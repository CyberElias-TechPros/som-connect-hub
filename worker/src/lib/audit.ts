import { Env } from './db';
import { generateId } from './auth';

export async function auditLog(
  db: D1Database,
  userId: string | null,
  action: string,
  resourceType: string,
  resourceId?: string,
  details?: any,
  ip?: string,
  userAgent?: string
) {
  try {
    const id = generateId('audit_');
    await db.prepare(
      'INSERT INTO audit_logs (id, user_id, action, resource_type, resource_id, details, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(
      id,
      userId,
      action,
      resourceType,
      resourceId || null,
      details ? JSON.stringify(details) : null,
      ip || null,
      userAgent || null
    ).run();
  } catch (e) {
    console.error('Audit log failed:', e);
  }
}

export function getClientInfo(c: any): { ip: string; ua: string } {
  const ip = c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || 'unknown';
  const ua = c.req.header('User-Agent') || 'unknown';
  return { ip, ua };
}
