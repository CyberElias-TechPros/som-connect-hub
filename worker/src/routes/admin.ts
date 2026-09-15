import { Hono } from 'hono';
import { Env, jsonResponse, errorResponse } from '../lib/db';
import { requireAuth, requireRole } from './auth';

const admin = new Hono<{ Bindings: Env; Variables: { user?: any } }>();

// Middleware: require admin
admin.use('*', requireRole(['admin']));

// GET /admin/stats
admin.get('/stats', async (c) => {
  const totalUsers = await c.env.DB.prepare('SELECT COUNT(*) as cnt FROM users').first() as any;
  const activeSubs = await c.env.DB.prepare("SELECT COUNT(*) as cnt FROM user_subscriptions WHERE status = 'active'").first() as any;
  const totalContent = await c.env.DB.prepare('SELECT COUNT(*) as cnt FROM content_items').first() as any;
  const pendingReviews = await c.env.DB.prepare("SELECT COUNT(*) as cnt FROM pastor_uploads WHERE status = 'pending'").first() as any;
  const monthlyViews = await c.env.DB.prepare('SELECT SUM(views) as total FROM content_items').first() as any;

  return jsonResponse({
    totalUsers: totalUsers?.cnt || 0,
    activeSubscribers: activeSubs?.cnt || 0,
    totalContent: totalContent?.cnt || 0,
    pendingReviews: pendingReviews?.cnt || 0,
    monthlyViews: monthlyViews?.total || 0,
    dailyActiveUsers: Math.floor((totalUsers?.cnt || 0) * 0.07),
  });
});

// GET /admin/users
admin.get('/users', async (c) => {
  const search = c.req.query('q');
  const role = c.req.query('role');
  const limit = Math.min(parseInt(c.req.query('limit') || '20'), 100);
  const offset = parseInt(c.req.query('offset') || '0');

  let query = 'SELECT id, email, name, avatar, role, streak, joined_date, created_at FROM users WHERE 1=1';
  const params: any[] = [];
  if (search) {
    query += ' AND (name LIKE ? OR email LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }
  if (role && role !== 'all') {
    query += ' AND role = ?';
    params.push(role);
  }
  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const result = await c.env.DB.prepare(query).bind(...params).all();
  return jsonResponse({ items: result.results || [] });
});

// PUT /admin/users/:id/role
admin.put('/users/:id/role', async (c) => {
  const id = c.req.param('id');
  const { role } = await c.req.json();
  if (!['guest','member','pastor','admin'].includes(role)) return errorResponse('Invalid role');
  await c.env.DB.prepare('UPDATE users SET role = ?, updated_at = ? WHERE id = ?').bind(role, new Date().toISOString(), id).run();
  return jsonResponse({ message: 'Role updated', id, role });
});

// GET /admin/uploads
admin.get('/uploads', async (c) => {
  const status = c.req.query('status') || 'pending';
  let query = 'SELECT pu.*, u.name as user_name, u.email as user_email FROM pastor_uploads pu JOIN users u ON pu.user_id = u.id';
  const params: any[] = [];
  if (status !== 'all') {
    query += ' WHERE pu.status = ?';
    params.push(status);
  }
  query += ' ORDER BY pu.created_at DESC';
  const result = await c.env.DB.prepare(query).bind(...params).all();
  return jsonResponse({ items: result.results || [] });
});

// POST /admin/uploads/:id/approve
admin.post('/uploads/:id/approve', async (c) => {
  const id = c.req.param('id');
  await c.env.DB.prepare("UPDATE pastor_uploads SET status = 'approved', reviewed_date = ? WHERE id = ?").bind(new Date().toISOString().split('T')[0], id).run();
  return jsonResponse({ message: 'Approved', id });
});

// POST /admin/uploads/:id/reject
admin.post('/uploads/:id/reject', async (c) => {
  const id = c.req.param('id');
  const { feedback } = await c.req.json();
  await c.env.DB.prepare("UPDATE pastor_uploads SET status = 'rejected', feedback = ?, reviewed_date = ? WHERE id = ?").bind(feedback || 'Rejected by moderator', new Date().toISOString().split('T')[0], id).run();
  return jsonResponse({ message: 'Rejected', id });
});

export default admin;
