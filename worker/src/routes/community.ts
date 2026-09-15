import { Hono } from 'hono';
import { Env, jsonResponse, errorResponse } from '../lib/db';
import { requireAuth } from './auth';
import { generateId } from '../lib/auth';

const community = new Hono<{ Bindings: Env; Variables: { user?: any } }>();

// GET /community/posts
community.get('/posts', async (c) => {
  const limit = Math.min(parseInt(c.req.query('limit') || '20'), 100);
  const offset = parseInt(c.req.query('offset') || '0');

  const result = await c.env.DB.prepare(`
    SELECT p.*, u.name as author_name, u.email as author_email, u.avatar as author_avatar, u.role as author_role
    FROM community_posts p
    JOIN users u ON p.author_id = u.id
    ORDER BY p.created_at DESC
    LIMIT ? OFFSET ?
  `).bind(limit, offset).all();

  const items = (result.results || []).map((row: any) => ({
    id: row.id,
    content: row.content,
    image: row.image_url,
    likes: row.likes,
    comments: row.comments_count,
    timestamp: row.created_at,
    author: {
      id: row.author_id,
      name: row.author_name,
      email: row.author_email,
      avatar: row.author_avatar,
      role: row.author_role,
    }
  }));

  return jsonResponse({ items });
});

// POST /community/posts
community.post('/posts', async (c) => {
  const authErr = requireAuth(c);
  if (authErr) return authErr;
  const user = c.get('user');
  const { content, imageUrl } = await c.req.json();
  if (!content) return errorResponse('Content required');

  const id = generateId('post_');
  await c.env.DB.prepare('INSERT INTO community_posts (id, author_id, content, image_url) VALUES (?, ?, ?, ?)').bind(id, user.id, content, imageUrl || null).run();

  try {
    await c.env.QUEUE.send({ type: 'new_post', postId: id, authorId: user.id });
  } catch {}

  return jsonResponse({ id, message: 'Post created' }, 201);
});

// POST /community/posts/:id/like
community.post('/posts/:id/like', async (c) => {
  const authErr = requireAuth(c);
  if (authErr) return authErr;
  const user = c.get('user');
  const postId = c.req.param('id');

  const likeId = generateId('like_');
  try {
    await c.env.DB.prepare('INSERT INTO post_likes (id, post_id, user_id) VALUES (?, ?, ?)').bind(likeId, postId, user.id).run();
    await c.env.DB.prepare('UPDATE community_posts SET likes = likes + 1 WHERE id = ?').bind(postId).run();
  } catch (e: any) {
    if (e.message?.includes('UNIQUE')) {
      // Unlike
      await c.env.DB.prepare('DELETE FROM post_likes WHERE post_id = ? AND user_id = ?').bind(postId, user.id).run();
      await c.env.DB.prepare('UPDATE community_posts SET likes = MAX(0, likes - 1) WHERE id = ?').bind(postId).run();
      return jsonResponse({ message: 'Unliked', liked: false });
    }
    throw e;
  }

  return jsonResponse({ message: 'Liked', liked: true });
});

// GET /community/groups
community.get('/groups', async (c) => {
  const result = await c.env.DB.prepare('SELECT * FROM groups ORDER BY member_count DESC').all();
  const user = c.get('user');
  let joinedIds: string[] = [];

  if (user) {
    const joined = await c.env.DB.prepare('SELECT group_id FROM group_members WHERE user_id = ?').bind(user.id).all();
    joinedIds = (joined.results || []).map((r: any) => r.group_id);
  }

  const items = (result.results || []).map((g: any) => ({
    id: g.id,
    name: g.name,
    description: g.description,
    cover: g.cover,
    memberCount: g.member_count,
    isJoined: joinedIds.includes(g.id),
  }));

  return jsonResponse({ items });
});

// POST /community/groups/:id/join
community.post('/groups/:id/join', async (c) => {
  const authErr = requireAuth(c);
  if (authErr) return authErr;
  const user = c.get('user');
  const groupId = c.req.param('id');

  const id = generateId('gm_');
  try {
    await c.env.DB.prepare('INSERT INTO group_members (id, group_id, user_id) VALUES (?, ?, ?)').bind(id, groupId, user.id).run();
    await c.env.DB.prepare('UPDATE groups SET member_count = member_count + 1 WHERE id = ?').bind(groupId).run();
    return jsonResponse({ message: 'Joined group', joined: true });
  } catch (e: any) {
    if (e.message?.includes('UNIQUE')) {
      await c.env.DB.prepare('DELETE FROM group_members WHERE group_id = ? AND user_id = ?').bind(groupId, user.id).run();
      await c.env.DB.prepare('UPDATE groups SET member_count = MAX(0, member_count - 1) WHERE id = ?').bind(groupId).run();
      return jsonResponse({ message: 'Left group', joined: false });
    }
    throw e;
  }
});

export default community;
