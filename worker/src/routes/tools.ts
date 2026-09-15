import { Hono } from 'hono';
import { Env, jsonResponse, errorResponse } from '../lib/db';
import { requireAuth } from './auth';
import { generateId } from '../lib/auth';

const tools = new Hono<{ Bindings: Env; Variables: { user?: any } }>();

// GET /tools/confessions
tools.get('/confessions', async (c) => {
  const date = c.req.query('date');
  if (date) {
    const row = await c.env.DB.prepare('SELECT * FROM daily_confessions WHERE date = ?').bind(date).first();
    if (!row) return errorResponse('Not found', 404);
    return jsonResponse(row);
  }
  const result = await c.env.DB.prepare('SELECT * FROM daily_confessions ORDER BY date DESC LIMIT 10').all();
  return jsonResponse({ items: result.results || [] });
});

// GET /tools/ror
tools.get('/ror', async (c) => {
  const date = c.req.query('date');
  if (date) {
    const row = await c.env.DB.prepare('SELECT * FROM ror_readings WHERE date = ?').bind(date).first();
    if (!row) return errorResponse('Not found', 404);
    return jsonResponse({
      ...row,
      furtherStudy: row.further_study ? JSON.parse(row.further_study as string) : [],
      dailyScriptureReading: row.daily_scripture_reading ? JSON.parse(row.daily_scripture_reading as string) : [],
    });
  }
  const result = await c.env.DB.prepare('SELECT * FROM ror_readings ORDER BY date DESC LIMIT 10').all();
  const items = (result.results || []).map((r: any) => ({
    ...r,
    furtherStudy: r.further_study ? JSON.parse(r.further_study) : [],
    dailyScriptureReading: r.daily_scripture_reading ? JSON.parse(r.daily_scripture_reading) : [],
  }));
  return jsonResponse({ items });
});

// POST /tools/complete
tools.post('/complete', async (c) => {
  const authErr = requireAuth(c);
  if (authErr) return authErr;
  const user = c.get('user');
  const { type } = await c.req.json(); // confession or ror
  if (!['confession', 'ror'].includes(type)) return errorResponse('Invalid type');

  const today = new Date().toISOString().split('T')[0];
  const id = generateId('comp_');
  try {
    await c.env.DB.prepare('INSERT INTO daily_completions (id, user_id, type, date) VALUES (?, ?, ?, ?)').bind(id, user.id, type, today).run();
    await c.env.DB.prepare('UPDATE users SET streak = streak + 1 WHERE id = ?').bind(user.id).run();
  } catch (e: any) {
    if (e.message?.includes('UNIQUE')) {
      return jsonResponse({ message: 'Already completed today', date: today });
    }
    throw e;
  }

  const updatedUser = await c.env.DB.prepare('SELECT streak FROM users WHERE id = ?').bind(user.id).first() as any;
  return jsonResponse({ message: 'Marked completed', streak: updatedUser?.streak || 0, date: today });
});

// GET /tools/streak
tools.get('/streak', async (c) => {
  const authErr = requireAuth(c);
  if (authErr) return authErr;
  const user = c.get('user');

  const completions = await c.env.DB.prepare('SELECT * FROM daily_completions WHERE user_id = ? ORDER BY date DESC LIMIT 30').bind(user.id).all();
  const today = new Date().toISOString().split('T')[0];
  const todayCompletions = (completions.results || []).filter((r: any) => r.date === today);

  return jsonResponse({
    streak: user.streak,
    todayCompleted: todayCompletions.map((r: any) => r.type),
    recent: completions.results || [],
  });
});

// GET /tools/publications
tools.get('/publications', async (c) => {
  const result = await c.env.DB.prepare('SELECT * FROM publications ORDER BY issue_date DESC').all();
  return jsonResponse({ items: result.results || [] });
});

export default tools;
