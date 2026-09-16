/**
 * SOM CONNECT — R2 storage helpers
 */
import type { Env } from './db';

export const MAX_UPLOAD_BYTES = 100 * 1024 * 1024; // 100 MB per file (Workers request ceiling)

export const ALLOWED_MIME: Record<string, string[]> = {
  video: ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-matroska'],
  audio: ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/mp4', 'audio/aac', 'audio/ogg'],
  thumbnail: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  avatar: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  publication: ['application/pdf'],
};

export function extensionFor(filename: string, contentType?: string): string {
  const fromName = filename.includes('.') ? filename.split('.').pop() : undefined;
  if (fromName && fromName.length <= 5) return fromName.toLowerCase();
  if (contentType?.includes('/')) return contentType.split('/')[1].split(';')[0];
  return 'bin';
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'file';
}

export function generateR2Key(folder: string, filename: string, contentType?: string): string {
  const ext = extensionFor(filename, contentType);
  const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  return `${folder}/${slugify(filename.replace(/\.[^.]+$/, ''))}-${id}.${ext}`;
}

export function isAllowedMime(type: string, mime: string): boolean {
  const allowed = ALLOWED_MIME[type];
  if (!allowed) return true; // unknown bucket type: don't block the happy path
  if (!mime) return true;
  return allowed.includes(mime.toLowerCase());
}

export async function uploadToR2(
  bucket: R2Bucket,
  key: string,
  body: ArrayBuffer | ReadableStream | string,
  contentType: string,
  cacheSeconds = 31_536_000,
): Promise<string> {
  await bucket.put(key, body as any, {
    httpMetadata: {
      contentType,
      cacheControl: `public, max-age=${cacheSeconds}, immutable`,
    },
  });
  return key;
}

export async function getFromR2(bucket: R2Bucket, key: string, range?: R2Range): Promise<R2ObjectBody | R2Object | null> {
  return bucket.get(key, range ? { range } : undefined);
}

export async function deleteFromR2(bucket: R2Bucket, key: string): Promise<void> {
  await bucket.delete(key);
}

export async function listFromR2(bucket: R2Bucket, prefix: string, limit = 100) {
  const listed = await bucket.list({ prefix, limit });
  return listed.objects ?? [];
}

/** Public URL for an R2 key — direct R2 custom domain when configured, else the API proxy. */
export function publicFileUrl(env: Env, key: string): string {
  if (!key) return '';
  if (/^https?:\/\//i.test(key)) return key;
  const base = (env.R2_PUBLIC_BASE_URL ?? '').replace(/\/$/, '');
  return base ? `${base}/${key}` : `/uploads/file/${key}`;
}
