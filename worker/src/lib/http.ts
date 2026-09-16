/**
 * SOM CONNECT — HTTP helpers
 * Consistent JSON envelopes, validation, pagination and CORS.
 */

export interface ApiMeta {
  total?: number;
  limit?: number;
  offset?: number;
  [key: string]: unknown;
}

export function jsonResponse(data: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...headers,
    },
  });
}

/** Success envelope: `{ ok: true, ...payload }`. */
export function ok(data: Record<string, unknown> = {}, status = 200, headers?: Record<string, string>): Response {
  return jsonResponse({ ok: true, ...data }, status, headers);
}

export interface ErrorBody {
  ok: false;
  error: string;
  code: string;
  status: number;
  details?: unknown;
}

export function errorResponse(message: string, status = 400, code?: string, details?: unknown): Response {
  const body: ErrorBody = {
    ok: false,
    error: message,
    code: code ?? codeForStatus(status),
    status,
    ...(details !== undefined ? { details } : {}),
  };
  return jsonResponse(body, status);
}

function codeForStatus(status: number): string {
  switch (status) {
    case 400: return 'bad_request';
    case 401: return 'unauthorized';
    case 403: return 'forbidden';
    case 404: return 'not_found';
    case 409: return 'conflict';
    case 413: return 'payload_too_large';
    case 429: return 'rate_limited';
    default: return status >= 500 ? 'internal_error' : 'error';
  }
}

/* ------------------------------------------------------------------ *
 * Request parsing — never throws, always returns usable values
 * ------------------------------------------------------------------ */

export async function readJson<T = Record<string, any>>(c: any): Promise<T> {
  try {
    const body = await c.req.json();
    return (body ?? {}) as T;
  } catch {
    return {} as T;
  }
}

export function queryInt(c: any, key: string, fallback: number, max = 200): number {
  const raw = c.req.query(key);
  if (raw === undefined || raw === '') return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed)) return fallback;
  return Math.min(Math.max(parsed, 0), max);
}

export function queryBool(c: any, key: string): boolean | undefined {
  const raw = c.req.query(key);
  if (raw === undefined || raw === '') return undefined;
  return raw === 'true' || raw === '1';
}

export interface Pagination {
  limit: number;
  offset: number;
}

export function pagination(c: any, defaultLimit = 20, maxLimit = 100): Pagination {
  return {
    limit: queryInt(c, 'limit', defaultLimit, maxLimit) || defaultLimit,
    offset: queryInt(c, 'offset', 0, 100000),
  };
}

/** Validates an email loosely — demo friendly, never blocks a happy path. */
export function normalizeEmail(email: unknown): string | null {
  if (typeof email !== 'string') return null;
  const trimmed = email.trim().toLowerCase();
  if (!trimmed || !trimmed.includes('@') || trimmed.length < 5) return null;
  return trimmed;
}

export function requireFields(body: Record<string, unknown>, fields: string[]): string[] {
  return fields.filter((field) => {
    const value = body[field];
    return value === undefined || value === null || (typeof value === 'string' && value.trim() === '');
  });
}

export function pick<T extends Record<string, any>>(source: T, keys: string[]): Record<string, any> {
  const out: Record<string, any> = {};
  for (const key of keys) {
    if (source[key] !== undefined) out[key] = source[key];
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * Security headers
 * Deliberately no X-Frame-Options / restrictive CORP: the API is embedded
 * in preview iframes and serves media that the app loads cross-origin.
 * ------------------------------------------------------------------ */
export function securityHeaders() {
  return async (c: any, next: () => Promise<void>) => {
    await next();
    const headers = c.res.headers;
    if (!headers.has('X-Content-Type-Options')) headers.set('X-Content-Type-Options', 'nosniff');
    if (!headers.has('Referrer-Policy')) headers.set('Referrer-Policy', 'no-referrer');
    if (!headers.has('Cross-Origin-Resource-Policy')) headers.set('Cross-Origin-Resource-Policy', 'cross-origin');
    if (!headers.has('Permissions-Policy')) headers.set('Permissions-Policy', 'geolocation=(), microphone=()');
  };
}

/* ------------------------------------------------------------------ *
 * CORS
 * ------------------------------------------------------------------ */

export function corsConfig(env: { FRONTEND_URL?: string; ALLOWED_ORIGINS?: string; ALLOW_ALL_ORIGINS?: string }) {
  const configured = [env.FRONTEND_URL, ...(env.ALLOWED_ORIGINS ?? '').split(',')]
    .map((value) => (value ?? '').trim().replace(/\/$/, ''))
    .filter(Boolean);

  const allowAll = env.ALLOW_ALL_ORIGINS !== 'false';

  return {
    origin: (origin: string) => {
      if (!origin) return '*';
      const normalized = origin.replace(/\/$/, '');
      if (allowAll) return origin;
      if (configured.includes(normalized)) return origin;
      // Localhost on any port + Cloudflare Pages + Arena preview hosts.
      if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(normalized)) return origin;
      if (/^https:\/\/([a-z0-9-]+\.)*(workers\.dev|pages\.dev)$/.test(normalized)) return origin;
      if (/^https:\/\/[a-z0-9-]+\.e2b\.app$/.test(normalized)) return origin;
      return configured[0] ?? origin;
    },
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'] as string[],
    allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Range', 'If-None-Match'],
    exposeHeaders: ['Content-Length', 'ETag', 'X-Total-Count'],
    credentials: true,
    maxAge: 86400,
  };
}
