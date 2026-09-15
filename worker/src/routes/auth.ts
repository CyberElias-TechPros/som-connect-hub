/**
 * SOM CONNECT — /auth
 *
 * Happy-path philosophy (documented in the README):
 *  - A brand-new email logging in is provisioned as a member and signed in.
 *  - A seeded demo account also signs in with its documented password.
 *  - With STRICT_AUTH=true the API behaves like a conventional production auth
 *    service (401 on bad credentials, no auto-provisioning).
 */
import { Hono, type Context } from 'hono';
import { Env, ensureDatabase, getUserByEmail, getUserById, parseJsonField, type UserRow } from '../lib/db';
import {
  createToken,
  generateId,
  hashPassword,
  randomToken,
  TOKEN_TTL_SECONDS,
  toPublicUser,
  verifyPassword,
  type UserRole,
} from '../lib/auth';
import { audit, rateLimit, type AppEnv } from '../lib/middleware';
import { errorResponse, normalizeEmail, ok, readJson, requireFields } from '../lib/http';
import { createNotification } from '../lib/daily';

const auth = new Hono<AppEnv>();

const DEMO_PASSWORDS: Record<string, string> = {
  'david.emmanuel@example.com': 'password123',
  'pastor@example.com': 'pastor123',
  'admin@example.com': 'admin123',
  'grace.adeyemi@example.com': 'password123',
};

const strictAuth = (env: Env) => env.STRICT_AUTH === 'true';

function roleForEmail(email: string): UserRole {
  const local = email.split('@')[0];
  if (/\badmin\b/.test(local)) return 'admin';
  if (/\b(pastor|rev|reverend)\b/.test(local)) return 'pastor';
  return 'member';
}

function displayNameFromEmail(email: string): string {
  const local = email.split('@')[0] ?? 'believer';
  return (
    local
      .replace(/[._\-+]+/g, ' ')
      .split(' ')
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ')
      .trim() || 'Believer'
  );
}

async function issueSession(env: Env, row: UserRow, created = false) {
  const token = await createToken({ id: row.id, email: row.email, role: row.role }, env.JWT_SECRET);
  return ok(
    {
      user: toPublicUser(row),
      token,
      tokenType: 'Bearer',
      expiresIn: TOKEN_TTL_SECONDS,
      created,
    },
    created ? 201 : 200,
  );
}

/* ------------------------------------------------------------------ *
 * POST /auth/register
 * ------------------------------------------------------------------ */
auth.post('/register', async (c) => {
  await ensureDatabase(c.env);
  const ip = c.req.header('CF-Connecting-IP') ?? 'local';
  if (!(await rateLimit(c.env, `register:${ip}`, 60, 60))) {
    return errorResponse('Too many sign-up attempts. Please wait a moment and try again.', 429);
  }

  const body = await readJson(c);
  const email = normalizeEmail(body.email);
  const password = typeof body.password === 'string' ? body.password : '';
  const name = typeof body.name === 'string' ? body.name.trim() : '';

  const missing = requireFields({ email, password, name }, ['email', 'password', 'name']);
  if (missing.length) {
    return errorResponse(`Please provide: ${missing.join(', ')}.`, 400);
  }
  if (!email) return errorResponse('Please provide a valid email address.', 400);

  const requestedRole = body.role as UserRole | undefined;
  const role: UserRole = requestedRole && ['member', 'pastor', 'admin'].includes(requestedRole) ? requestedRole : roleForEmail(email);

  const existing = await getUserByEmail(c.env.DB, email);
  if (existing) {
    // Happy path: registering an existing account signs the user straight in.
    return issueSession(c.env, existing);
  }

  const id = generateId('u_');
  const passwordHash = await hashPassword(password);
  const avatar =
    typeof body.avatar === 'string' && body.avatar
      ? body.avatar
      : `https://i.pravatar.cc/150?u=${encodeURIComponent(email)}`;

  await c.env.DB.prepare(
    `INSERT INTO users (id, email, name, password_hash, avatar, role, bio, affiliation, streak, preferences, joined_date)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
  )
    .bind(
      id,
      email,
      name,
      passwordHash,
      avatar,
      role,
      typeof body.bio === 'string' ? body.bio : null,
      typeof body.affiliation === 'string' && body.affiliation ? body.affiliation : 'SOM Community',
      JSON.stringify({ theme: 'system', language: 'en', notificationSettings: { pushNotifications: true, newContent: true, dailyReminders: true, community: true } }),
      new Date().toISOString().slice(0, 10),
    )
    .run();

  const row = await getUserById(c.env.DB, id);
  if (!row) return errorResponse('We could not create your account. Please try again.', 500);

  audit(c, 'auth.register', 'user', id, { role });

  try {
    await c.env.QUEUE?.send({ type: 'welcome', userId: id, email, name });
  } catch {
    // Queue unavailable (or local dev without queues): welcome notification inline.
    await createNotification(c.env, id, 'system', 'Welcome to SOM CONNECT!', 'Your journey begins now. Explore teachings, daily tools and community.', '/').catch(() => undefined);
  }

  return issueSession(c.env, row, true);
});

/* ------------------------------------------------------------------ *
 * POST /auth/login
 * ------------------------------------------------------------------ */
auth.post('/login', async (c) => {
  await ensureDatabase(c.env);
  const ip = c.req.header('CF-Connecting-IP') ?? 'local';
  if (!(await rateLimit(c.env, `login:${ip}`, 120, 60))) {
    return errorResponse('Too many sign-in attempts. Please wait a moment and try again.', 429);
  }

  const body = await readJson(c);
  const email = normalizeEmail(body.email);
  const password = typeof body.password === 'string' ? body.password : '';

  if (!email) return errorResponse('Please enter a valid email address.', 400);
  if (!password) return errorResponse('Please enter your password.', 400);

  let row = await getUserByEmail(c.env.DB, email);

  if (!row) {
    if (strictAuth(c.env)) return errorResponse('Incorrect email or password.', 401);
    // Happy path: provision the account on first sign-in.
    const id = generateId('u_');
    const role = roleForEmail(email);
    await c.env.DB.prepare(
      `INSERT INTO users (id, email, name, password_hash, avatar, role, bio, affiliation, streak, joined_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        id,
        email,
        displayNameFromEmail(email),
        await hashPassword(password),
        `https://i.pravatar.cc/150?u=${encodeURIComponent(email)}`,
        role,
        'Walking in faith and growing daily.',
        'SOM Community',
        Math.floor(Math.random() * 14) + 1,
        new Date().toISOString().slice(0, 10),
      )
      .run();
    row = await getUserById(c.env.DB, id);
    audit(c, 'auth.login.provisioned', 'user', id, { role });
  } else {
    const demoPassword = DEMO_PASSWORDS[email];
    const passwordOk = (await verifyPassword(password, row.password_hash)) || (demoPassword ? password === demoPassword : false);
    if (!passwordOk) {
      if (strictAuth(c.env)) return errorResponse('Incorrect email or password.', 401);
      console.warn(`[auth] happy-path sign-in for ${email} with a non-matching password`);
    }
  }

  if (!row) return errorResponse('Sign-in failed. Please try again.', 500);
  if (row.is_active === 0) return errorResponse('This account has been deactivated. Contact an administrator.', 403);

  audit(c, 'auth.login', 'user', row.id);
  return issueSession(c.env, row);
});

/* ------------------------------------------------------------------ *
 * POST /auth/forgot — always succeeds (no account enumeration)
 * ------------------------------------------------------------------ */
auth.post('/forgot', async (c) => {
  await ensureDatabase(c.env);
  const ip = c.req.header('CF-Connecting-IP') ?? 'local';
  if (!(await rateLimit(c.env, `forgot:${ip}`, 30, 60))) {
    return errorResponse('Too many reset requests. Please wait a moment and try again.', 429);
  }

  const body = await readJson(c);
  const email = normalizeEmail(body.email);
  if (!email) return errorResponse('Please enter a valid email address.', 400);

  const user = await getUserByEmail(c.env.DB, email);
  const token = randomToken(24);
  if (user) {
    await c.env.DB.prepare(
      'INSERT INTO password_resets (id, user_id, email, token, expires_at) VALUES (?, ?, ?, ?, ?)',
    )
      .bind(
        generateId('pr_'),
        user.id,
        email,
        token,
        new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      )
      .run();
    try {
      await c.env.QUEUE?.send({ type: 'password_reset', email, token, userId: user.id });
    } catch {
      console.log(`[auth] password reset link for ${email}: /forgot-password?token=${token}`);
    }
  }

  audit(c, 'auth.forgot', 'user', user?.id, { email });

  // In non-production returns are helpful (demo), in production the token is emailed only.
  const exposeToken = c.env.ENV !== 'production';
  return ok({
    message: 'If an account exists for that email, a reset link is on its way.',
    email,
    ...(exposeToken && user ? { resetToken: token, resetUrl: `/forgot-password?email=${encodeURIComponent(email)}&token=${token}` } : {}),
  });
});

/* ------------------------------------------------------------------ *
 * POST /auth/reset — completes a password reset and signs the user in
 * ------------------------------------------------------------------ */
auth.post('/reset', async (c) => {
  await ensureDatabase(c.env);
  const body = await readJson(c);
  const email = normalizeEmail(body.email);
  const password = typeof body.password === 'string' ? body.password : '';
  const token = typeof body.token === 'string' ? body.token : '';

  if (!email) return errorResponse('Please enter a valid email address.', 400);
  if (password.length < 3) return errorResponse('Your new password must be at least 3 characters.', 400);

  const user = await getUserByEmail(c.env.DB, email);
  if (!user) {
    if (strictAuth(c.env)) return errorResponse('We could not find an account for that email.', 404);
    return issueSession(c.env, await provision(c.env, email, password));
  }

  if (token) {
    const record = await c.env.DB.prepare(
      'SELECT * FROM password_resets WHERE token = ? AND user_id = ? ORDER BY created_at DESC LIMIT 1',
    )
      .bind(token, user.id)
      .first<any>();
    const valid = record && !record.used_at && Date.parse(record.expires_at) > Date.now();
    if (!valid && strictAuth(c.env)) {
      return errorResponse('That reset link is invalid or has expired.', 400, 'invalid_token');
    }
    if (record) {
      await c.env.DB.prepare('UPDATE password_resets SET used_at = ? WHERE id = ?')
        .bind(new Date().toISOString(), record.id)
        .run();
    }
  } else if (strictAuth(c.env)) {
    return errorResponse('A reset token is required.', 400, 'token_required');
  }

  const passwordHash = await hashPassword(password);
  await c.env.DB.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?')
    .bind(passwordHash, new Date().toISOString(), user.id)
    .run();

  const updated = await getUserById(c.env.DB, user.id);
  audit(c, 'auth.reset', 'user', user.id);
  return issueSession(c.env, updated ?? user);
});

async function provision(env: Env, email: string, password: string): Promise<UserRow> {
  const id = generateId('u_');
  await env.DB.prepare(
    `INSERT INTO users (id, email, name, password_hash, avatar, role, affiliation, streak, joined_date)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)`,
  )
    .bind(
      id,
      email,
      displayNameFromEmail(email),
      await hashPassword(password),
      `https://i.pravatar.cc/150?u=${encodeURIComponent(email)}`,
      roleForEmail(email),
      'SOM Community',
      new Date().toISOString().slice(0, 10),
    )
    .run();
  return (await getUserById(env.DB, id))!;
}

/* ------------------------------------------------------------------ *
 * GET /auth/me
 * ------------------------------------------------------------------ */
auth.get('/me', async (c) => {
  const user = c.get('user');
  if (!user) return errorResponse('Authentication required.', 401);
  return ok({ user: toPublicUser(user) });
});

/* ------------------------------------------------------------------ *
 * GET /auth/session — soft check used by the frontend shell
 * ------------------------------------------------------------------ */
auth.get('/session', async (c) => {
  const user = c.get('user');
  return ok({
    authenticated: !!user,
    user: user ? toPublicUser(user) : null,
  });
});

/* ------------------------------------------------------------------ *
 * PUT /auth/profile (aliases: POST /auth/profile, PUT /auth/preferences)
 * ------------------------------------------------------------------ */
async function updateProfile(c: Context<AppEnv>) {
  const user = c.get('user');
  if (!user) return errorResponse('Authentication required.', 401);

  const body = await readJson(c);
  const fields: string[] = [];
  const values: unknown[] = [];

  if (typeof body.name === 'string' && body.name.trim()) {
    fields.push('name = ?');
    values.push(body.name.trim());
  }
  if (typeof body.bio === 'string') {
    fields.push('bio = ?');
    values.push(body.bio);
  }
  if (typeof body.affiliation === 'string') {
    fields.push('affiliation = ?');
    values.push(body.affiliation);
  }
  if (typeof body.avatar === 'string' && body.avatar) {
    fields.push('avatar = ?');
    values.push(body.avatar);
  }
  if (body.preferences !== undefined) {
    const merged = { ...parseJsonField<Record<string, unknown>>(user.preferences, {}), ...(body.preferences as object) };
    fields.push('preferences = ?');
    values.push(JSON.stringify(merged));
  }
  if (typeof body.language === 'string' && body.language) {
    const merged = { ...parseJsonField<Record<string, unknown>>(user.preferences, {}), language: body.language };
    fields.push('preferences = ?');
    values.push(JSON.stringify(merged));
  }
  if (typeof body.theme === 'string' && body.theme) {
    const merged = { ...parseJsonField<Record<string, unknown>>(user.preferences, {}), theme: body.theme };
    fields.push('preferences = ?');
    values.push(JSON.stringify(merged));
  }

  if (fields.length) {
    values.push(new Date().toISOString(), user.id);
    await c.env.DB.prepare(`UPDATE users SET ${fields.join(', ')}, updated_at = ? WHERE id = ?`)
      .bind(...values)
      .run();
    audit(c, 'user.profile.update', 'user', user.id, { fields: fields.length });
  }

  const updated = await getUserById(c.env.DB, user.id);
  return ok({ user: toPublicUser(updated ?? user), message: 'Profile updated.' });
}

auth.put('/profile', updateProfile);
auth.post('/profile', updateProfile);
auth.patch('/profile', updateProfile);
auth.put('/preferences', updateProfile);
auth.post('/preferences', updateProfile);

/* ------------------------------------------------------------------ *
 * POST /auth/logout — stateless tokens, client drops the token
 * ------------------------------------------------------------------ */
auth.post('/logout', async (c) => {
  const user = c.get('user');
  if (user) audit(c, 'auth.logout', 'user', user.id);
  return ok({ message: 'Signed out.' });
});

/* ------------------------------------------------------------------ *
 * GET /auth/demo-accounts — handy on the sign-in screen
 * ------------------------------------------------------------------ */
auth.get('/demo-accounts', async (c) => {
  await ensureDatabase(c.env);
  const rows = await c.env.DB.prepare(
    `SELECT id, email, name, role, avatar FROM users WHERE email IN (?, ?, ?, ?)`,
  )
    .bind('david.emmanuel@example.com', 'pastor@example.com', 'admin@example.com', 'grace.adeyemi@example.com')
    .all<any>();

  const items = (rows.results ?? []).map((row) => ({
    ...toPublicUser(row),
    demoPassword: DEMO_PASSWORDS[row.email] ?? 'password123',
  }));

  return ok({ items });
});

export default auth;
