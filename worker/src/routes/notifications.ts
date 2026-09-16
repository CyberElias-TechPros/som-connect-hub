/**
 * SOM CONNECT — /notifications
 */
import { Hono, type Context } from 'hono';
import { audit, type AppEnv } from '../lib/middleware';
import { errorResponse, ok, pagination, readJson } from '../lib/http';
import { generateId } from '../lib/auth';

const notifications = new Hono<AppEnv>();

function mapNotification(row: any) {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    message: row.message,
    isRead: !!row.is_read,
    actionUrl: row.action_url ?? null,
    timestamp: row.created_at,
    createdAt: row.created_at,
  };
}

/* GET /notifications?unread=true */
notifications.get('/', async (c) => {
  const user = c.get('user');
  if (!user) return errorResponse('Authentication required.', 401);

  const unreadOnly = c.req.query('unread') === 'true';
  const type = c.req.query('type');
  const { limit, offset } = pagination(c, 50, 100);

  let where = ' WHERE user_id = ?';
  const params: unknown[] = [user.id];
  if (unreadOnly) where += ' AND is_read = 0';
  if (type && type !== 'all') {
    where += ' AND type = ?';
    params.push(type);
  }

  const [rows, unread, total] = await Promise.all([
    c.env.DB.prepare(`SELECT * FROM notifications${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`)
      .bind(...params, limit, offset)
      .all<any>(),
    c.env.DB.prepare('SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND is_read = 0')
      .bind(user.id)
      .first<{ n: number }>(),
    c.env.DB.prepare(`SELECT COUNT(*) AS n FROM notifications${where}`).bind(...params).first<{ n: number }>(),
  ]);

  const items = (rows.results ?? []).map(mapNotification);
  return ok({ items, unreadCount: unread?.n ?? 0, total: total?.n ?? items.length, limit, offset });
});

/* GET /notifications/unread-count */
notifications.get('/unread-count', async (c) => {
  const user = c.get('user');
  if (!user) return ok({ unreadCount: 0 });
  const row = await c.env.DB.prepare('SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND is_read = 0')
    .bind(user.id)
    .first<{ n: number }>();
  return ok({ unreadCount: row?.n ?? 0 });
});

/* PUT /notifications/read-all (before /:id/read) */
notifications.put('/read-all', async (c) => {
  const user = c.get('user');
  if (!user) return errorResponse('Authentication required.', 401);
  const result = await c.env.DB.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0')
    .bind(user.id)
    .run();
  return ok({ message: 'All notifications marked as read.', updated: result.meta?.changes ?? 0, unreadCount: 0 });
});
notifications.post('/read-all', async (c) => {
  const user = c.get('user');
  if (!user) return errorResponse('Authentication required.', 401);
  await c.env.DB.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').bind(user.id).run();
  return ok({ message: 'All notifications marked as read.', unreadCount: 0 });
});

/* PUT /notifications/:id/read  |  PUT /notifications/:id/unread */
async function setRead(c: Context<AppEnv>, isRead: boolean) {
  const user = c.get('user');
  if (!user) return errorResponse('Authentication required.', 401);
  const id = c.req.param('id');
  await c.env.DB.prepare('UPDATE notifications SET is_read = ? WHERE id = ? AND user_id = ?')
    .bind(isRead ? 1 : 0, id, user.id)
    .run();
  const row = await c.env.DB.prepare('SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND is_read = 0')
    .bind(user.id)
    .first<{ n: number }>();
  return ok({ id, isRead, unreadCount: row?.n ?? 0, message: isRead ? 'Marked as read.' : 'Marked as unread.' });
}

notifications.put('/:id/read', (c) => setRead(c, true));
notifications.post('/:id/read', (c) => setRead(c, true));
notifications.put('/:id/unread', (c) => setRead(c, false));

/* DELETE /notifications — clear all (before /:id) */
notifications.delete('/', async (c) => {
  const user = c.get('user');
  if (!user) return errorResponse('Authentication required.', 401);
  await c.env.DB.prepare('DELETE FROM notifications WHERE user_id = ?').bind(user.id).run();
  return ok({ message: 'All notifications cleared.', unreadCount: 0 });
});

/* DELETE /notifications/:id */
notifications.delete('/:id', async (c) => {
  const user = c.get('user');
  if (!user) return errorResponse('Authentication required.', 401);
  const id = c.req.param('id');
  await c.env.DB.prepare('DELETE FROM notifications WHERE id = ? AND user_id = ?').bind(id, user.id).run();
  return ok({ id, message: 'Notification deleted.' });
});

/* POST /notifications — admin broadcast */
notifications.post('/', async (c) => {
  const user = c.get('user');
  if (!user) return errorResponse('Authentication required.', 401);
  if (user.role !== 'admin') return errorResponse('Only administrators can create notifications.', 403);

  const body = await readJson(c);
  const { userId, type, title, message, actionUrl } = body as any;
  if (!userId || !title || !message) return errorResponse('userId, title and message are required.', 400);

  const id = generateId('notif_');
  await c.env.DB.prepare(
    'INSERT INTO notifications (id, user_id, type, title, message, action_url) VALUES (?, ?, ?, ?, ?, ?)',
  )
    .bind(id, userId, type ?? 'system', title, message, actionUrl ?? null)
    .run();

  audit(c, 'notification.create', 'notification', id, { userId });
  return ok({ id, message: 'Notification created.' }, 201);
});

/* PUT /notifications/settings — persisted per-user preferences */
notifications.put('/settings', async (c) => {
  const user = c.get('user');
  if (!user) return errorResponse('Authentication required.', 401);
  const body = await readJson(c);
  let existing: Record<string, unknown> = {};
  try {
    existing = user.preferences ? JSON.parse(user.preferences) : {};
  } catch {
    existing = {};
  }
  const merged = {
    ...existing,
    notificationSettings: {
      ...((existing as any).notificationSettings ?? {}),
      ...((body.notificationSettings as object) ?? body),
    },
  };
  await c.env.DB.prepare('UPDATE users SET preferences = ?, updated_at = ? WHERE id = ?')
    .bind(JSON.stringify(merged), new Date().toISOString(), user.id)
    .run();
  return ok({ message: 'Notification preferences saved.', preferences: merged });
});

notifications.get('/settings', async (c) => {
  const user = c.get('user');
  if (!user) return errorResponse('Authentication required.', 401);
  let preferences: Record<string, unknown> = {};
  try {
    preferences = user.preferences ? JSON.parse(user.preferences) : {};
  } catch {
    preferences = {};
  }
  return ok({ settings: (preferences as any).notificationSettings ?? {} });
});

export default notifications;
