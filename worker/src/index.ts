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
import { QASessionDurableObject } from './durable/qa';

type Bindings = Env;

const app = new Hono<{ Bindings: Bindings; Variables: { user?: any } }>();

// Global middleware
app.use('*', logger());
app.use('*', cors({
  origin: (origin, c) => {
    const allowed = [
      c.env.FRONTEND_URL,
      'http://localhost:8080',
      'http://localhost:5173',
      'http://localhost:3000',
      'https://som-connect-hub.vercel.app',
    ];
    // Allow all for demo / Arena preview
    return origin || '*';
  },
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// Auth middleware for all routes (sets user if token present)
app.use('*', authMiddleware);

// Health check
app.get('/', (c) => {
  return jsonResponse({
    name: 'SOM CONNECT API',
    version: '1.0.0',
    status: 'operational',
    env: c.env.ENV,
    timestamp: new Date().toISOString(),
    endpoints: [
      '/auth/login',
      '/auth/register',
      '/auth/me',
      '/content',
      '/favorites',
      '/playlists',
      '/community/posts',
      '/community/groups',
      '/qa',
      '/tools/confessions',
      '/tools/ror',
      '/subscriptions/plans',
      '/notifications',
      '/admin/stats',
      '/uploads',
    ],
  });
});

app.get('/health', (c) => jsonResponse({ status: 'ok', timestamp: new Date().toISOString() }));

// Routes
app.route('/auth', authRoutes);
app.route('/content', contentRoutes);
app.route('/favorites', favoritesRoutes);
app.route('/playlists', playlistsRoutes);
app.route('/community', communityRoutes);
app.route('/qa', qaRoutes);
app.route('/tools', toolsRoutes);
app.route('/subscriptions', subsRoutes);
app.route('/notifications', notificationsRoutes);
app.route('/admin', adminRoutes);
app.route('/uploads', uploadsRoutes);

// Additional utility routes

// GET /speakers
app.get('/speakers', async (c) => {
  const result = await c.env.DB.prepare('SELECT * FROM speakers').all();
  return jsonResponse({ items: result.results || [] });
});

// GET /search — global search
app.get('/search', async (c) => {
  const q = c.req.query('q');
  if (!q) return jsonResponse({ items: [] });
  const like = `%${q}%`;
  const result = await c.env.DB.prepare(`
    SELECT c.*, s.name as speaker_name, s.avatar as speaker_avatar
    FROM content_items c
    JOIN speakers s ON c.speaker_id = s.id
    WHERE c.title LIKE ? OR c.description LIKE ? OR c.tags LIKE ? OR s.name LIKE ?
    ORDER BY c.views DESC
    LIMIT 20
  `).bind(like, like, like, like).all();

  const items = (result.results || []).map((row: any) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    thumbnail: row.thumbnail,
    duration: row.duration,
    speaker: { name: row.speaker_name, avatar: row.speaker_avatar },
    category: row.category,
    tags: row.tags ? JSON.parse(row.tags) : [],
    views: row.views,
    isPremium: !!row.is_premium,
  }));

  return jsonResponse({ items, query: q });
});

// 404
app.notFound((c) => {
  return jsonResponse({ error: 'Not found', path: c.req.path }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error('API Error:', err);
  return jsonResponse({ error: err.message || 'Internal server error' }, 500);
});

// Queue consumer — background jobs
export async function queue(batch: MessageBatch, env: Env) {
  for (const message of batch.messages) {
    const payload = message.body as any;
    console.log('Queue job:', payload);

    try {
      if (payload.type === 'welcome') {
        // Create welcome notification
        const id = `notif_${Date.now()}_${Math.random().toString(36).slice(2,6)}`;
        await env.DB.prepare(
          'INSERT INTO notifications (id, user_id, type, title, message, action_url) VALUES (?, ?, ?, ?, ?, ?)'
        ).bind(id, payload.userId, 'system', 'Welcome to SOM CONNECT!', 'Your journey begins now. Explore teachings, daily tools, and community.', '/').run();
      }

      if (payload.type === 'new_content') {
        // Notify all users about new content (in prod, fan-out)
        const users = await env.DB.prepare('SELECT id FROM users LIMIT 100').all();
        for (const u of users.results || []) {
          const nid = `notif_${Date.now()}_${Math.random().toString(36).slice(2,6)}`;
          try {
            await env.DB.prepare(
              'INSERT INTO notifications (id, user_id, type, title, message, action_url) VALUES (?, ?, ?, ?, ?, ?)'
            ).bind(nid, (u as any).id, 'content', 'New Content Available', `New teaching "${payload.title}" is now available.`, `/library/${payload.contentId}`).run();
          } catch {}
        }
      }

      if (payload.type === 'new_post') {
        // Could notify group members
      }

      if (payload.type === 'new_question') {
        // Could notify speaker
      }

      if (payload.type === 'subscription_created') {
        const nid = `notif_${Date.now()}_${Math.random().toString(36).slice(2,6)}`;
        await env.DB.prepare(
          'INSERT INTO notifications (id, user_id, type, title, message, action_url) VALUES (?, ?, ?, ?, ?, ?)'
        ).bind(nid, payload.userId, 'system', 'Premium Activated!', 'Your premium subscription is now active. Enjoy HD streaming, offline downloads, and exclusive content.', '/profile').run();
      }

      if (payload.type === 'password_reset') {
        // In prod, send email via Resend/SendGrid
        console.log(`Password reset email would be sent to ${payload.email}`);
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
  console.log('Cron triggered:', event.cron);

  // Daily: reset streaks? Actually streak should persist, but we can create daily confessions if missing
  // For demo, ensure today's confession exists
  const today = new Date().toISOString().split('T')[0];
  const existing = await env.DB.prepare('SELECT id FROM daily_confessions WHERE date = ?').bind(today).first();
  if (!existing) {
    // In prod, generate from template
    console.log(`No confession for ${today}, would generate`);
  }

  // Clean old notifications (older than 30 days)
  try {
    await env.DB.prepare("DELETE FROM notifications WHERE created_at < datetime('now', '-30 days')").run();
  } catch {}

  // Update cache stats
  try {
    const stats = await env.DB.prepare('SELECT COUNT(*) as users, SUM(views) as views FROM users, content_items').first() as any;
    await env.CACHE.put('stats:daily', JSON.stringify(stats), { expirationTtl: 86400 });
  } catch {}
}

export default {
  fetch: app.fetch,
  queue,
  scheduled,
};

// Export Durable Object
export { QASessionDurableObject };
