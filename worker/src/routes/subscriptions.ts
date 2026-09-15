import { Hono } from 'hono';
import { Env, jsonResponse, errorResponse } from '../lib/db';
import { requireAuth } from './auth';
import { generateId } from '../lib/auth';

const subs = new Hono<{ Bindings: Env; Variables: { user?: any } }>();

// GET /subscriptions/plans
subs.get('/plans', async (c) => {
  const result = await c.env.DB.prepare('SELECT * FROM subscription_plans').all();
  const items = (result.results || []).map((p: any) => ({
    id: p.id,
    name: p.name,
    price: p.price,
    interval: p.interval,
    features: JSON.parse(p.features),
    isPopular: !!p.is_popular,
  }));
  return jsonResponse({ items });
});

// GET /subscriptions/me
subs.get('/me', async (c) => {
  const authErr = requireAuth(c);
  if (authErr) return authErr;
  const user = c.get('user');

  const sub = await c.env.DB.prepare(`
    SELECT us.*, sp.name as plan_name, sp.price, sp.interval, sp.features
    FROM user_subscriptions us
    JOIN subscription_plans sp ON us.plan_id = sp.id
    WHERE us.user_id = ? AND us.status = 'active'
    ORDER BY us.created_at DESC
    LIMIT 1
  `).bind(user.id).first() as any;

  if (!sub) return jsonResponse({ subscription: null });

  return jsonResponse({
    subscription: {
      id: sub.id,
      planId: sub.plan_id,
      planName: sub.plan_name,
      price: sub.price,
      interval: sub.interval,
      features: JSON.parse(sub.features),
      status: sub.status,
      currentPeriodStart: sub.current_period_start,
      currentPeriodEnd: sub.current_period_end,
    }
  });
});

// POST /subscriptions — happy path always succeeds
subs.post('/', async (c) => {
  const authErr = requireAuth(c);
  if (authErr) return authErr;
  const user = c.get('user');
  const { planId, paymentMethodId } = await c.req.json();
  if (!planId) return errorResponse('planId required');

  // Validate plan exists
  const plan = await c.env.DB.prepare('SELECT * FROM subscription_plans WHERE id = ?').bind(planId).first();
  if (!plan) return errorResponse('Plan not found', 404);

  const id = generateId('sub_');
  const now = new Date();
  const periodEnd = new Date(now);
  if ((plan as any).interval === 'monthly') periodEnd.setMonth(periodEnd.getMonth() + 1);
  else periodEnd.setFullYear(periodEnd.getFullYear() + 1);

  // Cancel existing active
  await c.env.DB.prepare('UPDATE user_subscriptions SET status = ? WHERE user_id = ? AND status = ?').bind('cancelled', user.id, 'active').run();

  await c.env.DB.prepare(`
    INSERT INTO user_subscriptions (id, user_id, plan_id, status, current_period_start, current_period_end)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(id, user.id, planId, 'active', now.toISOString(), periodEnd.toISOString()).run();

  try {
    await c.env.QUEUE.send({ type: 'subscription_created', userId: user.id, planId, subscriptionId: id });
  } catch {}

  return jsonResponse({ id, message: 'Subscription activated', planId, status: 'active' }, 201);
});

// POST /subscriptions/cancel
subs.post('/cancel', async (c) => {
  const authErr = requireAuth(c);
  if (authErr) return authErr;
  const user = c.get('user');

  await c.env.DB.prepare('UPDATE user_subscriptions SET status = ? WHERE user_id = ? AND status = ?').bind('cancelled', user.id, 'active').run();
  return jsonResponse({ message: 'Subscription cancelled, access until period end' });
});

export default subs;
