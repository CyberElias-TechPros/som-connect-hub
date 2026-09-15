/**
 * SOM CONNECT — /playlists
 */
import { Hono } from 'hono';
import { audit, type AppEnv } from '../lib/middleware';
import { errorResponse, ok, readJson } from '../lib/http';
import { generateId } from '../lib/auth';
import { parseJsonField } from '../lib/db';

const playlists = new Hono<AppEnv>();

function mapPlaylist(row: any, contentIds: string[] = []) {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    description: row.description ?? '',
    thumbnail: row.thumbnail ?? 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=600&h=340&fit=crop',
    contentIds,
    itemCount: row.item_count ?? contentIds.length,
    createdDate: row.created_date ?? row.created_at,
    isPublic: !!row.is_public,
    updatedAt: row.updated_at ?? row.created_at,
  };
}

function mapContentRow(row: any) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    thumbnail: row.thumbnail,
    duration: row.duration,
    category: row.category,
    date: row.date,
    views: row.views,
    isPremium: !!row.is_premium,
    tags: parseJsonField<string[]>(row.tags, []),
    speaker: { id: row.speaker_id, name: row.speaker_name, title: row.speaker_title, avatar: row.speaker_avatar },
  };
}

async function loadPlaylistItems(db: D1Database, playlistId: string) {
  const rows = await db
    .prepare(
      `SELECT c.*, s.name AS speaker_name, s.title AS speaker_title, s.avatar AS speaker_avatar
       FROM playlist_items pi
       JOIN content_items c ON pi.content_id = c.id
       JOIN speakers s ON c.speaker_id = s.id
       WHERE pi.playlist_id = ?
       ORDER BY pi.position ASC, pi.added_at ASC`,
    )
    .bind(playlistId)
    .all<any>();
  return (rows.results ?? []).map(mapContentRow);
}

/* GET /playlists */
playlists.get('/', async (c) => {
  const user = c.get('user');
  if (!user) return errorResponse('Authentication required.', 401);
  const q = c.req.query('q');
  const includeItems = c.req.query('items') === 'true';

  let query = `SELECT p.*, (SELECT COUNT(*) FROM playlist_items pi WHERE pi.playlist_id = p.id) AS item_count
               FROM playlists p WHERE p.user_id = ?`;
  const params: unknown[] = [user.id];
  if (q) {
    query += ' AND (p.name LIKE ? OR p.description LIKE ?)';
    params.push(`%${q}%`, `%${q}%`);
  }
  query += ' ORDER BY p.created_at DESC';

  const rows = await c.env.DB.prepare(query).bind(...params).all<any>();
  const items = await Promise.all(
    (rows.results ?? []).map(async (row: any) => {
      const contentIds = includeItems
        ? (await loadPlaylistItems(c.env.DB, row.id)).map((item) => item.id)
        : ((await c.env.DB.prepare('SELECT content_id FROM playlist_items WHERE playlist_id = ? ORDER BY position')
            .bind(row.id)
            .all<any>()).results ?? []).map((r: any) => r.content_id);
      return mapPlaylist(row, contentIds);
    }),
  );

  return ok({ items, total: items.length });
});

/* POST /playlists { name, description?, isPublic?, contentIds? } */
playlists.post('/', async (c) => {
  const user = c.get('user');
  if (!user) return errorResponse('Authentication required.', 401);
  const body = await readJson(c);
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name) return errorResponse('Give your playlist a name.', 400);

  const id = generateId('pl_');
  await c.env.DB.prepare(
    'INSERT INTO playlists (id, user_id, name, description, thumbnail, is_public) VALUES (?, ?, ?, ?, ?, ?)',
  )
    .bind(
      id,
      user.id,
      name,
      typeof body.description === 'string' ? body.description : null,
      typeof body.thumbnail === 'string' && body.thumbnail
        ? body.thumbnail
        : 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=600&h=340&fit=crop',
      body.isPublic ? 1 : 0,
    )
    .run();

  const contentIds = Array.isArray(body.contentIds) ? (body.contentIds as string[]) : [];
  for (let index = 0; index < contentIds.length; index += 1) {
    try {
      await c.env.DB.prepare('INSERT INTO playlist_items (id, playlist_id, content_id, position) VALUES (?, ?, ?, ?)')
        .bind(generateId('pli_'), id, contentIds[index], index)
        .run();
    } catch {
      /* skip duplicates / missing content */
    }
  }

  audit(c, 'playlist.create', 'playlist', id, { name });
  const row = await c.env.DB.prepare('SELECT * FROM playlists WHERE id = ?').bind(id).first<any>();
  return ok({ id, playlist: row ? mapPlaylist(row, contentIds) : { id, name }, message: 'Playlist created.' }, 201);
});

/* GET /playlists/:id */
playlists.get('/:id', async (c) => {
  const id = c.req.param('id');
  const row = await c.env.DB.prepare('SELECT * FROM playlists WHERE id = ?').bind(id).first<any>();
  if (!row) return errorResponse('Playlist not found.', 404);

  const items = await loadPlaylistItems(c.env.DB, id);
  return ok({ ...mapPlaylist(row, items.map((item) => item.id)), items });
});

/* PUT /playlists/:id */
playlists.put('/:id', async (c) => {
  const user = c.get('user');
  if (!user) return errorResponse('Authentication required.', 401);
  const id = c.req.param('id');
  const body = await readJson(c);

  const owner = await c.env.DB.prepare('SELECT user_id FROM playlists WHERE id = ?').bind(id).first<{ user_id: string }>();
  if (!owner) return errorResponse('Playlist not found.', 404);
  if (owner.user_id !== user.id && user.role !== 'admin') return errorResponse('You can only edit your own playlists.', 403);

  const fields: string[] = [];
  const values: unknown[] = [];
  if (typeof body.name === 'string' && body.name.trim()) {
    fields.push('name = ?');
    values.push(body.name.trim());
  }
  if (typeof body.description === 'string') {
    fields.push('description = ?');
    values.push(body.description);
  }
  if (body.isPublic !== undefined) {
    fields.push('is_public = ?');
    values.push(body.isPublic ? 1 : 0);
  }
  if (typeof body.thumbnail === 'string' && body.thumbnail) {
    fields.push('thumbnail = ?');
    values.push(body.thumbnail);
  }
  if (fields.length) {
    values.push(new Date().toISOString(), id);
    await c.env.DB.prepare(`UPDATE playlists SET ${fields.join(', ')}, updated_at = ? WHERE id = ?`)
      .bind(...values)
      .run();
  }

  const row = await c.env.DB.prepare('SELECT * FROM playlists WHERE id = ?').bind(id).first<any>();
  const items = await loadPlaylistItems(c.env.DB, id);
  return ok({ playlist: mapPlaylist(row, items.map((item) => item.id)), items, message: 'Playlist updated.' });
});

/* POST /playlists/:id/items { contentId } */
playlists.post('/:id/items', async (c) => {
  const user = c.get('user');
  if (!user) return errorResponse('Authentication required.', 401);
  const playlistId = c.req.param('id');
  const body = await readJson(c);
  const contentId = typeof body.contentId === 'string' ? body.contentId : '';
  if (!contentId) return errorResponse('contentId is required.', 400);

  const playlist = await c.env.DB.prepare('SELECT id, user_id FROM playlists WHERE id = ?').bind(playlistId).first<any>();
  if (!playlist) return errorResponse('Playlist not found.', 404);
  if (playlist.user_id !== user.id && user.role !== 'admin') return errorResponse('You can only edit your own playlists.', 403);

  const maxPosition = await c.env.DB.prepare('SELECT COALESCE(MAX(position), -1) AS max FROM playlist_items WHERE playlist_id = ?')
    .bind(playlistId)
    .first<{ max: number }>();

  try {
    await c.env.DB.prepare('INSERT INTO playlist_items (id, playlist_id, content_id, position) VALUES (?, ?, ?, ?)')
      .bind(generateId('pli_'), playlistId, contentId, (maxPosition?.max ?? -1) + 1)
      .run();
  } catch (error: any) {
    if (String(error?.message ?? '').includes('UNIQUE')) {
      return ok({ message: 'Already in this playlist.', contentId, alreadyPresent: true });
    }
    throw error;
  }

  await c.env.DB.prepare('UPDATE playlists SET updated_at = ? WHERE id = ?')
    .bind(new Date().toISOString(), playlistId)
    .run();

  const items = await loadPlaylistItems(c.env.DB, playlistId);
  return ok({ message: 'Added to playlist.', contentId, items }, 201);
});

/* DELETE /playlists/:id/items/:contentId */
playlists.delete('/:id/items/:contentId', async (c) => {
  const user = c.get('user');
  if (!user) return errorResponse('Authentication required.', 401);
  const playlistId = c.req.param('id');
  const contentId = c.req.param('contentId');

  const playlist = await c.env.DB.prepare('SELECT user_id FROM playlists WHERE id = ?').bind(playlistId).first<{ user_id: string }>();
  if (!playlist) return errorResponse('Playlist not found.', 404);
  if (playlist.user_id !== user.id && user.role !== 'admin') return errorResponse('You can only edit your own playlists.', 403);

  await c.env.DB.prepare('DELETE FROM playlist_items WHERE playlist_id = ? AND content_id = ?')
    .bind(playlistId, contentId)
    .run();

  return ok({ message: 'Removed from playlist.', contentId });
});

/* DELETE /playlists/:id */
playlists.delete('/:id', async (c) => {
  const user = c.get('user');
  if (!user) return errorResponse('Authentication required.', 401);
  const id = c.req.param('id');

  const playlist = await c.env.DB.prepare('SELECT user_id FROM playlists WHERE id = ?').bind(id).first<{ user_id: string }>();
  if (!playlist) return errorResponse('Playlist not found.', 404);
  if (playlist.user_id !== user.id && user.role !== 'admin') return errorResponse('You can only delete your own playlists.', 403);

  await c.env.DB.prepare('DELETE FROM playlists WHERE id = ?').bind(id).run();
  audit(c, 'playlist.delete', 'playlist', id);
  return ok({ id, message: 'Playlist deleted.' });
});

export default playlists;
