# SOM CONNECT — Cloudflare Workers Backend

Production-grade API for SOM CONNECT Hub, built on Cloudflare's edge platform.

## Architecture

- **Runtime:** Cloudflare Workers (Hono framework)
- **Database:** Cloudflare D1 (SQLite at edge) — 18 tables with FKs, indexes, CHECK constraints
- **Storage:** R2 for video, audio, thumbnails, publications, avatars
- **Cache:** KV for trending content, stats, session coordination
- **Queue:** Cloudflare Queues for background jobs (welcome notifications, new content fan-out, password resets)
- **Durable Objects:** QASessionDurableObject for live Q&A participant tracking
- **Cron:** Daily cron `0 0 * * *` for cleanup, streak management, cache warmup

## Schema (D1)

18 tables: `users`, `speakers`, `content_items`, `content_progress`, `favorites`, `playlists`, `playlist_items`, `daily_confessions`, `ror_readings`, `publications`, `qa_sessions`, `qa_questions`, `community_posts`, `post_likes`, `groups`, `group_members`, `subscription_plans`, `user_subscriptions`, `pastor_uploads`, `notifications`, `daily_completions`, `audit_logs`.

All tables include:
- `id TEXT PRIMARY KEY`
- Timestamps (`created_at`, `updated_at`)
- Foreign keys with ON DELETE CASCADE where appropriate
- Indexes on hot paths (email, role, category, speaker, date, views, premium, status)
- CHECK constraints for enums

## Endpoints

### Auth
- `POST /auth/register` — happy path: always succeeds, auto-login if exists
- `POST /auth/login` — happy path: any email works, auto-creates member
- `POST /auth/forgot` — always succeeds
- `GET /auth/me` — current user
- `PUT /auth/profile` — update profile

### Content
- `GET /content?category=&q=&premium=&limit=&offset=&sort=date|views|title`
- `GET /content/:id` — increments views
- `POST /content` — pastor/admin only
- `POST /content/:id/progress` — save watch progress
- `GET /content/user/continue` — continue watching

### Favorites & Playlists
- `GET /favorites`, `POST /favorites`, `DELETE /favorites/:contentId`
- `GET /playlists`, `POST /playlists`, `GET /playlists/:id`, `POST /playlists/:id/items`, `DELETE /playlists/:id/items/:contentId`

### Community
- `GET /community/posts`, `POST /community/posts`, `POST /community/posts/:id/like`
- `GET /community/groups`, `POST /community/groups/:id/join`

### Q&A
- `GET /qa?status=`, `GET /qa/:id`, `POST /qa/:id/questions`, `POST /qa/:id/questions/:qid/upvote`, `POST /qa/:id/join` (Durable Object)

### Tools (Daily)
- `GET /tools/confessions?date=`, `GET /tools/ror?date=`, `GET /tools/publications`
- `POST /tools/complete` — { type: 'confession'|'ror' }
- `GET /tools/streak`

### Subscriptions (Happy Path)
- `GET /subscriptions/plans`, `GET /subscriptions/me`, `POST /subscriptions` (always succeeds), `POST /subscriptions/cancel`

### Notifications
- `GET /notifications?unread=true`, `PUT /notifications/:id/read`, `PUT /notifications/read-all`, `DELETE /notifications/:id`

### Admin
- `GET /admin/stats`, `GET /admin/users?q=&role=`, `PUT /admin/users/:id/role`, `GET /admin/uploads?status=`, `POST /admin/uploads/:id/approve`, `POST /admin/uploads/:id/reject`

### Uploads (R2)
- `POST /uploads` — multipart form: file, type, title (pastor/admin)
- `GET /uploads/file/*` — serve from R2 with cache headers
- `GET /uploads` — user's uploads
- `GET /speakers`, `GET /search?q=`, `GET /health`

## Happy Path Guarantee

Every endpoint is designed to never dead-end:
- Login/register accept any email/password ≥3 chars
- Existing user registration auto-logs in
- Payment always succeeds (no real Stripe in demo)
- Favorites/playlists/community all work offline via localStorage fallback when API unavailable
- Content progress stored in localStorage if API down

## Local Development

```bash
cd worker
npm install
# Create D1 locally
npx wrangler d1 create som-connect-db
# Update wrangler.toml with database_id

# Run migrations
npx wrangler d1 execute som-connect-db --file=src/db/schema.sql --local
npx wrangler d1 execute som-connect-db --file=src/db/seed.sql --local

# Dev server
npm run dev
# Worker runs at http://localhost:8787
```

Set `.dev.vars`:
```
JWT_SECRET=your-super-secret-jwt-key-change-in-production
FRONTEND_URL=http://localhost:8080
ENV=development
```

## Deployment

```bash
# Production D1
npx wrangler d1 create som-connect-db-prod
npx wrangler d1 execute som-connect-db-prod --file=src/db/schema.sql
npx wrangler d1 execute som-connect-db-prod --file=src/db/seed.sql

# R2 bucket
npx wrangler r2 bucket create som-connect-storage

# KV namespace
npx wrangler kv:namespace create CACHE
npx wrangler kv:namespace create CACHE --preview

# Queue
npx wrangler queues create som-connect-queue

# Secrets
npx wrangler secret put JWT_SECRET
npx wrangler secret put FRONTEND_URL

# Deploy
npm run deploy
```

## Frontend Integration

Frontend uses `VITE_API_URL` env var. If set, `src/lib/api-client.ts` routes through Worker; if not set, falls back to localStorage mock — ensuring the app is fully functional without backend.

```env
VITE_API_URL=https://som-connect-api.your-subdomain.workers.dev
```

## Security

- JWT HS256 with 7-day expiry, verified via Web Crypto
- CORS allows frontend origin + localhost + Arena preview
- Role checks: `requireAuth`, `requireRole(['pastor','admin'])`
- Passwords hashed via SHA-256 + salt (demo; use bcrypt in prod via wasm)
- R2 uploads restricted to pastor/admin, validated mime types
- D1 prepared statements prevent SQL injection
- Rate limiting via KV (future)
- Audit logs table for sensitive actions

## Performance

- Hono lightweight (~14kB)
- KV cache for content lists (5min TTL)
- R2 cache-control 1 year for immutable assets
- D1 indexes on all filter/sort columns
- Queue for non-blocking notifications
- Durable Object for live session state without DB polling

## Cron & Queue Handlers

- `queue()` handles: welcome, new_content fan-out, subscription_created, password_reset
- `scheduled()` daily: cleanup old notifications, ensure today's confession exists, cache daily stats
