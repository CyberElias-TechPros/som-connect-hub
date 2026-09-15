import { Hono } from 'hono';
import { Env, jsonResponse, errorResponse } from '../lib/db';
import { requireAuth } from './auth';
import { generateId } from '../lib/auth';

const analytics = new Hono<{ Bindings: Env; Variables: { user?: any } }>();

// POST /analytics/view — track content view
analytics.post('/view', async (c) => {
  const user = c.get('user') as any;
  const { contentId, watchedSeconds, completed, deviceType, country } = await c.req.json() as any;

  if (!contentId) return errorResponse('contentId required', 400);

  const id = generateId('cv_');
  try {
    await c.env.DB.prepare(
      'INSERT INTO content_views (id, content_id, user_id, watched_seconds, completed, device_type, country) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(id, contentId, user?.id || null, watchedSeconds || 0, completed ? 1 : 0, deviceType || null, country || null).run();
  } catch (e) {
    console.error('Analytics view failed', e);
  }

  // Also increment content views for trending
  try {
    await c.env.DB.prepare('UPDATE content_items SET views = views + 1 WHERE id = ?').bind(contentId).run();
  } catch {}

  return jsonResponse({ message: 'View tracked', id });
});

// GET /analytics/content/:id — content analytics (admin or speaker)
analytics.get('/content/:id', async (c) => {
  const authErr = requireAuth(c);
  if (authErr) return authErr;
  const user = c.get('user') as any;
  if (!['admin','pastor'].includes(user.role)) return errorResponse('Forbidden', 403);

  const contentId = c.req.param('id');

  const totalViews = await c.env.DB.prepare('SELECT COUNT(*) as cnt FROM content_views WHERE content_id = ?').bind(contentId).first() as any;
  const uniqueViewers = await c.env.DB.prepare('SELECT COUNT(DISTINCT user_id) as cnt FROM content_views WHERE content_id = ? AND user_id IS NOT NULL').bind(contentId).first() as any;
  const avgWatch = await c.env.DB.prepare('SELECT AVG(watched_seconds) as avg FROM content_views WHERE content_id = ?').bind(contentId).first() as any;
  const completionRate = await c.env.DB.prepare('SELECT COUNT(*) as total, SUM(completed) as completed FROM content_views WHERE content_id = ?').bind(contentId).first() as any;
  const byDevice = await c.env.DB.prepare('SELECT device_type, COUNT(*) as cnt FROM content_views WHERE content_id = ? GROUP BY device_type').bind(contentId).all();
  const recent = await c.env.DB.prepare('SELECT * FROM content_views WHERE content_id = ? ORDER BY created_at DESC LIMIT 10').bind(contentId).all();

  return jsonResponse({
    contentId,
    totalViews: totalViews?.cnt || 0,
    uniqueViewers: uniqueViewers?.cnt || 0,
    avgWatchSeconds: Math.round(avgWatch?.avg || 0),
    completionRate: completionRate?.total ? Math.round((completionRate.completed / completionRate.total) * 100) : 0,
    byDevice: byDevice.results || [],
    recentViews: recent.results || [],
  });
});

// GET /analytics/me — user analytics
analytics.get('/me', async (c) => {
  const authErr = requireAuth(c);
  if (authErr) return authErr;
  const user = c.get('user') as any;

  const totalWatched = await c.env.DB.prepare('SELECT COUNT(*) as cnt, SUM(watched_seconds) as total FROM content_views WHERE user_id = ?').bind(user.id).first() as any;
  const completed = await c.env.DB.prepare('SELECT COUNT(*) as cnt FROM content_views WHERE user_id = ? AND completed = 1').bind(user.id).first() as any;
  const byCategory = await c.env.DB.prepare(`
    SELECT c.category, COUNT(*) as cnt
    FROM content_views cv
    JOIN content_items c ON cv.content_id = c.id
    WHERE cv.user_id = ?
    GROUP BY c.category
  `).bind(user.id).all();
  const recent = await c.env.DB.prepare(`
    SELECT cv.*, c.title, c.thumbnail
    FROM content_views cv
    JOIN content_items c ON cv.content_id = c.id
    WHERE cv.user_id = ?
    ORDER BY cv.created_at DESC
    LIMIT 10
  `).bind(user.id).all();

  return jsonResponse({
    totalWatched: totalWatched?.cnt || 0,
    totalSeconds: totalWatched?.total || 0,
    completed: completed?.cnt || 0,
    byCategory: byCategory.results || [],
    recent: recent.results || [],
  });
});

export default analytics;
