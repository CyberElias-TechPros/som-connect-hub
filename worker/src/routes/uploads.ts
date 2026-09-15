import { Hono } from 'hono';
import { Env, jsonResponse, errorResponse } from '../lib/db';
import { requireAuth } from './auth';
import { generateId } from '../lib/auth';
import { generateR2Key } from '../lib/r2';

const uploads = new Hono<{ Bindings: Env; Variables: { user?: any } }>();

// POST /uploads — upload file to R2 (video, thumbnail, avatar)
uploads.post('/', async (c) => {
  const authErr = requireAuth(c);
  if (authErr) return authErr;
  const user = c.get('user');
  if (!['pastor','admin'].includes(user.role)) return errorResponse('Only pastors and admins can upload', 403);

  const formData = await c.req.formData();
  const file = formData.get('file') as File | null;
  const type = formData.get('type') as string || 'video'; // video, audio, thumbnail, avatar, publication
  const title = formData.get('title') as string || 'Untitled';

  if (!file) return errorResponse('File required');

  const arrayBuffer = await file.arrayBuffer();
  const key = generateR2Key(type, file.name);

  await c.env.STORAGE.put(key, arrayBuffer, {
    httpMetadata: { contentType: file.type || 'application/octet-stream' },
  });

  // Create pastor_upload record
  const id = generateId('up_');
  await c.env.DB.prepare(`
    INSERT INTO pastor_uploads (id, user_id, title, type, status, file_url, submitted_date)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(id, user.id, title, type === 'thumbnail' ? 'video' : type, 'pending', key, new Date().toISOString().split('T')[0]).run();

  return jsonResponse({ id, key, url: `/uploads/file/${key}`, message: 'Upload successful, pending review' }, 201);
});

// GET /uploads/file/:key — serve file from R2
uploads.get('/file/*', async (c) => {
  const key = c.req.param('*') || c.req.path.replace('/uploads/file/', '');
  if (!key) return errorResponse('Key required', 400);

  const obj = await c.env.STORAGE.get(key);
  if (!obj) return errorResponse('File not found', 404);

  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set('etag', obj.httpEtag);
  headers.set('Cache-Control', 'public, max-age=31536000');

  return new Response(obj.body, { headers });
});

// GET /uploads — list user's uploads
uploads.get('/', async (c) => {
  const authErr = requireAuth(c);
  if (authErr) return authErr;
  const user = c.get('user');

  const result = await c.env.DB.prepare('SELECT * FROM pastor_uploads WHERE user_id = ? ORDER BY created_at DESC').bind(user.id).all();
  return jsonResponse({ items: result.results || [] });
});

// GET /uploads/all — admin sees all
uploads.get('/all', async (c) => {
  const authErr = requireAuth(c);
  if (authErr) return authErr;
  const user = c.get('user');
  if (user.role !== 'admin') return errorResponse('Forbidden', 403);

  const result = await c.env.DB.prepare('SELECT pu.*, u.name as user_name FROM pastor_uploads pu JOIN users u ON pu.user_id = u.id ORDER BY pu.created_at DESC').all();
  return jsonResponse({ items: result.results || [] });
});

export default uploads;
