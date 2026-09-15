/**
 * SOM CONNECT — middleware: auth resolution, role gates, rate limiting, audit.
 */
import { Env, ensureDatabase, getUserById, toBool, type Role } from './db';
import { verifyToken, hasAtLeast, generateId, type UserRole } from './auth';
import { errorResponse } from './http';

export type AppEnv = { Bindings: Env; Variables: { user?: any; requestId: string } };

function bearerToken(c: any): string | null {
  const header = c.req.header('Authorization') || c.req.header('authorization');
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match ? match[1].trim() : null;
}

/**
 * Resolves the current user from the bearer token (if any), bootstraps the
 * database and assigns a request id. Never rejects — route-level guards do.
 */
export async function resolveAuth(c: any, next: () => Promise<void>): Promise<void> {
  c.set('requestId', generateId('req_'));
  try {
    await ensureDatabase(c.env);
  } catch {
    /* routes will report their own failures */
  }

  const token = bearerToken(c);
  if (token) {
    const payload = await verifyToken(token, c.env.JWT_SECRET);
    if (payload) {
      const user = await getUserById(c.env.DB, payload.id);
      if (user && user.is_active !== 0) c.set('user', user);
    }
  }
  await next();
}

/** Route guard: returns a 401 Response when unauthenticated, otherwise null. */
export function requireAuth(c: any): Response | null {
  if (!c.get('user')) {
    return errorResponse('Authentication required. Sign in to continue.', 401, 'unauthorized');
  }
  return null;
}

/** Route guard: 403 unless the user holds one of the roles. */
export function requireRole(c: any, roles: UserRole[]): Response | null {
  const unauthorized = requireAuth(c);
  if (unauthorized) return unauthorized;
  const user = c.get('user');
  if (!roles.includes(user.role)) {
    return errorResponse('You do not have permission to perform this action.', 403, 'forbidden');
  }
  return null;
}

/** Route guard: 403 unless the user's role ranks at least `minimum`. */
export function requireAtLeast(c: any, minimum: Role): Response | null {
  const unauthorized = requireAuth(c);
  if (unauthorized) return unauthorized;
  const user = c.get('user');
  if (!hasAtLeast(user.role, minimum)) {
    return errorResponse('You do not have permission to perform this action.', 403, 'forbidden');
  }
  return null;
}

/* ------------------------------------------------------------------ *
 * Rate limiting (KV, fails open — never blocks a happy path)
 * ------------------------------------------------------------------ */

const memoryBuckets = new Map<string, { count: number; resetAt: number }>();

export async function rateLimit(env: Env, key: string, limit = 60, windowSeconds = 60): Promise<boolean> {
  const bucketKey = `ratelimit:${key}`;
  const now = Date.now();

  if (!env.CACHE) {
    const bucket = memoryBuckets.get(bucketKey);
    if (!bucket || bucket.resetAt < now) {
      memoryBuckets.set(bucketKey, { count: 1, resetAt: now + windowSeconds * 1000 });
      return true;
    }
    bucket.count += 1;
    return bucket.count <= limit;
  }

  try {
    const current = Number((await env.CACHE.get(bucketKey)) ?? 0);
    if (current >= limit) return false;
    await env.CACHE.put(bucketKey, String(current + 1), { expirationTtl: Math.max(windowSeconds, 60) });
    return true;
  } catch {
    return true; // fail open
  }
}

/* ------------------------------------------------------------------ *
 * Audit trail
 * ------------------------------------------------------------------ */

export function audit(
  c: any,
  action: string,
  resourceType: string,
  resourceId?: string,
  details?: Record<string, unknown>,
): void {
  const env: Env | undefined = c?.env;
  if (!env?.DB) return;
  const userId = c.get?.('user')?.id ?? null;
  const statement = env.DB.prepare(
    'INSERT INTO audit_logs (id, user_id, action, resource_type, resource_id, details) VALUES (?, ?, ?, ?, ?, ?)',
  )
    .bind(
      generateId('audit_'),
      userId,
      action,
      resourceType,
      resourceId ?? null,
      details ? JSON.stringify(details).slice(0, 2000) : null,
    )
    .run()
    .catch(() => undefined);

  try {
    c.executionCtx?.waitUntil?.(statement);
  } catch {
    /* ExecutionContext unavailable (tests) — the promise still runs */
  }
}

/** Safe number coercion for money/limits. */
export function num(value: unknown, fallback = 0): number {
  const parsed = typeof value === 'string' ? Number.parseFloat(value) : typeof value === 'number' ? value : NaN;
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function bool(value: unknown, fallback = false): boolean {
  if (value === undefined || value === null) return fallback;
  return toBool(value);
}
