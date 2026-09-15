import { Hono } from 'hono';
import { Env, jsonResponse, errorResponse } from '../lib/db';
import { requireAuth } from './auth';
import { generateId } from '../lib/auth';

const favorites = new Hono<{ Bindings: Env; Variables: { user?: any } }>();

// GET /favorites
favorites.get('/', async (c) => {
  const authErr = requireAuth(c);
  if (authErr) return authErr;
  const user = c.get('user');

  const result = await c.env.DB.prepare(`
    SELECT f.*, c.title, c.thumbnail, c.duration, c.category, s.name as speaker_name, s.avatar as speaker_avatar
    FROM favorites f
    JOIN content_items c ON f.content_id = c.id
    JOIN speakers s ON c.speaker_id = s.id
    WHERE f.user_id = ?
    ORDER BY f.added_at DESC
  `).bind(user.id).all();

  return jsonResponse({ items: result.results || [] });
});

// POST /favorites
favorites.post('/', async (c) => {
  const authErr = requireAuth(c);
  if (authErr) return authErr;
  const user = c.get('user');
  const { contentId, notes } = await c.req.json();
  if (!contentId) return errorResponse('contentId required');

  const id = generateId('fav_');
  try {
    await c.env.DB.prepare('INSERT INTO favorites (id, user_id, content_id, notes) VALUES (?, ?, ?, ?)').bind(id, user.id, contentId, notes || null).run();
  } catch (e: any) {
    if (e.message?.includes('UNIQUE')) {
      // Update notes if already exists
      await c.env.DB.prepare('UPDATE favorites SET notes = ? WHERE user_id = ? AND content_id = ?').bind(notes || null, user.id, contentId).run();
      return jsonResponse({ message: 'Favorite updated' });
    }
    throw e;
  }
  return jsonResponse({ id, message: 'Added to favorites' }, 201);
});

// DELETE /favorites/:contentId
favorites.delete('/:contentId', async (c) => {
  const authErr = requireAuth(c);
  if (authErr) return authErr;
  const user = c.get('user');
  const contentId = c.req.param('contentId');
  await c.env.DB.prepare('DELETE FROM favorites WHERE user_id = ? AND content_id = ?').bind(user.id, contentId).run();
  return jsonResponse({ message: 'Removed from favorites' });
});

// DELETE /favorites (clear all)
favorites.delete('/', async (c) => {
  const authErr = requireAuth(c);
  if (authErr) return authErr;
  const user = c.get('user');
  await c.env.DB.prepare('DELETE FROM favorites WHERE user_id = ?').bind(user.id).run();
  return jsonResponse({ message: 'All favorites cleared' });
});

export default favorites;
