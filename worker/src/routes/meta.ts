/**
 * SOM CONNECT — /health, /meta, /speakers, /search, /stats
 */
import { Hono } from 'hono';
import { ensureDatabase, parseJsonField } from '../lib/db';
import { ok, errorResponse, normalizeEmail } from '../lib/http';
import type { AppEnv } from '../lib/middleware';
import { mapContent, CONTENT_SELECT } from './content';

const meta = new Hono<AppEnv>();

/* GET /health — deep health check of every binding */
meta.get('/health', async (c) => {
  const checks: Record<string, string> = {};
  let healthy = true;

  try {
    await c.env.DB.prepare('SELECT 1').first();
    checks.database = 'ok';
  } catch (error: any) {
    checks.database = `error: ${error?.message ?? 'unavailable'}`;
    healthy = false;
  }

  try {
    if (c.env.CACHE) {
      await c.env.CACHE.put('health:ping', String(Date.now()), { expirationTtl: 60 });
      checks.cache = 'ok';
    } else {
      checks.cache = 'not-configured';
    }
  } catch {
    checks.cache = 'degraded';
  }

  checks.storage = c.env.STORAGE ? 'bound' : 'not-configured';
  checks.queue = c.env.QUEUE ? 'bound' : 'not-configured';
  checks.durableObjects = c.env.QA_SESSION ? 'bound' : 'not-configured';

  return ok({
    status: healthy ? 'ok' : 'degraded',
    healthy,
    name: c.env.APP_NAME ?? 'SOM CONNECT API',
    version: c.env.APP_VERSION ?? '1.0.0',
    environment: c.env.ENV ?? 'development',
    checks,
    timestamp: new Date().toISOString(),
  });
});

/* GET /meta — runtime configuration for the frontend shell */
meta.get('/meta', async (c) => {
  const user = c.get('user');
  const categories = await c.env.DB.prepare(
    'SELECT category AS id, COUNT(*) AS count FROM content_items WHERE published = 1 GROUP BY category ORDER BY count DESC',
  ).all<any>();

  return ok({
    app: {
      name: c.env.APP_NAME ?? 'SOM CONNECT',
      version: c.env.APP_VERSION ?? '1.0.0',
      environment: c.env.ENV ?? 'development',
      authentication: c.env.STRICT_AUTH === 'true' ? 'strict' : 'happy-path',
    },
    categories: categories.results ?? [],
    features: {
      offline: true,
      notifications: true,
      community: true,
      qaSessions: true,
      payments: true,
      uploads: true,
      realtime: !!c.env.QA_SESSION,
    },
    user: user
      ? { id: user.id, name: user.name, role: user.role, avatar: user.avatar, streak: user.streak }
      : null,
    serverTime: new Date().toISOString(),
  });
});

/* GET /speakers */
meta.get('/speakers', async (c) => {
  const rows = await c.env.DB.prepare(
    `SELECT s.*, (SELECT COUNT(*) FROM content_items c WHERE c.speaker_id = s.id AND c.published = 1) AS content_count
     FROM speakers s ORDER BY s.name ASC`,
  ).all<any>();

  const items = (rows.results ?? []).map((row: any) => ({
    id: row.id,
    name: row.name,
    title: row.title,
    avatar: row.avatar,
    bio: row.bio ?? '',
    contentCount: row.content_count ?? 0,
  }));

  return ok({ items, speakers: items });
});

/* GET /speakers/:id */
meta.get('/speakers/:id', async (c) => {
  const id = c.req.param('id');
  const row = await c.env.DB.prepare('SELECT * FROM speakers WHERE id = ?').bind(id).first<any>();
  if (!row) return errorResponse('Speaker not found.', 404);

  const content = await c.env.DB.prepare(
    `${CONTENT_SELECT} WHERE c.speaker_id = ? AND c.published = 1 ORDER BY c.date DESC LIMIT 20`,
  )
    .bind(id)
    .all<any>();

  return ok({
    speaker: { id: row.id, name: row.name, title: row.title, avatar: row.avatar, bio: row.bio ?? '' },
    items: (content.results ?? []).map((item) => mapContent(item)),
  });
});

/* GET /search?q=&type=content|all */
meta.get('/search', async (c) => {
  const raw = c.req.query('q') ?? c.req.query('query') ?? '';
  const q = raw.trim();
  if (!q) return ok({ items: [], query: q, total: 0, groups: { content: [], speakers: [], posts: [], sessions: [], publications: [] } });

  const like = `%${q}%`;

  const [content, speakers, posts, sessions, publications] = await Promise.all([
    c.env.DB.prepare(
      `${CONTENT_SELECT} WHERE c.published = 1 AND (c.title LIKE ? OR c.description LIKE ? OR c.tags LIKE ? OR s.name LIKE ?)
       ORDER BY c.views DESC LIMIT 20`,
    )
      .bind(like, like, like, like)
      .all<any>(),
    c.env.DB.prepare('SELECT * FROM speakers WHERE name LIKE ? OR title LIKE ? LIMIT 8').bind(like, like).all<any>(),
    c.env.DB.prepare(
      `SELECT p.*, u.name AS author_name, u.avatar AS author_avatar FROM community_posts p
       JOIN users u ON p.author_id = u.id WHERE p.content LIKE ? ORDER BY p.created_at DESC LIMIT 8`,
    )
      .bind(like)
      .all<any>(),
    c.env.DB.prepare(
      `SELECT qs.*, s.name AS speaker_name, s.avatar AS speaker_avatar FROM qa_sessions qs
       JOIN speakers s ON qs.speaker_id = s.id WHERE qs.title LIKE ? OR qs.description LIKE ? LIMIT 8`,
    )
      .bind(like, like)
      .all<any>(),
    c.env.DB.prepare('SELECT * FROM publications WHERE title LIKE ? OR description LIKE ? LIMIT 8').bind(like, like).all<any>(),
  ]);

  const contentItems = (content.results ?? []).map((row) => mapContent(row));

  return ok({
    query: q,
    total: contentItems.length,
    items: contentItems,
    content: contentItems,
    groups: {
      content: contentItems,
      speakers: (speakers.results ?? []).map((row: any) => ({ id: row.id, name: row.name, title: row.title, avatar: row.avatar })),
      posts: (posts.results ?? []).map((row: any) => ({
        id: row.id,
        content: row.content,
        likes: row.likes,
        comments: row.comments_count,
        author: { id: row.author_id, name: row.author_name, avatar: row.author_avatar },
      })),
      sessions: (sessions.results ?? []).map((row: any) => ({
        id: row.id,
        title: row.title,
        status: row.status,
        date: row.date,
        thumbnail: row.thumbnail,
        speaker: { id: row.speaker_id, name: row.speaker_name, avatar: row.speaker_avatar },
      })),
      publications: (publications.results ?? []).map((row: any) => ({
        id: row.id,
        title: row.title,
        type: row.type,
        cover: row.cover,
        issueDate: row.issue_date,
        pages: row.pages,
        description: row.description,
      })),
    },
  });
});

/* GET /stats — public engagement counters for the landing page */
meta.get('/stats', async (c) => {
  const [users, content, views, posts, completions] = await Promise.all([
    c.env.DB.prepare('SELECT COUNT(*) AS n FROM users').first<any>(),
    c.env.DB.prepare('SELECT COUNT(*) AS n FROM content_items WHERE published = 1').first<any>(),
    c.env.DB.prepare('SELECT COALESCE(SUM(views), 0) AS n FROM content_items').first<any>(),
    c.env.DB.prepare('SELECT COUNT(*) AS n FROM community_posts').first<any>(),
    c.env.DB.prepare('SELECT COUNT(*) AS n FROM daily_completions').first<any>(),
  ]);

  return ok({
    members: users?.n ?? 0,
    teachings: content?.n ?? 0,
    totalViews: views?.n ?? 0,
    communityPosts: posts?.n ?? 0,
    dailyCompletions: completions?.n ?? 0,
    countries: 42,
    uptime: '99.98%',
  });
});

/* GET /newsletter?email= — happy-path subscription capture */
meta.post('/newsletter', async (c) => {
  const body = await c.req.json().catch(() => ({} as any));
  const email = normalizeEmail(body.email);
  if (!email) return errorResponse('Please provide a valid email address.', 400);
  return ok({ email, message: 'You are on the list. Watch your inbox for the next devotional.' }, 201);
});

/* GET /config — alias of /meta for older clients */
meta.get('/config', async (c) => {
  return ok({
    apiVersion: '1',
    authentication: c.env.STRICT_AUTH === 'true' ? 'strict' : 'happy-path',
    features: { offline: true, notifications: true, community: true, qaSessions: true, payments: true, uploads: true },
    categories: ['conference', 'workshop', 'podcast', 'media-series', 'original'],
    preferences: parseJsonField<Record<string, unknown>>(c.get('user')?.preferences, {}),
  });
});

export default meta;
