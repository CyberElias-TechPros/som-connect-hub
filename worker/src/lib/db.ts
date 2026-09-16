/**
 * SOM CONNECT — Worker environment + D1 helpers
 *
 * Includes a self-healing bootstrap: on the first request handled by a fresh
 * isolate we verify the D1 schema exists and that core seed rows are present.
 * That means a brand-new database (local or a fresh Cloudflare deployment)
 * works on first hit without a manual migration step — while
 * `wrangler d1 migrations apply` remains the canonical production path.
 */
import { SCHEMA_EXEC_SQL, SEED_EXEC_SQL, SCHEMA_VERSION } from '../db/sql.generated';

export interface Env {
  DB: D1Database;
  STORAGE: R2Bucket;
  CACHE: KVNamespace;
  QUEUE?: Queue;
  QA_SESSION?: DurableObjectNamespace;
  /** Required in production (`wrangler secret put JWT_SECRET`); optional elsewhere. */
  JWT_SECRET?: string;
  FRONTEND_URL?: string;
  ALLOWED_ORIGINS?: string;
  ALLOW_ALL_ORIGINS?: string;
  STRICT_AUTH?: string;
  ENV?: string;
  APP_NAME?: string;
  APP_VERSION?: string;
  R2_PUBLIC_BASE_URL?: string;
  /* Email (Resend). Without a key, mail is logged + kept in the KV outbox. */
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
  SUPPORT_EMAIL?: string;
  /* Payments. Without a key the deterministic mock provider is used. */
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  PAYMENT_WEBHOOK_SECRET?: string;
}

export type Role = 'guest' | 'member' | 'pastor' | 'admin';

export interface UserRow {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  avatar: string | null;
  role: Role;
  bio: string | null;
  affiliation: string | null;
  streak: number;
  last_streak_date?: string | null;
  preferences?: string | null;
  is_active?: number;
  joined_date: string;
  created_at: string;
  updated_at: string;
}

/* ------------------------------------------------------------------ *
 * Queries
 * ------------------------------------------------------------------ */

export async function getUserByEmail(db: D1Database, email: string): Promise<UserRow | null> {
  return (await db.prepare('SELECT * FROM users WHERE email = ?').bind(email.trim().toLowerCase()).first<UserRow>()) ?? null;
}

export async function getUserById(db: D1Database, id: string): Promise<UserRow | null> {
  return (await db.prepare('SELECT * FROM users WHERE id = ?').bind(id).first<UserRow>()) ?? null;
}

export async function getSpeakerById(db: D1Database, id: string) {
  return (await db.prepare('SELECT * FROM speakers WHERE id = ?').bind(id).first()) ?? null;
}

export async function count(db: D1Database, table: string, where = '1=1', ...params: unknown[]): Promise<number> {
  const row = await db.prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE ${where}`).bind(...params).first<{ n: number }>();
  return row?.n ?? 0;
}

/* ------------------------------------------------------------------ *
 * JSON helpers
 * ------------------------------------------------------------------ */

export function parseJsonField<T>(field: unknown, fallback: T): T {
  if (field === null || field === undefined || field === '') return fallback;
  if (typeof field !== 'string') return field as T;
  try {
    return JSON.parse(field) as T;
  } catch {
    return fallback;
  }
}

export function toBool(value: unknown): boolean {
  return value === 1 || value === true || value === '1' || value === 'true';
}

/* ------------------------------------------------------------------ *
 * Self-healing bootstrap
 * ------------------------------------------------------------------ */

let bootstrapPromise: Promise<void> | null = null;

/**
 * Splits a SQL script into individual statements.
 *
 * `D1Database.exec()` processes SQL line-by-line, which breaks multi-line
 * `CREATE TABLE` statements, so the bootstrap prepares statements itself.
 * Quote-aware (handles `'God''s'`, `"quoted"` and inline `--` comments).
 */
export function splitSqlStatements(sql: string): string[] {
  const statements: string[] = [];
  let current = '';
  let quote: string | null = null;
  let inLineComment = false;
  let inBlockComment = false;

  for (let i = 0; i < sql.length; i += 1) {
    const char = sql[i];
    const next = sql[i + 1];

    if (inLineComment) {
      if (char === '\n') {
        inLineComment = false;
        current += '\n';
      }
      continue;
    }
    if (inBlockComment) {
      if (char === '*' && next === '/') {
        inBlockComment = false;
        i += 1;
      }
      continue;
    }
    if (quote) {
      current += char;
      if (char === quote) {
        if (next === quote) {
          current += next; // escaped quote
          i += 1;
        } else {
          quote = null;
        }
      }
      continue;
    }

    if (char === '-' && next === '-') {
      inLineComment = true;
      i += 1;
      continue;
    }
    if (char === '/' && next === '*') {
      inBlockComment = true;
      i += 1;
      continue;
    }
    if (char === "'" || char === '"') {
      quote = char;
      current += char;
      continue;
    }
    if (char === ';') {
      const trimmed = current.trim();
      if (trimmed) statements.push(trimmed);
      current = '';
      continue;
    }
    current += char;
  }

  const tail = current.trim();
  if (tail) statements.push(tail);
  return statements;
}

/** Runs a SQL script as a D1 batch, falling back to statement-by-statement. */
async function runSqlScript(db: D1Database, sql: string, label: string): Promise<void> {
  const statements = splitSqlStatements(sql);
  if (!statements.length) return;

  try {
    await db.batch(statements.map((statement) => db.prepare(statement)));
    console.log(`[bootstrap] ${label}: ${statements.length} statements applied`);
    return;
  } catch (error) {
    console.warn(`[bootstrap] batch failed for ${label}, retrying individually`, error);
  }

  let applied = 0;
  for (const statement of statements) {
    try {
      await db.prepare(statement).run();
      applied += 1;
    } catch (error: any) {
      // `CREATE ... IF NOT EXISTS` on an existing object is not an error path we
      // need to fail on; log and continue so a partial schema still serves.
      console.warn(`[bootstrap] statement skipped: ${error?.message ?? error}`);
    }
  }
  console.log(`[bootstrap] ${label}: ${applied}/${statements.length} statements applied`);
}

async function hasTable(db: D1Database, name: string): Promise<boolean> {
  try {
    const row = await db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?")
      .bind(name)
      .first<{ name: string }>();
    return !!row;
  } catch {
    return false;
  }
}

async function runBootstrap(env: Env): Promise<void> {
  if (!env.DB) return;
  try {
    if (!(await hasTable(env.DB, 'users'))) {
      await runSqlScript(env.DB, SCHEMA_EXEC_SQL, 'schema');
    }
    const speakers = await count(env.DB, 'speakers').catch(() => 0);
    if (speakers === 0) {
      await runSqlScript(env.DB, SEED_EXEC_SQL, 'seed data');
    }
    // Cache the marker in KV so subsequent cold isolates can skip the probe.
    try {
      await env.CACHE?.put('schema:version', SCHEMA_VERSION, { expirationTtl: 86400 });
    } catch {
      /* KV is optional */
    }
  } catch (error) {
    console.error('[bootstrap] failed', error);
    bootstrapPromise = null; // allow a later request to retry
    throw error;
  }
}

/**
 * Ensures the D1 database is ready. Idempotent and memoised per isolate.
 * Never throws for the caller: a broken bootstrap must not take the API down,
 * individual routes surface their own errors.
 */
export async function ensureDatabase(env: Env): Promise<void> {
  if (!env.DB) return;
  if (!bootstrapPromise) {
    bootstrapPromise = (async () => {
      // Fast path: schema present and seeded.
      const ready = await hasTable(env.DB, 'users').then(async (ok) => {
        if (!ok) return false;
        const seeded = await count(env.DB, 'speakers').catch(() => 0);
        return seeded > 0;
      });
      if (ready) return;
      await runBootstrap(env);
    })().catch((error) => {
      console.error('[ensureDatabase]', error);
    });
  }
  return bootstrapPromise;
}
