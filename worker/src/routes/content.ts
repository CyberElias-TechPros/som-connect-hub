import { Hono } from 'hono';
import { Env, jsonResponse, errorResponse, parseJsonField } from '../lib/db';
import { requireAuth } from './auth';

const content = new Hono<{ Bindings: Env; Variables: { user?: any } }>();

// GET /content — list with filtering, search, pagination
content.get('/', async (c) => {
  const category = c.req.query('category');
  const search = c.req.query('q') || c.req.query('search');
  const premium = c.req.query('premium');
  const limit = Math.min(parseInt(c.req.query('limit') || '20'), 100);
  const offset = parseInt(c.req.query('offset') || '0');
  const sort = c.req.query('sort') || 'date'; // date, views, title

  let query = `
    SELECT c.*, s.name as speaker_name, s.title as speaker_title, s.avatar as speaker_avatar
    FROM content_items c
    JOIN speakers s ON c.speaker_id = s.id
    WHERE 1=1
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
  if (search) {
    query += ' AND (c.title LIKE ? OR c.description LIKE ? OR c.tags LIKE ?)';
    const like = `%${search}%`;
    params.push(like, like, like);
  }

  // Sorting
  if (sort === 'views') query += ' ORDER BY c.views DESC';
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
    },
    date: row.date,
    category: row.category,
    tags: parseJsonField<string[]>(row.tags, []),
    views: row.views,
    isPremium: !!row.is_premium,
    videoUrl: row.video_url,
  }));

  // Cache trending in KV
  try {
    if (!search && !category) {
      await c.env.CACHE.put(`content:list:${sort}:${limit}:${offset}`, JSON.stringify(items), { expirationTtl: 300 });
    }
  } catch {}

  return jsonResponse({ items, total: items.length, limit, offset });
});

// GET /content/:id
content.get('/:id', async (c) => {
  const id = c.req.param('id');
  const row = await c.env.DB.prepare(`
    SELECT c.*, s.name as speaker_name, s.title as speaker_title, s.avatar as speaker_avatar
    FROM content_items c
    JOIN speakers s ON c.speaker_id = s.id
    WHERE c.id = ?
  `).bind(id).first() as any;

  if (!row) return errorResponse('Content not found', 404);

  // Increment views
  try {
    await c.env.DB.prepare('UPDATE content_items SET views = views + 1 WHERE id = ?').bind(id).run();
  } catch {}

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
    },
    date: row.date,
    category: row.category,
    tags: parseJsonField<string[]>(row.tags, []),
    views: row.views + 1,
    isPremium: !!row.is_premium,
    videoUrl: row.video_url,
  });
});

// POST /content — pastor/admin only
content.post('/', async (c) => {
  const authErr = requireAuth(c);
  if (authErr) return authErr;
  const user = c.get('user');
  if (!['pastor', 'admin'].includes(user.role)) return errorResponse('Forbidden', 403);

  const { title, description, thumbnail, duration, speakerId, category, tags, isPremium, videoUrl } = await c.req.json();
  if (!title || !description || !category) return errorResponse('Missing fields');

  const id = `c_${Date.now()}_${Math.random().toString(36).slice(2,6)}`;
  await c.env.DB.prepare(`
    INSERT INTO content_items (id, title, description, thumbnail, duration, speaker_id, date, category, tags, is_premium, video_url)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    title,
    description,
    thumbnail || 'https://images.unsplash.com/photo-1507692049790-de58290a4334?w=600&h=340&fit=crop',
    duration || '45:00',
    speakerId || '1',
    new Date().toISOString().split('T')[0],
    category,
    JSON.stringify(tags || []),
    isPremium ? 1 : 0,
    videoUrl || null
  ).run();

  // Notify via queue
  try {
    await c.env.QUEUE.send({ type: 'new_content', contentId: id, title });
  } catch {}

  return jsonResponse({ id, message: 'Content created' }, 201);
});

// POST /content/:id/progress
content.post('/:id/progress', async (c) => {
  const authErr = requireAuth(c);
  if (authErr) return authErr;
  const user = c.get('user');
  const contentId = c.req.param('id');
  const { progress } = await c.req.json();

  const id = `prog_${user.id}_${contentId}`;
  await c.env.DB.prepare(`
    INSERT INTO content_progress (id, user_id, content_id, progress, last_watched_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(user_id, content_id) DO UPDATE SET progress = ?, last_watched_at = ?
  `).bind(id, user.id, contentId, progress, new Date().toISOString(), progress, new Date().toISOString()).run();

  return jsonResponse({ message: 'Progress saved', progress });
});

// GET /content/user/continue — continue watching
content.get('/user/continue', async (c) => {
  const authErr = requireAuth(c);
  if (authErr) return authErr;
  const user = c.get('user');

  const result = await c.env.DB.prepare(`
    SELECT c.*, s.name as speaker_name, s.title as speaker_title, s.avatar as speaker_avatar, cp.progress
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
  }));

  return jsonResponse({ items });
});

export default content;
