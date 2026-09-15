/**
 * SOM CONNECT — authentication primitives
 *
 * Passwords: PBKDF2-HMAC-SHA256 (Web Crypto, available in Workers) with a
 * per-user random salt and 210k iterations. Stored as:
 *   pbkdf2$<iterations>$<base64 salt>$<base64 derived key>
 *
 * Tokens: HS256 JWT signed with JWT_SECRET (Hono's Web Crypto JWT helpers).
 */
import { sign, verify } from 'hono/jwt';

export type UserRole = 'guest' | 'member' | 'pastor' | 'admin';

export interface JWTPayload {
  id: string;
  email: string;
  role: UserRole;
  exp: number;
  iat?: number;
  [key: string]: unknown;
}

const JWT_ALG = 'HS256';
export const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days
const PBKDF2_ITERATIONS = 210_000;

const encoder = new TextEncoder();

function toBase64(bytes: ArrayBuffer | Uint8Array): string {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = '';
  for (let i = 0; i < view.length; i += 1) binary += String.fromCharCode(view[i]);
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function derive(password: string, salt: Uint8Array, iterations: number): Promise<string> {
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
    key,
    256,
  );
  return toBase64(bits);
}

/** Constant-time-ish string comparison to avoid trivial timing leaks. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const derived = await derive(password, salt, PBKDF2_ITERATIONS);
  return `pbkdf2$${PBKDF2_ITERATIONS}$${toBase64(salt)}$${derived}`;
}

export async function verifyPassword(password: string, stored: string | null | undefined): Promise<boolean> {
  if (!stored) return false;

  try {
    if (stored.startsWith('pbkdf2$')) {
      const [, iterations, salt, hash] = stored.split('$');
      if (!iterations || !salt || !hash) return false;
      const derived = await derive(password, fromBase64(salt), Number(iterations) || PBKDF2_ITERATIONS);
      return safeEqual(derived, hash);
    }
    // Legacy/test format fallback: sha256(password + salt)
    const legacy = await legacySha256(password);
    return safeEqual(legacy, stored);
  } catch {
    return false;
  }
}

async function legacySha256(password: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(password + 'som-salt-2025'));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** True when the account hash is unusable (seed placeholders etc.). */
export function isPlaceholderHash(stored: string | null | undefined): boolean {
  if (!stored) return true;
  return stored.includes('demo_hash') || stored === '' || stored === 'test';
}

/* ------------------------------------------------------------------ *
 * Tokens
 * ------------------------------------------------------------------ */

export async function createToken(
  user: { id: string; email: string; role: UserRole },
  secret: string,
  ttl = TOKEN_TTL_SECONDS,
): Promise<string> {
  const issuedAt = Math.floor(Date.now() / 1000);
  return sign({ id: user.id, email: user.email, role: user.role, iat: issuedAt, exp: issuedAt + ttl }, secret, JWT_ALG);
}

export async function verifyToken(token: string, secret: string): Promise<JWTPayload | null> {
  try {
    const payload = (await verify(token, secret, JWT_ALG)) as JWTPayload;
    if (!payload?.id) return null;
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ *
 * Misc
 * ------------------------------------------------------------------ */

export function generateId(prefix = ''): string {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 9)}`;
}

export function randomToken(bytes = 24): string {
  const buffer = crypto.getRandomValues(new Uint8Array(bytes));
  return Array.from(buffer).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export const ROLE_RANK: Record<UserRole, number> = { guest: 0, member: 1, pastor: 2, admin: 3 };

export function hasAtLeast(role: UserRole, minimum: UserRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[minimum];
}

export function isDemoEmail(email: string): boolean {
  return /(demo|example\.com$)/i.test(email);
}

/**
 * Shape a D1 user row into the API/frontend contract and drop secrets.
 */
export function toPublicUser(row: any) {
  if (!row) return null;
  let preferences: unknown = row.preferences;
  if (typeof preferences === 'string') {
    try {
      preferences = JSON.parse(preferences);
    } catch {
      preferences = undefined;
    }
  }
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    avatar: row.avatar,
    role: row.role,
    bio: row.bio ?? '',
    affiliation: row.affiliation ?? '',
    streak: row.streak ?? 0,
    joinedDate: row.joined_date ?? row.joinedDate ?? new Date().toISOString().slice(0, 10),
    preferences,
    createdAt: row.created_at ?? row.createdAt,
  };
}
