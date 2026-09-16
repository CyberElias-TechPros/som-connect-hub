/**
 * SOM CONNECT — /community
 * Posts, likes, comments, groups.
 */
import { Hono } from 'hono';
import { audit, type AppEnv } from '../lib/middleware';
import { errorResponse, ok, pagination, readJson } from '../lib/http';
import { generateId } from '../lib/auth';

const community = new Hono<AppEnv>();

const POST_SELECT = `
  SELECT p.*, u.name AS author_name, u.email AS author_email, u.avatar AS author_avatar, u.role AS author_role,
         g.name AS group_name
  FROM community_posts p
  JOIN users u ON p.author_id = u.id
  LEFT JOIN groups g ON p.group_id = g.id
`;

function mapPost(row: any, likes: Set<string> = new Set()) {
  return {
    id: row.id,
    content: row.content,
    image: row.image_url ?? null,
    imageUrl: row.image_url ?? null,
    likes: row.likes ?? 0,
    comments: row.comments_count ?? 0,
    commentsCount: row.comments_count ?? 0,
    timestamp: row.created_at,
    createdAt: row.created_at,
    groupId: row.group_id ?? null,
    groupName: row.group_name ?? null,
    isLiked: likes.has(row.id),
    author: {
      id: row.author_id,
      name: row.author_name,
      email: row.author_email,
      avatar: row.author_avatar,
      role: row.author_role,
    },
  };
}

/* GET /community/posts */
community.get('/posts', async (c) => {
  const { limit, offset } = pagination(c, 20, 50);
  const author = c.req.query('author');
  const groupId = c.req.query('group');

  let where = ' WHERE 1=1';
  const params: unknown[] = [];
  if (author) {
    where += ' AND p.author_id = ?';
    params.push(author);
  }
  if (groupId) {
    where += ' AND p.group_id = ?';
    params.push(groupId);
  }

  const [rows, total] = await Promise.all([
    c.env.DB.prepare(`${POST_SELECT}${where} ORDER BY p.created_at DESC LIMIT ? OFFSET ?`)
      .bind(...params, limit, offset)
      .all<any>(),
    c.env.DB.prepare(`SELECT COUNT(*) AS n FROM community_posts p${where}`).bind(...params).first<{ n: number }>(),
  ]);

  let liked = new Set<string>();
  const user = c.get('user');
  if (user && rows.results?.length) {
    const ids = rows.results.map((row: any) => row.id);
    const placeholders = ids.map(() => '?').join(',');
    const likedRows = await c.env.DB.prepare(
      `SELECT post_id FROM post_likes WHERE user_id = ? AND post_id IN (${placeholders})`,
    )
      .bind(user.id, ...ids)
      .all<any>();
    liked = new Set((likedRows.results ?? []).map((r: any) => r.post_id));
  }

  const items = (rows.results ?? []).map((row) => mapPost(row, liked));
  const count = total?.n ?? items.length;
  return ok({ items, total: count, limit, offset, hasMore: offset + items.length < count });
});

/* POST /community/posts */
community.post('/posts', async (c) => {
  const user = c.get('user');
  if (!user) return errorResponse('Authentication required.', 401);
  const body = await readJson(c);
  const text = typeof body.content === 'string' ? body.content.trim() : '';
  if (!text) return errorResponse('Write something before posting.', 400);
  if (text.length > 5000) return errorResponse('Posts are limited to 5000 characters.', 400);

  const id = generateId('post_');
  const imageUrl = typeof body.imageUrl === 'string' && body.imageUrl ? body.imageUrl : null;
  const groupId = typeof body.groupId === 'string' && body.groupId ? body.groupId : null;

  await c.env.DB.prepare('INSERT INTO community_posts (id, author_id, content, image_url, group_id) VALUES (?, ?, ?, ?, ?)')
    .bind(id, user.id, text, imageUrl, groupId)
    .run();

  audit(c, 'community.post.create', 'post', id);
  try {
    await c.env.QUEUE?.send({ type: 'new_post', postId: id, authorId: user.id });
  } catch {
    /* queue optional */
  }

  const row = await c.env.DB.prepare(`${POST_SELECT} WHERE p.id = ?`).bind(id).first<any>();
  return ok({ id, post: row ? mapPost(row) : { id, content: text, author: { id: user.id, name: user.name } }, message: 'Posted to the community.' }, 201);
});

/* GET /community/posts/:id */
community.get('/posts/:id', async (c) => {
  const id = c.req.param('id');
  const row = await c.env.DB.prepare(`${POST_SELECT} WHERE p.id = ?`).bind(id).first<any>();
  if (!row) return errorResponse('Post not found.', 404);

  const comments = await c.env.DB.prepare(
    `SELECT c.*, u.name AS author_name, u.avatar AS author_avatar, u.role AS author_role
     FROM post_comments c JOIN users u ON c.author_id = u.id
     WHERE c.post_id = ? ORDER BY c.created_at ASC`,
  )
    .bind(id)
    .all<any>();

  return ok({
    post: mapPost(row),
    comments: (comments.results ?? []).map((comment: any) => ({
      id: comment.id,
      content: comment.content,
      timestamp: comment.created_at,
      author: { id: comment.author_id, name: comment.author_name, avatar: comment.author_avatar, role: comment.author_role },
    })),
  });
});

/* POST /community/posts/:id/like — toggles */
community.post('/posts/:id/like', async (c) => {
  const user = c.get('user');
  if (!user) return errorResponse('Authentication required.', 401);
  const postId = c.req.param('id');

  const post = await c.env.DB.prepare('SELECT id FROM community_posts WHERE id = ?').bind(postId).first<{ id: string }>();
  if (!post) return errorResponse('Post not found.', 404);

  const existing = await c.env.DB.prepare('SELECT id FROM post_likes WHERE post_id = ? AND user_id = ?')
    .bind(postId, user.id)
    .first<{ id: string }>();

  if (existing) {
    await c.env.DB.prepare('DELETE FROM post_likes WHERE id = ?').bind(existing.id).run();
    await c.env.DB.prepare('UPDATE community_posts SET likes = MAX(0, likes - 1) WHERE id = ?').bind(postId).run();
    const row = await c.env.DB.prepare('SELECT likes FROM community_posts WHERE id = ?').bind(postId).first<{ likes: number }>();
    return ok({ liked: false, likes: row?.likes ?? 0, message: 'Like removed.' });
  }

  await c.env.DB.prepare('INSERT INTO post_likes (id, post_id, user_id) VALUES (?, ?, ?)')
    .bind(generateId('like_'), postId, user.id)
    .run();
  await c.env.DB.prepare('UPDATE community_posts SET likes = likes + 1 WHERE id = ?').bind(postId).run();
  const row = await c.env.DB.prepare('SELECT likes FROM community_posts WHERE id = ?').bind(postId).first<{ likes: number }>();
  return ok({ liked: true, likes: row?.likes ?? 1, message: 'Liked.' });
});

/* POST /community/posts/:id/comments */
community.post('/posts/:id/comments', async (c) => {
  const user = c.get('user');
  if (!user) return errorResponse('Authentication required.', 401);
  const postId = c.req.param('id');
  const body = await readJson(c);
  const text = typeof body.content === 'string' ? body.content.trim() : '';
  if (!text) return errorResponse('Write a comment first.', 400);

  const post = await c.env.DB.prepare('SELECT id, author_id FROM community_posts WHERE id = ?').bind(postId).first<any>();
  if (!post) return errorResponse('Post not found.', 404);

  const id = generateId('comment_');
  await c.env.DB.prepare('INSERT INTO post_comments (id, post_id, author_id, content) VALUES (?, ?, ?, ?)')
    .bind(id, postId, user.id, text)
    .run();
  await c.env.DB.prepare('UPDATE community_posts SET comments_count = comments_count + 1 WHERE id = ?').bind(postId).run();

  // Notify the post author (never self-notify).
  if (post.author_id !== user.id) {
    await c.env.DB.prepare(
      'INSERT INTO notifications (id, user_id, type, title, message, action_url) VALUES (?, ?, ?, ?, ?, ?)',
    )
      .bind(
        generateId('notif_'),
        post.author_id,
        'community',
        'New comment on your post',
        `${user.name} commented on your post.`,
        '/community',
      )
      .run()
      .catch(() => undefined);
  }

  return ok(
    {
      id,
      comment: {
        id,
        content: text,
        timestamp: new Date().toISOString(),
        author: { id: user.id, name: user.name, avatar: user.avatar, role: user.role },
      },
      message: 'Comment added.',
    },
    201,
  );
});

/* DELETE /community/posts/:id */
community.delete('/posts/:id', async (c) => {
  const user = c.get('user');
  if (!user) return errorResponse('Authentication required.', 401);
  const postId = c.req.param('id');
  const post = await c.env.DB.prepare('SELECT author_id FROM community_posts WHERE id = ?').bind(postId).first<{ author_id: string }>();
  if (!post) return errorResponse('Post not found.', 404);
  if (post.author_id !== user.id && user.role !== 'admin') return errorResponse('You can only delete your own posts.', 403);

  await c.env.DB.prepare('DELETE FROM community_posts WHERE id = ?').bind(postId).run();
  audit(c, 'community.post.delete', 'post', postId);
  return ok({ id: postId, message: 'Post deleted.' });
});

/* GET /community/groups */
community.get('/groups', async (c) => {
  const rows = await c.env.DB.prepare('SELECT * FROM groups ORDER BY member_count DESC').all<any>();
  const user = c.get('user');

  let joinedIds: string[] = [];
  if (user) {
    const joined = await c.env.DB.prepare('SELECT group_id FROM group_members WHERE user_id = ?').bind(user.id).all<any>();
    joinedIds = (joined.results ?? []).map((r: any) => r.group_id);
  }

  const items = (rows.results ?? []).map((group: any) => ({
    id: group.id,
    name: group.name,
    description: group.description,
    cover: group.cover,
    category: group.category,
    memberCount: group.member_count,
    isJoined: joinedIds.includes(group.id),
  }));

  return ok({ items, joined: joinedIds });
});

/* POST /community/groups/:id/join — toggles membership */
community.post('/groups/:id/join', async (c) => {
  const user = c.get('user');
  if (!user) return errorResponse('Authentication required.', 401);
  const groupId = c.req.param('id');

  const group = await c.env.DB.prepare('SELECT id, name FROM groups WHERE id = ?').bind(groupId).first<any>();
  if (!group) return errorResponse('Group not found.', 404);

  const existing = await c.env.DB.prepare('SELECT id FROM group_members WHERE group_id = ? AND user_id = ?')
    .bind(groupId, user.id)
    .first<{ id: string }>();

  if (existing) {
    await c.env.DB.prepare('DELETE FROM group_members WHERE id = ?').bind(existing.id).run();
    await c.env.DB.prepare('UPDATE groups SET member_count = MAX(0, member_count - 1) WHERE id = ?').bind(groupId).run();
    return ok({ joined: false, groupId, message: `You left ${group.name}.` });
  }

  await c.env.DB.prepare('INSERT INTO group_members (id, group_id, user_id) VALUES (?, ?, ?)')
    .bind(generateId('gm_'), groupId, user.id)
    .run();
  await c.env.DB.prepare('UPDATE groups SET member_count = member_count + 1 WHERE id = ?').bind(groupId).run();
  return ok({ joined: true, groupId, message: `Welcome to ${group.name}!` });
});

export default community;
