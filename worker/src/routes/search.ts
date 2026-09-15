import { Hono } from 'hono';
import { Env, jsonResponse, errorResponse } from '../lib/db';
import { generateId } from '../lib/auth';

const search = new Hono<{ Bindings: Env; Variables: { user?: any } }>();

// GET /search?q=&type=&limit=
search.get('/', async (c) => {
  const q = c.req.query('q')?.trim();
  if (!q || q.length < 2) return jsonResponse({ items: [], query: q || '', suggestions: [] });

  const type = c.req.query('type') || 'all'; // all, content, speaker, publication, post, group
  const limit = Math.min(parseInt(c.req.query('limit') || '20'), 50);
  const user = c.get('user') as any;

  // Save search history if user logged in
  if (user && q.length >= 2) {
    try {
      const id = generateId('sh_');
      await c.env.DB.prepare('INSERT INTO search_history (id, user_id, query) VALUES (?, ?, ?)').bind(id, user.id, q).run();
    } catch {}
  }

  let items: any[] = [];

  if (type === 'all' || type === 'content') {
    const like = `%${q}%`;
    const contentResult = await c.env.DB.prepare(`
      SELECT c.*, s.name as speaker_name, s.avatar as speaker_avatar
      FROM content_items c
      JOIN speakers s ON c.speaker_id = s.id
      WHERE c.is_published = 1 AND (c.title LIKE ? OR c.description LIKE ? OR c.tags LIKE ? OR s.name LIKE ?)
      ORDER BY c.views DESC
      LIMIT ?
    `).bind(like, like, like, like, limit).all();

    const contentItems = (contentResult.results || []).map((row: any) => ({
      id: row.id,
      type: 'content',
      title: row.title,
      description: row.description,
      thumbnail: row.thumbnail,
      duration: row.duration,
      speaker: { name: row.speaker_name, avatar: row.speaker_avatar },
      category: row.category,
      tags: row.tags ? JSON.parse(row.tags) : [],
      views: row.views,
      isPremium: !!row.is_premium,
    }));

    items = [...items, ...contentItems];

    // Update results count for history
    if (user) {
      try {
        await c.env.DB.prepare('UPDATE search_history SET results_count = ? WHERE user_id = ? AND query = ? ORDER BY created_at DESC LIMIT 1').bind(contentItems.length, user.id, q).run();
      } catch {}
    }
  }

  if (type === 'all' || type === 'speaker') {
    const like = `%${q}%`;
    const speakerResult = await c.env.DB.prepare('SELECT * FROM speakers WHERE name LIKE ? OR title LIKE ? LIMIT 5').bind(like, like).all();
    const speakerItems = (speakerResult.results || []).map((s: any) => ({
      id: s.id,
      type: 'speaker',
      title: s.name,
      description: s.title,
      thumbnail: s.avatar,
      avatar: s.avatar,
    }));
    items = [...items, ...speakerItems];
  }

  if (type === 'all' || type === 'publication') {
    const like = `%${q}%`;
    const pubResult = await c.env.DB.prepare('SELECT * FROM publications WHERE title LIKE ? OR description LIKE ? LIMIT 5').bind(like, like).all();
    const pubItems = (pubResult.results || []).map((p: any) => ({
      id: p.id,
      type: 'publication',
      title: p.title,
      description: p.description,
      thumbnail: p.cover,
    }));
    items = [...items, ...pubItems];
  }

  if (type === 'all' || type === 'group') {
    const like = `%${q}%`;
    const groupResult = await c.env.DB.prepare('SELECT * FROM groups WHERE name LIKE ? OR description LIKE ? LIMIT 5').bind(like, like).all();
    const groupItems = (groupResult.results || []).map((g: any) => ({
      id: g.id,
      type: 'group',
      title: g.name,
      description: g.description,
      thumbnail: g.cover,
    }));
    items = [...items, ...groupItems];
  }

  // Suggestions based on popular searches or tags
  const suggestions = ['faith', 'healing', 'worship', 'prayer', 'leadership', 'communion', 'grace', 'wisdom'].filter(s => s.includes(q.toLowerCase())).slice(0, 3);

  return jsonResponse({ items: items.slice(0, limit), query: q, suggestions, total: items.length });
});

// GET /search/history — user's search history
search.get('/history', async (c) => {
  const user = c.get('user') as any;
  if (!user) return errorResponse('Unauthorized', 401);

  const result = await c.env.DB.prepare('SELECT * FROM search_history WHERE user_id = ? ORDER BY created_at DESC LIMIT 20').bind(user.id).all();
  return jsonResponse({ items: result.results || [] });
});

// DELETE /search/history — clear history
search.delete('/history', async (c) => {
  const user = c.get('user') as any;
  if (!user) return errorResponse('Unauthorized', 401);

  await c.env.DB.prepare('DELETE FROM search_history WHERE user_id = ?').bind(user.id).run();
  return jsonResponse({ message: 'Search history cleared' });
});

// GET /search/trending — trending searches (from content views)
search.get('/trending', async (c) => {
  try {
    const cached = await c.env.CACHE.get('search:trending');
    if (cached) return jsonResponse(JSON.parse(cached));
  } catch {}

  const result = await c.env.DB.prepare(`
    SELECT tags FROM content_items WHERE is_published = 1 ORDER BY views DESC LIMIT 20
  `).all();

  const tagCounts: Record<string, number> = {};
  for (const row of result.results || []) {
    try {
      const tags = JSON.parse((row as any).tags || '[]');
      for (const tag of tags) {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      }
    } catch {}
  }

  const trending = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([tag, count]) => ({ tag, count }));

  const response = { items: trending };

  try {
    await c.env.CACHE.put('search:trending', JSON.stringify(response), { expirationTtl: 3600 });
  } catch {}

  return jsonResponse(response);
});

export default search;
