import { Hono } from 'hono';
import { Env, jsonResponse, errorResponse } from '../lib/db';
import { requireAuth } from './auth';
import { validate, commentSchema } from '../lib/validators';
import { generateId } from '../lib/auth';

const comments = new Hono<{ Bindings: Env; Variables: { user?: any } }>();

// ===== CONTENT COMMENTS =====

// GET /comments/content/:contentId
comments.get('/content/:contentId', async (c) => {
  const contentId = c.req.param('contentId');
  const limit = Math.min(parseInt(c.req.query('limit') || '20'), 100);
  const offset = parseInt(c.req.query('offset') || '0');

  const result = await c.env.DB.prepare(`
    SELECT cc.*, u.name as user_name, u.avatar as user_avatar, u.role as user_role
    FROM content_comments cc
    JOIN users u ON cc.user_id = u.id
    WHERE cc.content_id = ? AND cc.is_deleted = 0
    ORDER BY cc.created_at DESC
    LIMIT ? OFFSET ?
  `).bind(contentId, limit, offset).all();

  const items = (result.results || []).map((r: any) => ({
    id: r.id,
    contentId: r.content_id,
    text: r.text,
    likes: r.likes,
    isEdited: !!r.is_edited,
    parentId: r.parent_id,
    user: { id: r.user_id, name: r.user_name, avatar: r.user_avatar, role: r.user_role },
    createdAt: r.created_at,
  }));

  return jsonResponse({ items });
});

// POST /comments/content/:contentId
comments.post('/content/:contentId', async (c) => {
  const authErr = requireAuth(c);
  if (authErr) return authErr;
  const user = c.get('user') as any;
  const contentId = c.req.param('contentId');

  const body = await c.req.json();
  const v = validate(commentSchema, body);
  if (!v.success) return errorResponse(v.error, 400);

  const id = generateId('cc_');
  await c.env.DB.prepare(
    'INSERT INTO content_comments (id, content_id, user_id, parent_id, text) VALUES (?, ?, ?, ?, ?)'
  ).bind(id, contentId, user.id, v.data.parentId || null, v.data.text).run();

  return jsonResponse({ id, message: 'Comment added' }, 201);
});

// POST /comments/content/:contentId/:commentId/like
comments.post('/content/:contentId/:commentId/like', async (c) => {
  const commentId = c.req.param('commentId');
  await c.env.DB.prepare('UPDATE content_comments SET likes = likes + 1 WHERE id = ?').bind(commentId).run();
  const updated = await c.env.DB.prepare('SELECT * FROM content_comments WHERE id = ?').bind(commentId).first();
  return jsonResponse(updated);
});

// DELETE /comments/content/:commentId
comments.delete('/content/:commentId', async (c) => {
  const authErr = requireAuth(c);
  if (authErr) return authErr;
  const user = c.get('user') as any;
  const commentId = c.req.param('commentId');

  const comment = await c.env.DB.prepare('SELECT * FROM content_comments WHERE id = ?').bind(commentId).first() as any;
  if (!comment) return errorResponse('Comment not found', 404);
  if (comment.user_id !== user.id && user.role !== 'admin') return errorResponse('Forbidden', 403);

  await c.env.DB.prepare('UPDATE content_comments SET is_deleted = 1 WHERE id = ?').bind(commentId).run();
  return jsonResponse({ message: 'Comment deleted' });
});

// ===== POST COMMENTS (Community) =====

// GET /comments/post/:postId
comments.get('/post/:postId', async (c) => {
  const postId = c.req.param('postId');
  const result = await c.env.DB.prepare(`
    SELECT pc.*, u.name as user_name, u.avatar as user_avatar
    FROM post_comments pc
    JOIN users u ON pc.user_id = u.id
    WHERE pc.post_id = ? AND pc.is_deleted = 0
    ORDER BY pc.created_at ASC
  `).bind(postId).all();

  const items = (result.results || []).map((r: any) => ({
    id: r.id,
    postId: r.post_id,
    text: r.text,
    likes: r.likes,
    parentId: r.parent_id,
    user: { id: r.user_id, name: r.user_name, avatar: r.user_avatar },
    createdAt: r.created_at,
  }));

  return jsonResponse({ items });
});

// POST /comments/post/:postId
comments.post('/post/:postId', async (c) => {
  const authErr = requireAuth(c);
  if (authErr) return authErr;
  const user = c.get('user') as any;
  const postId = c.req.param('postId');

  const body = await c.req.json();
  const v = validate(commentSchema, body);
  if (!v.success) return errorResponse(v.error, 400);

  const id = generateId('pc_');
  await c.env.DB.prepare(
    'INSERT INTO post_comments (id, post_id, user_id, parent_id, text) VALUES (?, ?, ?, ?, ?)'
  ).bind(id, postId, user.id, v.data.parentId || null, v.data.text).run();

  await c.env.DB.prepare('UPDATE community_posts SET comments_count = comments_count + 1 WHERE id = ?').bind(postId).run();

  return jsonResponse({ id, message: 'Comment added' }, 201);
});

// DELETE /comments/post/:commentId
comments.delete('/post/:commentId', async (c) => {
  const authErr = requireAuth(c);
  if (authErr) return authErr;
  const user = c.get('user') as any;
  const commentId = c.req.param('commentId');

  const comment = await c.env.DB.prepare('SELECT * FROM post_comments WHERE id = ?').bind(commentId).first() as any;
  if (!comment) return errorResponse('Comment not found', 404);
  if (comment.user_id !== user.id && user.role !== 'admin') return errorResponse('Forbidden', 403);

  await c.env.DB.prepare('UPDATE post_comments SET is_deleted = 1 WHERE id = ?').bind(commentId).run();
  await c.env.DB.prepare('UPDATE community_posts SET comments_count = MAX(0, comments_count - 1) WHERE id = ?').bind(comment.post_id).run();

  return jsonResponse({ message: 'Comment deleted' });
});

export default comments;
