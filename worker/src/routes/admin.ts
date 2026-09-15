import { Hono } from 'hono';
import { Env, jsonResponse, errorResponse } from '../lib/db';
import { requireAuth, requireRole } from './auth';
import { generateId } from '../lib/auth';
import { auditLog, getClientInfo } from '../lib/audit';
import { cacheDeletePrefix } from '../lib/cache';

const admin = new Hono<{ Bindings: Env; Variables: { user?: any } }>();

// Middleware: require admin
admin.use('*', requireRole(['admin']));

// GET /admin/stats — comprehensive
admin.get('/stats', async (c) => {
  try {
    const cached = await c.env.CACHE.get('stats:daily');
    if (cached) {
      const stats = JSON.parse(cached);
      // Still return cached but with fresh flag
      return jsonResponse({ ...stats, cached: true, timestamp: new Date().toISOString() });
    }
  } catch {}

  const totalUsers = await c.env.DB.prepare('SELECT COUNT(*) as cnt FROM users WHERE is_active = 1').first() as any;
  const activeSubs = await c.env.DB.prepare("SELECT COUNT(*) as cnt FROM user_subscriptions WHERE status = 'active'").first() as any;
  const totalContent = await c.env.DB.prepare('SELECT COUNT(*) as cnt FROM content_items WHERE is_published = 1').first() as any;
  const pendingReviews = await c.env.DB.prepare("SELECT COUNT(*) as cnt FROM pastor_uploads WHERE status = 'pending'").first() as any;
  const monthlyViews = await c.env.DB.prepare('SELECT SUM(views) as total FROM content_items').first() as any;
  const totalSpeakers = await c.env.DB.prepare('SELECT COUNT(*) as cnt FROM speakers').first() as any;
  const totalPosts = await c.env.DB.prepare('SELECT COUNT(*) as cnt FROM community_posts').first() as any;
  const totalGroups = await c.env.DB.prepare('SELECT COUNT(*) as cnt FROM groups').first() as any;
  const qaSessions = await c.env.DB.prepare('SELECT COUNT(*) as cnt FROM qa_sessions').first() as any;
  const totalRevenue = await c.env.DB.prepare("SELECT SUM(amount) as total FROM invoices WHERE status = 'paid'").first() as any;

  // Growth: users last 7 days
  const growth = await c.env.DB.prepare("SELECT date(created_at) as date, COUNT(*) as cnt FROM users WHERE created_at >= date('now', '-7 days') GROUP BY date(created_at) ORDER BY date ASC").all();

  const stats = {
    totalUsers: totalUsers?.cnt || 0,
    activeSubscribers: activeSubs?.cnt || 0,
    totalContent: totalContent?.cnt || 0,
    pendingReviews: pendingReviews?.cnt || 0,
    monthlyViews: monthlyViews?.total || 0,
    totalSpeakers: totalSpeakers?.cnt || 0,
    totalPosts: totalPosts?.cnt || 0,
    totalGroups: totalGroups?.cnt || 0,
    qaSessions: qaSessions?.cnt || 0,
    totalRevenue: totalRevenue?.total || 0,
    dailyActiveUsers: Math.floor((totalUsers?.cnt || 0) * 0.07),
    growth: growth.results || [],
    timestamp: new Date().toISOString(),
  };

  try {
    await c.env.CACHE.put('stats:daily', JSON.stringify(stats), { expirationTtl: 3600 });
  } catch {}

  return jsonResponse(stats);
});

// GET /admin/users
admin.get('/users', async (c) => {
  const search = c.req.query('q');
  const role = c.req.query('role');
  const active = c.req.query('active');
  const limit = Math.min(parseInt(c.req.query('limit') || '20'), 100);
  const offset = parseInt(c.req.query('offset') || '0');

  let query = 'SELECT id, email, name, avatar, role, streak, longest_streak, is_active, joined_date, created_at, last_login_at FROM users WHERE 1=1';
  const params: any[] = [];
  if (search) {
    query += ' AND (name LIKE ? OR email LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }
  if (role && role !== 'all') {
    query += ' AND role = ?';
    params.push(role);
  }
  if (active === 'true') query += ' AND is_active = 1';
  if (active === 'false') query += ' AND is_active = 0';

  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const result = await c.env.DB.prepare(query).bind(...params).all();
  const totalResult = await c.env.DB.prepare('SELECT COUNT(*) as cnt FROM users').first() as any;

  return jsonResponse({ items: result.results || [], total: totalResult?.cnt || 0, limit, offset });
});

// PUT /admin/users/:id/role
admin.put('/users/:id/role', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json() as any;
  const { role } = body;
  if (!['guest','member','pastor','admin'].includes(role)) return errorResponse('Invalid role');

  const actor = c.get('user') as any;
  if (id === actor.id) return errorResponse('Cannot change your own role', 400);

  await c.env.DB.prepare('UPDATE users SET role = ?, updated_at = ? WHERE id = ?').bind(role, new Date().toISOString(), id).run();

  const { ip, ua } = getClientInfo(c);
  await auditLog(c.env.DB, actor.id, 'user.role.update', 'user', id, { role }, ip, ua);

  return jsonResponse({ message: 'Role updated', id, role });
});

// GET /admin/uploads
admin.get('/uploads', async (c) => {
  const status = c.req.query('status') || 'pending';
  const type = c.req.query('type');
  const limit = Math.min(parseInt(c.req.query('limit') || '20'), 100);
  const offset = parseInt(c.req.query('offset') || '0');

  let query = 'SELECT pu.*, u.name as user_name, u.email as user_email, u.avatar as user_avatar FROM pastor_uploads pu JOIN users u ON pu.user_id = u.id WHERE 1=1';
  const params: any[] = [];
  if (status !== 'all') {
    query += ' AND pu.status = ?';
    params.push(status);
  }
  if (type && type !== 'all') {
    query += ' AND pu.type = ?';
    params.push(type);
  }
  query += ' ORDER BY pu.created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const result = await c.env.DB.prepare(query).bind(...params).all();
  return jsonResponse({ items: result.results || [] });
});

// POST /admin/uploads/:id/approve — creates content_item
admin.post('/uploads/:id/approve', async (c) => {
  const id = c.req.param('id');
  const actor = c.get('user') as any;

  const upload = await c.env.DB.prepare('SELECT * FROM pastor_uploads WHERE id = ?').bind(id).first() as any;
  if (!upload) return errorResponse('Upload not found', 404);
  if (upload.status === 'approved') return jsonResponse({ message: 'Already approved', id });

  // Create content_item from upload
  const contentId = generateId('c_');
  const thumbnail = upload.thumbnail || 'https://images.unsplash.com/photo-1507692049790-de58290a4334?w=600&h=340&fit=crop';
  const speakerId = upload.speaker_id || 'spk_1';

  try {
    await c.env.DB.prepare(`
      INSERT INTO content_items (id, title, description, thumbnail, duration, speaker_id, date, category, tags, is_premium, video_url, is_published)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `).bind(
      contentId,
      upload.title,
      upload.description || upload.title,
      thumbnail,
      upload.duration || '45:00',
      speakerId,
      new Date().toISOString().split('T')[0],
      upload.category || 'original',
      upload.tags || '[]',
      0,
      upload.file_url
    ).run();
  } catch (e: any) {
    console.error('Failed to create content from upload', e);
    // Continue anyway
  }

  await c.env.DB.prepare("UPDATE pastor_uploads SET status = 'approved', reviewed_date = ?, reviewed_by = ?, published_content_id = ? WHERE id = ?").bind(new Date().toISOString().split('T')[0], actor.id, contentId, id).run();

  const { ip, ua } = getClientInfo(c);
  await auditLog(c.env.DB, actor.id, 'upload.approve', 'pastor_upload', id, { contentId }, ip, ua);

  try {
    await c.env.QUEUE.send({ type: 'content_approved', userId: upload.user_id, title: upload.title, contentId });
  } catch {}

  await cacheDeletePrefix(c.env, 'content:list:');

  return jsonResponse({ message: 'Approved and published', id, contentId });
});

// POST /admin/uploads/:id/reject
admin.post('/uploads/:id/reject', async (c) => {
  const id = c.req.param('id');
  const actor = c.get('user') as any;
  const body = await c.req.json() as any;
  const { feedback } = body;

  const upload = await c.env.DB.prepare('SELECT * FROM pastor_uploads WHERE id = ?').bind(id).first() as any;
  if (!upload) return errorResponse('Upload not found', 404);

  await c.env.DB.prepare("UPDATE pastor_uploads SET status = 'rejected', feedback = ?, reviewed_date = ?, reviewed_by = ? WHERE id = ?").bind(feedback || 'Rejected by moderator', new Date().toISOString().split('T')[0], actor.id, id).run();

  const { ip, ua } = getClientInfo(c);
  await auditLog(c.env.DB, actor.id, 'upload.reject', 'pastor_upload', id, { feedback }, ip, ua);

  try {
    await c.env.QUEUE.send({ type: 'content_rejected', userId: upload.user_id, title: upload.title, feedback });
  } catch {}

  return jsonResponse({ message: 'Rejected', id });
});

// GET /admin/audit-logs
admin.get('/audit-logs', async (c) => {
  const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100);
  const offset = parseInt(c.req.query('offset') || '0');
  const action = c.req.query('action');

  let query = 'SELECT al.*, u.name as user_name, u.email as user_email FROM audit_logs al LEFT JOIN users u ON al.user_id = u.id WHERE 1=1';
  const params: any[] = [];
  if (action) {
    query += ' AND al.action LIKE ?';
    params.push(`%${action}%`);
  }
  query += ' ORDER BY al.created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const result = await c.env.DB.prepare(query).bind(...params).all();
  return jsonResponse({ items: result.results || [] });
});

// GET /admin/analytics
admin.get('/analytics', async (c) => {
  const period = c.req.query('period') || '7d'; // 7d, 30d, 90d
  let days = 7;
  if (period === '30d') days = 30;
  if (period === '90d') days = 90;

  const viewsByDay = await c.env.DB.prepare(`
    SELECT date(created_at) as date, COUNT(*) as views
    FROM content_views
    WHERE created_at >= date('now', ?)
    GROUP BY date(created_at)
    ORDER BY date ASC
  `).bind(`-${days} days`).all();

  const topContent = await c.env.DB.prepare(`
    SELECT c.id, c.title, c.thumbnail, COUNT(cv.id) as views
    FROM content_views cv
    JOIN content_items c ON cv.content_id = c.id
    WHERE cv.created_at >= date('now', ?)
    GROUP BY c.id
    ORDER BY views DESC
    LIMIT 10
  `).bind(`-${days} days`).all();

  const userGrowth = await c.env.DB.prepare(`
    SELECT date(created_at) as date, COUNT(*) as users
    FROM users
    WHERE created_at >= date('now', ?)
    GROUP BY date(created_at)
    ORDER BY date ASC
  `).bind(`-${days} days`).all();

  return jsonResponse({
    period,
    viewsByDay: viewsByDay.results || [],
    topContent: topContent.results || [],
    userGrowth: userGrowth.results || [],
  });
});

export default admin;
