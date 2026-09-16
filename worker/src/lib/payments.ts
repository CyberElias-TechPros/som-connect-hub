/**
 * SOM CONNECT — payments & subscription business logic.
 *
 * The routes stay thin; the rules that decide money live here so they can be
 * reasoned about (and tested) in one place:
 *
 *  - **Providers.** `mock` (default) always succeeds so the happy path never
 *    dead-ends, but honours deterministic test cards so failure flows
 *    (declines → past_due → dunning) are real, not imaginary. `stripe` is used
 *    automatically when `STRIPE_SECRET_KEY` is configured.
 *  - **Plan changes** are prorated: unused time on the current plan is credited
 *    against the new plan for the remainder of the period.
 *  - **Cancellation** keeps access until the period ends; `resume` reverses it.
 *  - **Dunning:** a failed renewal marks the subscription `past_due` and is
 *    retried on a fixed schedule before expiring.
 *  - **Invoices** are numbered sequentially per year and always written for
 *    money that moved.
 *
 * Everything here is pure or takes an explicit `now`, so tests can travel in
 * time without mocking the clock.
 */
import type { Env } from './db';

export type PlanInterval = 'monthly' | 'annually';
export type SubscriptionStatus = 'active' | 'trialing' | 'cancelled' | 'expired' | 'past_due';

export interface PlanRow {
  id: string;
  name: string;
  price: number;
  currency: string;
  interval: PlanInterval;
  features: string;
  trial_days: number;
}

/* ------------------------------------------------------------------ *
 * Pricing
 * ------------------------------------------------------------------ */

export const DAY_MS = 86_400_000;

/** Money is stored in whole cents internally to avoid float drift. */
export const toCents = (amount: number): number => Math.round(amount * 100);
export const fromCents = (cents: number): number => Math.round(cents) / 100;

export function periodEnd(startISO: string, interval: PlanInterval): string {
  const start = new Date(startISO);
  const end = new Date(start);
  if (interval === 'annually') end.setUTCFullYear(end.getUTCFullYear() + 1);
  else end.setUTCMonth(end.getUTCMonth() + 1);
  return end.toISOString();
}

export function addDays(startISO: string, days: number): string {
  return new Date(Date.parse(startISO) + days * DAY_MS).toISOString();
}

export interface ProrationInput {
  /** Price of the plan the user is on now. */
  currentAmount: number;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  /** Price of the plan they are switching to. */
  nextAmount: number;
  now?: string;
}

export interface ProrationResult {
  credit: number;
  charge: number;
  /** Amount actually due today (never negative — credit carries as a discount). */
  dueNow: number;
  daysRemaining: number;
  daysInPeriod: number;
  isUpgrade: boolean;
}

/**
 * Prorate a mid-cycle plan change.
 *
 * Unused time is credited at the current plan's daily rate; the new plan is
 * charged for the remaining days. Upgrades therefore cost a little today,
 * downgrades cost nothing and give a credit.
 */
export function proratePlanChange(input: ProrationInput): ProrationResult {
  const now = Date.parse(input.now ?? new Date().toISOString());
  const start = Date.parse(input.currentPeriodStart);
  const end = Date.parse(input.currentPeriodEnd);

  const daysInPeriod = Math.max(1, Math.round((end - start) / DAY_MS));
  const daysRemaining = Math.max(0, Math.round((end - now) / DAY_MS));

  const currentCents = toCents(input.currentAmount);
  const nextCents = toCents(input.nextAmount);
  const unusedRatio = Math.min(1, daysRemaining / daysInPeriod);

  const credit = Math.round(currentCents * unusedRatio);
  const charge = Math.round(nextCents * unusedRatio);

  return {
    credit: fromCents(credit),
    charge: fromCents(charge),
    dueNow: fromCents(Math.max(0, charge - credit)),
    daysRemaining,
    daysInPeriod,
    isUpgrade: nextCents > currentCents,
  };
}

/* ------------------------------------------------------------------ *
 * Invoices
 * ------------------------------------------------------------------ */

/** Sequential per-year invoice numbers: `INV-2026-0007`. */
export function invoiceNumber(sequence: number, dateISO = new Date().toISOString()): string {
  const year = new Date(dateISO).getUTCFullYear();
  return `INV-${year}-${String(sequence).padStart(4, '0')}`;
}

export async function nextInvoiceSequence(env: Env, dateISO = new Date().toISOString()): Promise<number> {
  const year = new Date(dateISO).getUTCFullYear();
  const row = await env.DB.prepare(
    "SELECT COUNT(*) AS count FROM invoices WHERE issued_at >= ? AND issued_at < ?",
  )
    .bind(`${year}-01-01`, `${year + 1}-01-01`)
    .first<{ count: number }>();
  return (row?.count ?? 0) + 1;
}

export async function createInvoice(
  env: Env,
  input: {
    userId: string;
    subscriptionId?: string | null;
    amount: number;
    currency?: string;
    status?: 'paid' | 'open' | 'void';
    description: string;
    now?: string;
  },
): Promise<{ id: string; number: string; amount: number; currency: string; status: string }> {
  const now = input.now ?? new Date().toISOString();
  const sequence = await nextInvoiceSequence(env, now);
  const id = `inv_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
  const number = invoiceNumber(sequence, now);
  const status = input.status ?? 'paid';
  const currency = input.currency ?? 'USD';

  await env.DB.prepare(
    'INSERT INTO invoices (id, number, user_id, subscription_id, amount, currency, status, description, period_start, period_end, paid_at, issued_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
  )
    .bind(
      id,
      number,
      input.userId,
      input.subscriptionId ?? null,
      input.amount,
      currency,
      status,
      input.description,
      null,
      null,
      status === 'paid' ? now : null,
      now,
    )
    .run();

  return { id, number, amount: input.amount, currency, status };
}

/* ------------------------------------------------------------------ *
 * Payment providers
 * ------------------------------------------------------------------ */

export interface ChargeInput {
  amount: number;
  currency: string;
  /** Stored gateway token (mock: the payment method id). */
  source: string;
  description: string;
  /** Stable key so a retry cannot double-charge. */
  idempotencyKey: string;
}

export interface ChargeResult {
  ok: boolean;
  reference: string;
  /** Gateway decline code, when the charge failed. */
  declineCode?: string;
  message: string;
}

export interface PaymentProvider {
  readonly name: string;
  charge(input: ChargeInput): Promise<ChargeResult>;
  refund(reference: string, amount: number): Promise<ChargeResult>;
}

/**
 * Deterministic test cards keep failure paths honest:
 *  - `pm_card_visa` / any `4242…` → succeeds.
 *  - `pm_card_declined` / `4000000000000002` → `card_declined`.
 *  - `pm_card_insufficient` / `4000000000009995` → `insufficient_funds`.
 *  - amounts ending in `.13` → random-ish processor failure (deterministic).
 */
export function mockDeclineCode(source: string, amount: number): string | null {
  const value = source.toLowerCase();
  if (value.includes('declined') || value.includes('4000000000000002')) return 'card_declined';
  if (value.includes('insufficient') || value.includes('4000000000009995')) return 'insufficient_funds';
  if (value.includes('expired') || value.includes('4000000000000069')) return 'expired_card';
  if (toCents(amount) % 100 === 13) return 'processing_error';
  return null;
}

/**
 * Maps a card number to the gateway token the mock provider charges through, so
 * a *stored* card keeps its behaviour (a declined test card stays declined).
 * Real gateways hand back a token like this from their own tokenise call.
 */
export function mockTokenForCard(cardNumber: string): string | null {
  const digits = cardNumber.replace(/\D/g, '');
  if (digits === '4000000000000002') return 'pm_card_declined';
  if (digits === '4000000000009995') return 'pm_card_insufficient';
  if (digits === '4000000000000069') return 'pm_card_expired';
  if (digits === '4242424242424242' || digits === '5555555555554444') return 'pm_card_visa';
  return null;
}

/** True when a gateway reference is a known test card that always declines. */
export function isDecliningToken(token: string | null | undefined): boolean {
  if (!token) return false;
  const value = token.toLowerCase();
  return value.includes('declined') || value.includes('insufficient') || value.includes('expired');
}

export const mockProvider: PaymentProvider = {
  name: 'mock',
  async charge(input) {
    const decline = mockDeclineCode(input.source, input.amount);
    const reference = `ch_${input.idempotencyKey.slice(0, 24)}`;
    if (decline) {
      return {
        ok: false,
        reference,
        declineCode: decline,
        message:
          decline === 'insufficient_funds'
            ? 'Your card was declined for insufficient funds.'
            : decline === 'expired_card'
              ? 'That card has expired.'
              : 'Your card was declined.',
      };
    }
    return { ok: true, reference, message: 'Payment succeeded.' };
  },
  async refund(reference) {
    return { ok: true, reference: `${reference}_refund`, message: 'Refund issued.' };
  },
};

export const stripeProvider: PaymentProvider = {
  name: 'stripe',
  async charge(input) {
    // Stripe's PaymentIntents API with an idempotency key.
    const body = new URLSearchParams({
      amount: String(toCents(input.amount)),
      currency: input.currency.toLowerCase(),
      description: input.description,
      payment_method: input.source,
      confirm: 'true',
      'automatic_payment_methods[enabled]': 'true',
      'automatic_payment_methods[allow_redirects]': 'never',
    });
    const response = await fetch('https://api.stripe.com/v1/payment_intents', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${input.source.startsWith('sk_') ? input.source : ''}`,
        'Idempotency-Key': input.idempotencyKey,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    });
    const payload: any = await response.json().catch(() => ({}));
    if (!response.ok || payload?.status !== 'succeeded') {
      return {
        ok: false,
        reference: payload?.id ?? `pi_${input.idempotencyKey}`,
        declineCode: payload?.last_payment_error?.decline_code ?? payload?.error?.code,
        message: payload?.last_payment_error?.message ?? payload?.error?.message ?? 'Payment failed.',
      };
    }
    return { ok: true, reference: payload.id, message: 'Payment succeeded.' };
  },
  async refund(reference) {
    const response = await fetch('https://api.stripe.com/v1/refunds', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ payment_intent: reference }),
    });
    const payload: any = await response.json().catch(() => ({}));
    return { ok: response.ok, reference: payload?.id ?? reference, message: response.ok ? 'Refund issued.' : 'Refund failed.' };
  },
};

export function providerFor(env: Env): PaymentProvider {
  return env.STRIPE_SECRET_KEY?.trim() ? stripeProvider : mockProvider;
}

/* ------------------------------------------------------------------ *
 * Card helpers
 * ------------------------------------------------------------------ */

export function detectBrand(number: string): string {
  const digits = number.replace(/\D/g, '');
  if (/^4/.test(digits)) return 'Visa';
  if (/^5[1-5]/.test(digits) || /^2[2-7]/.test(digits)) return 'Mastercard';
  if (/^3[47]/.test(digits)) return 'Amex';
  if (/^6(?:011|5)/.test(digits)) return 'Discover';
  if (/^506[01]|^650/.test(digits)) return 'Verve';
  return 'Card';
}

/** Luhn check — the same rule a real gateway applies before charging. */
export function isValidCardNumber(number: string): boolean {
  const digits = number.replace(/\D/g, '');
  if (digits.length < 13 || digits.length > 19) return false;
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i -= 1) {
    let value = Number(digits[i]);
    if (double) {
      value *= 2;
      if (value > 9) value -= 9;
    }
    sum += value;
    double = !double;
  }
  return sum % 10 === 0;
}

export function parseExpiry(expiry: string | undefined, now = new Date()): { valid: boolean; month: number; year: number } {
  const match = /^(\d{1,2})\s*\/\s*(\d{2,4})$/.exec((expiry ?? '').trim());
  if (!match) return { valid: false, month: 0, year: 0 };
  const month = Number(match[1]);
  const rawYear = Number(match[2]);
  const year = rawYear < 100 ? 2000 + rawYear : rawYear;
  if (month < 1 || month > 12) return { valid: false, month, year };
  const expired = year < now.getUTCFullYear() || (year === now.getUTCFullYear() && month < now.getUTCMonth() + 1);
  return { valid: !expired, month, year };
}

/* ------------------------------------------------------------------ *
 * Dunning (failed renewals)
 * ------------------------------------------------------------------ */

/** Retry schedule after a failed renewal: 3 days, 5 days, then 7 days. */
export const DUNNING_SCHEDULE_DAYS = [3, 5, 7] as const;

export interface DunningDecision {
  retryAt: string | null;
  status: SubscriptionStatus;
  shouldExpire: boolean;
  attempt: number;
}

export function dunningDecision(attempt: number, nowISO = new Date().toISOString()): DunningDecision {
  const index = Math.max(0, attempt - 1);
  if (index >= DUNNING_SCHEDULE_DAYS.length) {
    return { retryAt: null, status: 'expired', shouldExpire: true, attempt };
  }
  return {
    retryAt: addDays(nowISO, DUNNING_SCHEDULE_DAYS[index]),
    status: 'past_due',
    shouldExpire: false,
    attempt,
  };
}

/* ------------------------------------------------------------------ *
 * Lifecycle rules
 * ------------------------------------------------------------------ */

export const ACTIVE_STATUSES: SubscriptionStatus[] = ['active', 'trialing', 'past_due'];

/** Premium content unlocks for active, trialing (and grace-period past_due) users. */
export function hasPremiumAccess(status: string | null | undefined): boolean {
  return ACTIVE_STATUSES.includes((status ?? '') as SubscriptionStatus);
}

/** Can this subscription be resumed (cancelled but still inside the period)? */
export function canResume(row: { status: string; current_period_end: string }, nowISO = new Date().toISOString()): boolean {
  if (row.status !== 'cancelled' && row.status !== 'expired') return false;
  return Date.parse(row.current_period_end) > Date.parse(nowISO);
}

export interface PlanChangeInput {
  current: { plan_id: string; price: number; current_period_start: string; current_period_end: string };
  next: PlanRow;
  now?: string;
}

export interface PlanChangeResult extends ProrationResult {
  mode: 'immediate' | 'at_period_end';
  reason: string;
}

/**
 * Decide how to apply a plan change.
 *
 * Upgrades take effect immediately (prorated). Downgrades are scheduled for the
 * end of the current period so the user keeps what they paid for — the standard
 * industry rule and the least surprising behaviour.
 */
export function planChange(input: PlanChangeInput): PlanChangeResult {
  const now = input.now ?? new Date().toISOString();
  const proration = proratePlanChange({
    currentAmount: input.current.price,
    currentPeriodStart: input.current.current_period_start,
    currentPeriodEnd: input.current.current_period_end,
    nextAmount: input.next.price,
    now,
  });

  if (input.current.plan_id === input.next.id) {
    return { ...proration, mode: 'immediate', reason: 'already_on_plan' };
  }
  if (proration.isUpgrade) {
    return { ...proration, mode: 'immediate', reason: 'upgrade_prorated' };
  }
  return { ...proration, mode: 'at_period_end', reason: 'downgrade_at_period_end' };
}

/* ------------------------------------------------------------------ *
 * Webhooks
 * ------------------------------------------------------------------ */

/**
 * Verify a gateway webhook signature (`t=<ts>,v1=<hmac>` — Stripe's scheme).
 * Uses Web Crypto HMAC-SHA256, available on Workers.
 */
export async function verifyWebhookSignature(
  payload: string,
  signatureHeader: string | null,
  secret: string,
  toleranceSeconds = 300,
  nowMs = Date.now(),
): Promise<boolean> {
  if (!signatureHeader || !secret) return false;

  const parts = signatureHeader.split(',').reduce<Record<string, string>>((acc, part) => {
    const [key, value] = part.split('=');
    if (key && value) acc[key.trim()] = value.trim();
    return acc;
  }, {});
  if (!parts.t || !parts.v1) return false;

  const timestamp = Number(parts.t);
  if (!Number.isFinite(timestamp)) return false;
  if (Math.abs(nowMs / 1000 - timestamp) > toleranceSeconds) return false;

  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${parts.t}.${payload}`));
  const expected = Array.from(new Uint8Array(mac))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  // Constant-time-ish comparison.
  if (expected.length !== parts.v1.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i += 1) diff |= expected.charCodeAt(i) ^ parts.v1.charCodeAt(i);
  return diff === 0;
}
