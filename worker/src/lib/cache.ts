import { Env } from './db';

export async function cacheGet<T>(env: Env, key: string): Promise<T | null> {
  try {
    const raw = await env.CACHE.get(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function cacheSet(env: Env, key: string, value: any, ttlSeconds = 300): Promise<void> {
  try {
    await env.CACHE.put(key, JSON.stringify(value), { expirationTtl: ttlSeconds });
  } catch {}
}

export async function cacheDelete(env: Env, key: string): Promise<void> {
  try {
    await env.CACHE.delete(key);
  } catch {}
}

export async function cacheDeletePrefix(env: Env, prefix: string): Promise<void> {
  try {
    const list = await env.CACHE.list({ prefix });
    for (const key of list.keys) {
      await env.CACHE.delete(key.name);
    }
  } catch {}
}

// Cache keys
export const CacheKeys = {
  contentList: (sort: string, limit: number, offset: number, category?: string, q?: string) =>
    `content:list:${sort}:${limit}:${offset}:${category || 'all'}:${q || ''}`,
  trending: 'content:trending',
  speakers: 'speakers:all',
  plans: 'subscription:plans',
  stats: 'stats:daily',
  confessions: (date?: string) => `confessions:${date || 'latest'}`,
  ror: (date?: string) => `ror:${date || 'latest'}`,
};
