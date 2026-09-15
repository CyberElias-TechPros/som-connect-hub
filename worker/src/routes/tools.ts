import { Hono } from 'hono';
import { Env, jsonResponse, errorResponse } from '../lib/db';
import { requireAuth } from './auth';
import { generateId } from '../lib/auth';
import { validate, confessionSchema, rorSchema } from '../lib/validators';
import { cacheGet, cacheSet, CacheKeys } from '../lib/cache';
import { auditLog, getClientInfo } from '../lib/audit';

const tools = new Hono<{ Bindings: Env; Variables: { user?: any } }>();

// GET /tools/confessions
tools.get('/confessions', async (c) => {
  const date = c.req.query('date');
  if (date) {
    const row = await c.env.DB.prepare('SELECT * FROM daily_confessions WHERE date = ?').bind(date).first();
    if (!row) return errorResponse('Not found', 404);
    return jsonResponse(row);
  }

  const cached = await cacheGet<any>(c.env, CacheKeys.confessions());
  if (cached) return jsonResponse({ items: cached, cached: true });

  const result = await c.env.DB.prepare('SELECT * FROM daily_confessions ORDER BY date DESC LIMIT 30').all();
  const items = result.results || [];
  await cacheSet(c.env, CacheKeys.confessions(), items, 3600);
  return jsonResponse({ items });
});

// POST /tools/confessions — admin only
tools.post('/confessions', async (c) => {
  const authErr = requireAuth(c);
  if (authErr) return authErr;
  const user = c.get('user') as any;
  if (user.role !== 'admin') return errorResponse('Forbidden', 403);

  const body = await c.req.json();
  const v = validate(confessionSchema, body);
  if (!v.success) return errorResponse(v.error, 400);

  const id = generateId('conf_');
  await c.env.DB.prepare(
    'INSERT INTO daily_confessions (id, date, title, content, scripture, scripture_ref) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(id, v.data.date, v.data.title, v.data.content, v.data.scripture, v.data.scriptureRef).run();

  await c.env.CACHE.delete(CacheKeys.confessions());
  const { ip, ua } = getClientInfo(c);
  await auditLog(c.env.DB, user.id, 'confession.create', 'daily_confession', id, v.data, ip, ua);

  return jsonResponse({ id, message: 'Confession created' }, 201);
});

// GET /tools/ror
tools.get('/ror', async (c) => {
  const date = c.req.query('date');
  if (date) {
    const row = await c.env.DB.prepare('SELECT * FROM ror_readings WHERE date = ?').bind(date).first() as any;
    if (!row) return errorResponse('Not found', 404);
    return jsonResponse({
      ...row,
      furtherStudy: row.further_study ? JSON.parse(row.further_study as string) : [],
      dailyScriptureReading: row.daily_scripture_reading ? JSON.parse(row.daily_scripture_reading as string) : [],
    });
  }

  const cached = await cacheGet<any>(c.env, CacheKeys.ror());
  if (cached) return jsonResponse({ items: cached, cached: true });

  const result = await c.env.DB.prepare('SELECT * FROM ror_readings ORDER BY date DESC LIMIT 30').all();
  const items = (result.results || []).map((r: any) => ({
    ...r,
    furtherStudy: r.further_study ? JSON.parse(r.further_study) : [],
    dailyScriptureReading: r.daily_scripture_reading ? JSON.parse(r.daily_scripture_reading) : [],
  }));

  await cacheSet(c.env, CacheKeys.ror(), items, 3600);
  return jsonResponse({ items });
});

// POST /tools/ror — admin only
tools.post('/ror', async (c) => {
  const authErr = requireAuth(c);
  if (authErr) return authErr;
  const user = c.get('user') as any;
  if (user.role !== 'admin') return errorResponse('Forbidden', 403);

  const body = await c.req.json();
  const v = validate(rorSchema, body);
  if (!v.success) return errorResponse(v.error, 400);

  const id = generateId('ror_');
  await c.env.DB.prepare(
    'INSERT INTO ror_readings (id, date, title, theme, scripture, scripture_ref, content, prayer, further_study, daily_scripture_reading) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(
    id,
    v.data.date,
    v.data.title,
    v.data.theme,
    v.data.scripture,
    v.data.scriptureRef,
    v.data.content,
    v.data.prayer,
    JSON.stringify(v.data.furtherStudy || []),
    JSON.stringify(v.data.dailyScriptureReading || [])
  ).run();

  await c.env.CACHE.delete(CacheKeys.ror());
  return jsonResponse({ id, message: 'ROR created' }, 201);
});

// POST /tools/complete — mark daily completion, handles streak logic
tools.post('/complete', async (c) => {
  const authErr = requireAuth(c);
  if (authErr) return authErr;
  const user = c.get('user') as any;
  const body = await c.req.json() as any;
  const { type } = body; // confession, ror, bible, prayer
  if (!['confession', 'ror', 'bible', 'prayer'].includes(type)) return errorResponse('Invalid type, must be confession|ror|bible|prayer');

  const today = new Date().toISOString().split('T')[0];
  const id = generateId('comp_');

  try {
    await c.env.DB.prepare('INSERT INTO daily_completions (id, user_id, type, date) VALUES (?, ?, ?, ?)').bind(id, user.id, type, today).run();
  } catch (e: any) {
    if (e.message?.includes('UNIQUE')) {
      const streakRow = await c.env.DB.prepare('SELECT streak FROM users WHERE id = ?').bind(user.id).first() as any;
      return jsonResponse({ message: 'Already completed today', date: today, streak: streakRow?.streak || 0, alreadyCompleted: true });
    }
    throw e;
  }

  // Streak logic: check if yesterday was completed, if not reset? For happy path, increment
  // More accurate: streak is number of consecutive days with at least one completion
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  const yesterdayCompletion = await c.env.DB.prepare('SELECT id FROM daily_completions WHERE user_id = ? AND date = ? LIMIT 1').bind(user.id, yesterday).first();
  const todayCompletionsCount = await c.env.DB.prepare('SELECT COUNT(*) as cnt FROM daily_completions WHERE user_id = ? AND date = ?').bind(user.id, today).first() as any;

  let newStreak = user.streak;
  if (todayCompletionsCount?.cnt === 1) {
    // First completion today
    if (yesterdayCompletion || user.streak === 0) {
      newStreak = user.streak + 1;
    } else {
      // Check if streak broken — if no completion yesterday, reset to 1
      const lastCompletion = await c.env.DB.prepare('SELECT date FROM daily_completions WHERE user_id = ? AND date != ? ORDER BY date DESC LIMIT 1').bind(user.id, today).first() as any;
      if (lastCompletion) {
        const lastDate = new Date(lastCompletion.date);
        const todayDate = new Date(today);
        const diffDays = Math.floor((todayDate.getTime() - lastDate.getTime()) / 86400000);
        if (diffDays === 1) newStreak = user.streak + 1;
        else newStreak = 1;
      } else {
        newStreak = 1;
      }
    }

    const longestStreak = Math.max(user.longest_streak || 0, newStreak);
    await c.env.DB.prepare('UPDATE users SET streak = ?, longest_streak = ?, updated_at = ? WHERE id = ?').bind(newStreak, longestStreak, new Date().toISOString(), user.id).run();
  } else {
    newStreak = user.streak;
  }

  const updatedUser = await c.env.DB.prepare('SELECT streak, longest_streak FROM users WHERE id = ?').bind(user.id).first() as any;

  // Check for achievements
  if (newStreak === 7 || newStreak === 30 || newStreak === 100) {
    try {
      const nid = generateId('notif_');
      await c.env.DB.prepare(
        'INSERT INTO notifications (id, user_id, type, title, message, action_url) VALUES (?, ?, ?, ?, ?, ?)'
      ).bind(nid, user.id, 'achievement', `${newStreak}-Day Streak!`, `Congratulations! You've maintained a ${newStreak}-day streak. Keep growing!`, '/tools').run();
    } catch {}
  }

  return jsonResponse({ message: 'Marked completed', streak: updatedUser?.streak || newStreak, longestStreak: updatedUser?.longest_streak || newStreak, date: today, type });
});

// GET /tools/streak
tools.get('/streak', async (c) => {
  const authErr = requireAuth(c);
  if (authErr) return authErr;
  const user = c.get('user') as any;

  const completions = await c.env.DB.prepare('SELECT * FROM daily_completions WHERE user_id = ? ORDER BY date DESC LIMIT 60').bind(user.id).all();
  const today = new Date().toISOString().split('T')[0];
  const todayCompletions = (completions.results || []).filter((r: any) => r.date === today);

  // Calculate streak history for calendar
  const history: Record<string, string[]> = {};
  for (const comp of completions.results || []) {
    const d = (comp as any).date;
    if (!history[d]) history[d] = [];
    history[d].push((comp as any).type);
  }

  const freshUser = await c.env.DB.prepare('SELECT streak, longest_streak FROM users WHERE id = ?').bind(user.id).first() as any;

  return jsonResponse({
    streak: freshUser?.streak || user.streak,
    longestStreak: freshUser?.longest_streak || user.streak,
    todayCompleted: todayCompletions.map((r: any) => r.type),
    recent: completions.results || [],
    history,
  });
});

// GET /tools/publications — redirect to dedicated route, but keep for backward compat
tools.get('/publications', async (c) => {
  const result = await c.env.DB.prepare('SELECT * FROM publications ORDER BY issue_date DESC LIMIT 20').all();
  return jsonResponse({ items: result.results || [] });
});

export default tools;
