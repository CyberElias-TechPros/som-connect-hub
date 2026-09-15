import { Hono } from 'hono';
import { Env, jsonResponse, errorResponse } from '../lib/db';
import { requireAuth } from './auth';
import { generateId } from '../lib/auth';

const playlists = new Hono<{ Bindings: Env; Variables: { user?: any } }>();

// GET /playlists
playlists.get('/', async (c) => {
  const authErr = requireAuth(c);
  if (authErr) return authErr;
  const user = c.get('user');
  const q = c.req.query('q');

  let query = 'SELECT * FROM playlists WHERE user_id = ?';
  const params: any[] = [user.id];
  if (q) {
    query += ' AND name LIKE ?';
    params.push(`%${q}%`);
  }
  query += ' ORDER BY created_at DESC';

  const result = await c.env.DB.prepare(query).bind(...params).all();
  // Get item counts
  const items = await Promise.all((result.results || []).map(async (pl: any) => {
    const count = await c.env.DB.prepare('SELECT COUNT(*) as cnt FROM playlist_items WHERE playlist_id = ?').bind(pl.id).first() as any;
    return { ...pl, contentIds: [], itemCount: count?.cnt || 0, isPublic: !!pl.is_public };
  }));

  return jsonResponse({ items });
});

// POST /playlists
playlists.post('/', async (c) => {
  const authErr = requireAuth(c);
  if (authErr) return authErr;
  const user = c.get('user');
  const { name, description, thumbnail, isPublic } = await c.req.json();
  if (!name) return errorResponse('Name required');

  const id = generateId('pl_');
  await c.env.DB.prepare(
    'INSERT INTO playlists (id, user_id, name, description, thumbnail, is_public) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(id, user.id, name, description || null, thumbnail || 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=600&h=340&fit=crop', isPublic ? 1 : 0).run();

  return jsonResponse({ id, message: 'Playlist created' }, 201);
});

// GET /playlists/:id
playlists.get('/:id', async (c) => {
  const id = c.req.param('id');
  const pl = await c.env.DB.prepare('SELECT * FROM playlists WHERE id = ?').bind(id).first() as any;
  if (!pl) return errorResponse('Playlist not found', 404);

  const itemsResult = await c.env.DB.prepare(`
    SELECT c.*, s.name as speaker_name, s.avatar as speaker_avatar
    FROM playlist_items pi
    JOIN content_items c ON pi.content_id = c.id
    JOIN speakers s ON c.speaker_id = s.id
    WHERE pi.playlist_id = ?
    ORDER BY pi.position ASC, pi.added_at ASC
  `).bind(id).all();

  return jsonResponse({ ...pl, isPublic: !!pl.is_public, items: itemsResult.results || [] });
});

// POST /playlists/:id/items
playlists.post('/:id/items', async (c) => {
  const authErr = requireAuth(c);
  if (authErr) return authErr;
  const playlistId = c.req.param('id');
  const { contentId } = await c.req.json();
  if (!contentId) return errorResponse('contentId required');

  const id = generateId('pli_');
  try {
    await c.env.DB.prepare('INSERT INTO playlist_items (id, playlist_id, content_id) VALUES (?, ?, ?)').bind(id, playlistId, contentId).run();
  } catch (e: any) {
    if (e.message?.includes('UNIQUE')) return jsonResponse({ message: 'Already in playlist' });
    throw e;
  }
  return jsonResponse({ message: 'Added to playlist' }, 201);
});

// DELETE /playlists/:id/items/:contentId
playlists.delete('/:id/items/:contentId', async (c) => {
  const playlistId = c.req.param('id');
  const contentId = c.req.param('contentId');
  await c.env.DB.prepare('DELETE FROM playlist_items WHERE playlist_id = ? AND content_id = ?').bind(playlistId, contentId).run();
  return jsonResponse({ message: 'Removed from playlist' });
});

// DELETE /playlists/:id
playlists.delete('/:id', async (c) => {
  const authErr = requireAuth(c);
  if (authErr) return authErr;
  const id = c.req.param('id');
  await c.env.DB.prepare('DELETE FROM playlists WHERE id = ?').bind(id).run();
  return jsonResponse({ message: 'Playlist deleted' });
});

export default playlists;
