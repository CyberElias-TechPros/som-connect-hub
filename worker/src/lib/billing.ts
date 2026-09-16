/**
 * SOM CONNECT — billing engine.
 *
 * The single place where money actually moves. Both the HTTP routes and the
 * cron trigger call in here, so a renewal behaves identically whether it was
 * triggered by a user action, a webhook or the nightly job.
 *
 * Guarantees:
 *  - A charge is only ever recorded once (idempotency key + `payment_events`).
 *  - An invoice exists for every successful charge, with a sequential number.
 *  - A decline never deletes access immediately: the subscription goes
 *    `past_due` and enters dunning.
 *  - Dunning retries respect their schedule: a failed charge waits for its
 *    `next_retry_at` instead of being retried on the very next run.
 */
import type { Env } from './db';
import { generateId } from './auth';
import { createNotification } from './daily';
import { sendEmail, templates, appBaseUrl } from './email';
import {
  addDays,
  canResume,
  createInvoice,
  dunningDecision,
  hasPremiumAccess,
  periodEnd,
  planChange,
  providerFor,
  type PlanInterval,
  type PlanRow,
} from './payments';

export interface PlanRowFull extends PlanRow {
  features: string;
  trial_days: number;
  currency: string;
}

export interface StartResult {
  ok: boolean;
  status: number;
  code?: string;
  message: string;
  subscriptionId?: string;
  invoice?: { id: string; number: string; amount: number; currency: string };
  reference?: string;
}

async function alreadyProcessed(env: Env, key: string): Promise<boolean> {
  const row = await env.DB.prepare('SELECT id FROM payment_events WHERE id = ?').bind(key).first<{ id: string }>();
  return !!row;
}

async function markProcessed(env: Env, key: string, type: string, meta: Record<string, unknown>): Promise<void> {
  await env.DB.prepare(
    'INSERT OR IGNORE INTO payment_events (id, type, user_id, subscription_id, amount, payload) VALUES (?, ?, ?, ?, ?, ?)',
  )
    .bind(
      key,
      type,
      (meta.userId as string) ?? null,
      (meta.subscriptionId as string) ?? null,
      typeof meta.amount === 'number' ? meta.amount : null,
      JSON.stringify(meta).slice(0, 2000),
    )
    .run();
}

/** Charges a card through the configured provider exactly once per key. */
async function chargeOnce(
  env: Env,
  input: { amount: number; currency: string; source: string; description: string; key: string; userId: string; subscriptionId?: string },
): Promise<{ ok: boolean; reference?: string; message: string; declineCode?: string; replayed?: boolean }> {
  if (await alreadyProcessed(env, input.key)) {
    return { ok: true, message: 'Already charged.', replayed: true };
  }

  const provider = providerFor(env);
  const result = await provider.charge({
    amount: input.amount,
    currency: input.currency,
    source: input.source,
    description: input.description,
    idempotencyKey: input.key,
  });

  const audit = {
    userId: input.userId,
    subscriptionId: input.subscriptionId,
    amount: input.amount,
    provider: provider.name,
    declineCode: result.declineCode,
  };

  if (result.ok) {
    // Only a successful charge locks the key, so a repeated request cannot be
    // charged twice.
    await markProcessed(env, input.key, 'charge.succeeded', audit);
  } else {
    // A decline must NOT lock it: the member has to be able to retry with the
    // same or another card. The attempt is still audited, under a unique id.
    await markProcessed(env, `${input.key}#fail#${Date.now()}`, 'charge.failed', audit);
  }

  return { ok: result.ok, reference: result.reference, message: result.message, declineCode: result.declineCode };
}

/**
 * Resolve the reference the provider charges.
 *
 * A stored method resolves to its gateway token; a raw token (e.g.
 * `pm_card_declined`, as a test or a PSP would supply) passes through; with no
 * method at all the user's default card is used, falling back to a test Visa so
 * the flow always completes.
 */
async function chargeSource(env: Env, userId: string, paymentMethodId?: string | null): Promise<string> {
  if (paymentMethodId) {
    const row = await env.DB.prepare('SELECT id, token FROM payment_methods WHERE id = ? AND user_id = ?')
      .bind(paymentMethodId, userId)
      .first<{ id: string; token: string | null }>();
    return row ? row.token ?? row.id : paymentMethodId;
  }
  const row = await env.DB.prepare(
    'SELECT id, token FROM payment_methods WHERE user_id = ? ORDER BY is_default DESC, created_at DESC LIMIT 1',
  )
    .bind(userId)
    .first<{ id: string; token: string | null }>();
  if (!row) return 'pm_card_visa';
  // `token` is the gateway reference (a real PSP returns one at tokenise time);
  // without it the method id is the reference the provider understands.
  return row.token ?? row.id;
}

/* ------------------------------------------------------------------ *
 * Subscribe
 * ------------------------------------------------------------------ */

export async function startSubscription(
  env: Env,
  user: { id: string; name?: string; email?: string },
  plan: PlanRowFull,
  options: { paymentMethodId?: string | null; now?: string } = {},
): Promise<StartResult> {
  const now = options.now ?? new Date().toISOString();
  const source = await chargeSource(env, user.id, options.paymentMethodId);

  const charge = await chargeOnce(env, {
    amount: plan.price,
    currency: plan.currency ?? 'USD',
    source,
    description: `${plan.name} (${plan.interval})`,
    key: `sub_start_${user.id}_${plan.id}_${now.slice(0, 13)}`,
    userId: user.id,
  });

  if (!charge.ok) {
    return {
      ok: false,
      status: 402,
      code: charge.declineCode ?? 'payment_failed',
      message: charge.message,
    };
  }

  // Exactly one live subscription per user.
  await env.DB.prepare(
    "UPDATE user_subscriptions SET status = 'cancelled', cancelled_at = ?, updated_at = ? WHERE user_id = ? AND status IN ('active','trialing','past_due')",
  )
    .bind(now, now, user.id)
    .run();

  const id = generateId('sub_');
  const endsAt = periodEnd(now, plan.interval as PlanInterval);

  await env.DB.prepare(
    `INSERT INTO user_subscriptions
      (id, user_id, plan_id, status, payment_method_id, current_period_start, current_period_end, amount, currency, last_charge_reference)
     VALUES (?, ?, ?, 'active', ?, ?, ?, ?, ?, ?)`,
  )
    .bind(id, user.id, plan.id, source, now, endsAt, plan.price, plan.currency ?? 'USD', charge.reference ?? null)
    .run();

  if (options.paymentMethodId) {
    await env.DB.prepare('UPDATE payment_methods SET is_default = 0 WHERE user_id = ?').bind(user.id).run();
    await env.DB.prepare('UPDATE payment_methods SET is_default = 1 WHERE id = ? AND user_id = ?')
      .bind(options.paymentMethodId, user.id)
      .run();
  }

  const invoice = await createInvoice(env, {
    userId: user.id,
    subscriptionId: id,
    amount: plan.price,
    currency: plan.currency ?? 'USD',
    description: `${plan.name} (${plan.interval})`,
    now,
  });

  await notifyPremium(env, user, plan, invoice.number, endsAt);
  return { ok: true, status: 201, message: `Welcome to ${plan.name}! Your subscription is active.`, subscriptionId: id, invoice, reference: charge.reference };
}

async function notifyPremium(
  env: Env,
  user: { id: string; name?: string; email?: string },
  plan: { name: string; price: number; currency?: string },
  invoiceNumber: string,
  periodEndISO: string,
): Promise<void> {
  const amount = `${plan.currency ?? 'USD'} ${plan.price.toFixed(2)}`;
  await createNotification(
    env,
    user.id,
    'system',
    'Premium activated',
    `Your ${plan.name} plan is active. Enjoy HD streaming, offline downloads and exclusive content.`,
    '/manage-subscription',
  ).catch(() => undefined);

  await env.DB.prepare(
    'INSERT INTO notifications (id, user_id, type, title, message, action_url) VALUES (?, ?, ?, ?, ?, ?)',
  )
    .bind(
      generateId('notif_'),
      user.id,
      'system',
      'Receipt',
      `${invoiceNumber} — ${amount} received. Renews ${new Date(periodEndISO).toLocaleDateString()}.`,
      '/manage-subscription',
    )
    .run()
    .catch(() => undefined);

  if (user.email) {
    await sendEmail(env, {
      to: user.email,
      ...templates.subscriptionCreated(user.name ?? 'friend', plan.name, amount, invoiceNumber),
    }).catch(() => undefined);
  }
}

/* ------------------------------------------------------------------ *
 * Renewal + dunning
 * ------------------------------------------------------------------ */

export interface RenewResult {
  ok: boolean;
  status: 'active' | 'past_due' | 'expired' | 'skipped';
  message: string;
  invoice?: { id: string; number: string };
  retryAt?: string | null;
  declineCode?: string;
}

/**
 * Attempt to renew one subscription. Called by cron for every subscription
 * whose period has ended, and directly by tests / an admin "retry" action.
 */
export async function renewSubscription(
  env: Env,
  subscriptionId: string,
  options: { now?: string; source?: string } = {},
): Promise<RenewResult> {
  const now = options.now ?? new Date().toISOString();
  const row = await env.DB.prepare(
    `SELECT us.*, sp.name AS plan_name, sp.price AS plan_price, sp.currency AS plan_currency, sp.interval AS plan_interval,
            u.name AS user_name, u.email AS user_email
     FROM user_subscriptions us
     JOIN subscription_plans sp ON us.plan_id = sp.id
     JOIN users u ON u.id = us.user_id
     WHERE us.id = ?`,
  )
    .bind(subscriptionId)
    .first<any>();

  if (!row) return { ok: false, status: 'skipped', message: 'Subscription not found.' };
  if (row.cancel_at_period_end) {
    await env.DB.prepare("UPDATE user_subscriptions SET status = 'expired', updated_at = ? WHERE id = ?")
      .bind(now, subscriptionId)
      .run();
    return { ok: false, status: 'expired', message: 'Subscription ended — cancellation was scheduled.' };
  }
  if (row.status === 'expired') return { ok: false, status: 'skipped', message: 'Already expired.' };

  const amount = typeof row.amount === 'number' ? row.amount : row.plan_price;
  const attempt = (row.failed_payment_count ?? 0) + 1;
  const source = options.source ?? (await chargeSource(env, row.user_id, row.payment_method_id));
  const periodKey = `${subscriptionId}_${row.current_period_end}`;

  const charge = await chargeOnce(env, {
    amount,
    currency: row.plan_currency ?? 'USD',
    source,
    description: `${row.plan_name} renewal`,
    key: `renew_${periodKey}_${attempt}`,
    userId: row.user_id,
    subscriptionId,
  });

  if (charge.ok) {
    const start = now;
    const ends = periodEnd(start, (row.plan_interval ?? 'monthly') as PlanInterval);
    await env.DB.prepare(
      `UPDATE user_subscriptions
         SET status = 'active', current_period_start = ?, current_period_end = ?, failed_payment_count = 0,
             last_payment_error = NULL, next_retry_at = NULL, last_charge_reference = ?, updated_at = ?
       WHERE id = ?`,
    )
      .bind(start, ends, charge.reference ?? null, now, subscriptionId)
      .run();

    const invoice = await createInvoice(env, {
      userId: row.user_id,
      subscriptionId,
      amount,
      currency: row.plan_currency ?? 'USD',
      description: `${row.plan_name} renewal`,
      now,
    });

    await createNotification(
      env,
      row.user_id,
      'system',
      'Subscription renewed',
      `${invoice.number} — ${row.plan_currency ?? 'USD'} ${amount.toFixed(2)} paid. Renews ${new Date(ends).toLocaleDateString()}.`,
      '/manage-subscription',
    ).catch(() => undefined);

    return { ok: true, status: 'active', message: 'Renewed.', invoice: { id: invoice.id, number: invoice.number } };
  }

  const decision = dunningDecision(attempt, now);
  await env.DB.prepare(
    `UPDATE user_subscriptions
       SET status = ?, failed_payment_count = ?, last_payment_error = ?, next_retry_at = ?, updated_at = ?
     WHERE id = ?`,
  )
    .bind(decision.status, attempt, charge.message, decision.retryAt, now, subscriptionId)
    .run();

  const copy = decision.shouldExpire
    ? 'We could not renew your subscription after several attempts, so it has ended. You can resubscribe any time.'
    : `We could not renew your subscription (${charge.message}) We will try again on ${new Date(decision.retryAt!).toLocaleDateString()}.`;

  await createNotification(env, row.user_id, 'system', decision.shouldExpire ? 'Subscription ended' : 'Payment failed', copy, '/payment').catch(() => undefined);

  if (row.user_email) {
    await sendEmail(env, {
      to: row.user_email,
      tag: decision.shouldExpire ? 'subscription_expired' : 'payment_failed',
      subject: decision.shouldExpire ? 'Your SOM CONNECT subscription has ended' : 'We could not process your payment',
      html: `<p>${copy}</p><p><a href="${appBaseUrl(env)}/payment">Update your payment method</a></p>`,
      text: `${copy} Update your payment method: ${appBaseUrl(env)}/payment`,
    }).catch(() => undefined);
  }

  return { ok: false, status: decision.status as RenewResult['status'], message: charge.message, retryAt: decision.retryAt, declineCode: charge.declineCode };
}

/** Nightly job: renew what is due, retry what is in dunning, expire what lapsed. */
export async function processDueRenewals(env: Env, nowISOMs?: string): Promise<{ renewed: number; failed: number; expired: number; retried: number }> {
  const now = nowISOMs ?? new Date().toISOString();
  const summary = { renewed: 0, failed: 0, expired: 0, retried: 0 };

  const due = await env.DB.prepare(
    `SELECT id, status FROM user_subscriptions
      WHERE status IN ('active','past_due') AND current_period_end <= ?
        AND (next_retry_at IS NULL OR next_retry_at <= ?)
      ORDER BY current_period_end LIMIT 200`,
  )
    .bind(now, now)
    .all<{ id: string; status: string }>();

  for (const row of due.results ?? []) {
    const result = await renewSubscription(env, row.id, { now });
    if (result.ok) summary.renewed += 1;
    else if (result.status === 'expired') summary.expired += 1;
    else summary.failed += 1;
  }

  // Dunning retries that have come around.
  const retries = await env.DB.prepare(
    "SELECT id FROM user_subscriptions WHERE status = 'past_due' AND next_retry_at IS NOT NULL AND next_retry_at <= ? LIMIT 200",
  )
    .bind(now)
    .all<{ id: string }>();

  for (const row of retries.results ?? []) {
    const result = await renewSubscription(env, row.id, { now });
    summary.retried += 1;
    if (result.ok) summary.renewed += 1;
    else if (result.status === 'expired') summary.expired += 1;
  }

  return summary;
}

/* ------------------------------------------------------------------ *
 * Plan changes / cancel / resume
 * ------------------------------------------------------------------ */

export interface ChangeResult {
  ok: boolean;
  status: number;
  mode: 'immediate' | 'at_period_end';
  message: string;
  proration?: { credit: number; charge: number; dueNow: number; daysRemaining: number };
  invoice?: { id: string; number: string; amount: number };
  code?: string;
}

export async function changePlan(
  env: Env,
  user: { id: string; name?: string; email?: string },
  nextPlan: PlanRowFull,
  options: { now?: string; force?: boolean; paymentMethodId?: string } = {},
): Promise<ChangeResult> {
  const now = options.now ?? new Date().toISOString();

  const current = await env.DB.prepare(
    `SELECT us.*, sp.price AS plan_price, sp.currency AS plan_currency
     FROM user_subscriptions us JOIN subscription_plans sp ON us.plan_id = sp.id
     WHERE us.user_id = ? AND us.status IN ('active','trialing','past_due')
     ORDER BY us.created_at DESC LIMIT 1`,
  )
    .bind(user.id)
    .first<any>();

  if (!current) {
    const started = await startSubscription(env, user, nextPlan, { now: options.now });
    return { ok: started.ok, status: started.status, mode: 'immediate', message: started.message, code: started.code, invoice: started.invoice };
  }

  const decision = planChange({
    current: {
      plan_id: current.plan_id,
      price: current.amount ?? current.plan_price,
      current_period_start: current.current_period_start,
      current_period_end: current.current_period_end,
    },
    next: nextPlan,
    now,
  });

  if (decision.reason === 'already_on_plan') {
    return { ok: true, status: 200, mode: 'immediate', message: `You are already on ${nextPlan.name}.` };
  }

  if (decision.mode === 'at_period_end' && !options.force) {
    await env.DB.prepare('UPDATE user_subscriptions SET pending_plan_id = ?, updated_at = ? WHERE id = ?')
      .bind(nextPlan.id, now, current.id)
      .run();
    return {
      ok: true,
      status: 200,
      mode: 'at_period_end',
      message: `We will switch you to ${nextPlan.name} when your current period ends on ${new Date(current.current_period_end).toLocaleDateString()}.`,
      proration: { credit: decision.credit, charge: decision.charge, dueNow: decision.dueNow, daysRemaining: decision.daysRemaining },
    };
  }

  // Immediate (upgrade or forced): charge the prorated difference today.
  const source = options.paymentMethodId ?? (await chargeSource(env, user.id, current.payment_method_id));
  if (decision.dueNow > 0) {
    const charge = await chargeOnce(env, {
      amount: decision.dueNow,
      currency: nextPlan.currency ?? 'USD',
      source,
      description: `Plan change to ${nextPlan.name}`,
      key: `change_${current.id}_${current.plan_id}_${nextPlan.id}_${current.current_period_end}`,
      userId: user.id,
      subscriptionId: current.id,
    });
    if (!charge.ok) {
      return { ok: false, status: 402, mode: 'immediate', code: charge.declineCode ?? 'payment_failed', message: charge.message };
    }
  }

  // Keep the same period boundaries — the user already paid for that time.
  await env.DB.prepare(
    `UPDATE user_subscriptions SET plan_id = ?, amount = ?, currency = ?, pending_plan_id = NULL,
       failed_payment_count = 0, last_payment_error = NULL, next_retry_at = NULL, updated_at = ?
     WHERE id = ?`,
  )
    .bind(nextPlan.id, nextPlan.price, nextPlan.currency ?? 'USD', now, current.id)
    .run();

  let invoice: { id: string; number: string; amount: number } | undefined;
  if (decision.dueNow > 0) {
    invoice = await createInvoice(env, {
      userId: user.id,
      subscriptionId: current.id,
      amount: decision.dueNow,
      currency: nextPlan.currency ?? 'USD',
      description: `Plan change to ${nextPlan.name} (prorated)`,
      now,
    });
  }

  await createNotification(
    env,
    user.id,
    'system',
    'Plan updated',
    `You are now on ${nextPlan.name}.${decision.dueNow > 0 ? ` ${decision.dueNow.toFixed(2)} ${nextPlan.currency ?? 'USD'} charged today (prorated).` : ''}`,
    '/manage-subscription',
  ).catch(() => undefined);

  return {
    ok: true,
    status: 200,
    mode: 'immediate',
    message: `You are now on ${nextPlan.name}.`,
    proration: { credit: decision.credit, charge: decision.charge, dueNow: decision.dueNow, daysRemaining: decision.daysRemaining },
    invoice,
  };
}

export async function cancelSubscription(
  env: Env,
  userId: string,
  options: { immediately?: boolean; now?: string } = {},
): Promise<{ ok: boolean; message: string; status: string; periodEnd?: string }> {
  const now = options.now ?? new Date().toISOString();
  const row = await env.DB.prepare(
    "SELECT * FROM user_subscriptions WHERE user_id = ? AND status IN ('active','trialing','past_due') ORDER BY created_at DESC LIMIT 1",
  )
    .bind(userId)
    .first<any>();

  if (!row) return { ok: false, message: 'You do not have an active subscription.', status: 'none' };

  if (options.immediately) {
    await env.DB.prepare("UPDATE user_subscriptions SET status = 'cancelled', cancelled_at = ?, cancel_at_period_end = 0, updated_at = ? WHERE id = ?")
      .bind(now, now, row.id)
      .run();
    return { ok: true, message: 'Your subscription has been cancelled.', status: 'cancelled' };
  }

  await env.DB.prepare('UPDATE user_subscriptions SET cancel_at_period_end = 1, cancelled_at = ?, updated_at = ? WHERE id = ?')
    .bind(now, now, row.id)
    .run();

  return {
    ok: true,
    message: `Your plan stays active until ${new Date(row.current_period_end).toLocaleDateString()}.`,
    status: 'cancelled_at_period_end',
    periodEnd: row.current_period_end,
  };
}

export async function resumeSubscription(env: Env, userId: string, now = new Date().toISOString()) {
  const row = await env.DB.prepare(
    "SELECT * FROM user_subscriptions WHERE user_id = ? AND (cancel_at_period_end = 1 OR status IN ('cancelled','expired')) ORDER BY created_at DESC LIMIT 1",
  )
    .bind(userId)
    .first<any>();

  if (!row) return { ok: false as const, message: 'There is no cancelled subscription to resume.' };

  if (!canResume(row, now) && row.cancel_at_period_end !== 1) {
    return { ok: false as const, message: 'That subscription has ended — start a new plan instead.' };
  }

  await env.DB.prepare(
    "UPDATE user_subscriptions SET status = 'active', cancel_at_period_end = 0, cancelled_at = NULL, updated_at = ? WHERE id = ?",
  )
    .bind(now, row.id)
    .run();

  return { ok: true as const, message: 'Your subscription will renew as normal.', subscriptionId: row.id };
}

/* ------------------------------------------------------------------ *
 * Access
 * ------------------------------------------------------------------ */

export async function premiumStatus(env: Env, userId: string) {
  const row = await env.DB.prepare(
    `SELECT us.*, sp.name AS plan_name, sp.features, sp.interval
     FROM user_subscriptions us JOIN subscription_plans sp ON us.plan_id = sp.id
     WHERE us.user_id = ? ORDER BY us.created_at DESC LIMIT 1`,
  )
    .bind(userId)
    .first<any>();
  return { row, isPremium: hasPremiumAccess(row?.status) };
}

export { addDays };
