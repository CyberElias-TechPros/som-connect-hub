/**
 * SOM CONNECT — /favorites
 */
import { Hono } from 'hono';
import { audit, type AppEnv } from '../lib/middleware';
import { errorResponse, ok, readJson } from '../lib/http';
import { generateId } from '../lib/auth';
import { parseJsonField } from '../lib/db';

const favorites = new Hono<AppEnv>();

function mapFavorite(row: any) {
  return {
    id: row.id,
    contentId: row.content_id,
    addedAt: row.added_at,
    notes: row.notes ?? '',
    content: row.title
      ? {
          id: row.content_id,
          title: row.title,
          description: row.description,
          thumbnail: row.thumbnail,
          duration: row.duration,
          category: row.category,
          date: row.date,
          views: row.views,
          isPremium: !!row.is_premium,
          tags: parseJsonField<string[]>(row.tags, []),
          speaker: {
            id: row.speaker_id,
            name: row.speaker_name,
            title: row.speaker_title,
            avatar: row.speaker_avatar,
          },
        }
      : undefined,
  };
}

const FAVORITE_SELECT = `
  SELECT f.id, f.content_id, f.notes, f.added_at,
         c.title, c.description, c.thumbnail, c.duration, c.category, c.date, c.views, c.is_premium, c.tags,
         s.id AS speaker_id, s.name AS speaker_name, s.title AS speaker_title, s.avatar AS speaker_avatar
  FROM favorites f
  JOIN content_items c ON f.content_id = c.id
  JOIN speakers s ON c.speaker_id = s.id
`;

/* GET /favorites */
favorites.get('/', async (c) => {
  const user = c.get('user');
  if (!user) return errorResponse('Authentication required.', 401);

  const rows = await c.env.DB.prepare(`${FAVORITE_SELECT} WHERE f.user_id = ? ORDER BY f.added_at DESC`)
    .bind(user.id)
    .all<any>();

  const items = (rows.results ?? []).map(mapFavorite);
  return ok({ items, total: items.length, contentIds: items.map((i) => i.contentId) });
});

/* POST /favorites  { contentId, notes? } */
favorites.post('/', async (c) => {
  const user = c.get('user');
  if (!user) return errorResponse('Authentication required.', 401);
  const body = await readJson(c);
  const contentId = typeof body.contentId === 'string' ? body.contentId : String(body.contentId ?? '');
  if (!contentId) return errorResponse('contentId is required.', 400);

  const exists = await c.env.DB.prepare('SELECT id FROM content_items WHERE id = ?').bind(contentId).first<{ id: string }>();
  if (!exists) return errorResponse('That teaching could not be found.', 404);

  const id = generateId('fav_');
  try {
    await c.env.DB.prepare('INSERT INTO favorites (id, user_id, content_id, notes) VALUES (?, ?, ?, ?)')
      .bind(id, user.id, contentId, typeof body.notes === 'string' ? body.notes : null)
      .run();
  } catch (error: any) {
    if (String(error?.message ?? '').includes('UNIQUE')) {
      await c.env.DB.prepare('UPDATE favorites SET notes = ? WHERE user_id = ? AND content_id = ?')
        .bind(typeof body.notes === 'string' ? body.notes : null, user.id, contentId)
        .run();
      return ok({ id, contentId, isFavorited: true, message: 'Updated your notes.' });
    }
    throw error;
  }

  audit(c, 'favorite.add', 'content', contentId);
  return ok({ id, contentId, isFavorited: true, message: 'Added to favorites.' }, 201);
});

/* DELETE /favorites — clear all (registered before /:contentId) */
favorites.delete('/', async (c) => {
  const user = c.get('user');
  if (!user) return errorResponse('Authentication required.', 401);
  await c.env.DB.prepare('DELETE FROM favorites WHERE user_id = ?').bind(user.id).run();
  return ok({ message: 'All favorites cleared.' });
});

/* DELETE /favorites/:contentId */
favorites.delete('/:contentId', async (c) => {
  const user = c.get('user');
  if (!user) return errorResponse('Authentication required.', 401);
  const contentId = c.req.param('contentId');
  await c.env.DB.prepare('DELETE FROM favorites WHERE user_id = ? AND content_id = ?').bind(user.id, contentId).run();
  return ok({ contentId, isFavorited: false, message: 'Removed from favorites.' });
});

/* POST /favorites/:contentId/toggle */
favorites.post('/:contentId/toggle', async (c) => {
  const user = c.get('user');
  if (!user) return errorResponse('Authentication required.', 401);
  const contentId = c.req.param('contentId');

  const existing = await c.env.DB.prepare('SELECT id FROM favorites WHERE user_id = ? AND content_id = ?')
    .bind(user.id, contentId)
    .first<{ id: string }>();

  if (existing) {
    await c.env.DB.prepare('DELETE FROM favorites WHERE id = ?').bind(existing.id).run();
    return ok({ contentId, isFavorited: false, message: 'Removed from favorites.' });
  }

  await c.env.DB.prepare('INSERT INTO favorites (id, user_id, content_id) VALUES (?, ?, ?)')
    .bind(generateId('fav_'), user.id, contentId)
    .run();
  return ok({ contentId, isFavorited: true, message: 'Added to favorites.' }, 201);
});

export default favorites;
