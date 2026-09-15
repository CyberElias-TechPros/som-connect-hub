import { Hono } from 'hono';
import { Env, jsonResponse, errorResponse } from '../lib/db';
import { requireAuth, requireRole } from './auth';
import { generateId } from '../lib/auth';
import { auditLog, getClientInfo } from '../lib/audit';

const users = new Hono<{ Bindings: Env; Variables: { user?: any } }>();

// GET /users/me/preferences
users.get('/me/preferences', async (c) => {
  const authErr = requireAuth(c);
  if (authErr) return authErr;
  const user = c.get('user') as any;
  try {
    const prefs = user.preferences ? JSON.parse(user.preferences) : {};
    return jsonResponse(prefs);
  } catch {
    return jsonResponse({});
  }
});

// PUT /users/me/preferences
users.put('/me/preferences', async (c) => {
  const authErr = requireAuth(c);
  if (authErr) return authErr;
  const user = c.get('user') as any;
  const prefs = await c.req.json();

  await c.env.DB.prepare('UPDATE users SET preferences = ?, updated_at = ? WHERE id = ?').bind(JSON.stringify(prefs), new Date().toISOString(), user.id).run();
  return jsonResponse({ message: 'Preferences updated', preferences: prefs });
});

// GET /users/me/stats
users.get('/me/stats', async (c) => {
  const authErr = requireAuth(c);
  if (authErr) return authErr;
  const user = c.get('user') as any;

  const favorites = await c.env.DB.prepare('SELECT COUNT(*) as cnt FROM favorites WHERE user_id = ?').bind(user.id).first() as any;
  const playlists = await c.env.DB.prepare('SELECT COUNT(*) as cnt FROM playlists WHERE user_id = ?').bind(user.id).first() as any;
  const watched = await c.env.DB.prepare('SELECT COUNT(*) as cnt, SUM(watched_seconds) as totalSeconds FROM content_progress WHERE user_id = ?').bind(user.id).first() as any;
  const completions = await c.env.DB.prepare('SELECT COUNT(*) as cnt FROM daily_completions WHERE user_id = ?').bind(user.id).first() as any;
  const posts = await c.env.DB.prepare('SELECT COUNT(*) as cnt FROM community_posts WHERE author_id = ?').bind(user.id).first() as any;

  return jsonResponse({
    favorites: favorites?.cnt || 0,
    playlists: playlists?.cnt || 0,
    watchedCount: watched?.cnt || 0,
    watchedSeconds: watched?.totalSeconds || 0,
    completions: completions?.cnt || 0,
    posts: posts?.cnt || 0,
    streak: user.streak,
    longestStreak: user.longest_streak || user.streak,
  });
});

// GET /users/:id — public profile
users.get('/:id', async (c) => {
  const id = c.req.param('id');
  const user = await c.env.DB.prepare('SELECT id, name, avatar, role, bio, affiliation, streak, joined_date, created_at FROM users WHERE id = ? AND is_active = 1').bind(id).first();
  if (!user) return errorResponse('User not found', 404);

  const stats = await c.env.DB.prepare('SELECT COUNT(*) as posts FROM community_posts WHERE author_id = ?').bind(id).first() as any;

  return jsonResponse({
    ...(user as any),
    stats: { posts: stats?.posts || 0 },
  });
});

// PUT /users/:id/deactivate — admin only
users.put('/:id/deactivate', async (c) => {
  const authErr = requireAuth(c);
  if (authErr) return authErr;
  const actor = c.get('user') as any;
  if (actor.role !== 'admin') return errorResponse('Forbidden', 403);

  const id = c.req.param('id');
  if (id === actor.id) return errorResponse('Cannot deactivate yourself', 400);

  await c.env.DB.prepare('UPDATE users SET is_active = 0, updated_at = ? WHERE id = ?').bind(new Date().toISOString(), id).run();

  const { ip, ua } = getClientInfo(c);
  await auditLog(c.env.DB, actor.id, 'user.deactivate', 'user', id, null, ip, ua);

  return jsonResponse({ message: 'User deactivated', id });
});

// PUT /users/:id/activate — admin only
users.put('/:id/activate', async (c) => {
  const authErr = requireAuth(c);
  if (authErr) return authErr;
  const actor = c.get('user') as any;
  if (actor.role !== 'admin') return errorResponse('Forbidden', 403);

  const id = c.req.param('id');
  await c.env.DB.prepare('UPDATE users SET is_active = 1, updated_at = ? WHERE id = ?').bind(new Date().toISOString(), id).run();

  return jsonResponse({ message: 'User activated', id });
});

// GET /users — admin search
users.get('/', async (c) => {
  const authErr = requireAuth(c);
  if (authErr) return authErr;
  const actor = c.get('user') as any;
  if (actor.role !== 'admin') return errorResponse('Forbidden', 403);

  const search = c.req.query('q');
  const role = c.req.query('role');
  const active = c.req.query('active');
  const limit = Math.min(parseInt(c.req.query('limit') || '20'), 100);
  const offset = parseInt(c.req.query('offset') || '0');

  let query = 'SELECT id, email, name, avatar, role, streak, is_active, joined_date, created_at, last_login_at FROM users WHERE 1=1';
  const params: any[] = [];

  if (search) {
    query += ' AND (name LIKE ? OR email LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }
  if (role && role !== 'all') {
    query += ' AND role = ?';
    params.push(role);
  }
  if (active === 'true') {
    query += ' AND is_active = 1';
  } else if (active === 'false') {
    query += ' AND is_active = 0';
  }

  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const result = await c.env.DB.prepare(query).bind(...params).all();
  const totalResult = await c.env.DB.prepare('SELECT COUNT(*) as cnt FROM users').first() as any;

  return jsonResponse({ items: result.results || [], total: totalResult?.cnt || 0, limit, offset });
});

export default users;
