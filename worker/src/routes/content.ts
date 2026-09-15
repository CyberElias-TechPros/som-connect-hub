import { Hono } from 'hono';
import { Env, jsonResponse, errorResponse, parseJsonField } from '../lib/db';
import { requireAuth } from './auth';
import { validate, contentCreateSchema } from '../lib/validators';
import { generateId } from '../lib/auth';
import { cacheGet, cacheSet, CacheKeys } from '../lib/cache';
import { auditLog, getClientInfo } from '../lib/audit';

const content = new Hono<{ Bindings: Env; Variables: { user?: any } }>();

// GET /content — list with filtering, search, pagination, cache
content.get('/', async (c) => {
  const category = c.req.query('category');
  const search = c.req.query('q') || c.req.query('search');
  const premium = c.req.query('premium');
  const language = c.req.query('language');
  const limit = Math.min(parseInt(c.req.query('limit') || '20'), 100);
  const offset = parseInt(c.req.query('offset') || '0');
  const sort = c.req.query('sort') || 'date'; // date, views, title, likes

  const cacheKey = CacheKeys.contentList(sort, limit, offset, category, search);
  if (!search) {
    const cached = await cacheGet<any[]>(c.env, cacheKey);
    if (cached) return jsonResponse({ items: cached, total: cached.length, limit, offset, cached: true });
  }

  let query = `
    SELECT c.*, s.name as speaker_name, s.title as speaker_title, s.avatar as speaker_avatar, s.bio as speaker_bio
    FROM content_items c
    JOIN speakers s ON c.speaker_id = s.id
    WHERE c.is_published = 1
  `;
  const params: any[] = [];

  if (category && category !== 'all') {
    query += ' AND c.category = ?';
    params.push(category);
  }
  if (premium === 'true') {
    query += ' AND c.is_premium = 1';
  } else if (premium === 'false') {
    query += ' AND c.is_premium = 0';
  }
  if (language) {
    query += ' AND c.language = ?';
    params.push(language);
  }
  if (search) {
    query += ' AND (c.title LIKE ? OR c.description LIKE ? OR c.tags LIKE ? OR s.name LIKE ?)';
    const like = `%${search}%`;
    params.push(like, like, like, like);
  }

  // Sorting
  if (sort === 'views') query += ' ORDER BY c.views DESC';
  else if (sort === 'likes') query += ' ORDER BY c.likes DESC';
  else if (sort === 'title') query += ' ORDER BY c.title ASC';
  else query += ' ORDER BY c.date DESC';

  query += ' LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const result = await c.env.DB.prepare(query).bind(...params).all();
  const items = (result.results || []).map((row: any) => ({
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
      bio: row.speaker_bio,
    },
    date: row.date,
    category: row.category,
    tags: parseJsonField<string[]>(row.tags, []),
    views: row.views,
    likes: row.likes,
    isPremium: !!row.is_premium,
    videoUrl: row.video_url,
    audioUrl: row.audio_url,
    language: row.language,
  }));

  if (!search) {
    await cacheSet(c.env, cacheKey, items, 300);
  }

  // Total count for pagination (approx)
  let total = items.length;
  if (offset === 0 && items.length === limit) {
    try {
      const countQuery = query.replace(/SELECT c\.\*,.*FROM/, 'SELECT COUNT(*) as cnt FROM').split('ORDER BY')[0];
      const countParams = params.slice(0, -2);
      const countResult = await c.env.DB.prepare(countQuery).bind(...countParams).first() as any;
      total = countResult?.cnt || items.length;
    } catch {}
  }

  return jsonResponse({ items, total, limit, offset });
});

// GET /content/trending — trending content
content.get('/trending', async (c) => {
  const cached = await cacheGet<any[]>(c.env, CacheKeys.trending);
  if (cached) return jsonResponse({ items: cached, cached: true });

  const result = await c.env.DB.prepare(`
    SELECT c.*, s.name as speaker_name, s.title as speaker_title, s.avatar as speaker_avatar
    FROM content_items c
    JOIN speakers s ON c.speaker_id = s.id
    WHERE c.is_published = 1
    ORDER BY c.views DESC, c.likes DESC
    LIMIT 10
  `).all();

  const items = (result.results || []).map((row: any) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    thumbnail: row.thumbnail,
    duration: row.duration,
    speaker: { id: row.speaker_id, name: row.speaker_name, title: row.speaker_title, avatar: row.speaker_avatar },
    date: row.date,
    category: row.category,
    tags: parseJsonField<string[]>(row.tags, []),
    views: row.views,
    likes: row.likes,
    isPremium: !!row.is_premium,
  }));

  await cacheSet(c.env, CacheKeys.trending, items, 600);
  return jsonResponse({ items });
});

// GET /content/user/continue — continue watching (must be before /:id)
content.get('/user/continue', async (c) => {
  const authErr = requireAuth(c);
  if (authErr) return authErr;
  const user = c.get('user') as any;

  const result = await c.env.DB.prepare(`
    SELECT c.*, s.name as speaker_name, s.title as speaker_title, s.avatar as speaker_avatar, cp.progress, cp.watched_seconds
    FROM content_progress cp
    JOIN content_items c ON cp.content_id = c.id
    JOIN speakers s ON c.speaker_id = s.id
    WHERE cp.user_id = ? AND cp.progress > 0 AND cp.progress < 100
    ORDER BY cp.last_watched_at DESC
    LIMIT 10
  `).bind(user.id).all();

  const items = (result.results || []).map((row: any) => ({
    id: row.id,
    title: row.title,
    thumbnail: row.thumbnail,
    duration: row.duration,
    speaker: { name: row.speaker_name, avatar: row.speaker_avatar },
    progress: row.progress,
    watchedSeconds: row.watched_seconds,
  }));

  return jsonResponse({ items });
});

// GET /content/:id
content.get('/:id', async (c) => {
  const id = c.req.param('id');
  const row = await c.env.DB.prepare(`
    SELECT c.*, s.name as speaker_name, s.title as speaker_title, s.avatar as speaker_avatar, s.bio as speaker_bio
    FROM content_items c
    JOIN speakers s ON c.speaker_id = s.id
    WHERE c.id = ?
  `).bind(id).first() as any;

  if (!row) return errorResponse('Content not found', 404);

  // Increment views async (don't block)
  c.executionCtx.waitUntil(
    (async () => {
      try {
        await c.env.DB.prepare('UPDATE content_items SET views = views + 1 WHERE id = ?').bind(id).run();
        // Also track in analytics
        const viewId = generateId('cv_');
        const user = c.get('user') as any;
        await c.env.DB.prepare('INSERT INTO content_views (id, content_id, user_id) VALUES (?, ?, ?)').bind(viewId, id, user?.id || null).run();
      } catch {}
    })()
  );

  // Get related content
  const related = await c.env.DB.prepare(`
    SELECT c.*, s.name as speaker_name, s.avatar as speaker_avatar
    FROM content_items c
    JOIN speakers s ON c.speaker_id = s.id
    WHERE c.category = ? AND c.id != ? AND c.is_published = 1
    ORDER BY c.views DESC
    LIMIT 4
  `).bind(row.category, id).all();

  const user = c.get('user') as any;
  let userProgress = null;
  let isFavorited = false;
  let isLiked = false;

  if (user) {
    const progress = await c.env.DB.prepare('SELECT progress FROM content_progress WHERE user_id = ? AND content_id = ?').bind(user.id, id).first() as any;
    userProgress = progress?.progress || null;

    const fav = await c.env.DB.prepare('SELECT id FROM favorites WHERE user_id = ? AND content_id = ?').bind(user.id, id).first();
    isFavorited = !!fav;

    const like = await c.env.DB.prepare('SELECT id FROM content_likes WHERE user_id = ? AND content_id = ?').bind(user.id, id).first();
    isLiked = !!like;
  }

  return jsonResponse({
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
      bio: row.speaker_bio,
    },
    date: row.date,
    category: row.category,
    tags: parseJsonField<string[]>(row.tags, []),
    views: row.views + 1,
    likes: row.likes,
    isPremium: !!row.is_premium,
    videoUrl: row.video_url,
    audioUrl: row.audio_url,
    language: row.language,
    transcript: row.transcript,
    userProgress,
    isFavorited,
    isLiked,
    related: (related.results || []).map((r: any) => ({
      id: r.id,
      title: r.title,
      thumbnail: r.thumbnail,
      duration: r.duration,
      speaker: { name: r.speaker_name, avatar: r.speaker_avatar },
      views: r.views,
      category: r.category,
    })),
  });
});

// POST /content — pastor/admin only
content.post('/', async (c) => {
  const authErr = requireAuth(c);
  if (authErr) return authErr;
  const user = c.get('user') as any;
  if (!['pastor', 'admin'].includes(user.role)) return errorResponse('Forbidden: pastor or admin only', 403);

  const body = await c.req.json();
  const v = validate(contentCreateSchema, body);
  if (!v.success) return errorResponse(v.error, 400);

  const id = generateId('c_');
  await c.env.DB.prepare(`
    INSERT INTO content_items (id, title, description, thumbnail, duration, speaker_id, date, category, tags, is_premium, video_url)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    v.data.title,
    v.data.description,
    v.data.thumbnail || 'https://images.unsplash.com/photo-1507692049790-de58290a4334?w=600&h=340&fit=crop',
    v.data.duration,
    v.data.speakerId,
    new Date().toISOString().split('T')[0],
    v.data.category,
    JSON.stringify(v.data.tags),
    v.data.isPremium ? 1 : 0,
    v.data.videoUrl || null
  ).run();

  const { ip, ua } = getClientInfo(c);
  await auditLog(c.env.DB, user.id, 'content.create', 'content', id, v.data, ip, ua);

  // Invalidate caches
  await c.env.CACHE.delete(CacheKeys.trending);
  try {
    const keys = await c.env.CACHE.list({ prefix: 'content:list:' });
    for (const k of keys.keys) await c.env.CACHE.delete(k.name);
  } catch {}

  // Notify via queue
  try {
    await c.env.QUEUE.send({ type: 'new_content', contentId: id, title: v.data.title });
  } catch {}

  return jsonResponse({ id, message: 'Content created' }, 201);
});

// PUT /content/:id — pastor/admin only
content.put('/:id', async (c) => {
  const authErr = requireAuth(c);
  if (authErr) return authErr;
  const user = c.get('user') as any;
  if (!['pastor', 'admin'].includes(user.role)) return errorResponse('Forbidden', 403);

  const id = c.req.param('id');
  const body = await c.req.json();
  const v = validate(contentCreateSchema.partial(), body);
  if (!v.success) return errorResponse(v.error, 400);

  const updates = v.data as any;
  if (Object.keys(updates).length === 0) return errorResponse('No fields to update', 400);

  // Map frontend fields to DB columns
  const fieldMap: Record<string, string> = {
    speakerId: 'speaker_id',
    isPremium: 'is_premium',
    videoUrl: 'video_url',
  };

  const setClauses: string[] = [];
  const values: any[] = [];

  for (const [key, val] of Object.entries(updates)) {
    const col = fieldMap[key] || key;
    if (col === 'tags') {
      setClauses.push(`${col} = ?`);
      values.push(JSON.stringify(val));
    } else if (col === 'is_premium') {
      setClauses.push(`${col} = ?`);
      values.push(val ? 1 : 0);
    } else {
      setClauses.push(`${col} = ?`);
      values.push(val);
    }
  }

  setClauses.push('updated_at = ?');
  values.push(new Date().toISOString());
  values.push(id);

  await c.env.DB.prepare(`UPDATE content_items SET ${setClauses.join(', ')} WHERE id = ?`).bind(...values).run();

  await c.env.CACHE.delete(CacheKeys.trending);

  return jsonResponse({ message: 'Content updated', id });
});

// DELETE /content/:id — admin only
content.delete('/:id', async (c) => {
  const authErr = requireAuth(c);
  if (authErr) return authErr;
  const user = c.get('user') as any;
  if (user.role !== 'admin') return errorResponse('Forbidden: admin only', 403);

  const id = c.req.param('id');
  await c.env.DB.prepare('DELETE FROM content_items WHERE id = ?').bind(id).run();

  const { ip, ua } = getClientInfo(c);
  await auditLog(c.env.DB, user.id, 'content.delete', 'content', id, null, ip, ua);

  await c.env.CACHE.delete(CacheKeys.trending);

  return jsonResponse({ message: 'Content deleted', id });
});

// POST /content/:id/like — toggle like
content.post('/:id/like', async (c) => {
  const authErr = requireAuth(c);
  if (authErr) return authErr;
  const user = c.get('user') as any;
  const contentId = c.req.param('id');

  const likeId = generateId('cl_');
  try {
    await c.env.DB.prepare('INSERT INTO content_likes (id, user_id, content_id) VALUES (?, ?, ?)').bind(likeId, user.id, contentId).run();
    await c.env.DB.prepare('UPDATE content_items SET likes = likes + 1 WHERE id = ?').bind(contentId).run();
    return jsonResponse({ liked: true, message: 'Liked' });
  } catch (e: any) {
    if (e.message?.includes('UNIQUE')) {
      await c.env.DB.prepare('DELETE FROM content_likes WHERE user_id = ? AND content_id = ?').bind(user.id, contentId).run();
      await c.env.DB.prepare('UPDATE content_items SET likes = MAX(0, likes - 1) WHERE id = ?').bind(contentId).run();
      return jsonResponse({ liked: false, message: 'Unliked' });
    }
    throw e;
  }
});

// POST /content/:id/progress
content.post('/:id/progress', async (c) => {
  const authErr = requireAuth(c);
  if (authErr) return authErr;
  const user = c.get('user') as any;
  const contentId = c.req.param('id');
  const { progress, watchedSeconds } = await c.req.json() as any;

  if (progress === undefined || progress < 0 || progress > 100) return errorResponse('Invalid progress (0-100)', 400);

  const id = generateId('prog_');
  const now = new Date().toISOString();
  const completedAt = progress >= 95 ? now : null;

  await c.env.DB.prepare(`
    INSERT INTO content_progress (id, user_id, content_id, progress, watched_seconds, last_watched_at, completed_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id, content_id) DO UPDATE SET progress = ?, watched_seconds = ?, last_watched_at = ?, completed_at = COALESCE(?, completed_at)
  `).bind(id, user.id, contentId, progress, watchedSeconds || 0, now, completedAt, progress, watchedSeconds || 0, now, completedAt).run();

  return jsonResponse({ message: 'Progress saved', progress, watchedSeconds });
});

export default content;
