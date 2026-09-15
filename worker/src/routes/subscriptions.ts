import { Hono } from 'hono';
import { Env, jsonResponse, errorResponse } from '../lib/db';
import { requireAuth } from './auth';
import { generateId } from '../lib/auth';
import { validate, subscriptionPlanSchema } from '../lib/validators';
import { cacheGet, cacheSet, CacheKeys } from '../lib/cache';
import { auditLog, getClientInfo } from '../lib/audit';

const subs = new Hono<{ Bindings: Env; Variables: { user?: any } }>();

// GET /subscriptions/plans
subs.get('/plans', async (c) => {
  const cached = await cacheGet<any>(c.env, CacheKeys.plans);
  if (cached) return jsonResponse({ items: cached, cached: true });

  const result = await c.env.DB.prepare('SELECT * FROM subscription_plans WHERE is_active = 1 ORDER BY price ASC').all();
  const items = (result.results || []).map((p: any) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    price: p.price,
    currency: p.currency,
    interval: p.interval,
    intervalCount: p.interval_count,
    features: JSON.parse(p.features),
    isPopular: !!p.is_popular,
    trialDays: p.trial_days,
  }));

  await cacheSet(c.env, CacheKeys.plans, items, 3600);
  return jsonResponse({ items });
});

// GET /subscriptions/me
subs.get('/me', async (c) => {
  const authErr = requireAuth(c);
  if (authErr) return authErr;
  const user = c.get('user') as any;

  const sub = await c.env.DB.prepare(`
    SELECT us.*, sp.name as plan_name, sp.description as plan_description, sp.price, sp.currency, sp.interval, sp.features, sp.trial_days
    FROM user_subscriptions us
    JOIN subscription_plans sp ON us.plan_id = sp.id
    WHERE us.user_id = ? AND us.status IN ('active','trialing')
    ORDER BY us.created_at DESC
    LIMIT 1
  `).bind(user.id).first() as any;

  if (!sub) return jsonResponse({ subscription: null });

  const invoices = await c.env.DB.prepare('SELECT * FROM invoices WHERE user_id = ? ORDER BY created_at DESC LIMIT 5').bind(user.id).all();

  return jsonResponse({
    subscription: {
      id: sub.id,
      planId: sub.plan_id,
      planName: sub.plan_name,
      planDescription: sub.plan_description,
      price: sub.price,
      currency: sub.currency,
      interval: sub.interval,
      features: JSON.parse(sub.features),
      status: sub.status,
      currentPeriodStart: sub.current_period_start,
      currentPeriodEnd: sub.current_period_end,
      trialEnd: sub.trial_end,
      cancelAtPeriodEnd: !!sub.cancel_at_period_end,
      paymentProvider: sub.payment_provider,
    },
    invoices: invoices.results || [],
  });
});

// GET /subscriptions/history
subs.get('/history', async (c) => {
  const authErr = requireAuth(c);
  if (authErr) return authErr;
  const user = c.get('user') as any;

  const result = await c.env.DB.prepare(`
    SELECT us.*, sp.name as plan_name, sp.price
    FROM user_subscriptions us
    JOIN subscription_plans sp ON us.plan_id = sp.id
    WHERE us.user_id = ?
    ORDER BY us.created_at DESC
  `).bind(user.id).all();

  return jsonResponse({ items: result.results || [] });
});

// GET /subscriptions/invoices
subs.get('/invoices', async (c) => {
  const authErr = requireAuth(c);
  if (authErr) return authErr;
  const user = c.get('user') as any;

  const result = await c.env.DB.prepare('SELECT * FROM invoices WHERE user_id = ? ORDER BY created_at DESC').bind(user.id).all();
  return jsonResponse({ items: result.results || [] });
});

// POST /subscriptions — happy path always succeeds
subs.post('/', async (c) => {
  const authErr = requireAuth(c);
  if (authErr) return authErr;
  const user = c.get('user') as any;
  const body = await c.req.json() as any;
  const { planId, paymentMethodId } = body;
  if (!planId) return errorResponse('planId required');

  const plan = await c.env.DB.prepare('SELECT * FROM subscription_plans WHERE id = ? AND is_active = 1').bind(planId).first() as any;
  if (!plan) return errorResponse('Plan not found', 404);

  const id = generateId('sub_');
  const now = new Date();
  const periodEnd = new Date(now);
  if (plan.interval === 'monthly') periodEnd.setMonth(periodEnd.getMonth() + 1);
  else if (plan.interval === 'annually') periodEnd.setFullYear(periodEnd.getFullYear() + 1);
  else periodEnd.setFullYear(periodEnd.getFullYear() + 100); // lifetime

  const trialEnd = plan.trial_days > 0 ? new Date(now.getTime() + plan.trial_days * 86400000).toISOString() : null;
  const status = plan.trial_days > 0 ? 'trialing' : 'active';

  // Cancel existing active
  await c.env.DB.prepare('UPDATE user_subscriptions SET status = ?, cancel_at_period_end = 1, updated_at = ? WHERE user_id = ? AND status IN (?, ?)').bind('cancelled', now.toISOString(), user.id, 'active', 'trialing').run();

  await c.env.DB.prepare(`
    INSERT INTO user_subscriptions (id, user_id, plan_id, status, current_period_start, current_period_end, trial_end, payment_provider)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(id, user.id, planId, status, now.toISOString(), periodEnd.toISOString(), trialEnd, 'manual').run();

  // Create invoice
  const invoiceId = generateId('inv_');
  await c.env.DB.prepare('INSERT INTO invoices (id, user_id, subscription_id, amount, currency, status) VALUES (?, ?, ?, ?, ?, ?)').bind(invoiceId, user.id, id, plan.price, plan.currency || 'USD', 'paid').run();

  const { ip, ua } = getClientInfo(c);
  await auditLog(c.env.DB, user.id, 'subscription.create', 'subscription', id, { planId }, ip, ua);

  try {
    await c.env.QUEUE.send({ type: 'subscription_created', userId: user.id, planId, subscriptionId: id });
  } catch {}

  return jsonResponse({ id, invoiceId, message: 'Subscription activated', planId, status, trialEnd, currentPeriodEnd: periodEnd.toISOString() }, 201);
});

// POST /subscriptions/cancel
subs.post('/cancel', async (c) => {
  const authErr = requireAuth(c);
  if (authErr) return authErr;
  const user = c.get('user') as any;
  const body = await c.req.json() as any;
  const immediate = body.immediate === true;

  if (immediate) {
    await c.env.DB.prepare('UPDATE user_subscriptions SET status = ?, updated_at = ? WHERE user_id = ? AND status IN (?, ?)').bind('cancelled', new Date().toISOString(), user.id, 'active', 'trialing').run();
  } else {
    await c.env.DB.prepare('UPDATE user_subscriptions SET cancel_at_period_end = 1, updated_at = ? WHERE user_id = ? AND status IN (?, ?)').bind(new Date().toISOString(), user.id, 'active', 'trialing').run();
  }

  const { ip, ua } = getClientInfo(c);
  await auditLog(c.env.DB, user.id, 'subscription.cancel', 'subscription', undefined, { immediate }, ip, ua);

  return jsonResponse({ message: immediate ? 'Subscription cancelled immediately' : 'Subscription will cancel at period end', immediate });
});

// POST /subscriptions/reactivate
subs.post('/reactivate', async (c) => {
  const authErr = requireAuth(c);
  if (authErr) return authErr;
  const user = c.get('user') as any;

  await c.env.DB.prepare('UPDATE user_subscriptions SET cancel_at_period_end = 0, status = ?, updated_at = ? WHERE user_id = ? AND status = ?').bind('active', new Date().toISOString(), user.id, 'cancelled').run();

  return jsonResponse({ message: 'Subscription reactivated' });
});

// Admin: POST /subscriptions/plans — create plan
subs.post('/plans', async (c) => {
  const authErr = requireAuth(c);
  if (authErr) return authErr;
  const user = c.get('user') as any;
  if (user.role !== 'admin') return errorResponse('Forbidden', 403);

  const body = await c.req.json();
  const v = validate(subscriptionPlanSchema, body);
  if (!v.success) return errorResponse(v.error, 400);

  const id = generateId('plan_');
  await c.env.DB.prepare(
    'INSERT INTO subscription_plans (id, name, description, price, currency, interval, features, is_popular, trial_days) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(id, v.data.name, v.data.description || null, v.data.price, v.data.currency, v.data.interval, JSON.stringify(v.data.features), v.data.isPopular ? 1 : 0, v.data.trialDays || 0).run();

  await c.env.CACHE.delete(CacheKeys.plans);

  return jsonResponse({ id, message: 'Plan created' }, 201);
});

// Admin: PUT /subscriptions/plans/:id
subs.put('/plans/:id', async (c) => {
  const authErr = requireAuth(c);
  if (authErr) return authErr;
  const user = c.get('user') as any;
  if (user.role !== 'admin') return errorResponse('Forbidden', 403);

  const id = c.req.param('id');
  const body = await c.req.json();
  const v = validate(subscriptionPlanSchema.partial(), body);
  if (!v.success) return errorResponse(v.error, 400);

  const updates = v.data as any;
  const setClauses: string[] = [];
  const values: any[] = [];

  for (const [k, val] of Object.entries(updates)) {
    if (k === 'features') {
      setClauses.push('features = ?');
      values.push(JSON.stringify(val));
    } else if (k === 'isPopular') {
      setClauses.push('is_popular = ?');
      values.push(val ? 1 : 0);
    } else if (k === 'trialDays') {
      setClauses.push('trial_days = ?');
      values.push(val);
    } else {
      setClauses.push(`${k} = ?`);
      values.push(val);
    }
  }

  if (setClauses.length === 0) return errorResponse('No fields', 400);

  values.push(id);
  await c.env.DB.prepare(`UPDATE subscription_plans SET ${setClauses.join(', ')} WHERE id = ?`).bind(...values).run();
  await c.env.CACHE.delete(CacheKeys.plans);

  return jsonResponse({ message: 'Plan updated', id });
});

export default subs;
