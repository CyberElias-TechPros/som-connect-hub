import { Hono } from 'hono';
import { Env, jsonResponse, errorResponse } from '../lib/db';
import { requireAuth, requireRole } from './auth';
import { validate, speakerSchema } from '../lib/validators';
import { generateId } from '../lib/auth';
import { cacheGet, cacheSet, CacheKeys } from '../lib/cache';
import { auditLog, getClientInfo } from '../lib/audit';

const speakers = new Hono<{ Bindings: Env; Variables: { user?: any } }>();

// GET /speakers
speakers.get('/', async (c) => {
  const cached = await cacheGet<any[]>(c.env, CacheKeys.speakers);
  if (cached) return jsonResponse({ items: cached });

  const result = await c.env.DB.prepare('SELECT * FROM speakers ORDER BY content_count DESC').all();
  const items = result.results || [];

  await cacheSet(c.env, CacheKeys.speakers, items, 3600);
  return jsonResponse({ items });
});

// GET /speakers/:id
speakers.get('/:id', async (c) => {
  const id = c.req.param('id');
  const speaker = await c.env.DB.prepare('SELECT * FROM speakers WHERE id = ?').bind(id).first();
  if (!speaker) return errorResponse('Speaker not found', 404);

  const contentResult = await c.env.DB.prepare('SELECT COUNT(*) as cnt, SUM(views) as totalViews FROM content_items WHERE speaker_id = ?').bind(id).first() as any;
  const recent = await c.env.DB.prepare('SELECT * FROM content_items WHERE speaker_id = ? ORDER BY date DESC LIMIT 5').bind(id).all();

  return jsonResponse({
    ...(speaker as any),
    stats: {
      contentCount: contentResult?.cnt || 0,
      totalViews: contentResult?.totalViews || 0,
    },
    recentContent: recent.results || [],
  });
});

// POST /speakers — admin only
speakers.post('/', async (c) => {
  const authErr = requireAuth(c);
  if (authErr) return authErr;
  const user = c.get('user') as any;
  if (user.role !== 'admin') return errorResponse('Forbidden', 403);

  const body = await c.req.json();
  const v = validate(speakerSchema, body);
  if (!v.success) return errorResponse(v.error, 400);

  const id = generateId('spk_');
  await c.env.DB.prepare('INSERT INTO speakers (id, name, title, avatar, bio) VALUES (?, ?, ?, ?, ?)').bind(id, v.data.name, v.data.title, v.data.avatar, v.data.bio || null).run();

  const { ip, ua } = getClientInfo(c);
  await auditLog(c.env.DB, user.id, 'speaker.create', 'speaker', id, v.data, ip, ua);

  await c.env.CACHE.delete(CacheKeys.speakers);
  return jsonResponse({ id, message: 'Speaker created' }, 201);
});

// PUT /speakers/:id — admin only
speakers.put('/:id', async (c) => {
  const authErr = requireAuth(c);
  if (authErr) return authErr;
  const user = c.get('user') as any;
  if (user.role !== 'admin') return errorResponse('Forbidden', 403);

  const id = c.req.param('id');
  const body = await c.req.json();
  const v = validate(speakerSchema.partial(), body);
  if (!v.success) return errorResponse(v.error, 400);

  const updates = v.data as any;
  const setClause = Object.keys(updates).map(k => `${k} = ?`).join(', ');
  if (!setClause) return errorResponse('No fields to update', 400);

  const values = Object.values(updates);
  await c.env.DB.prepare(`UPDATE speakers SET ${setClause}, updated_at = ? WHERE id = ?`).bind(...values, new Date().toISOString(), id).run();

  await c.env.CACHE.delete(CacheKeys.speakers);
  return jsonResponse({ message: 'Speaker updated', id });
});

// DELETE /speakers/:id — admin only
speakers.delete('/:id', async (c) => {
  const authErr = requireAuth(c);
  if (authErr) return authErr;
  const user = c.get('user') as any;
  if (user.role !== 'admin') return errorResponse('Forbidden', 403);

  const id = c.req.param('id');
  await c.env.DB.prepare('DELETE FROM speakers WHERE id = ?').bind(id).run();
  await c.env.CACHE.delete(CacheKeys.speakers);
  return jsonResponse({ message: 'Speaker deleted' });
});

export default speakers;
