/**
 * SOM CONNECT — /payments
 * Tokenised payment methods, billing profile and payment intents.
 *
 * The demo settles every payment successfully (happy path) while keeping the
 * API surface compatible with a real PSP (Stripe-shaped intents + client
 * secrets). Raw card numbers are never stored — only brand/last4/expiry.
 */
import { Hono } from 'hono';
import { audit, type AppEnv } from '../lib/middleware';
import { errorResponse, ok, readJson } from '../lib/http';
import { generateId } from '../lib/auth';
import { sendEmail, templates } from '../lib/email';
import {
  createInvoice,
  detectBrand,
  isDecliningToken,
  isValidCardNumber,
  mockTokenForCard,
  parseExpiry,
  providerFor,
  toCents,
  verifyWebhookSignature,
} from '../lib/payments';

const payments = new Hono<AppEnv>();

function mapMethod(row: any) {
  return {
    id: row.id,
    type: row.type,
    brand: row.brand,
    last4: row.last4,
    expiry: row.expiry,
    holder: row.holder,
    isDefault: !!row.is_default,
    // True when the method is a gateway test reference that always declines.
    isTest: isDecliningToken(row.token),
  };
}

/**
 * "Default" means "the card we charge": pointing the default at a method also
 * points any live subscription at it, so the next invoice uses that card.
 */
async function applyDefaultMethod(env: any, userId: string, methodId: string): Promise<void> {
  await env.DB.prepare('UPDATE payment_methods SET is_default = 0 WHERE user_id = ?').bind(userId).run();
  await env.DB.prepare('UPDATE payment_methods SET is_default = 1 WHERE id = ? AND user_id = ?').bind(methodId, userId).run();
  await env.DB.prepare(
    "UPDATE user_subscriptions SET payment_method_id = ?, updated_at = ? WHERE user_id = ? AND status IN ('active','trialing','past_due')",
  )
    .bind(methodId, new Date().toISOString(), userId)
    .run();
}

/* GET /payments/methods */
payments.get('/methods', async (c) => {
  const user = c.get('user');
  if (!user) return errorResponse('Authentication required.', 401);
  const rows = await c.env.DB.prepare(
    'SELECT * FROM payment_methods WHERE user_id = ? ORDER BY is_default DESC, created_at DESC',
  )
    .bind(user.id)
    .all<any>();
  const items = (rows.results ?? []).map(mapMethod);

  if (!items.length) {
    // Happy path: every account can pay straight away with a demo card.
    const id = generateId('pm_');
    await c.env.DB.prepare(
      "INSERT INTO payment_methods (id, user_id, type, brand, last4, expiry, holder, is_default) VALUES (?, ?, 'card', 'Visa', '4242', '12/28', ?, 1)",
    )
      .bind(id, user.id, user.name)
      .run();
    const row = await c.env.DB.prepare('SELECT * FROM payment_methods WHERE id = ?').bind(id).first<any>();
    return ok({ items: [mapMethod(row)], seeded: true });
  }

  return ok({ items });
});

/* POST /payments/methods { type, brand?, last4?, cardNumber?, expiry?, holder?, isDefault? } */
payments.post('/methods', async (c) => {
  const user = c.get('user');
  if (!user) return errorResponse('Authentication required.', 401);
  const body = await readJson(c);

  const rawCard = String(body.cardNumber ?? body.number ?? '');
  const cardNumber = rawCard.replace(/\D/g, '');
  const type = ['card', 'paypal', 'bank'].includes(body.type) ? body.type : 'card';

  // When the client sends the PAN (server-side tokenisation), validate it and
  // derive brand/last4 here. Only the brand and the last four digits are kept.
  let brand: string;
  let last4: string;
  let expiry = typeof body.expiry === 'string' && body.expiry ? body.expiry : '12/28';
  if (!cardNumber && typeof body.last4 === 'string' && body.last4.length === 4) {
    // The client already tokenised the card (the browser flow does this).
    brand = typeof body.brand === 'string' && body.brand ? body.brand : 'Card';
    last4 = body.last4;
  } else {
    brand = typeof body.brand === 'string' && body.brand ? body.brand : detectBrand(cardNumber);
    last4 = cardNumber.slice(-4) || '4242';
    if (type === 'card') {
      const expiryState = parseExpiry(expiry);
      const cvcDigits = String(body.cvc ?? body.cvv ?? '').replace(/\D/g, '');
      const cvcExpected = brand === 'Amex' ? 4 : 3;
      const problem = !isValidCardNumber(cardNumber)
        ? 'That card number does not look right.'
        : !expiryState.valid
          ? 'That expiry date has passed.'
          : cvcDigits && cvcDigits.length !== cvcExpected
            ? `The security code should be ${cvcExpected} digits.`
            : null;
      if (problem) return errorResponse(problem, 400, 'invalid_card');
    }
  }

  const token = mockTokenForCard(cardNumber);
  const id = generateId('pm_');
  if (body.isDefault) {
    await c.env.DB.prepare('UPDATE payment_methods SET is_default = 0 WHERE user_id = ?').bind(user.id).run();
  }
  await c.env.DB.prepare(
    'INSERT INTO payment_methods (id, user_id, type, brand, last4, expiry, holder, is_default, token) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
  )
    .bind(id, user.id, type, brand, last4, expiry, body.holder ?? user.name, body.isDefault ? 1 : 0, token)
    .run();

  if (body.isDefault) await applyDefaultMethod(c.env, user.id, id);

  audit(c, 'payment_method.create', 'payment_method', id, { brand, last4 });
  const row = await c.env.DB.prepare('SELECT * FROM payment_methods WHERE id = ?').bind(id).first<any>();
  return ok({ method: mapMethod(row), message: 'Payment method added.' }, 201);
});

/* DELETE /payments/methods/:id */
payments.delete('/methods/:id', async (c) => {
  const user = c.get('user');
  if (!user) return errorResponse('Authentication required.', 401);
  const id = c.req.param('id');
  await c.env.DB.prepare('DELETE FROM payment_methods WHERE id = ? AND user_id = ?').bind(id, user.id).run();
  return ok({ id, message: 'Payment method removed.' });
});

/* PUT /payments/methods/:id/default */
payments.put('/methods/:id/default', async (c) => {
  const user = c.get('user');
  if (!user) return errorResponse('Authentication required.', 401);
  const id = c.req.param('id');
  const exists = await c.env.DB.prepare('SELECT id FROM payment_methods WHERE id = ? AND user_id = ?')
    .bind(id, user.id)
    .first<{ id: string }>();
  if (!exists) return errorResponse('That payment method could not be found.', 404);

  await applyDefaultMethod(c.env, user.id, id);
  audit(c, 'payment_method.default', 'payment_method', id);
  return ok({ id, isDefault: true, message: 'Default payment method updated.' });
});

/* GET /payments/billing */
payments.get('/billing', async (c) => {
  const user = c.get('user');
  if (!user) return errorResponse('Authentication required.', 401);
  const row = await c.env.DB.prepare('SELECT * FROM billing_profiles WHERE user_id = ?').bind(user.id).first<any>();
  return ok({
    billingInfo: row
      ? {
          name: row.name,
          email: row.email,
          address: row.address ?? '',
          city: row.city ?? '',
          state: row.state ?? '',
          zip: row.zip ?? '',
          country: row.country ?? '',
        }
      : { name: user.name, email: user.email, address: '', city: '', state: '', zip: '', country: '' },
  });
});

/* PUT /payments/billing */
payments.put('/billing', async (c) => {
  const user = c.get('user');
  if (!user) return errorResponse('Authentication required.', 401);
  const body = await readJson(c);
  const info = {
    name: body.name ?? user.name,
    email: body.email ?? user.email,
    address: body.address ?? '',
    city: body.city ?? '',
    state: body.state ?? '',
    zip: body.zip ?? '',
    country: body.country ?? '',
  };

  await c.env.DB.prepare(
    `INSERT INTO billing_profiles (user_id, name, email, address, city, state, zip, country, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET name = excluded.name, email = excluded.email, address = excluded.address,
       city = excluded.city, state = excluded.state, zip = excluded.zip, country = excluded.country, updated_at = excluded.updated_at`,
  )
    .bind(user.id, info.name, info.email, info.address, info.city, info.state, info.zip, info.country, new Date().toISOString())
    .run();

  return ok({ billingInfo: info, message: 'Billing details saved.' });
});

/* POST /payments/intents { amount, currency?, description?, planId? } */
payments.post('/intents', async (c) => {
  const user = c.get('user');
  if (!user) return errorResponse('Authentication required.', 401);
  const body = await readJson(c);

  let amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    const plan = body.planId
      ? await c.env.DB.prepare('SELECT price FROM subscription_plans WHERE id = ?').bind(body.planId).first<{ price: number }>()
      : null;
    amount = plan?.price ?? 9.99;
  }

  const id = generateId('pi_');
  const clientSecret = `${id}_secret_${generateId('')}`;

  await c.env.DB.prepare(
    `INSERT INTO payment_intents (id, user_id, amount, currency, status, plan_id, client_secret, description)
     VALUES (?, ?, ?, ?, 'requires_confirmation', ?, ?, ?)`,
  )
    .bind(id, user.id, amount, body.currency ?? 'USD', body.planId ?? null, clientSecret, body.description ?? null)
    .run();

  return ok(
    {
      paymentIntent: {
        id,
        amount,
        currency: body.currency ?? 'USD',
        status: 'requires_confirmation',
        clientSecret,
        created: Date.now(),
      },
      message: 'Payment intent created.',
    },
    201,
  );
});

/* POST /payments/confirm { paymentIntentId, paymentMethodId? } — settles via the provider */
payments.post('/confirm', async (c) => {
  const user = c.get('user');
  if (!user) return errorResponse('Authentication required.', 401);
  const body = await readJson(c);
  const requestedId = body.paymentIntentId ?? body.intentId;
  const id = typeof requestedId === 'string' && requestedId ? requestedId : generateId('pi_');

  const existing = await c.env.DB.prepare('SELECT * FROM payment_intents WHERE id = ? AND user_id = ?')
    .bind(id, user.id)
    .first<any>();

  // Confirming an intent that does not exist needs an amount — otherwise this
  // would fail deeper down with a database error instead of a helpful message.
  const bodyAmount = Number(body.amount);
  if (!existing && (!Number.isFinite(bodyAmount) || bodyAmount <= 0)) {
    return errorResponse('Create a payment intent before confirming it.', 400, 'intent_not_found');
  }

  // Already settled? Idempotent replay.
  if (existing?.status === 'succeeded') {
    return ok({
      paymentIntent: { id, amount: existing.amount, currency: existing.currency, status: 'succeeded', clientSecret: existing.client_secret, created: Date.now() },
      message: 'Payment already confirmed.',
    });
  }

  const amount = existing?.amount ?? (Number.isFinite(bodyAmount) && bodyAmount > 0 ? bodyAmount : 9.99);
  const currency = existing?.currency ?? body.currency ?? 'USD';
  const requestedMethod = body.paymentMethodId ?? body.methodId;
  const methodId =
    (typeof requestedMethod === 'string' && requestedMethod) ||
    existing?.payment_method_id ||
    (await c.env.DB.prepare('SELECT id FROM payment_methods WHERE user_id = ? ORDER BY is_default DESC, created_at DESC LIMIT 1')
      .bind(user.id)
      .first<{ id: string }>())?.id ||
    'pm_card_visa';

  const provider = providerFor(c.env);
  const key = `intent_${id}`;
  const replay = await c.env.DB.prepare('SELECT id FROM payment_events WHERE id = ?').bind(key).first<{ id: string }>();

  let result = { ok: true, reference: `ch_${id}`, message: 'Payment succeeded.' } as { ok: boolean; reference: string; message: string; declineCode?: string };
  if (!replay) {
    result = await provider.charge({
      amount: Number(amount),
      currency: String(currency),
      source: methodId,
      description: existing?.description ?? body.description ?? 'SOM CONNECT payment',
      idempotencyKey: key,
    });
    // Only a successful charge locks the idempotency key, so a decline can be
    // retried (with another card) instead of replaying as a false success.
    await c.env.DB.prepare(
      'INSERT OR IGNORE INTO payment_events (id, type, user_id, amount, payload) VALUES (?, ?, ?, ?, ?)',
    )
      .bind(
        result.ok ? key : `${key}#fail#${Date.now()}`,
        result.ok ? 'intent.succeeded' : 'intent.failed',
        user.id,
        Number(amount),
        JSON.stringify({ provider: provider.name, reference: result.reference, declineCode: result.declineCode }),
      )
      .run();
  }

  if (!result.ok) {
    if (existing) {
      await c.env.DB.prepare("UPDATE payment_intents SET status = 'failed', updated_at = ? WHERE id = ?")
        .bind(new Date().toISOString(), id)
        .run();
    }
    audit(c, 'payment.failed', 'payment_intent', id, { declineCode: result.declineCode });
    return errorResponse(result.message, 402, result.declineCode ?? 'payment_failed');
  }

  if (!existing) {
    await c.env.DB.prepare(
      `INSERT INTO payment_intents (id, user_id, amount, currency, status, payment_method_id, client_secret, description)
       VALUES (?, ?, ?, ?, 'succeeded', ?, ?, 'Payment')`,
    )
      .bind(id, user.id, Number(amount), String(currency), methodId, `${id}_secret_confirmed`)
      .run();
  } else {
    await c.env.DB.prepare("UPDATE payment_intents SET status = 'succeeded', payment_method_id = ?, updated_at = ? WHERE id = ?")
      .bind(methodId, new Date().toISOString(), id)
      .run();
  }

  audit(c, 'payment.confirm', 'payment_intent', id, { reference: result.reference });
  return ok({
    paymentIntent: {
      id,
      amount: Number(amount),
      currency,
      status: 'succeeded',
      reference: result.reference,
      clientSecret: `${id}_secret_confirmed`,
      created: Date.now(),
    },
    message: 'Payment confirmed.',
  });
});

/* GET /payments/history */
payments.get('/history', async (c) => {
  const user = c.get('user');
  if (!user) return errorResponse('Authentication required.', 401);
  const rows = await c.env.DB.prepare('SELECT * FROM payment_intents WHERE user_id = ? ORDER BY created_at DESC LIMIT 50')
    .bind(user.id)
    .all<any>();
  return ok({
    items: (rows.results ?? []).map((row: any) => ({
      id: row.id,
      amount: row.amount,
      currency: row.currency,
      status: row.status,
      description: row.description,
      createdAt: row.created_at,
    })),
  });
});

/* POST /payments/validate — Luhn + expiry + CVC, the same rules the gateway applies */
payments.post('/validate', async (c) => {
  const body = await readJson(c);
  const raw = String(body.cardNumber ?? body.number ?? '');
  const digits = raw.replace(/\D/g, '');
  const expiry = String(body.expiry ?? '');
  const cvc = String(body.cvc ?? body.cvv ?? '');
  const brand = detectBrand(digits);
  const expiryState = parseExpiry(expiry);
  const cvcExpected = brand === 'Amex' ? 4 : 3;

  const problems: string[] = [];
  if (!isValidCardNumber(digits)) problems.push('That card number does not look right.');
  if (!expiryState.valid) problems.push(expiry ? 'That expiry date has passed.' : 'Add the expiry date (MM/YY).');
  if (cvc.replace(/\D/g, '').length !== cvcExpected) problems.push(`The security code should be ${cvcExpected} digits.`);

  return ok({
    valid: problems.length === 0,
    brand,
    last4: digits.slice(-4),
    message: problems[0] ?? 'Card looks good.',
    problems,
  });
});

/* POST /payments/webhook — gateway callbacks (signature verified, idempotent) */
payments.post('/webhook', async (c) => {
  const raw = await c.req.text();
  const secret = c.env.PAYMENT_WEBHOOK_SECRET?.trim();

  // In dev without a secret we accept unsigned calls (so the flow is testable);
  // with a secret configured, unsigned or stale signatures are rejected.
  if (secret) {
    const signature = c.req.header('stripe-signature') ?? c.req.header('x-signature') ?? null;
    const valid = await verifyWebhookSignature(raw, signature, secret);
    if (!valid) return errorResponse('Invalid webhook signature.', 401, 'invalid_signature');
  }

  let event: any;
  try {
    event = JSON.parse(raw);
  } catch {
    return errorResponse('Send the event as JSON.', 400);
  }

  const eventId = String(event?.id ?? '');
  const type = String(event?.type ?? 'unknown');
  if (!eventId) return errorResponse('Webhook events need an id.', 400);

  const seen = await c.env.DB.prepare('SELECT id FROM payment_events WHERE id = ?').bind(eventId).first<{ id: string }>();
  if (seen) return ok({ received: true, duplicate: true, id: eventId });

  await c.env.DB.prepare(
    'INSERT OR IGNORE INTO payment_events (id, type, user_id, subscription_id, amount, payload) VALUES (?, ?, ?, ?, ?, ?)',
  )
    .bind(
      eventId,
      type,
      event?.data?.object?.metadata?.userId ?? null,
      event?.data?.object?.metadata?.subscriptionId ?? null,
      typeof event?.data?.object?.amount === 'number' ? toCents(event.data.object.amount) / 100 : null,
      raw.slice(0, 2000),
    )
    .run();

  const object = event?.data?.object ?? {};
  const userId = object?.metadata?.userId;
  const subscriptionId = object?.metadata?.subscriptionId;

  try {
    switch (type) {
      case 'payment_intent.succeeded':
      case 'invoice.paid': {
        if (userId) {
          const amount = typeof object.amount === 'number' ? object.amount : Number(object.amount_paid ?? 0) / 100;
          if (amount > 0) {
            await createInvoice(c.env, {
              userId,
              subscriptionId: subscriptionId ?? null,
              amount,
              currency: (object.currency ?? 'USD').toUpperCase(),
              description: object.description ?? 'Subscription payment',
            });
          }
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        if (subscriptionId) {
          const message = object?.last_payment_error?.message ?? 'Payment failed.';
          await c.env.DB.prepare(
            "UPDATE user_subscriptions SET status = 'past_due', failed_payment_count = failed_payment_count + 1, last_payment_error = ?, updated_at = ? WHERE id = ? AND status IN ('active','past_due')",
          )
            .bind(message, new Date().toISOString(), subscriptionId)
            .run();
        }
        break;
      }

      case 'customer.subscription.deleted': {
        if (subscriptionId) {
          await c.env.DB.prepare("UPDATE user_subscriptions SET status = 'cancelled', updated_at = ? WHERE id = ?")
            .bind(new Date().toISOString(), subscriptionId)
            .run();
        }
        break;
      }

      default:
        // Unknown types are still recorded for auditing, then acknowledged.
        break;
    }
  } catch (error) {
    console.error('[payments:webhook] handler failed', type, error);
    return errorResponse('Webhook handler failed.', 500, 'webhook_failed');
  }

  return ok({ received: true, id: eventId, type });
});

export default payments;
