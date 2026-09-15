import { Env } from '../lib/db';

interface RateLimitOptions {
  windowSeconds: number;
  maxRequests: number;
  keyPrefix?: string;
}

export function rateLimit(options: RateLimitOptions) {
  const { windowSeconds, maxRequests, keyPrefix = 'rl' } = options;

  return async (c: any, next: any) => {
    const ip = c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || 'anon';
    const path = c.req.path;
    const key = `${keyPrefix}:${ip}:${path}`;

    try {
      const now = Date.now();
      const windowKey = `${key}:${Math.floor(now / (windowSeconds * 1000))}`;

      const current = await c.env.CACHE.get(windowKey);
      const count = current ? parseInt(current) : 0;

      if (count >= maxRequests) {
        return c.json({ error: 'Too many requests, please try again later' }, 429);
      }

      await c.env.CACHE.put(windowKey, String(count + 1), { expirationTtl: windowSeconds });

      // Add headers
      c.header('X-RateLimit-Limit', String(maxRequests));
      c.header('X-RateLimit-Remaining', String(Math.max(0, maxRequests - count - 1)));
      c.header('X-RateLimit-Reset', String(Math.floor(now / 1000) + windowSeconds));

      await next();
    } catch {
      // If KV fails, allow request (fail open for availability)
      await next();
    }
  };
}

// Specific limiters
export const strictRateLimit = rateLimit({ windowSeconds: 60, maxRequests: 20, keyPrefix: 'strict' });
export const standardRateLimit = rateLimit({ windowSeconds: 60, maxRequests: 100, keyPrefix: 'std' });
export const lenientRateLimit = rateLimit({ windowSeconds: 60, maxRequests: 300, keyPrefix: 'lenient' });
