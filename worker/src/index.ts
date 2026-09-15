import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { Env, jsonResponse } from './lib/db';
import { authMiddleware } from './routes/auth';
import authRoutes from './routes/auth';
import contentRoutes from './routes/content';
import favoritesRoutes from './routes/favorites';
import playlistsRoutes from './routes/playlists';
import communityRoutes from './routes/community';
import qaRoutes from './routes/qa';
import toolsRoutes from './routes/tools';
import subsRoutes from './routes/subscriptions';
import notificationsRoutes from './routes/notifications';
import adminRoutes from './routes/admin';
import uploadsRoutes from './routes/uploads';
import speakersRoutes from './routes/speakers';
import commentsRoutes from './routes/comments';
import usersRoutes from './routes/users';
import publicationsRoutes from './routes/publications';
import searchRoutes from './routes/search';
import analyticsRoutes from './routes/analytics';
import { QASessionDurableObject } from './durable/qa';
import { standardRateLimit } from './middleware/rateLimit';

type Bindings = Env;

const app = new Hono<{ Bindings: Bindings; Variables: { user?: any } }>();

// Global middleware
app.use('*', logger());
app.use('*', cors({
  origin: (origin, c) => {
    // Allow all for demo / Arena preview / Vercel
    return origin || '*';
  },
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  maxAge: 86400,
}));

// Security headers
app.use('*', async (c, next) => {
  await next();
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('X-Frame-Options', 'DENY');
  c.header('X-XSS-Protection', '1; mode=block');
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
});

// Auth middleware for all routes (sets user if token present)
app.use('*', authMiddleware);

// Rate limiting for sensitive routes
app.use('/auth/*', standardRateLimit);

// Root — API info
app.get('/', (c) => {
  return jsonResponse({
    name: 'SOM CONNECT API',
    version: '2.0.0',
    status: 'operational',
    env: c.env.ENV,
    timestamp: new Date().toISOString(),
    docs: '/openapi.json',
    endpoints: {
      auth: ['/auth/login', '/auth/register', '/auth/me', '/auth/forgot', '/auth/profile'],
      content: ['/content', '/content/:id', '/content/:id/progress', '/content/user/continue'],
      favorites: ['/favorites', '/favorites/:contentId'],
      playlists: ['/playlists', '/playlists/:id', '/playlists/:id/items'],
      speakers: ['/speakers', '/speakers/:id'],
      community: ['/community/posts', '/community/groups', '/community/groups/:id/join'],
      comments: ['/comments/content/:contentId', '/comments/post/:postId'],
      qa: ['/qa', '/qa/:id', '/qa/:id/questions', '/qa/:id/join'],
      tools: ['/tools/confessions', '/tools/ror', '/tools/publications', '/tools/complete', '/tools/streak'],
      publications: ['/publications', '/publications/:id'],
      subscriptions: ['/subscriptions/plans', '/subscriptions/me', '/subscriptions'],
      notifications: ['/notifications', '/notifications/:id/read'],
      users: ['/users/me/preferences', '/users/me/stats', '/users/:id'],
      search: ['/search?q=', '/search/trending', '/search/history'],
      analytics: ['/analytics/view', '/analytics/me', '/analytics/content/:id'],
      uploads: ['/uploads', '/uploads/file/*'],
      admin: ['/admin/stats', '/admin/users', '/admin/uploads'],
    },
  });
});

// Health check with DB
app.get('/health', async (c) => {
  let dbStatus = 'ok';
  let dbLatency = 0;
  try {
    const start = Date.now();
    await c.env.DB.prepare('SELECT 1').first();
    dbLatency = Date.now() - start;
  } catch (e: any) {
    dbStatus = 'error: ' + e.message;
  }

  let kvStatus = 'ok';
  try {
    await c.env.CACHE.get('health:check');
  } catch (e: any) {
    kvStatus = 'error: ' + e.message;
  }

  let r2Status = 'ok';
  try {
    await c.env.STORAGE.list({ limit: 1 });
  } catch (e: any) {
    r2Status = 'error: ' + e.message;
  }

  return jsonResponse({
    status: dbStatus === 'ok' && kvStatus === 'ok' ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    services: {
      d1: { status: dbStatus, latencyMs: dbLatency },
      kv: { status: kvStatus },
      r2: { status: r2Status },
      queue: { status: 'ok' },
      durableObjects: { status: 'ok' },
    },
  });
});

// OpenAPI spec (simplified)
app.get('/openapi.json', (c) => {
  return jsonResponse({
    openapi: '3.0.0',
    info: {
      title: 'SOM CONNECT API',
      version: '2.0.0',
      description: 'Production-grade API for SOM CONNECT Hub — spiritual streaming platform',
    },
    servers: [{ url: 'https://api.som-connect.workers.dev', description: 'Production' }],
    paths: {
      '/auth/login': { post: { summary: 'Login — happy path any email works', tags: ['auth'] } },
      '/auth/register': { post: { summary: 'Register — happy path', tags: ['auth'] } },
      '/content': { get: { summary: 'List content with filters', tags: ['content'] } },
      '/speakers': { get: { summary: 'List speakers', tags: ['speakers'] } },
      '/search': { get: { summary: 'Global search', tags: ['search'] } },
    },
  });
});

// Routes
app.route('/auth', authRoutes);
app.route('/content', contentRoutes);
app.route('/favorites', favoritesRoutes);
app.route('/playlists', playlistsRoutes);
app.route('/speakers', speakersRoutes);
app.route('/community', communityRoutes);
app.route('/comments', commentsRoutes);
app.route('/qa', qaRoutes);
app.route('/tools', toolsRoutes);
app.route('/publications', publicationsRoutes);
app.route('/subscriptions', subsRoutes);
app.route('/notifications', notificationsRoutes);
app.route('/users', usersRoutes);
app.route('/search', searchRoutes);
app.route('/analytics', analyticsRoutes);
app.route('/admin', adminRoutes);
app.route('/uploads', uploadsRoutes);

// Legacy compatibility: /speakers and /search at root were already routed via modules above
// Additional legacy endpoints for frontend that may call /speakers directly without prefix
app.get('/speakers-legacy', async (c) => {
  const result = await c.env.DB.prepare('SELECT * FROM speakers').all();
  return jsonResponse({ items: result.results || [] });
});

// 404
app.notFound((c) => {
  return jsonResponse({ error: 'Not found', path: c.req.path, method: c.req.method, hint: 'Check / for available endpoints' }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error('API Error:', err, err.stack);
  return jsonResponse({ error: err.message || 'Internal server error', stack: c.env.ENV === 'development' ? err.stack : undefined }, 500);
});

// Queue consumer — background jobs
export async function queue(batch: MessageBatch, env: Env) {
  for (const message of batch.messages) {
    const payload = message.body as any;
    console.log('Queue job:', JSON.stringify(payload));

    try {
      if (payload.type === 'welcome') {
        const id = `notif_${Date.now()}_${Math.random().toString(36).slice(2,6)}`;
        await env.DB.prepare(
          'INSERT INTO notifications (id, user_id, type, title, message, action_url, metadata) VALUES (?, ?, ?, ?, ?, ?, ?)'
        ).bind(id, payload.userId, 'system', 'Welcome to SOM CONNECT!', 'Your journey begins now. Explore teachings, daily tools, and community.', '/', JSON.stringify({ onboarding: true })).run();
      }

      if (payload.type === 'new_content') {
        const users = await env.DB.prepare('SELECT id FROM users WHERE is_active = 1 LIMIT 200').all();
        for (const u of users.results || []) {
          const nid = `notif_${Date.now()}_${Math.random().toString(36).slice(2,6)}`;
          try {
            await env.DB.prepare(
              'INSERT INTO notifications (id, user_id, type, title, message, action_url) VALUES (?, ?, ?, ?, ?, ?)'
            ).bind(nid, (u as any).id, 'content', 'New Content Available', `New teaching "${payload.title}" is now available.`, `/library/${payload.contentId}`).run();
          } catch {}
        }
        // Invalidate cache
        try { await env.CACHE.delete('content:trending'); } catch {}
      }

      if (payload.type === 'new_post') {
        // Notify group members if group post
        if (payload.groupId) {
          const members = await env.DB.prepare('SELECT user_id FROM group_members WHERE group_id = ? LIMIT 100').bind(payload.groupId).all();
          for (const m of members.results || []) {
            if ((m as any).user_id === payload.authorId) continue;
            const nid = `notif_${Date.now()}_${Math.random().toString(36).slice(2,6)}`;
            try {
              await env.DB.prepare(
                'INSERT INTO notifications (id, user_id, type, title, message, action_url) VALUES (?, ?, ?, ?, ?, ?)'
              ).bind(nid, (m as any).user_id, 'community', 'New post in your group', 'A new post was shared in a group you joined.', `/community`).run();
            } catch {}
          }
        }
      }

      if (payload.type === 'new_question') {
        // Notify speaker (in real app, via email)
        console.log(`New question ${payload.questionId} in session ${payload.sessionId}`);
      }

      if (payload.type === 'subscription_created') {
        const nid = `notif_${Date.now()}_${Math.random().toString(36).slice(2,6)}`;
        await env.DB.prepare(
          'INSERT INTO notifications (id, user_id, type, title, message, action_url) VALUES (?, ?, ?, ?, ?, ?)'
        ).bind(nid, payload.userId, 'subscription', 'Premium Activated!', 'Your premium subscription is now active. Enjoy HD streaming, offline downloads, and exclusive content.', '/profile').run();

        // Create invoice
        try {
          const invoiceId = `inv_${Date.now()}_${Math.random().toString(36).slice(2,6)}`;
          const plan = await env.DB.prepare('SELECT price FROM subscription_plans WHERE id = ?').bind(payload.planId).first() as any;
          await env.DB.prepare('INSERT INTO invoices (id, user_id, subscription_id, amount, status) VALUES (?, ?, ?, ?, ?)').bind(invoiceId, payload.userId, payload.subscriptionId, plan?.price || 9.99, 'paid').run();
        } catch {}
      }

      if (payload.type === 'password_reset') {
        console.log(`Password reset email would be sent to ${payload.email} — token ${payload.token || 'demo'}`);
      }

      if (payload.type === 'content_approved') {
        // Notify uploader
        const nid = `notif_${Date.now()}_${Math.random().toString(36).slice(2,6)}`;
        await env.DB.prepare(
          'INSERT INTO notifications (id, user_id, type, title, message, action_url) VALUES (?, ?, ?, ?, ?, ?)'
        ).bind(nid, payload.userId, 'system', 'Content Approved!', `Your upload "${payload.title}" has been approved and is now live.`, `/library/${payload.contentId}`).run();
      }

      if (payload.type === 'content_rejected') {
        const nid = `notif_${Date.now()}_${Math.random().toString(36).slice(2,6)}`;
        await env.DB.prepare(
          'INSERT INTO notifications (id, user_id, type, title, message, action_url) VALUES (?, ?, ?, ?, ?, ?)'
        ).bind(nid, payload.userId, 'system', 'Content Needs Revision', `Your upload "${payload.title}" was not approved. Feedback: ${payload.feedback}`, '/submissions').run();
      }

      message.ack();
    } catch (e) {
      console.error('Queue job failed:', e);
      message.retry();
    }
  }
}

// Cron — daily tasks
export async function scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
  console.log('Cron triggered:', event.cron, 'at', new Date().toISOString());

  const today = new Date().toISOString().split('T')[0];

  // Ensure today's confession exists (create placeholder if missing)
  try {
    const existing = await env.DB.prepare('SELECT id FROM daily_confessions WHERE date = ?').bind(today).first();
    if (!existing) {
      console.log(`No confession for ${today}, creating placeholder`);
      const id = `conf_${Date.now()}`;
      await env.DB.prepare(
        'INSERT INTO daily_confessions (id, date, title, content, scripture, scripture_ref) VALUES (?, ?, ?, ?, ?, ?)'
      ).bind(id, today, 'Daily Confession — Walk in Faith', 'I declare today that I walk by faith and not by sight. My steps are ordered by the Lord.', 'For we walk by faith, not by sight.', '2 Corinthians 5:7').run();
    }
  } catch (e) { console.error('Confession cron failed', e); }

  // Ensure today's ROR exists
  try {
    const existingRor = await env.DB.prepare('SELECT id FROM ror_readings WHERE date = ?').bind(today).first();
    if (!existingRor) {
      console.log(`No ROR for ${today}`);
    }
  } catch {}

  // Clean old notifications (older than 30 days)
  try {
    const del = await env.DB.prepare("DELETE FROM notifications WHERE created_at < datetime('now', '-30 days') AND is_archived = 0").run();
    console.log(`Cleaned ${del.meta.changes} old notifications`);
  } catch (e) { console.error('Notification cleanup failed', e); }

  // Clean old password reset tokens
  try {
    await env.DB.prepare("DELETE FROM password_reset_tokens WHERE expires_at < datetime('now') OR used = 1").run();
  } catch {}

  // Clean old sessions
  try {
    await env.DB.prepare("DELETE FROM user_sessions WHERE expires_at < datetime('now')").run();
  } catch {}

  // Clean old search history (90 days)
  try {
    await env.DB.prepare("DELETE FROM search_history WHERE created_at < datetime('now', '-90 days')").run();
  } catch {}

  // Update cache stats
  try {
    const stats = await env.DB.prepare(`
      SELECT
        (SELECT COUNT(*) FROM users WHERE is_active = 1) as totalUsers,
        (SELECT COUNT(*) FROM content_items WHERE is_published = 1) as totalContent,
        (SELECT SUM(views) FROM content_items) as totalViews,
        (SELECT COUNT(*) FROM user_subscriptions WHERE status = 'active') as activeSubs,
        (SELECT COUNT(*) FROM pastor_uploads WHERE status = 'pending') as pendingUploads
    `).first() as any;

    await env.CACHE.put('stats:daily', JSON.stringify({ ...stats, date: today }), { expirationTtl: 86400 });
    console.log('Stats cached', stats);
  } catch (e) { console.error('Stats cache failed', e); }

  // Update speaker content counts
  try {
    await env.DB.prepare(`
      UPDATE speakers SET content_count = (SELECT COUNT(*) FROM content_items WHERE speaker_id = speakers.id AND is_published = 1)
    `).run();
  } catch {}

  // Trending cache warmup
  try {
    const trending = await env.DB.prepare('SELECT * FROM content_items WHERE is_published = 1 ORDER BY views DESC LIMIT 10').all();
    await env.CACHE.put('content:trending', JSON.stringify(trending.results || []), { expirationTtl: 3600 });
  } catch {}
}

export default {
  fetch: app.fetch,
  queue,
  scheduled,
};

// Export Durable Object
export { QASessionDurableObject };
