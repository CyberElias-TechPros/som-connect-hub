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
  };
}

function detectBrand(cardNumber: string): string {
  const digits = cardNumber.replace(/\D/g, '');
  if (/^4/.test(digits)) return 'Visa';
  if (/^5[1-5]/.test(digits)) return 'Mastercard';
  if (/^3[47]/.test(digits)) return 'American Express';
  if (/^6/.test(digits)) return 'Discover';
  return 'Card';
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

  const cardNumber = typeof body.cardNumber === 'string' ? body.cardNumber : '';
  const type = ['card', 'paypal', 'bank'].includes(body.type) ? body.type : 'card';
  const brand = typeof body.brand === 'string' && body.brand ? body.brand : detectBrand(cardNumber || '4242');
  const last4 =
    typeof body.last4 === 'string' && body.last4.length === 4
      ? body.last4
      : cardNumber.replace(/\D/g, '').slice(-4) || '4242';
  const expiry = typeof body.expiry === 'string' && body.expiry ? body.expiry : '12/28';

  const id = generateId('pm_');
  if (body.isDefault) {
    await c.env.DB.prepare('UPDATE payment_methods SET is_default = 0 WHERE user_id = ?').bind(user.id).run();
  }
  await c.env.DB.prepare(
    'INSERT INTO payment_methods (id, user_id, type, brand, last4, expiry, holder, is_default) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
  )
    .bind(id, user.id, type, brand, last4, expiry, body.holder ?? user.name, body.isDefault ? 1 : 0)
    .run();

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
  await c.env.DB.prepare('UPDATE payment_methods SET is_default = 0 WHERE user_id = ?').bind(user.id).run();
  await c.env.DB.prepare('UPDATE payment_methods SET is_default = 1 WHERE id = ? AND user_id = ?').bind(id, user.id).run();
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

/* POST /payments/confirm { paymentIntentId } — demo settlement always succeeds */
payments.post('/confirm', async (c) => {
  const user = c.get('user');
  if (!user) return errorResponse('Authentication required.', 401);
  const body = await readJson(c);
  const id = typeof body.paymentIntentId === 'string' ? body.paymentIntentId : generateId('pi_');

  const existing = await c.env.DB.prepare('SELECT * FROM payment_intents WHERE id = ? AND user_id = ?')
    .bind(id, user.id)
    .first<any>();

  if (!existing) {
    await c.env.DB.prepare(
      `INSERT INTO payment_intents (id, user_id, amount, currency, status, client_secret, description)
       VALUES (?, ?, 9.99, 'USD', 'succeeded', ?, 'Demo payment')`,
    )
      .bind(id, user.id, `${id}_secret_confirmed`)
      .run();
  } else {
    await c.env.DB.prepare("UPDATE payment_intents SET status = 'succeeded', updated_at = ? WHERE id = ?")
      .bind(new Date().toISOString(), id)
      .run();
  }

  audit(c, 'payment.confirm', 'payment_intent', id);
  return ok({
    paymentIntent: {
      id,
      amount: existing?.amount ?? 9.99,
      currency: existing?.currency ?? 'USD',
      status: 'succeeded',
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

/* POST /payments/validate — lightweight client-side card sanity check */
payments.post('/validate', async (c) => {
  const body = await readJson(c);
  const digits = String(body.cardNumber ?? '').replace(/\D/g, '');
  const expiry = String(body.expiry ?? '');
  const cvc = String(body.cvc ?? '');
  const valid = digits.length >= 13 && /^\d{2}\/?\d{2}$/.test(expiry) && cvc.length >= 3;
  return ok({ valid, message: valid ? 'Card looks good.' : 'Please check the card details.' });
});

export default payments;
