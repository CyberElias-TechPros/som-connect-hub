/**
 * SOM CONNECT — /subscriptions
 * Plans, current membership, subscribe / change / cancel, invoices.
 * No real payment processor is wired in the demo: creating a subscription
 * always succeeds and issues a paid invoice ("happy path"), while the shape of
 * the API matches a Stripe-backed implementation.
 */
import { Hono, type Context } from 'hono';
import { parseJsonField, type Env } from '../lib/db';
import { audit, type AppEnv } from '../lib/middleware';
import { errorResponse, ok, readJson } from '../lib/http';
import { generateId } from '../lib/auth';

const subs = new Hono<AppEnv>();

function mapPlan(row: any, currentPlanId?: string | null) {
  return {
    id: row.id,
    name: row.name,
    price: row.price,
    currency: row.currency ?? 'USD',
    interval: row.interval,
    features: parseJsonField<string[]>(row.features, []),
    trialDays: row.trial_days ?? 0,
    isPopular: !!row.is_popular,
    isCurrent: currentPlanId === row.id,
  };
}

function mapSubscription(row: any) {
  if (!row) return null;
  return {
    id: row.id,
    planId: row.plan_id,
    planName: row.plan_name,
    price: row.price,
    currency: row.currency ?? 'USD',
    interval: row.interval,
    features: parseJsonField<string[]>(row.features, []),
    status: row.status,
    paymentMethodId: row.payment_method_id ?? null,
    currentPeriodStart: row.current_period_start,
    currentPeriodEnd: row.current_period_end,
    cancelAtPeriodEnd: !!row.cancel_at_period_end,
    autoRenew: row.status === 'active' && !row.cancel_at_period_end,
    createdAt: row.created_at,
  };
}

async function activeSubscription(env: Env, userId: string) {
  return env.DB.prepare(
    `SELECT us.*, sp.name AS plan_name, sp.price, sp.currency, sp.interval, sp.features
     FROM user_subscriptions us
     JOIN subscription_plans sp ON us.plan_id = sp.id
     WHERE us.user_id = ? AND us.status IN ('active','trialing')
     ORDER BY us.created_at DESC LIMIT 1`,
  )
    .bind(userId)
    .first<any>();
}

/* GET /subscriptions/plans */
subs.get('/plans', async (c) => {
  const user = c.get('user');
  const [rows, current] = await Promise.all([
    c.env.DB.prepare('SELECT * FROM subscription_plans ORDER BY sort_order ASC, price ASC').all<any>(),
    user ? activeSubscription(c.env, user.id) : Promise.resolve(null),
  ]);

  const items = (rows.results ?? []).map((row) => mapPlan(row, current?.plan_id));
  return ok({ items, plans: items, currentPlanId: current?.plan_id ?? null });
});

/* GET /subscriptions/me */
subs.get('/me', async (c) => {
  const user = c.get('user');
  if (!user) return errorResponse('Authentication required.', 401);

  const [row, invoices] = await Promise.all([
    activeSubscription(c.env, user.id),
    c.env.DB.prepare('SELECT * FROM invoices WHERE user_id = ? ORDER BY issued_at DESC LIMIT 12').bind(user.id).all<any>(),
  ]);

  return ok({
    subscription: mapSubscription(row),
    isPremium: !!row,
    planId: row?.plan_id ?? null,
    invoices: (invoices.results ?? []).map((invoice: any) => ({
      id: invoice.id,
      amount: invoice.amount,
      currency: invoice.currency,
      status: invoice.status,
      description: invoice.description,
      issuedAt: invoice.issued_at,
    })),
  });
});

/* GET /subscriptions/status — lightweight gate used across the UI */
subs.get('/status', async (c) => {
  const user = c.get('user');
  if (!user) return ok({ isPremium: false, planId: null, status: 'guest' });
  const row = await activeSubscription(c.env, user.id);
  return ok({ isPremium: !!row, planId: row?.plan_id ?? null, status: row?.status ?? 'free', currentPeriodEnd: row?.current_period_end ?? null });
});

/* POST /subscriptions { planId, paymentMethodId?, billing? } — always succeeds */
subs.post('/', async (c) => {
  const user = c.get('user');
  if (!user) return errorResponse('Authentication required.', 401);

  const body = await readJson(c);
  const planId = typeof body.planId === 'string' && body.planId ? body.planId : 'premium-monthly';

  const plan = await c.env.DB.prepare('SELECT * FROM subscription_plans WHERE id = ?').bind(planId).first<any>();
  if (!plan) {
    const fallback = await c.env.DB.prepare('SELECT * FROM subscription_plans ORDER BY sort_order LIMIT 1').first<any>();
    if (!fallback) return errorResponse('No subscription plans are configured yet.', 503);
    return createSubscription(c, user, fallback, body);
  }

  return createSubscription(c, user, plan, body);
});

async function createSubscription(c: Context<AppEnv>, user: any, plan: any, body: any) {
  const now = new Date();
  const periodEnd = new Date(now);
  if (plan.interval === 'annually') periodEnd.setFullYear(periodEnd.getFullYear() + 1);
  else periodEnd.setMonth(periodEnd.getMonth() + 1);

  // Retire any existing active subscriptions so there is always exactly one.
  await c.env.DB.prepare(
    "UPDATE user_subscriptions SET status = 'cancelled', cancelled_at = ?, updated_at = ? WHERE user_id = ? AND status IN ('active','trialing')",
  )
    .bind(now.toISOString(), now.toISOString(), user.id)
    .run();

  const id = generateId('sub_');
  await c.env.DB.prepare(
    `INSERT INTO user_subscriptions (id, user_id, plan_id, status, payment_method_id, current_period_start, current_period_end)
     VALUES (?, ?, ?, 'active', ?, ?, ?)`,
  )
    .bind(
      id,
      user.id,
      plan.id,
      typeof body.paymentMethodId === 'string' ? body.paymentMethodId : null,
      now.toISOString(),
      periodEnd.toISOString(),
    )
    .run();

  // Issue a paid invoice (demo settlement) and receipt notification.
  await c.env.DB.prepare(
    'INSERT INTO invoices (id, user_id, subscription_id, amount, currency, status, description) VALUES (?, ?, ?, ?, ?, ?, ?)',
  )
    .bind(
      generateId('inv_'),
      user.id,
      id,
      plan.price,
      plan.currency ?? 'USD',
      'paid',
      `${plan.name} (${plan.interval})`,
    )
    .run();

  if (typeof body.paymentMethodId === 'string' && body.paymentMethodId) {
    await c.env.DB.prepare('UPDATE payment_methods SET is_default = 0 WHERE user_id = ?').bind(user.id).run();
    await c.env.DB.prepare('UPDATE payment_methods SET is_default = 1 WHERE id = ? AND user_id = ?')
      .bind(body.paymentMethodId, user.id)
      .run();
  }

  audit(c, 'subscription.create', 'subscription', id, { planId: plan.id });

  try {
    await c.env.QUEUE?.send({ type: 'subscription_created', userId: user.id, planId: plan.id });
  } catch {
    await c.env.DB.prepare(
      'INSERT INTO notifications (id, user_id, type, title, message, action_url) VALUES (?, ?, ?, ?, ?, ?)',
    )
      .bind(
        generateId('notif_'),
        user.id,
        'system',
        'Premium activated',
        `Your ${plan.name} plan is active. Enjoy everything SOM CONNECT has to offer.`,
        '/manage-subscription',
      )
      .run()
      .catch(() => undefined);
  }

  const row = await activeSubscription(c.env, user.id);
  return ok(
    {
      id,
      subscription: mapSubscription(row),
      plan: mapPlan(plan),
      message: `Welcome to ${plan.name}! Your subscription is active.`,
    },
    201,
  );
}

/* PUT /subscriptions/me { planId } — upgrade/downgrade keeps a happy path */
subs.put('/me', async (c) => {
  const user = c.get('user');
  if (!user) return errorResponse('Authentication required.', 401);
  const body = await readJson(c);
  const planId = typeof body.planId === 'string' && body.planId ? body.planId : 'premium-monthly';
  const plan = await c.env.DB.prepare('SELECT * FROM subscription_plans WHERE id = ?').bind(planId).first<any>();
  if (!plan) return errorResponse('That plan is not available.', 404);
  return createSubscription(c, user, plan, body);
});

/* POST /subscriptions/cancel { immediately? } */
subs.post('/cancel', async (c) => {
  const user = c.get('user');
  if (!user) return errorResponse('Authentication required.', 401);
  const body = await readJson(c);

  const row = await activeSubscription(c.env, user.id);
  if (!row) {
    return ok({ subscription: null, status: 'cancelled', message: 'You do not have an active subscription.' });
  }

  const immediate = body.immediately === true;
  if (immediate) {
    await c.env.DB.prepare("UPDATE user_subscriptions SET status = 'cancelled', cancelled_at = ?, updated_at = ? WHERE id = ?")
      .bind(new Date().toISOString(), new Date().toISOString(), row.id)
      .run();
  } else {
    await c.env.DB.prepare('UPDATE user_subscriptions SET cancel_at_period_end = 1, cancelled_at = ?, updated_at = ? WHERE id = ?')
      .bind(new Date().toISOString(), new Date().toISOString(), row.id)
      .run();
  }

  audit(c, 'subscription.cancel', 'subscription', row.id, { immediate });
  const updated = await activeSubscription(c.env, user.id);
  return ok({
    subscription: mapSubscription(updated),
    status: immediate ? 'cancelled' : 'active',
    message: immediate
      ? 'Your subscription has been cancelled.'
      : `Your plan stays active until ${new Date(row.current_period_end).toLocaleDateString()}.`,
  });
});

/* POST /subscriptions/resume */
subs.post('/resume', async (c) => {
  const user = c.get('user');
  if (!user) return errorResponse('Authentication required.', 401);

  const row = await c.env.DB.prepare(
    "SELECT * FROM user_subscriptions WHERE user_id = ? AND status = 'active' AND cancel_at_period_end = 1 ORDER BY created_at DESC LIMIT 1",
  )
    .bind(user.id)
    .first<any>();

  if (!row) return errorResponse('There is no cancelled subscription to resume.', 404);

  await c.env.DB.prepare('UPDATE user_subscriptions SET cancel_at_period_end = 0, cancelled_at = NULL, updated_at = ? WHERE id = ?')
    .bind(new Date().toISOString(), row.id)
    .run();

  const updated = await activeSubscription(c.env, user.id);
  return ok({ subscription: mapSubscription(updated), message: 'Your subscription will renew as normal.' });
});

/* GET /subscriptions/invoices */
subs.get('/invoices', async (c) => {
  const user = c.get('user');
  if (!user) return errorResponse('Authentication required.', 401);
  const rows = await c.env.DB.prepare('SELECT * FROM invoices WHERE user_id = ? ORDER BY issued_at DESC LIMIT 50')
    .bind(user.id)
    .all<any>();
  return ok({
    items: (rows.results ?? []).map((row: any) => ({
      id: row.id,
      amount: row.amount,
      currency: row.currency,
      status: row.status,
      description: row.description,
      issuedAt: row.issued_at,
    })),
  });
});

export default subs;
