import { Hono } from 'hono';
import { Env, jsonResponse, errorResponse } from '../lib/db';
import { requireAuth } from './auth';
import { generateId } from '../lib/auth';

const notifications = new Hono<{ Bindings: Env; Variables: { user?: any } }>();

// GET /notifications
notifications.get('/', async (c) => {
  const authErr = requireAuth(c);
  if (authErr) return authErr;
  const user = c.get('user');
  const unreadOnly = c.req.query('unread') === 'true';

  let query = 'SELECT * FROM notifications WHERE user_id = ?';
  const params: any[] = [user.id];
  if (unreadOnly) {
    query += ' AND is_read = 0';
  }
  query += ' ORDER BY created_at DESC LIMIT 50';

  const result = await c.env.DB.prepare(query).bind(...params).all();
  const unreadResult = await c.env.DB.prepare('SELECT COUNT(*) as cnt FROM notifications WHERE user_id = ? AND is_read = 0').bind(user.id).first() as any;

  return jsonResponse({ items: result.results || [], unreadCount: unreadResult?.cnt || 0 });
});

// PUT /notifications/:id/read
notifications.put('/:id/read', async (c) => {
  const authErr = requireAuth(c);
  if (authErr) return authErr;
  const id = c.req.param('id');
  await c.env.DB.prepare('UPDATE notifications SET is_read = 1 WHERE id = ?').bind(id).run();
  return jsonResponse({ message: 'Marked as read' });
});

// PUT /notifications/read-all
notifications.put('/read-all', async (c) => {
  const authErr = requireAuth(c);
  if (authErr) return authErr;
  const user = c.get('user');
  await c.env.DB.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').bind(user.id).run();
  return jsonResponse({ message: 'All marked as read' });
});

// DELETE /notifications/:id
notifications.delete('/:id', async (c) => {
  const authErr = requireAuth(c);
  if (authErr) return authErr;
  const id = c.req.param('id');
  await c.env.DB.prepare('DELETE FROM notifications WHERE id = ?').bind(id).run();
  return jsonResponse({ message: 'Deleted' });
});

// DELETE /notifications
notifications.delete('/', async (c) => {
  const authErr = requireAuth(c);
  if (authErr) return authErr;
  const user = c.get('user');
  await c.env.DB.prepare('DELETE FROM notifications WHERE user_id = ?').bind(user.id).run();
  return jsonResponse({ message: 'All cleared' });
});

// POST /notifications — admin/system creates notification
notifications.post('/', async (c) => {
  const authErr = requireAuth(c);
  if (authErr) return authErr;
  const user = c.get('user');
  if (!['admin'].includes(user.role)) return errorResponse('Forbidden', 403);

  const { userId, type, title, message, actionUrl } = await c.req.json();
  if (!userId || !title || !message) return errorResponse('Missing fields');

  const id = generateId('notif_');
  await c.env.DB.prepare(
    'INSERT INTO notifications (id, user_id, type, title, message, action_url) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(id, userId, type || 'system', title, message, actionUrl || null).run();

  return jsonResponse({ id, message: 'Notification created' }, 201);
});

export default notifications;
