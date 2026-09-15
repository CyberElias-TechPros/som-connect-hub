/**
 * SOM CONNECT — Cloudflare Workers API entrypoint
 *
 * Bindings: D1 (DB), R2 (STORAGE), KV (CACHE), Queues (QUEUE),
 * Durable Objects (QA_SESSION), Cron triggers and optional static assets.
 *
 * The whole API is mounted twice: at the root (`/content`) and under `/api`
 * (`/api/content`). The frontend talks to `/api/...` through the Vite dev
 * proxy or the Cloudflare Pages route, while health checks and legacy clients
 * can keep using the root paths.
 */
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import { Env, ensureDatabase } from './lib/db';
import { corsConfig, errorResponse, jsonResponse, ok, securityHeaders } from './lib/http';
import { resolveAuth, type AppEnv } from './lib/middleware';
import { createNotification } from './lib/daily';
import { QASessionDurableObject } from './durable/qa';

import authRoutes from './routes/auth';
import contentRoutes from './routes/content';
import favoritesRoutes from './routes/favorites';
import playlistsRoutes from './routes/playlists';
import communityRoutes from './routes/community';
import qaRoutes from './routes/qa';
import toolsRoutes from './routes/tools';
import subscriptionsRoutes from './routes/subscriptions';
import paymentsRoutes from './routes/payments';
import notificationsRoutes from './routes/notifications';
import adminRoutes from './routes/admin';
import uploadsRoutes from './routes/uploads';
import metaRoutes from './routes/meta';

/* ------------------------------------------------------------------ *
 * API application
 * ------------------------------------------------------------------ */
export const api = new Hono<AppEnv>();

api.use('*', logger());
api.use('*', securityHeaders());
api.use('*', prettyJSON());
api.use('*', (c, next) => cors(corsConfig(c.env))(c, next));

// Request id + token resolution + database self-healing.
api.use('*', resolveAuth);

// Root + health
api.get('/', (c) =>
  ok({
    name: c.env.APP_NAME ?? 'SOM CONNECT API',
    version: c.env.APP_VERSION ?? '1.0.0',
    status: 'operational',
    environment: c.env.ENV ?? 'development',
    timestamp: new Date().toISOString(),
    docs: '/api/meta',
    endpoints: {
      auth: ['/auth/register', '/auth/login', '/auth/forgot', '/auth/reset', '/auth/me', '/auth/profile'],
      content: ['/content', '/content/featured', '/content/:id', '/content/:id/progress', '/content/user/continue'],
      library: ['/favorites', '/playlists', '/notifications'],
      community: ['/community/posts', '/community/groups', '/qa', '/qa/:id/questions'],
      daily: ['/tools/bundle', '/tools/confessions', '/tools/ror', '/tools/complete', '/tools/streak'],
      commerce: ['/subscriptions/plans', '/subscriptions/me', '/payments/methods', '/payments/billing'],
      admin: ['/admin/stats', '/admin/users', '/admin/uploads', '/admin/moderation/posts'],
      media: ['/uploads', '/uploads/file/:key'],
    },
  }),
);

// Meta routes (health, meta, speakers, search, stats) sit at the API root.
api.route('/', metaRoutes);

// Feature routes
api.route('/auth', authRoutes);
api.route('/content', contentRoutes);
api.route('/favorites', favoritesRoutes);
api.route('/playlists', playlistsRoutes);
api.route('/community', communityRoutes);
api.route('/qa', qaRoutes);
api.route('/tools', toolsRoutes);
api.route('/subscriptions', subscriptionsRoutes);
api.route('/payments', paymentsRoutes);
api.route('/notifications', notificationsRoutes);
api.route('/uploads', uploadsRoutes);
api.route('/admin', adminRoutes);

/* ------------------------------------------------------------------ *
 * Root application — serves /api/* plus the unprefixed routes
 * ------------------------------------------------------------------ */
const app = new Hono<AppEnv>();

app.route('/api', api);
app.route('/', api);

app.notFound((c) => {
  if (c.req.path.startsWith('/api')) {
    return errorResponse(`No API route matches ${c.req.path}.`, 404, 'route_not_found');
  }
  // Anything outside /api is handled by static assets when configured.
  return errorResponse('Not found.', 404);
});

app.onError((error, c) => {
  console.error('[api:error]', error?.stack ?? error);
  const message =
    c.env.ENV === 'production' ? 'Something went wrong on our side. Please try again.' : error?.message ?? 'Internal server error';
  return errorResponse(message, 500, 'internal_error');
});

/* ------------------------------------------------------------------ *
 * Queue consumer — background jobs
 * ------------------------------------------------------------------ */
async function handleQueue(batch: MessageBatch<any>, env: Env): Promise<void> {
  for (const message of batch.messages) {
    const payload = message.body ?? {};
    try {
      switch (payload.type) {
        case 'welcome': {
          await createNotification(
            env,
            payload.userId,
            'system',
            'Welcome to SOM CONNECT!',
            'Your journey begins now. Explore teachings, daily tools and community.',
            '/',
          );
          break;
        }

        case 'new_content': {
          const users = await env.DB.prepare('SELECT id FROM users WHERE is_active = 1 LIMIT 200').all<any>();
          for (const user of users.results ?? []) {
            await createNotification(
              env,
              (user as any).id,
              'content',
              'New teaching available',
              `"${payload.title ?? 'New content'}" has just been published.`,
              payload.contentId ? `/library/${payload.contentId}` : '/library',
            ).catch(() => undefined);
          }
          break;
        }

        case 'new_post':
        case 'new_question': {
          // Fan-out is handled inline by the routes; nothing else to do.
          break;
        }

        case 'subscription_created': {
          await createNotification(
            env,
            payload.userId,
            'system',
            'Premium activated',
            'Your subscription is active. Enjoy HD streaming, offline downloads and exclusive content.',
            '/manage-subscription',
          );
          break;
        }

        case 'password_reset': {
          // Wire an email provider (Resend/SendGrid) here for production.
          console.log(`[queue] password reset requested for ${payload.email}`);
          break;
        }

        default:
          console.log('[queue] unhandled job', payload);
      }
      message.ack();
    } catch (error) {
      console.error('[queue] job failed', payload?.type, error);
      message.retry();
    }
  }
}

/* ------------------------------------------------------------------ *
 * Cron — daily housekeeping
 * ------------------------------------------------------------------ */
async function handleScheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
  ctx.waitUntil(
    (async () => {
      const today = new Date().toISOString().slice(0, 10);
      console.log(`[cron] ${event.cron} (${today})`);

      // 1. Make sure today's devotionals exist (deterministic per date).
      const { ensureConfessionForDate, ensureRorForDate } = await import('./lib/daily');
      await ensureConfessionForDate(env, today).catch((error) => console.error('[cron] confession', error));
      await ensureRorForDate(env, today).catch((error) => console.error('[cron] ror', error));

      // 2. Expire lapsed subscriptions.
      await env.DB.prepare(
        `UPDATE user_subscriptions SET status = 'expired', updated_at = ?
         WHERE status = 'active' AND cancel_at_period_end = 1 AND current_period_end < ?`,
      )
        .bind(new Date().toISOString(), new Date().toISOString())
        .run()
        .catch((error) => console.error('[cron] expire subscriptions', error));

      // 3. Daily reminder notifications for members who enabled them.
      try {
        const users = await env.DB.prepare(
          `SELECT id, name FROM users WHERE is_active = 1 AND (preferences IS NULL OR preferences NOT LIKE '%"dailyReminders":false%') LIMIT 500`,
        ).all<any>();
        for (const user of users.results ?? []) {
          await createNotification(
            env,
            (user as any).id,
            'system',
            "Today's devotional is ready",
            'Your daily confession and Rhapsody reading are waiting for you.',
            '/tools',
          ).catch(() => undefined);
        }
      } catch (error) {
        console.error('[cron] reminders', error);
      }

      // 4. Housekeeping: old notifications + expired reset tokens.
      await env.DB.prepare("DELETE FROM notifications WHERE created_at < datetime('now', '-60 days')").run().catch(() => undefined);
      await env.DB.prepare("DELETE FROM password_resets WHERE expires_at < datetime('now', '-7 days')").run().catch(() => undefined);

      // 5. Warm the KV cache for the shell.
      try {
        const stats = await env.DB.prepare(
          'SELECT (SELECT COUNT(*) FROM users) AS users, (SELECT COUNT(*) FROM content_items) AS content, (SELECT COALESCE(SUM(views),0) FROM content_items) AS views',
        ).first();
        await env.CACHE.put('stats:daily', JSON.stringify(stats), { expirationTtl: 86_400 });
      } catch (error) {
        console.error('[cron] cache warmup', error);
      }
    })(),
  );
}

/* ------------------------------------------------------------------ *
 * Exports
 * ------------------------------------------------------------------ */
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // Warm the database once per isolate before serving.
    ctx.waitUntil(ensureDatabase(env));
    try {
      return await app.fetch(request, env, ctx);
    } catch (error: any) {
      console.error('[worker] unhandled', error?.stack ?? error);
      return jsonResponse({ ok: false, error: 'Service temporarily unavailable.', code: 'worker_error' }, 500);
    }
  },
  queue: handleQueue,
  scheduled: handleScheduled,
};

export { QASessionDurableObject };
