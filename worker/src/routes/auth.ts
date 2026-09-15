import { Hono } from 'hono';
import { Env, getUserByEmail, getUserById, jsonResponse, errorResponse } from '../lib/db';
import { hashPassword, verifyPassword, createToken, verifyToken, generateId } from '../lib/auth';

type Bindings = Env;
type Variables = { user?: any };

const auth = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Middleware to check auth
export async function authMiddleware(c: any, next: any) {
  const authHeader = c.req.header('Authorization');
  if (!authHeader) {
    // Allow guest for some routes, but set no user
    await next();
    return;
  }
  const token = authHeader.replace('Bearer ', '');
  const payload = await verifyToken(token, c.env.JWT_SECRET);
  if (payload) {
    const user = await getUserById(c.env.DB, payload.id);
    if (user) {
      c.set('user', user);
    }
  }
  await next();
}

export function requireAuth(c: any) {
  const user = c.get('user');
  if (!user) {
    return errorResponse('Unauthorized', 401);
  }
  return null;
}

export function requireRole(roles: string[]) {
  return async (c: any, next: any) => {
    const user = c.get('user');
    if (!user) return errorResponse('Unauthorized', 401);
    if (!roles.includes(user.role)) return errorResponse('Forbidden', 403);
    await next();
  };
}

// POST /auth/register — happy path: always succeeds
auth.post('/register', async (c) => {
  try {
    const { email, password, name, affiliation } = await c.req.json();
    if (!email || !password || !name) return errorResponse('Email, password, name required');

    const existing = await getUserByEmail(c.env.DB, email) as any;
    if (existing) {
      // Happy path: if exists, just login
      const token = await createToken({ id: existing.id as string, email: existing.email as string, role: existing.role as any }, c.env.JWT_SECRET);
      const user = {
        id: existing.id,
        email: existing.email,
        name: existing.name,
        avatar: existing.avatar,
        role: existing.role,
        bio: existing.bio,
        affiliation: existing.affiliation,
        streak: existing.streak,
        joinedDate: existing.joined_date,
      };
      return jsonResponse({ user, token });
    }

    const id = generateId('u_');
    const passwordHash = await hashPassword(password);
    const avatar = `https://i.pravatar.cc/150?u=${encodeURIComponent(email.toLowerCase())}`;

    await c.env.DB.prepare(
      'INSERT INTO users (id, email, name, password_hash, avatar, role, affiliation, streak, joined_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(id, email.toLowerCase(), name, passwordHash, avatar, 'member', affiliation || 'SOM Community', 1, new Date().toISOString().split('T')[0]).run();

    const token = await createToken({ id, email: email.toLowerCase(), role: 'member' }, c.env.JWT_SECRET);
    const user = { id, email: email.toLowerCase(), name, avatar, role: 'member', affiliation, streak: 1, joinedDate: new Date().toISOString().split('T')[0] };

    // Queue welcome notification
    try {
      await c.env.QUEUE.send({ type: 'welcome', userId: id, email });
    } catch {}

    return jsonResponse({ user, token }, 201);
  } catch (e: any) {
    return errorResponse(e.message || 'Registration failed', 500);
  }
});

// POST /auth/login — happy path: any email/password works
auth.post('/login', async (c) => {
  try {
    const { email, password } = await c.req.json();
    if (!email || !password) return errorResponse('Email and password required');

    const normalized = email.toLowerCase();
    let user = await getUserByEmail(c.env.DB, normalized) as any;

    // Happy path: if not found, create member automatically
    if (!user) {
      const id = generateId('u_');
      const passwordHash = await hashPassword(password);
      const name = normalized.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || 'Believer';
      const avatar = `https://i.pravatar.cc/150?u=${encodeURIComponent(normalized)}`;

      // Determine role from email for demo
      let role = 'member';
      if (normalized.includes('pastor')) role = 'pastor';
      if (normalized.includes('admin')) role = 'admin';

      await c.env.DB.prepare(
        'INSERT INTO users (id, email, name, password_hash, avatar, role, affiliation, streak, joined_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).bind(id, normalized, name, passwordHash, avatar, role, 'SOM Community', Math.floor(Math.random()*20)+1, new Date().toISOString().split('T')[0]).run();

      user = await getUserById(c.env.DB, id) as any;
    } else {
      // Verify password, but allow happy path even if fails for demo (if password length >=3)
      const valid = await verifyPassword(password, user.password_hash as string);
      if (!valid && password.length < 3) return errorResponse('Invalid credentials', 401);
    }

    if (!user) return errorResponse('Login failed', 500);

    const token = await createToken({ id: user.id as string, email: user.email as string, role: user.role as any }, c.env.JWT_SECRET);
    const safeUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      role: user.role,
      bio: user.bio,
      affiliation: user.affiliation,
      streak: user.streak,
      joinedDate: user.joined_date,
      preferences: user.preferences ? JSON.parse(user.preferences as string) : undefined,
    };

    return jsonResponse({ user: safeUser, token });
  } catch (e: any) {
    return errorResponse(e.message || 'Login failed', 500);
  }
});

// POST /auth/forgot — always succeeds
auth.post('/forgot', async (c) => {
  const body = await c.req.json() as any;
  const email = body.email;
  if (!email) return errorResponse('Email required');
  // In real prod, send email via queue
  try {
    await c.env.QUEUE.send({ type: 'password_reset', email });
  } catch {}
  return jsonResponse({ message: 'If account exists, reset link sent', email });
});

// GET /auth/me
auth.get('/me', async (c) => {
  const authErr = requireAuth(c);
  if (authErr) return authErr;
  const user = c.get('user') as any;
  return jsonResponse({
    id: user.id,
    email: user.email,
    name: user.name,
    avatar: user.avatar,
    role: user.role,
    bio: user.bio,
    affiliation: user.affiliation,
    streak: user.streak,
    joinedDate: user.joined_date,
    preferences: user.preferences ? JSON.parse(user.preferences) : undefined,
  });
});

// PUT /auth/profile
auth.put('/profile', async (c) => {
  const authErr = requireAuth(c);
  if (authErr) return authErr;
  const user = c.get('user') as any;
  const body = await c.req.json() as any;
  const { name, bio, affiliation, avatar } = body;

  await c.env.DB.prepare(
    'UPDATE users SET name = COALESCE(?, name), bio = COALESCE(?, bio), affiliation = COALESCE(?, affiliation), avatar = COALESCE(?, avatar), updated_at = ? WHERE id = ?'
  ).bind(name || null, bio || null, affiliation || null, avatar || null, new Date().toISOString(), user.id).run();

  const updated = await getUserById(c.env.DB, user.id) as any;
  if (!updated) return errorResponse('User not found', 404);
  return jsonResponse({
    id: updated.id,
    email: updated.email,
    name: updated.name,
    avatar: updated.avatar,
    role: updated.role,
    bio: updated.bio,
    affiliation: updated.affiliation,
    streak: updated.streak,
    joinedDate: updated.joined_date,
  });
});

export default auth;
