/**
 * SOM CONNECT — /subscriptions
 *
 * Plans, the current membership, subscribe / upgrade / downgrade / cancel /
 * resume, renewal (manual + cron), and invoices.
 *
 * All money rules live in `lib/billing.ts` so this file only maps HTTP to the
 * billing engine and shapes responses.
 */
import { Hono } from 'hono';
import { parseJsonField, type Env } from '../lib/db';
import { audit, type AppEnv } from '../lib/middleware';
import { errorResponse, ok, readJson } from '../lib/http';
import { sendEmail, templates, appBaseUrl } from '../lib/email';
import { processDueRenewals, renewSubscription } from '../lib/billing';
import {
  changePlan,
  cancelSubscription,
  resumeSubscription,
  startSubscription,
  type PlanRowFull,
} from '../lib/billing';
import { hasPremiumAccess } from '../lib/payments';

const subs = new Hono<AppEnv>();

function mapPlan(row: any, currentPlanId?: string | null, pendingPlanId?: string | null) {
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
    isPending: pendingPlanId === row.id,
  };
}

function mapSubscription(row: any) {
  if (!row) return null;
  return {
    id: row.id,
    planId: row.plan_id,
    planName: row.plan_name,
    price: row.amount ?? row.price,
    currency: row.currency ?? row.currency_plan ?? 'USD',
    interval: row.interval,
    features: parseJsonField<string[]>(row.features, []),
    status: row.status,
    paymentMethodId: row.payment_method_id ?? null,
    currentPeriodStart: row.current_period_start,
    currentPeriodEnd: row.current_period_end,
    cancelAtPeriodEnd: !!row.cancel_at_period_end,
    pendingPlanId: row.pending_plan_id ?? null,
    failedPaymentCount: row.failed_payment_count ?? 0,
    lastPaymentError: row.last_payment_error ?? null,
    nextRetryAt: row.next_retry_at ?? null,
    autoRenew: row.status === 'active' && !row.cancel_at_period_end,
    createdAt: row.created_at,
  };
}

async function currentSubscription(env: Env, userId: string) {
  return env.DB.prepare(
    `SELECT us.*, sp.name AS plan_name, sp.price AS plan_price, sp.currency AS plan_currency, sp.interval, sp.features
     FROM user_subscriptions us
     JOIN subscription_plans sp ON us.plan_id = sp.id
     WHERE us.user_id = ?
     ORDER BY us.created_at DESC LIMIT 1`,
  )
    .bind(userId)
    .first<any>();
}

async function loadPlan(env: Env, planId: string | undefined, fallbackToFirst = false): Promise<PlanRowFull | null> {
  if (planId) {
    const row = await env.DB.prepare('SELECT * FROM subscription_plans WHERE id = ?').bind(planId).first<any>();
    if (row) return row as PlanRowFull;
    return null;
  }
  if (!fallbackToFirst) return null;
  const row = await env.DB.prepare('SELECT * FROM subscription_plans ORDER BY sort_order LIMIT 1').first<any>();
  return (row as PlanRowFull) ?? null;
}

/* GET /subscriptions/plans */
subs.get('/plans', async (c) => {
  const user = c.get('user');
  const existing = user ? await currentSubscription(c.env, user.id) : null;
  const rows = await c.env.DB.prepare('SELECT * FROM subscription_plans ORDER BY sort_order').all<any>();
  return ok({
    items: (rows.results ?? []).map((row: any) => mapPlan(row, existing?.plan_id, existing?.pending_plan_id)),
    currentPlanId: existing?.plan_id ?? null,
    pendingPlanId: existing?.pending_plan_id ?? null,
  });
});

/* GET /subscriptions/me */
subs.get('/me', async (c) => {
  const user = c.get('user');
  if (!user) return ok({ subscription: null, isPremium: false, status: 'guest' });
  const row = await currentSubscription(c.env, user.id);
  return ok({
    subscription: mapSubscription(row),
    isPremium: hasPremiumAccess(row?.status),
    status: row?.status ?? 'free',
  });
});

/* GET /subscriptions/status — light check used by the paywall + Player */
subs.get('/status', async (c) => {
  const user = c.get('user');
  if (!user) return ok({ isPremium: false, planId: null, status: 'guest' });
  const row = await currentSubscription(c.env, user.id);
  return ok({
    isPremium: hasPremiumAccess(row?.status),
    planId: row?.plan_id ?? null,
    status: row?.status ?? 'free',
    currentPeriodEnd: row?.current_period_end ?? null,
    cancelAtPeriodEnd: !!row?.cancel_at_period_end,
  });
});

/* POST /subscriptions { planId, paymentMethodId? } */
subs.post('/', async (c) => {
  const user = c.get('user');
  if (!user) return errorResponse('Authentication required.', 401);

  const body = await readJson(c);
  const planId = typeof body.planId === 'string' && body.planId ? body.planId : undefined;
  const plan = await loadPlan(c.env, planId, true);
  if (!plan) return errorResponse('No subscription plans are configured yet.', 503);

  const result = await startSubscription(c.env, user, plan, {
    paymentMethodId: typeof body.paymentMethodId === 'string' ? body.paymentMethodId : null,
  });

  if (!result.ok) {
    audit(c, 'subscription.create.failed', 'subscription', result.code ?? 'declined', { planId: plan.id });
    return errorResponse(result.message, result.status, result.code ?? 'payment_failed');
  }

  audit(c, 'subscription.create', 'subscription', result.subscriptionId!, { planId: plan.id });

  try {
    await c.env.QUEUE?.send({ type: 'subscription_created', userId: user.id, planId: plan.id });
  } catch {
    /* the notification is already written by the billing engine */
  }

  const row = await currentSubscription(c.env, user.id);
  return ok(
    {
      id: result.subscriptionId,
      subscription: mapSubscription(row),
      plan: mapPlan(plan),
      invoice: result.invoice,
      message: result.message,
    },
    201,
  );
});

/* PUT /subscriptions/me { planId, immediately? } — prorated plan change */
subs.put('/me', async (c) => {
  const user = c.get('user');
  if (!user) return errorResponse('Authentication required.', 401);
  const body = await readJson(c);
  const plan = await loadPlan(c.env, typeof body.planId === 'string' ? body.planId : undefined, true);
  if (!plan) return errorResponse('That plan is not available.', 404);

  const result = await changePlan(c.env, user, plan, {
    force: body.immediately === true,
    paymentMethodId: typeof body.paymentMethodId === 'string' ? body.paymentMethodId : undefined,
  });
  if (!result.ok) return errorResponse(result.message, result.status, result.code ?? 'change_failed');

  audit(c, 'subscription.change', 'subscription', plan.id, { mode: result.mode });
  const row = await currentSubscription(c.env, user.id);

  return ok({
    subscription: mapSubscription(row),
    plan: mapPlan(plan),
    mode: result.mode,
    proration: result.proration,
    invoice: result.invoice,
    message: result.message,
  });
});

/* POST /subscriptions/cancel { immediately? } */
subs.post('/cancel', async (c) => {
  const user = c.get('user');
  if (!user) return errorResponse('Authentication required.', 401);
  const body = await readJson(c);

  const result = await cancelSubscription(c.env, user.id, { immediately: body.immediately === true });
  if (!result.ok) return ok({ subscription: null, status: 'none', message: result.message });

  audit(c, 'subscription.cancel', 'subscription', user.id, { immediate: body.immediately === true });
  const row = await currentSubscription(c.env, user.id);
  return ok({ subscription: mapSubscription(row), status: result.status, periodEnd: result.periodEnd ?? null, message: result.message });
});

/* POST /subscriptions/resume */
subs.post('/resume', async (c) => {
  const user = c.get('user');
  if (!user) return errorResponse('Authentication required.', 401);

  const result = await resumeSubscription(c.env, user.id);
  if (!result.ok) return errorResponse(result.message, 404, 'nothing_to_resume');

  audit(c, 'subscription.resume', 'subscription', result.subscriptionId);
  const row = await currentSubscription(c.env, user.id);
  return ok({ subscription: mapSubscription(row), message: result.message });
});

/* POST /subscriptions/renew — run one renewal (admin, tests, "retry payment") */
subs.post('/renew', async (c) => {
  const user = c.get('user');
  if (!user) return errorResponse('Authentication required.', 401);
  const body = await readJson(c);

  const row = await currentSubscription(c.env, user.id);
  if (!row) return errorResponse('You do not have a subscription to renew.', 404);
  if (!['member', 'pastor', 'admin'].includes(user.role) && row.user_id !== user.id) {
    return errorResponse('You do not have access to that subscription.', 403);
  }

  const result = await renewSubscription(c.env, row.id, {
    source: typeof body.paymentMethodId === 'string' ? body.paymentMethodId : undefined,
  });

  audit(c, 'subscription.renew', 'subscription', row.id, { status: result.status });
  const updated = await currentSubscription(c.env, user.id);
  return ok({ subscription: mapSubscription(updated), result }, result.ok ? 200 : 402);
});

/* POST /subscriptions/process-due — the cron job, callable for ops/tests */
subs.post('/process-due', async (c) => {
  const user = c.get('user');
  if (user?.role !== 'admin') return errorResponse('Admin access required.', 403);
  const summary = await processDueRenewals(c.env);
  return ok({ summary, message: 'Renewal run complete.' });
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
      number: row.number ?? null,
      amount: row.amount,
      currency: row.currency,
      status: row.status,
      description: row.description,
      periodStart: row.period_start ?? null,
      periodEnd: row.period_end ?? null,
      paidAt: row.paid_at ?? null,
      issuedAt: row.issued_at,
      downloadUrl: `/subscriptions/invoices/${row.id}`,
    })),
  });
});

/* GET /subscriptions/invoices/:id — a printable receipt */
subs.get('/invoices/:id', async (c) => {
  const user = c.get('user');
  if (!user) return errorResponse('Authentication required.', 401);
  const row = await c.env.DB.prepare('SELECT * FROM invoices WHERE id = ? AND user_id = ?')
    .bind(c.req.param('id'), user.id)
    .first<any>();
  if (!row) return errorResponse('Invoice not found.', 404);

  return ok({
    invoice: {
      id: row.id,
      number: row.number,
      amount: row.amount,
      currency: row.currency,
      status: row.status,
      description: row.description,
      issuedAt: row.issued_at,
      paidAt: row.paid_at,
      billedTo: { name: user.name, email: user.email },
      seller: { name: 'SOM CONNECT', support: 'support@somconnect.org' },
    },
  });
});

export default subs;
