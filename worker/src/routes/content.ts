/**
 * SOM CONNECT — /content
 * Library listing, detail, search, progress tracking, downloads and
 * continue-watching. Route order matters: static segments are registered
 * before the `/:id` matcher.
 */
import { Hono, type Context } from 'hono';
import { Env, parseJsonField } from '../lib/db';
import { audit, type AppEnv } from '../lib/middleware';
import { errorResponse, normalizeEmail, ok, pagination, readJson, requireFields } from '../lib/http';
import { generateId } from '../lib/auth';

const content = new Hono<AppEnv>();

const CONTENT_SELECT = `
  SELECT c.*, s.name AS speaker_name, s.title AS speaker_title, s.avatar AS speaker_avatar,
         (SELECT COUNT(*) FROM content_items x WHERE x.speaker_id = c.speaker_id) AS speaker_item_count
  FROM content_items c
  JOIN speakers s ON c.speaker_id = s.id
`;

function mapContent(row: any, extras: Record<string, unknown> = {}) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    thumbnail: row.thumbnail,
    duration: row.duration,
    speaker: {
      id: row.speaker_id,
      name: row.speaker_name,
      title: row.speaker_title,
      avatar: row.speaker_avatar,
    },
    date: row.date,
    category: row.category,
    tags: parseJsonField<string[]>(row.tags, []),
    views: row.views ?? 0,
    isPremium: !!row.is_premium,
    videoUrl: row.video_url ?? null,
    audioUrl: row.audio_url ?? null,
    progress: typeof row.progress === 'number' ? row.progress : undefined,
    isFavorited: row.is_favorited === undefined ? undefined : !!row.is_favorited,
    ...extras,
  };
}

/** Attach per-user progress/favourite flags when a bearer token is present. */
async function decorateForUser(c: Context<AppEnv>, items: any[]): Promise<any[]> {
  const user = c.get('user');
  if (!user || !items.length) return items;
  const ids = items.map((item) => item.id);
  const placeholders = ids.map(() => '?').join(',');

  const [progressRows, favoriteRows] = await Promise.all([
    c.env.DB.prepare(`SELECT content_id, progress FROM content_progress WHERE user_id = ? AND content_id IN (${placeholders})`)
      .bind(user.id, ...ids)
      .all<any>(),
    c.env.DB.prepare(`SELECT content_id FROM favorites WHERE user_id = ? AND content_id IN (${placeholders})`)
      .bind(user.id, ...ids)
      .all<any>(),
  ]);

  const progressMap = new Map<string, number>((progressRows.results ?? []).map((r: any) => [r.content_id, r.progress]));
  const favoriteSet = new Set<string>((favoriteRows.results ?? []).map((r: any) => r.content_id));

  return items.map((item) => ({
    ...item,
    progress: progressMap.get(item.id) ?? item.progress,
    isFavorited: favoriteSet.has(item.id),
  }));
}

/* ------------------------------------------------------------------ *
 * GET /content — filter, search, sort, paginate
 * ------------------------------------------------------------------ */
content.get('/', async (c) => {
  const category = c.req.query('category');
  const search = c.req.query('q') ?? c.req.query('search');
  const premium = c.req.query('premium');
  const speakerId = c.req.query('speaker');
  const sort = c.req.query('sort') ?? 'date';
  const { limit, offset } = pagination(c, 24);

  let where = ' WHERE c.published = 1';
  const params: unknown[] = [];

  if (category && category !== 'all') {
    where += ' AND c.category = ?';
    params.push(category);
  }
  if (premium === 'true') where += ' AND c.is_premium = 1';
  else if (premium === 'false') where += ' AND c.is_premium = 0';
  if (speakerId) {
    where += ' AND c.speaker_id = ?';
    params.push(speakerId);
  }
  if (search) {
    where += ' AND (c.title LIKE ? OR c.description LIKE ? OR c.tags LIKE ? OR s.name LIKE ?)';
    const like = `%${search}%`;
    params.push(like, like, like, like);
  }

  const orderBy =
    sort === 'views' ? 'c.views DESC'
    : sort === 'title' ? 'c.title ASC'
    : sort === 'duration' ? 'c.duration ASC'
    : 'c.date DESC, c.created_at DESC';

  const [rows, totals] = await Promise.all([
    c.env.DB.prepare(`${CONTENT_SELECT}${where} ORDER BY ${orderBy} LIMIT ? OFFSET ?`)
      .bind(...params, limit, offset)
      .all<any>(),
    c.env.DB.prepare(
      `SELECT COUNT(*) AS n FROM content_items c JOIN speakers s ON c.speaker_id = s.id${where}`,
    )
      .bind(...params)
      .first<{ n: number }>(),
  ]);

  const items = await decorateForUser(c, (rows.results ?? []).map((row) => mapContent(row)));
  const total = totals?.n ?? items.length;

  return ok({ items, total, limit, offset, hasMore: offset + items.length < total }, 200, {
    'X-Total-Count': String(total),
  });
});

/* ------------------------------------------------------------------ *
 * GET /content/categories
 * ------------------------------------------------------------------ */
content.get('/categories', async (c) => {
  const rows = await c.env.DB.prepare(
    'SELECT category, COUNT(*) AS count FROM content_items WHERE published = 1 GROUP BY category ORDER BY count DESC',
  ).all<any>();
  return ok({ items: rows.results ?? [] });
});

/* ------------------------------------------------------------------ *
 * GET /content/featured — homepage rails (trending, latest, premium, continue)
 * ------------------------------------------------------------------ */
content.get('/featured', async (c) => {
  const [trending, latest, premium, conferences, podcasts, originals] = await Promise.all([
    c.env.DB.prepare(`${CONTENT_SELECT} WHERE c.published = 1 ORDER BY c.views DESC LIMIT 6`).all<any>(),
    c.env.DB.prepare(`${CONTENT_SELECT} WHERE c.published = 1 ORDER BY c.date DESC LIMIT 8`).all<any>(),
    c.env.DB.prepare(`${CONTENT_SELECT} WHERE c.published = 1 AND c.is_premium = 1 ORDER BY c.views DESC LIMIT 6`).all<any>(),
    c.env.DB.prepare(`${CONTENT_SELECT} WHERE c.published = 1 AND c.category = 'conference' ORDER BY c.date DESC LIMIT 6`).all<any>(),
    c.env.DB.prepare(`${CONTENT_SELECT} WHERE c.published = 1 AND c.category = 'podcast' ORDER BY c.date DESC LIMIT 6`).all<any>(),
    c.env.DB.prepare(`${CONTENT_SELECT} WHERE c.published = 1 AND c.category = 'original' ORDER BY c.date DESC LIMIT 6`).all<any>(),
  ]);

  const user = c.get('user');
  let continueWatching: any[] = [];
  if (user) {
    const rows = await c.env.DB.prepare(
      `SELECT c.*, s.name AS speaker_name, s.title AS speaker_title, s.avatar AS speaker_avatar, cp.progress
       FROM content_progress cp
       JOIN content_items c ON cp.content_id = c.id
       JOIN speakers s ON c.speaker_id = s.id
       WHERE cp.user_id = ? AND cp.progress > 0 AND cp.progress < 100 AND c.published = 1
       ORDER BY cp.last_watched_at DESC LIMIT 6`,
    )
      .bind(user.id)
      .all<any>();
    continueWatching = (rows.results ?? []).map((row) => mapContent(row));
  }

  return ok({
    trending: (trending.results ?? []).map((row) => mapContent(row)),
    latest: (latest.results ?? []).map((row) => mapContent(row)),
    premium: (premium.results ?? []).map((row) => mapContent(row)),
    continueWatching,
    rails: [
      { id: 'conference', title: 'Conferences', items: (conferences.results ?? []).map((row) => mapContent(row)) },
      { id: 'podcast', title: 'Podcasts', items: (podcasts.results ?? []).map((row) => mapContent(row)) },
      { id: 'original', title: 'Originals', items: (originals.results ?? []).map((row) => mapContent(row)) },
    ],
  });
});

/* ------------------------------------------------------------------ *
 * GET /content/user/continue — must precede /:id
 * ------------------------------------------------------------------ */
content.get('/user/continue', async (c) => {
  const user = c.get('user');
  if (!user) return errorResponse('Authentication required.', 401);

  const rows = await c.env.DB.prepare(
    `SELECT c.*, s.name AS speaker_name, s.title AS speaker_title, s.avatar AS speaker_avatar, cp.progress, cp.last_watched_at
     FROM content_progress cp
     JOIN content_items c ON cp.content_id = c.id
     JOIN speakers s ON c.speaker_id = s.id
     WHERE cp.user_id = ? AND cp.progress > 0 AND cp.progress < 100
     ORDER BY cp.last_watched_at DESC LIMIT 10`,
  )
    .bind(user.id)
    .all<any>();

  return ok({ items: (rows.results ?? []).map((row) => mapContent(row)), continueWatching: (rows.results ?? []).map((row) => mapContent(row)) });
});

/* ------------------------------------------------------------------ *
 * GET /content/user/progress — every progress row for the user
 * ------------------------------------------------------------------ */
content.get('/user/progress', async (c) => {
  const user = c.get('user');
  if (!user) return errorResponse('Authentication required.', 401);
  const rows = await c.env.DB.prepare(
    'SELECT content_id, progress, position_seconds, completed, last_watched_at FROM content_progress WHERE user_id = ?',
  )
    .bind(user.id)
    .all<any>();
  const items = (rows.results ?? []).map((row: any) => ({
    contentId: row.content_id,
    progress: row.progress,
    positionSeconds: row.position_seconds,
    completed: !!row.completed,
    lastWatchedAt: row.last_watched_at,
  }));
  return ok({ items, map: Object.fromEntries(items.map((i) => [i.contentId, i.progress])) });
});

/* ------------------------------------------------------------------ *
 * GET /content/downloads
 * ------------------------------------------------------------------ */
content.get('/downloads', async (c) => {
  const user = c.get('user');
  if (!user) return errorResponse('Authentication required.', 401);
  const rows = await c.env.DB.prepare(
    `SELECT d.*, c.title, c.thumbnail, c.duration FROM downloads d
     JOIN content_items c ON d.content_id = c.id
     WHERE d.user_id = ? ORDER BY d.created_at DESC`,
  )
    .bind(user.id)
    .all<any>();
  return ok({ items: rows.results ?? [] });
});

/* ------------------------------------------------------------------ *
 * GET /content/:id
 * ------------------------------------------------------------------ */
content.get('/:id', async (c) => {
  const id = c.req.param('id');
  const row = await c.env.DB.prepare(`${CONTENT_SELECT} WHERE c.id = ?`).bind(id).first<any>();
  if (!row) return errorResponse('That teaching could not be found.', 404);

  // View counter (fire and forget).
  c.executionCtx?.waitUntil?.(
    c.env.DB.prepare('UPDATE content_items SET views = views + 1 WHERE id = ?').bind(id).run().catch(() => undefined),
  );

  const [related, decorated] = await Promise.all([
    c.env.DB.prepare(
      `${CONTENT_SELECT} WHERE c.published = 1 AND c.id != ? AND (c.category = ? OR c.speaker_id = ?) ORDER BY c.views DESC LIMIT 6`,
    )
      .bind(id, row.category, row.speaker_id)
      .all<any>(),
    decorateForUser(c, [mapContent({ ...row, views: (row.views ?? 0) + 1 })]),
  ]);

  return ok({ ...decorated[0], related: (related.results ?? []).map((r) => mapContent(r)) });
});

/* ------------------------------------------------------------------ *
 * POST /content — pastor/admin publish directly
 * ------------------------------------------------------------------ */
content.post('/', async (c) => {
  const user = c.get('user');
  if (!user) return errorResponse('Authentication required.', 401);
  if (!['pastor', 'admin'].includes(user.role)) {
    return errorResponse('Only pastors and admins can publish content.', 403);
  }

  const body = await readJson(c);
  const missing = requireFields(body, ['title', 'description', 'category']);
  if (missing.length) return errorResponse(`Missing required fields: ${missing.join(', ')}.`, 400);

  const speakerId = typeof body.speakerId === 'string' && body.speakerId ? body.speakerId : (await defaultSpeakerId(c.env));
  const id = generateId('c_');

  await c.env.DB.prepare(
    `INSERT INTO content_items (id, title, description, thumbnail, duration, speaker_id, date, category, tags, is_premium, video_url)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      id,
      body.title,
      body.description,
      body.thumbnail || 'https://images.unsplash.com/photo-1507692049790-de58290a4334?w=600&h=340&fit=crop',
      body.duration || '45:00',
      speakerId,
      body.date || new Date().toISOString().slice(0, 10),
      body.category,
      JSON.stringify(Array.isArray(body.tags) ? body.tags : []),
      body.isPremium ? 1 : 0,
      body.videoUrl ?? null,
    )
    .run();

  audit(c, 'content.create', 'content', id, { title: body.title });
  try {
    await c.env.QUEUE?.send({ type: 'new_content', contentId: id, title: body.title });
  } catch {
    /* queue optional */
  }

  const row = await c.env.DB.prepare(`${CONTENT_SELECT} WHERE c.id = ?`).bind(id).first<any>();
  return ok({ item: row ? mapContent(row) : { id }, id, message: 'Content published.' }, 201);
});

async function defaultSpeakerId(env: Env): Promise<string> {
  const row = await env.DB.prepare('SELECT id FROM speakers ORDER BY id LIMIT 1').first<{ id: string }>();
  return row?.id ?? '1';
}

/* ------------------------------------------------------------------ *
 * POST /content/:id/progress
 * ------------------------------------------------------------------ */
content.post('/:id/progress', async (c) => {
  const user = c.get('user');
  if (!user) return errorResponse('Authentication required.', 401);
  const contentId = c.req.param('id');
  const body = await readJson(c);
  const progress = Math.max(0, Math.min(100, Math.round(Number(body.progress ?? 0))));
  const position = Math.max(0, Math.round(Number(body.positionSeconds ?? 0)));

  const exists = await c.env.DB.prepare('SELECT id FROM content_items WHERE id = ?').bind(contentId).first<{ id: string }>();
  if (!exists) return errorResponse('That teaching could not be found.', 404, 'not_found', { contentId });

  await c.env.DB.prepare(
    `INSERT INTO content_progress (id, user_id, content_id, progress, position_seconds, completed, last_watched_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id, content_id) DO UPDATE SET
       progress = excluded.progress,
       position_seconds = excluded.position_seconds,
       completed = excluded.completed,
       last_watched_at = excluded.last_watched_at`,
  )
    .bind(
      `prog_${user.id}_${contentId}`,
      user.id,
      contentId,
      progress,
      position,
      progress >= 95 ? 1 : 0,
      new Date().toISOString(),
    )
    .run();

  return ok({ message: 'Progress saved.', progress, positionSeconds: position, contentId });
});

/* ------------------------------------------------------------------ *
 * POST /content/:id/download — register an offline download
 * ------------------------------------------------------------------ */
content.post('/:id/download', async (c) => {
  const user = c.get('user');
  if (!user) return errorResponse('Authentication required.', 401);
  const contentId = c.req.param('id');
  const item = await c.env.DB.prepare('SELECT id, title FROM content_items WHERE id = ?').bind(contentId).first<any>();
  if (!item) return errorResponse('That teaching could not be found.', 404);

  await c.env.DB.prepare(
    `INSERT INTO downloads (id, user_id, content_id, size_mb, status) VALUES (?, ?, ?, ?, 'ready')
     ON CONFLICT(user_id, content_id) DO UPDATE SET status = 'ready'`,
  )
    .bind(generateId('dl_'), user.id, contentId, Math.round((300 + Math.random() * 400) * 10) / 10)
    .run();

  return ok({ message: `"${item.title}" is available offline.`, contentId, status: 'ready' });
});

content.delete('/:id/download', async (c) => {
  const user = c.get('user');
  if (!user) return errorResponse('Authentication required.', 401);
  await c.env.DB.prepare('DELETE FROM downloads WHERE user_id = ? AND content_id = ?')
    .bind(user.id, c.req.param('id'))
    .run();
  return ok({ message: 'Removed from downloads.' });
});

export default content;
export { mapContent, CONTENT_SELECT, decorateForUser };
