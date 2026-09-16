/**
 * SOM CONNECT — /tools (daily spiritual disciplines)
 * Confessions, Rhapsody of Realities readings, publications and streaks.
 * Any requested date is generated on demand, so the UI never dead-ends.
 */
import { Hono } from 'hono';
import { parseJsonField } from '../lib/db';
import { audit, type AppEnv } from '../lib/middleware';
import { errorResponse, normalizeEmail, ok, readJson } from '../lib/http';
import { generateId } from '../lib/auth';
import {
  computeStreak,
  ensureConfessionForDate,
  ensureRorForDate,
  isValidDate,
  todayISO,
} from '../lib/daily';

const tools = new Hono<AppEnv>();

function mapConfession(row: any) {
  return {
    id: row.id,
    date: row.date,
    title: row.title,
    content: row.content,
    scripture: row.scripture,
    scriptureRef: row.scripture_ref ?? row.scriptureRef,
    audioUrl: row.audio_url ?? '/audio/daily-confession.mp3',
  };
}

function mapRor(row: any) {
  return {
    id: row.id,
    date: row.date,
    title: row.title,
    theme: row.theme,
    scripture: row.scripture,
    scriptureRef: row.scripture_ref ?? row.scriptureRef,
    content: row.content,
    prayer: row.prayer,
    furtherStudy: parseJsonField<string[]>(row.further_study, []),
    dailyScriptureReading: parseJsonField<string[]>(row.daily_scripture_reading, []),
  };
}

/* ------------------------------------------------------------------ *
 * GET /tools/confessions?date=YYYY-MM-DD&limit=
 * ------------------------------------------------------------------ */
tools.get('/confessions', async (c) => {
  const date = c.req.query('date');
  if (date) {
    if (!isValidDate(date)) return errorResponse('Use the date format YYYY-MM-DD.', 400);
    const row = await ensureConfessionForDate(c.env, date);
    return ok({ ...mapConfession(row), item: mapConfession(row) });
  }

  const limit = Math.min(Number.parseInt(c.req.query('limit') ?? '10', 10) || 10, 30);
  // Make sure today's devotional exists before listing.
  await ensureConfessionForDate(c.env, todayISO());
  const rows = await c.env.DB.prepare('SELECT * FROM daily_confessions ORDER BY date DESC LIMIT ?').bind(limit).all<any>();
  const items = (rows.results ?? []).map(mapConfession);

  const user = c.get('user');
  let completed: string[] = [];
  if (user) {
    const done = await c.env.DB.prepare('SELECT type FROM daily_completions WHERE user_id = ? AND date = ?')
      .bind(user.id, todayISO())
      .all<any>();
    completed = (done.results ?? []).map((r: any) => r.type);
  }

  return ok({ items, today: items[0] ?? null, completed, completedToday: completed });
});

/* ------------------------------------------------------------------ *
 * GET /tools/ror?date=YYYY-MM-DD
 * ------------------------------------------------------------------ */
tools.get('/ror', async (c) => {
  const date = c.req.query('date');
  if (date) {
    if (!isValidDate(date)) return errorResponse('Use the date format YYYY-MM-DD.', 400);
    const row = await ensureRorForDate(c.env, date);
    const mapped = mapRor(row);
    return ok({ ...mapped, item: mapped });
  }

  const limit = Math.min(Number.parseInt(c.req.query('limit') ?? '10', 10) || 10, 30);
  await ensureRorForDate(c.env, todayISO());
  const rows = await c.env.DB.prepare('SELECT * FROM ror_readings ORDER BY date DESC LIMIT ?').bind(limit).all<any>();
  const items = (rows.results ?? []).map(mapRor);
  return ok({ items, today: items[0] ?? null });
});

/* ------------------------------------------------------------------ *
 * GET /tools/bundle — both devotionals + streak in one round trip
 * ------------------------------------------------------------------ */
tools.get('/bundle', async (c) => {
  const today = todayISO();
  const [confession, ror] = await Promise.all([ensureConfessionForDate(c.env, today), ensureRorForDate(c.env, today)]);

  const user = c.get('user');
  let completed: string[] = [];
  let streak = 0;
  if (user) {
    const rows = await c.env.DB.prepare(
      'SELECT DISTINCT date FROM daily_completions WHERE user_id = ? ORDER BY date DESC LIMIT 90',
    )
      .bind(user.id)
      .all<any>();
    const dates = (rows.results ?? []).map((r: any) => r.date);
    streak = computeStreak(dates, today);
    const todayRows = await c.env.DB.prepare('SELECT type FROM daily_completions WHERE user_id = ? AND date = ?')
      .bind(user.id, today)
      .all<any>();
    completed = (todayRows.results ?? []).map((r: any) => r.type);
  }

  return ok({
    date: today,
    confession: mapConfession(confession),
    ror: mapRor(ror),
    streak,
    completed,
    completedToday: completed,
  });
});

/* ------------------------------------------------------------------ *
 * POST /tools/complete { type: 'confession' | 'ror', date? }
 * ------------------------------------------------------------------ */
tools.post('/complete', async (c) => {
  const user = c.get('user');
  if (!user) return errorResponse('Authentication required.', 401);
  const body = await readJson(c);
  const type = body.type;
  if (type !== 'confession' && type !== 'ror') {
    return errorResponse("type must be either 'confession' or 'ror'.", 400);
  }
  const date = isValidDate(body.date) ? body.date : todayISO();

  // Make sure the content for that day exists (keeps streaks meaningful).
  if (type === 'confession') await ensureConfessionForDate(c.env, date);
  else await ensureRorForDate(c.env, date);

  const already = await c.env.DB.prepare('SELECT id FROM daily_completions WHERE user_id = ? AND type = ? AND date = ?')
    .bind(user.id, type, date)
    .first<{ id: string }>();

  if (!already) {
    await c.env.DB.prepare('INSERT INTO daily_completions (id, user_id, type, date) VALUES (?, ?, ?, ?)')
      .bind(generateId('comp_'), user.id, type, date)
      .run();
  }

  const completions = await c.env.DB.prepare(
    'SELECT DISTINCT date FROM daily_completions WHERE user_id = ? ORDER BY date DESC LIMIT 90',
  )
    .bind(user.id)
    .all<any>();
  const streak = computeStreak((completions.results ?? []).map((r: any) => r.date), todayISO());

  await c.env.DB.prepare('UPDATE users SET streak = ?, last_streak_date = ?, updated_at = ? WHERE id = ?')
    .bind(streak, date, new Date().toISOString(), user.id)
    .run();

  const todayRows = await c.env.DB.prepare('SELECT type FROM daily_completions WHERE user_id = ? AND date = ?')
    .bind(user.id, todayISO())
    .all<any>();

  audit(c, 'tools.complete', 'daily_completion', `${type}:${date}`);

  return ok({
    message: already ? 'Already completed today — streak kept.' : 'Marked as complete. Well done!',
    type,
    date,
    streak,
    completedToday: (todayRows.results ?? []).map((r: any) => r.type),
    alreadyCompleted: !!already,
  });
});

/* ------------------------------------------------------------------ *
 * GET /tools/streak
 * ------------------------------------------------------------------ */
tools.get('/streak', async (c) => {
  const user = c.get('user');
  if (!user) return errorResponse('Authentication required.', 401);

  const rows = await c.env.DB.prepare(
    'SELECT type, date FROM daily_completions WHERE user_id = ? ORDER BY date DESC LIMIT 90',
  )
    .bind(user.id)
    .all<any>();
  const results = rows.results ?? [];
  const dates = results.map((r: any) => r.date);
  const today = todayISO();
  const streak = computeStreak(dates, today);

  return ok({
    streak,
    longestStreak: Math.max(streak, user.streak ?? 0),
    todayCompleted: results.filter((r: any) => r.date === today).map((r: any) => r.type),
    calendar: dates.slice(0, 30),
    recent: results.slice(0, 30),
  });
});

/* ------------------------------------------------------------------ *
 * GET /tools/publications
 * ------------------------------------------------------------------ */
tools.get('/publications', async (c) => {
  const type = c.req.query('type');
  let query = 'SELECT * FROM publications';
  const params: unknown[] = [];
  if (type && type !== 'all') {
    query += ' WHERE type = ?';
    params.push(type);
  }
  query += ' ORDER BY issue_date DESC';

  const rows = await c.env.DB.prepare(query).bind(...params).all<any>();
  const items = (rows.results ?? []).map((row: any) => ({
    id: row.id,
    title: row.title,
    type: row.type,
    cover: row.cover,
    issueDate: row.issue_date,
    pages: row.pages,
    description: row.description,
    fileUrl: row.file_url ?? null,
  }));
  return ok({ items, total: items.length });
});

/* ------------------------------------------------------------------ *
 * GET /tools/plan — reading plan for a date range (ROR plan screen)
 * ------------------------------------------------------------------ */
tools.get('/plan', async (c) => {
  const start = isValidDate(c.req.query('start')) ? c.req.query('start')! : todayISO();
  const days = Math.min(Math.max(Number.parseInt(c.req.query('days') ?? '14', 10) || 14, 1), 60);

  const startMs = Date.parse(`${start}T00:00:00Z`);
  const dates = Array.from({ length: days }, (_, index) => new Date(startMs + index * 86_400_000).toISOString().slice(0, 10));

  const user = c.get('user');
  let completedDates: string[] = [];
  if (user) {
    const rows = await c.env.DB.prepare('SELECT DISTINCT date FROM daily_completions WHERE user_id = ?')
      .bind(user.id)
      .all<any>();
    completedDates = (rows.results ?? []).map((r: any) => r.date);
  }

  return ok({
    start,
    days,
    items: dates.map((date) => ({
      date,
      completed: completedDates.includes(date),
      label: new Date(`${date}T00:00:00Z`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' }),
    })),
  });
});

/** Small helper for the frontend "share" flow. */
tools.get('/scripture', async (c) => {
  const reference = c.req.query('ref');
  const user = c.get('user');
  const email = normalizeEmail(user?.email) ?? '';
  return ok({ reference: reference ?? 'Romans 8:37', shareUrl: `/tools?ref=${encodeURIComponent(reference ?? 'Romans 8:37')}`, email });
});

/* GET /tools/completions — history */
tools.get('/completions', async (c) => {
  const user = c.get('user');
  if (!user) return errorResponse('Authentication required.', 401);
  const rows = await c.env.DB.prepare(
    'SELECT * FROM daily_completions WHERE user_id = ? ORDER BY date DESC LIMIT 100',
  )
    .bind(user.id)
    .all<any>();
  return ok({ items: rows.results ?? [] });
});

export default tools;
