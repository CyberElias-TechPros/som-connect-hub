import { Hono } from 'hono';
import { Env, jsonResponse, errorResponse } from '../lib/db';
import { requireAuth } from './auth';
import { validate, publicationSchema } from '../lib/validators';
import { generateId } from '../lib/auth';
import { auditLog, getClientInfo } from '../lib/audit';

const publications = new Hono<{ Bindings: Env; Variables: { user?: any } }>();

// GET /publications
publications.get('/', async (c) => {
  const type = c.req.query('type');
  const premium = c.req.query('premium');
  const limit = Math.min(parseInt(c.req.query('limit') || '20'), 100);
  const offset = parseInt(c.req.query('offset') || '0');

  let query = 'SELECT * FROM publications WHERE 1=1';
  const params: any[] = [];

  if (type && type !== 'all') {
    query += ' AND type = ?';
    params.push(type);
  }
  if (premium === 'true') {
    query += ' AND is_premium = 1';
  } else if (premium === 'false') {
    query += ' AND is_premium = 0';
  }

  query += ' ORDER BY issue_date DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const result = await c.env.DB.prepare(query).bind(...params).all();
  return jsonResponse({ items: result.results || [] });
});

// GET /publications/:id
publications.get('/:id', async (c) => {
  const id = c.req.param('id');
  const pub = await c.env.DB.prepare('SELECT * FROM publications WHERE id = ?').bind(id).first();
  if (!pub) return errorResponse('Publication not found', 404);

  // Increment download count if query param
  if (c.req.query('download') === 'true') {
    await c.env.DB.prepare('UPDATE publications SET download_count = download_count + 1 WHERE id = ?').bind(id).run();
  }

  return jsonResponse(pub);
});

// POST /publications — admin only
publications.post('/', async (c) => {
  const authErr = requireAuth(c);
  if (authErr) return authErr;
  const user = c.get('user') as any;
  if (user.role !== 'admin') return errorResponse('Forbidden', 403);

  const body = await c.req.json();
  const v = validate(publicationSchema, body);
  if (!v.success) return errorResponse(v.error, 400);

  const id = generateId('pub_');
  await c.env.DB.prepare(
    'INSERT INTO publications (id, title, type, cover, issue_date, pages, description, is_premium) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(id, v.data.title, v.data.type, v.data.cover, v.data.issueDate, v.data.pages, v.data.description, v.data.isPremium ? 1 : 0).run();

  const { ip, ua } = getClientInfo(c);
  await auditLog(c.env.DB, user.id, 'publication.create', 'publication', id, v.data, ip, ua);

  return jsonResponse({ id, message: 'Publication created' }, 201);
});

// PUT /publications/:id — admin only
publications.put('/:id', async (c) => {
  const authErr = requireAuth(c);
  if (authErr) return authErr;
  const user = c.get('user') as any;
  if (user.role !== 'admin') return errorResponse('Forbidden', 403);

  const id = c.req.param('id');
  const body = await c.req.json();

  const v = validate(publicationSchema.partial(), body);
  if (!v.success) return errorResponse(v.error, 400);

  const updates = v.data as any;
  const setClause = Object.keys(updates).map(k => {
    const col = k === 'issueDate' ? 'issue_date' : k === 'isPremium' ? 'is_premium' : k;
    return `${col} = ?`;
  }).join(', ');

  if (!setClause) return errorResponse('No fields', 400);

  const values = Object.values(updates).map(val => typeof val === 'boolean' ? (val ? 1 : 0) : val);
  await c.env.DB.prepare(`UPDATE publications SET ${setClause} WHERE id = ?`).bind(...values, id).run();

  return jsonResponse({ message: 'Publication updated', id });
});

// DELETE /publications/:id — admin only
publications.delete('/:id', async (c) => {
  const authErr = requireAuth(c);
  if (authErr) return authErr;
  const user = c.get('user') as any;
  if (user.role !== 'admin') return errorResponse('Forbidden', 403);

  const id = c.req.param('id');
  await c.env.DB.prepare('DELETE FROM publications WHERE id = ?').bind(id).run();
  return jsonResponse({ message: 'Publication deleted' });
});

export default publications;
