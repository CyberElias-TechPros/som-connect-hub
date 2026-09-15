/**
 * SOM CONNECT — /qa
 * Live Q&A sessions backed by D1, with real-time participant counts served by
 * the QASessionDurableObject (WebSocket + HTTP).
 */
import { Hono } from 'hono';
import { audit, type AppEnv } from '../lib/middleware';
import { errorResponse, ok, readJson } from '../lib/http';
import { generateId } from '../lib/auth';

const qa = new Hono<AppEnv>();

const SESSION_SELECT = `
  SELECT qs.*, s.name AS speaker_name, s.title AS speaker_title, s.avatar AS speaker_avatar, s.bio AS speaker_bio
  FROM qa_sessions qs
  JOIN speakers s ON qs.speaker_id = s.id
`;

function mapSession(row: any) {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? '',
    speaker: { id: row.speaker_id, name: row.speaker_name, title: row.speaker_title, avatar: row.speaker_avatar, bio: row.speaker_bio },
    date: row.date,
    status: row.status,
    thumbnail: row.thumbnail,
    duration: row.duration ?? '1:00:00',
    streamUrl: row.stream_url ?? null,
    questionsCount: row.questions_count ?? 0,
    participants: row.participants ?? 0,
  };
}

function mapQuestion(row: any) {
  return {
    id: row.id,
    text: row.text,
    askedBy: row.asked_by,
    userId: row.user_id,
    upvotes: row.upvotes ?? 0,
    isAnswered: !!row.is_answered,
    answer: row.answer ?? null,
    createdAt: row.created_at,
  };
}

/* GET /qa?status=upcoming|live|archived|all */
qa.get('/', async (c) => {
  const status = c.req.query('status');
  const limit = Math.min(Number.parseInt(c.req.query('limit') ?? '20', 10) || 20, 50);

  let query = `${SESSION_SELECT} WHERE 1=1`;
  const params: unknown[] = [];
  if (status && status !== 'all') {
    query += ' AND qs.status = ?';
    params.push(status);
  }
  query += ' ORDER BY CASE qs.status WHEN \'live\' THEN 0 WHEN \'upcoming\' THEN 1 ELSE 2 END, qs.date DESC LIMIT ?';
  params.push(limit);

  const rows = await c.env.DB.prepare(query).bind(...params).all<any>();
  const items = (rows.results ?? []).map(mapSession);

  const live = items.find((session) => session.status === 'live') ?? null;
  return ok({ items, live, total: items.length });
});

/* GET /qa/:id */
qa.get('/:id', async (c) => {
  const id = c.req.param('id');
  const row = await c.env.DB.prepare(`${SESSION_SELECT} WHERE qs.id = ?`).bind(id).first<any>();
  if (!row) return errorResponse('That Q&A session could not be found.', 404);

  const questions = await c.env.DB.prepare(
    'SELECT * FROM qa_questions WHERE session_id = ? ORDER BY is_answered ASC, upvotes DESC, created_at DESC',
  )
    .bind(id)
    .all<any>();

  const user = c.get('user');
  let votedIds: string[] = [];
  let isJoined = false;
  if (user) {
    const votes = await c.env.DB.prepare(
      `SELECT qv.question_id FROM qa_question_votes qv
       JOIN qa_questions q ON q.id = qv.question_id
       WHERE qv.user_id = ? AND q.session_id = ?`,
    )
      .bind(user.id, id)
      .all<any>();
    votedIds = (votes.results ?? []).map((v: any) => v.question_id);
    isJoined = true;
  }

  return ok({
    ...mapSession(row),
    session: mapSession(row),
    questions: (questions.results ?? []).map((question) => ({ ...mapQuestion(question), hasVoted: votedIds.includes(question.id) })),
    isJoined,
  });
});

/* POST /qa/:id/questions */
qa.post('/:id/questions', async (c) => {
  const user = c.get('user');
  if (!user) return errorResponse('Authentication required.', 401);
  const sessionId = c.req.param('id');
  const body = await readJson(c);
  const text = typeof body.text === 'string' ? body.text.trim() : '';
  if (!text) return errorResponse('Type your question first.', 400);
  if (text.length > 1000) return errorResponse('Questions are limited to 1000 characters.', 400);

  const session = await c.env.DB.prepare('SELECT id FROM qa_sessions WHERE id = ?').bind(sessionId).first<{ id: string }>();
  if (!session) return errorResponse('That Q&A session could not be found.', 404);

  const id = generateId('q_');
  await c.env.DB.prepare(
    'INSERT INTO qa_questions (id, session_id, user_id, text, asked_by) VALUES (?, ?, ?, ?, ?)',
  )
    .bind(id, sessionId, user.id, text, user.name)
    .run();
  await c.env.DB.prepare('UPDATE qa_sessions SET questions_count = questions_count + 1 WHERE id = ?')
    .bind(sessionId)
    .run();

  audit(c, 'qa.question.create', 'qa_session', sessionId);
  try {
    await c.env.QUEUE?.send({ type: 'new_question', sessionId, questionId: id });
  } catch {
    /* queue optional */
  }

  const row = await c.env.DB.prepare('SELECT * FROM qa_questions WHERE id = ?').bind(id).first<any>();
  return ok({ id, question: row ? mapQuestion(row) : { id, text, upvotes: 0 }, message: 'Question submitted.' }, 201);
});

/* POST /qa/:id/questions/:qid/upvote — toggles, one vote per user */
qa.post('/:id/questions/:qid/upvote', async (c) => {
  const sessionId = c.req.param('id');
  const questionId = c.req.param('qid');
  const user = c.get('user');

  const question = await c.env.DB.prepare('SELECT id, upvotes FROM qa_questions WHERE id = ? AND session_id = ?')
    .bind(questionId, sessionId)
    .first<{ id: string; upvotes: number }>();
  if (!question) return errorResponse('Question not found.', 404);

  if (!user) {
    const upvotes = (question.upvotes ?? 0) + 1;
    await c.env.DB.prepare('UPDATE qa_questions SET upvotes = upvotes + 1 WHERE id = ?').bind(questionId).run();
    return ok({ questionId, upvotes, hasVoted: true, message: 'Upvoted.' });
  }

  const existing = await c.env.DB.prepare('SELECT id FROM qa_question_votes WHERE question_id = ? AND user_id = ?')
    .bind(questionId, user.id)
    .first<{ id: string }>();

  if (existing) {
    await c.env.DB.prepare('DELETE FROM qa_question_votes WHERE id = ?').bind(existing.id).run();
    await c.env.DB.prepare('UPDATE qa_questions SET upvotes = MAX(0, upvotes - 1) WHERE id = ?').bind(questionId).run();
  } else {
    await c.env.DB.prepare('INSERT INTO qa_question_votes (id, question_id, user_id) VALUES (?, ?, ?)')
      .bind(generateId('qv_'), questionId, user.id)
      .run();
    await c.env.DB.prepare('UPDATE qa_questions SET upvotes = upvotes + 1 WHERE id = ?').bind(questionId).run();
  }

  const updated = await c.env.DB.prepare('SELECT upvotes FROM qa_questions WHERE id = ?').bind(questionId).first<{ upvotes: number }>();
  return ok({ questionId, upvotes: updated?.upvotes ?? 0, hasVoted: !existing, message: existing ? 'Upvote removed.' : 'Upvoted.' });
});

/* POST /qa/:id/join — Durable Object participant tracking (graceful fallback) */
qa.post('/:id/join', async (c) => {
  const user = c.get('user');
  if (!user) return errorResponse('Authentication required.', 401);
  const sessionId = c.req.param('id');

  const session = await c.env.DB.prepare('SELECT id FROM qa_sessions WHERE id = ?').bind(sessionId).first<{ id: string }>();
  if (!session) return errorResponse('That Q&A session could not be found.', 404);

  try {
    if (!c.env.QA_SESSION) throw new Error('durable object binding missing');
    const stub = c.env.QA_SESSION.get(c.env.QA_SESSION.idFromName(sessionId));
    const response = await stub.fetch(`https://qa-session/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, userId: user.id, name: user.name }),
    });
    const data = (await response.json()) as any;
    await c.env.DB.prepare('UPDATE qa_sessions SET participants = ? WHERE id = ?')
      .bind(data?.participants ?? 0, sessionId)
      .run()
      .catch(() => undefined);
    return ok({ joined: true, sessionId, participants: data?.participants ?? 1, questions: data?.questions ?? 0 });
  } catch (error) {
    console.warn('[qa] durable object unavailable, using D1 count', error);
    const row = await c.env.DB.prepare('SELECT participants FROM qa_sessions WHERE id = ?').bind(sessionId).first<{ participants: number }>();
    const participants = (row?.participants ?? 0) + 1;
    await c.env.DB.prepare('UPDATE qa_sessions SET participants = ? WHERE id = ?').bind(participants, sessionId).run().catch(() => undefined);
    return ok({ joined: true, sessionId, participants, degraded: true });
  }
});

/* POST /qa/:id/leave */
qa.post('/:id/leave', async (c) => {
  const user = c.get('user');
  if (!user) return errorResponse('Authentication required.', 401);
  const sessionId = c.req.param('id');
  try {
    const stub = c.env.QA_SESSION!.get(c.env.QA_SESSION!.idFromName(sessionId));
    const response = await stub.fetch('https://qa-session/leave', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, userId: user.id }),
    });
    const data = (await response.json()) as any;
    return ok({ left: true, participants: data?.participants ?? 0 });
  } catch {
    return ok({ left: true, degraded: true });
  }
});

/* GET /qa/:id/live — participant/question counters (falls back to D1) */
qa.get('/:id/live', async (c) => {
  const sessionId = c.req.param('id');
  try {
    const stub = c.env.QA_SESSION!.get(c.env.QA_SESSION!.idFromName(sessionId));
    const response = await stub.fetch(`https://qa-session/stats?sessionId=${encodeURIComponent(sessionId)}`);
    const data = (await response.json()) as any;
    return ok({ participants: data?.participants ?? 0, questions: data?.questions ?? 0, realtime: true });
  } catch {
    const row = await c.env.DB.prepare('SELECT participants, questions_count FROM qa_sessions WHERE id = ?')
      .bind(sessionId)
      .first<any>();
    return ok({ participants: row?.participants ?? 0, questions: row?.questions_count ?? 0, realtime: false });
  }
});

/* GET /qa/:id/ws — WebSocket upgrade for live session channels */
qa.get('/:id/ws', async (c) => {
  const sessionId = c.req.param('id');
  const upgrade = c.req.header('Upgrade');
  if (!upgrade || upgrade.toLowerCase() !== 'websocket') {
    return errorResponse('This endpoint requires a WebSocket upgrade.', 426, 'upgrade_required');
  }
  try {
    const stub = c.env.QA_SESSION!.get(c.env.QA_SESSION!.idFromName(sessionId));
    return await stub.fetch(`https://qa-session/ws?sessionId=${encodeURIComponent(sessionId)}`, c.req.raw);
  } catch {
    return errorResponse('Live channel unavailable, falling back to polling.', 503, 'realtime_unavailable');
  }
});

export default qa;
export { mapSession, mapQuestion };
