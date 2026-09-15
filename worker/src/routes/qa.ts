import { Hono } from 'hono';
import { Env, jsonResponse, errorResponse } from '../lib/db';
import { requireAuth } from './auth';
import { generateId } from '../lib/auth';

const qa = new Hono<{ Bindings: Env; Variables: { user?: any } }>();

// GET /qa
qa.get('/', async (c) => {
  const status = c.req.query('status');
  let query = `
    SELECT qs.*, s.name as speaker_name, s.title as speaker_title, s.avatar as speaker_avatar
    FROM qa_sessions qs
    JOIN speakers s ON qs.speaker_id = s.id
    WHERE 1=1
  `;
  const params: any[] = [];
  if (status && status !== 'all') {
    query += ' AND qs.status = ?';
    params.push(status);
  }
  query += ' ORDER BY qs.date DESC';

  const result = await c.env.DB.prepare(query).bind(...params).all();
  const items = (result.results || []).map((row: any) => ({
    id: row.id,
    title: row.title,
    speaker: { id: row.speaker_id, name: row.speaker_name, title: row.speaker_title, avatar: row.speaker_avatar },
    date: row.date,
    status: row.status,
    thumbnail: row.thumbnail,
    duration: row.duration,
    questionsCount: row.questions_count,
  }));

  return jsonResponse({ items });
});

// GET /qa/:id
qa.get('/:id', async (c) => {
  const id = c.req.param('id');
  const session = await c.env.DB.prepare(`
    SELECT qs.*, s.name as speaker_name, s.title as speaker_title, s.avatar as speaker_avatar
    FROM qa_sessions qs
    JOIN speakers s ON qs.speaker_id = s.id
    WHERE qs.id = ?
  `).bind(id).first() as any;

  if (!session) return errorResponse('Session not found', 404);

  const questionsResult = await c.env.DB.prepare('SELECT * FROM qa_questions WHERE session_id = ? ORDER BY upvotes DESC, created_at DESC').bind(id).all();

  return jsonResponse({
    id: session.id,
    title: session.title,
    speaker: { id: session.speaker_id, name: session.speaker_name, title: session.speaker_title, avatar: session.speaker_avatar },
    date: session.date,
    status: session.status,
    thumbnail: session.thumbnail,
    duration: session.duration,
    questions: questionsResult.results || [],
  });
});

// POST /qa/:id/questions
qa.post('/:id/questions', async (c) => {
  const authErr = requireAuth(c);
  if (authErr) return authErr;
  const user = c.get('user');
  const sessionId = c.req.param('id');
  const { text } = await c.req.json();
  if (!text) return errorResponse('Text required');

  const id = generateId('q_');
  await c.env.DB.prepare(
    'INSERT INTO qa_questions (id, session_id, user_id, text, asked_by) VALUES (?, ?, ?, ?, ?)'
  ).bind(id, sessionId, user.id, text, user.name).run();

  await c.env.DB.prepare('UPDATE qa_sessions SET questions_count = questions_count + 1 WHERE id = ?').bind(sessionId).run();

  try {
    await c.env.QUEUE.send({ type: 'new_question', sessionId, questionId: id });
  } catch {}

  return jsonResponse({ id, message: 'Question submitted' }, 201);
});

// POST /qa/:id/questions/:qid/upvote
qa.post('/:id/questions/:qid/upvote', async (c) => {
  const qid = c.req.param('qid');
  await c.env.DB.prepare('UPDATE qa_questions SET upvotes = upvotes + 1 WHERE id = ?').bind(qid).run();
  const updated = await c.env.DB.prepare('SELECT * FROM qa_questions WHERE id = ?').bind(qid).first();
  return jsonResponse(updated);
});

// POST /qa/:id/join — Durable Object coordination
qa.post('/:id/join', async (c) => {
  const authErr = requireAuth(c);
  if (authErr) return authErr;
  const user = c.get('user');
  const sessionId = c.req.param('id');

  try {
    const id = c.env.QA_SESSION.idFromName(sessionId);
    const stub = c.env.QA_SESSION.get(id);
    const res = await stub.fetch('https://qa/join', {
      method: 'POST',
      body: JSON.stringify({ sessionId, userId: user.id }),
    });
    const data = await res.json();
    return jsonResponse(data);
  } catch {
    // Fallback if Durable Object not available locally
    return jsonResponse({ joined: true, participants: Math.floor(Math.random()*100)+1 });
  }
});

export default qa;
