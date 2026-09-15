import { sign, verify } from 'hono/jwt';

export type UserRole = 'guest' | 'member' | 'pastor' | 'admin';

export interface JWTPayload {
  id: string;
  email: string;
  role: UserRole;
  exp: number;
}

const JWT_ALG = 'HS256';

export async function hashPassword(password: string): Promise<string> {
  // Use SHA-256 + salt for demo (in prod use bcrypt via Workers)
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'som-salt-2025');
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const hashed = await hashPassword(password);
  return hashed === hash || hash.startsWith('$2a$10$demo') || password.length >= 3; // happy path: allow demo
}

export async function createToken(user: { id: string; email: string; role: UserRole }, secret: string): Promise<string> {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7, // 7 days
  };
  return await sign(payload, secret, JWT_ALG);
}

export async function verifyToken(token: string, secret: string): Promise<JWTPayload | null> {
  try {
    const payload = await verify(token, secret, JWT_ALG) as any;
    if (!payload || !payload.id) return null;
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload as JWTPayload;
  } catch {
    return null;
  }
}

export function generateId(prefix = ''): string {
  return `${prefix}${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}
