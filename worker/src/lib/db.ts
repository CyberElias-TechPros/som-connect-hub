export interface Env {
  DB: D1Database;
  STORAGE: R2Bucket;
  CACHE: KVNamespace;
  QUEUE: Queue;
  QA_SESSION: DurableObjectNamespace;
  JWT_SECRET: string;
  FRONTEND_URL: string;
  ENV: string;
}

export async function getUserByEmail(db: D1Database, email: string) {
  return await db.prepare('SELECT * FROM users WHERE email = ?').bind(email.toLowerCase()).first();
}

export async function getUserById(db: D1Database, id: string) {
  return await db.prepare('SELECT * FROM users WHERE id = ?').bind(id).first();
}

export async function getSpeakerById(db: D1Database, id: string) {
  return await db.prepare('SELECT * FROM speakers WHERE id = ?').bind(id).first();
}

export function parseJsonField<T>(field: string | null, fallback: T): T {
  if (!field) return fallback;
  try {
    return JSON.parse(field) as T;
  } catch {
    return fallback;
  }
}

export function jsonResponse(data: any, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  });
}

export function errorResponse(message: string, status = 400) {
  return jsonResponse({ error: message }, status);
}
