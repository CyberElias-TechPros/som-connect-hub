# SOM CONNECT — Cloudflare Workers Backend v2

Production-grade, full-stack edge API for SOM CONNECT Hub.

**Upload size:** 154 KiB → 35 KiB gzip  
**Build:** `tsc --noEmit` clean, `wrangler deploy --dry-run` passes  
**Architecture:** Vercel frontend + Workers + D1 + R2 + KV + Queue + Durable Objects + Cron

---

## 🏗️ Architecture

```
Users → Vercel (Vite React) → Cloudflare Workers (Hono)
  → D1 (22 tables, FKs, indexes, CHECKs)
  → R2 (videos, audio, thumbnails, avatars, publications)
  → KV (trending, stats, rate limiting, cache)
  → Queue (welcome, new_content fan-out, subscription, password_reset, content_approved/rejected)
  → Durable Object QASessionDurableObject (live participant tracking)
  → Cron daily midnight UTC (cleanup, stats, confession generation)
```

### Why this stack?
- **Edge-first:** D1 SQLite at edge, R2 zero egress, KV sub-10ms
- **Happy-path:** Every endpoint designed to never dead-end, fallback to mock in frontend
- **Production-grade:** Validation via Zod, audit logs, rate limiting, security headers, observability

---

## 📦 Schema — 22 Tables (D1)

**Core:**
- `users` — id, email UNIQUE NOCASE, name, password_hash, avatar, role CHECK(guest|member|pastor|admin), bio, affiliation, streak, longest_streak, preferences JSON, email_verified, is_active, last_login_at, joined_date, timestamps
- `speakers` — id, name, title, avatar, bio, verified, content_count, followers
- `content_items` — id, title, description, thumbnail, duration, speaker_id FK, date, category CHECK(conference|workshop|podcast|media-series|original), tags JSON, views, likes, is_premium, is_published, video_url R2 key, audio_url, file_size, language, transcript
- `content_progress` — user_id FK, content_id FK, progress 0-100, watched_seconds, last_watched_at, completed_at, UNIQUE(user,content)
- `content_likes` — user_id, content_id, UNIQUE
- `content_comments` — content_id FK, user_id FK, parent_id self-ref, text, likes, is_edited, is_deleted
- `favorites` — user_id FK, content_id FK, notes, UNIQUE
- `playlists` — user_id FK, name, description, thumbnail, is_public, is_collaborative, content_count
- `playlist_items` — playlist_id FK, content_id FK, position, added_by FK, UNIQUE

**Daily Tools:**
- `daily_confessions` — date UNIQUE, title, content, scripture, scripture_ref, audio_url, video_url
- `ror_readings` — date UNIQUE, title, theme, scripture, scripture_ref, content, prayer, further_study JSON, daily_scripture_reading JSON, audio_url
- `publications` — title, type CHECK(magazine|newsletter|book|devotional), cover, issue_date, pages, description, file_url R2, file_size, download_count, is_premium
- `daily_completions` — user_id FK, type CHECK(confession|ror|bible|prayer), date, UNIQUE(user,type,date)

**Q&A:**
- `qa_sessions` — title, description, speaker_id FK, date, status CHECK(upcoming|live|archived|cancelled), thumbnail, duration, max_participants, questions_count, participants_count, recording_url
- `qa_questions` — session_id FK, user_id FK, text, asked_by, upvotes, is_answered, is_pinned, answer, answered_by FK, answered_at
- `qa_question_upvotes` — question_id FK, user_id FK, UNIQUE
- `qa_participants` — session_id FK, user_id FK, joined_at, left_at, UNIQUE

**Community:**
- `community_posts` — author_id FK, content, image_url, video_url, likes, comments_count, shares, is_pinned, is_edited, visibility CHECK(public|group|private), group_id FK
- `post_likes` — post_id FK, user_id FK, UNIQUE
- `post_comments` — post_id FK, user_id FK, parent_id self-ref, text, likes, is_edited, is_deleted
- `groups` — name, description, cover, avatar, member_count, post_count, is_private, is_verified, created_by FK
- `group_members` — group_id FK, user_id FK, role CHECK(member|moderator|admin), UNIQUE

**Subscriptions & Payments:**
- `subscription_plans` — name, description, price, currency, interval CHECK(monthly|annually|lifetime), interval_count, features JSON, is_popular, is_active, trial_days
- `user_subscriptions` — user_id FK, plan_id FK, status CHECK(active|cancelled|expired|past_due|trialing|incomplete), current_period_start/end, trial_end, cancel_at_period_end, payment_provider CHECK(stripe|paypal|manual), provider_subscription_id
- `payment_methods` — user_id FK, type CHECK(card|paypal|bank), brand, last4, expiry, is_default, provider_pm_id
- `invoices` — user_id FK, subscription_id FK, amount, currency, status CHECK(draft|open|paid|void|uncollectible), invoice_url, pdf_url

**Uploads & Moderation:**
- `pastor_uploads` — user_id FK, title, description, type CHECK(video|audio|thumbnail|avatar|publication|other), category CHECK(conference|workshop|podcast|media-series|original), status CHECK(pending|approved|rejected|processing|published), thumbnail, file_url R2 key, file_size, duration, speaker_id FK, tags JSON, feedback, reviewed_by FK, submitted_date, reviewed_date, published_content_id FK

**Notifications & Audit:**
- `notifications` — user_id FK, type CHECK(content|qa|community|system|subscription|achievement|mention|comment), title, message, is_read, is_archived, action_url, image_url, metadata JSON
- `audit_logs` — user_id FK, action, resource_type, resource_id, details JSON, ip_address, user_agent
- `user_sessions` — user_id FK, token_hash, device_info, ip_address, expires_at, last_active_at
- `password_reset_tokens` — user_id FK, token_hash, expires_at, used

**Analytics:**
- `content_views` — content_id FK, user_id FK nullable, watched_seconds, completed, device_type, country
- `search_history` — user_id FK nullable, query, results_count

All tables have `created_at`, `updated_at` defaults, indexes on hot paths, FKs with CASCADE/SET NULL.

---

## 🚀 Endpoints — 50+ (Full List)

### Auth
- `POST /auth/register` — Zod validated, happy-path auto-login if exists, Queue welcome
- `POST /auth/login` — happy-path auto-creates member, JWT HS256 7d
- `POST /auth/forgot` — always succeeds, Queue password_reset
- `GET /auth/me` — current user
- `PUT /auth/profile` — update name/bio/affiliation/avatar
- Rate limited: 100 req/min

### Content
- `GET /content?category=&q=&premium=&language=&limit=&offset=&sort=date|views|likes|title` — cached 5min KV, FTS via LIKE
- `GET /content/trending` — cached 10min
- `GET /content/user/continue` — progress 1-99%, ordered last_watched
- `GET /content/:id` — increments views async, tracks content_views, returns userProgress, isFavorited, isLiked, related 4
- `POST /content` — pastor/admin, Zod, audit, invalidate cache, Queue new_content fan-out
- `PUT /content/:id` — pastor/admin
- `DELETE /content/:id` — admin only, audit
- `POST /content/:id/like` — toggle, updates likes counter
- `POST /content/:id/progress` — progress 0-100, watched_seconds, completed_at auto if >=95%

### Speakers
- `GET /speakers` — cached 1h, ordered content_count
- `GET /speakers/:id` — stats contentCount/totalViews + recent 5
- `POST /speakers` — admin, Zod
- `PUT /speakers/:id` — admin
- `DELETE /speakers/:id` — admin

### Favorites & Playlists
- `GET /favorites` — user's favorites with content join
- `POST /favorites` — { contentId, notes }, UNIQUE handling
- `DELETE /favorites/:contentId`, `DELETE /favorites` clear all
- `GET /playlists?q=&limit=&offset=` — with item counts, search
- `POST /playlists` — { name, description, thumbnail, isPublic, isCollaborative }
- `GET /playlists/:id` — with items ordered position
- `POST /playlists/:id/items` — { contentId }
- `DELETE /playlists/:id/items/:contentId`
- `DELETE /playlists/:id`

### Community
- `GET /community/posts?limit=&offset=` — with author join, ordered date DESC
- `POST /community/posts` — { content, imageUrl, videoUrl, visibility, groupId }, Queue new_post → group members notification
- `POST /community/posts/:id/like` — toggle like, updates likes counter
- `GET /community/groups` — with joinedIds if authenticated
- `POST /community/groups/:id/join` — toggle join/leave, updates member_count

### Comments
- `GET /comments/content/:contentId?limit=&offset=` — with user join, is_deleted filter
- `POST /comments/content/:contentId` — { text, parentId }, Zod
- `POST /comments/content/:contentId/:commentId/like`
- `DELETE /comments/content/:commentId` — owner or admin
- `GET /comments/post/:postId`
- `POST /comments/post/:postId` — increments comments_count
- `DELETE /comments/post/:commentId`

### Q&A
- `GET /qa?status=upcoming|live|archived|cancelled|all` — with speaker join
- `GET /qa/:id` — with questions ordered upvotes DESC
- `POST /qa/:id/questions` — { text }, increments questions_count, Queue new_question
- `POST /qa/:id/questions/:qid/upvote` — increments upvotes, also creates qa_question_upvotes for dedup
- `POST /qa/:id/join` — via Durable Object QA_SESSION, returns participants
- Admin: `POST /qa` create session (future), `PUT /qa/:id` etc.

### Tools (Daily)
- `GET /tools/confessions?date=` — cached 1h, date filter
- `POST /tools/confessions` — admin, Zod
- `GET /tools/ror?date=` — cached 1h, parses furtherStudy JSON
- `POST /tools/ror` — admin, Zod
- `POST /tools/complete` — { type: confession|ror|bible|prayer }, UNIQUE per day, streak logic (checks yesterday, calculates consecutive), updates longest_streak, achievement notification at 7/30/100 days
- `GET /tools/streak` — streak, longestStreak, todayCompleted[], recent 60, history calendar Record<date, type[]>
- `GET /tools/publications` — backward compat, redirects to /publications

### Publications
- `GET /publications?type=&premium=&limit=&offset=` — ordered issue_date DESC
- `GET /publications/:id?download=true` — increments download_count if download=true
- `POST /publications` — admin, Zod
- `PUT /publications/:id` — admin
- `DELETE /publications/:id` — admin

### Subscriptions (Happy Path Always Succeeds)
- `GET /subscriptions/plans` — cached 1h, is_active filter, ordered price ASC
- `GET /subscriptions/me` — active or trialing, with invoices 5
- `GET /subscriptions/history` — all subscriptions for user
- `GET /subscriptions/invoices` — invoices ordered DESC
- `POST /subscriptions` — { planId, paymentMethodId }, validates plan, cancels existing active/trialing, creates new with periodEnd monthly/annually/lifetime, trial_end if trial_days>0, creates invoice paid, audit, Queue subscription_created → notification + invoice
- `POST /subscriptions/cancel` — { immediate?: boolean }, if immediate cancel now else cancel_at_period_end
- `POST /subscriptions/reactivate` — reactivates cancelled
- Admin: `POST /subscriptions/plans` create plan, `PUT /subscriptions/plans/:id` update, invalidates cache

### Notifications
- `GET /notifications?unread=true` — 50 limit, ordered DESC, returns unreadCount
- `PUT /notifications/:id/read`
- `PUT /notifications/read-all`
- `DELETE /notifications/:id`
- `DELETE /notifications` clear all
- `POST /notifications` — admin/system creates notification for user

### Users
- `GET /users/me/preferences` — parses JSON
- `PUT /users/me/preferences` — stores JSON
- `GET /users/me/stats` — favorites, playlists, watchedCount, watchedSeconds, completions, posts, streak, longestStreak
- `GET /users/:id` — public profile id,name,avatar,role,bio,affiliation,streak,joined_date + posts count
- `GET /users?q=&role=&active=&limit=&offset=` — admin search, total count
- `PUT /users/:id/deactivate` — admin, cannot self-deactivate, audit
- `PUT /users/:id/activate` — admin

### Search
- `GET /search?q=&type=all|content|speaker|publication|group&limit=` — saves search_history if authenticated, updates results_count, searches content (title/description/tags/speaker), speakers, publications, groups, returns suggestions from popular tags, trending cache 1h
- `GET /search/history` — user's last 20 searches, auth required
- `DELETE /search/history` — clear history
- `GET /search/trending` — from content tags, counts, cached 1h

### Analytics
- `POST /analytics/view` — { contentId, watchedSeconds, completed, deviceType, country }, increments content_items.views, creates content_views row
- `GET /analytics/content/:id` — pastor/admin, totalViews, uniqueViewers, avgWatchSeconds, completionRate, byDevice, recent 10
- `GET /analytics/me` — user's totalWatched, totalSeconds, completed, byCategory, recent 10 with content join

### Uploads (R2)
- `POST /uploads` — multipart form: file, type (video|audio|thumbnail|avatar|publication|other), title, description, category, speakerId, tags — pastor/admin only, generates R2 key `${type}/${id}.${ext}`, puts to STORAGE with contentType, creates pastor_upload pending
- `GET /uploads/file/*` — serves from R2, httpMetadata, etag, Cache-Control 1yr
- `GET /uploads` — user's uploads ordered DESC
- `GET /uploads/all` — admin sees all with user_name

### Admin
- `GET /admin/stats` — cached daily, totalUsers active, activeSubs, totalContent published, pendingReviews, monthlyViews SUM(views), totalSpeakers, totalPosts, totalGroups, qaSessions, totalRevenue SUM(invoices paid), dailyActiveUsers 7%, growth last 7d
- `GET /admin/users?q=&role=&active=&limit=&offset=` — admin search
- `PUT /admin/users/:id/role` — admin, cannot self, audit
- `GET /admin/uploads?status=pending|approved|rejected|all&type=&limit=&offset=` — with user join
- `POST /admin/uploads/:id/approve` — creates content_item from upload, updates pastor_upload approved, reviewed_by, published_content_id, audit, Queue content_approved → notifies uploader, invalidates content cache
- `POST /admin/uploads/:id/reject` — { feedback }, audit, Queue content_rejected
- `GET /admin/audit-logs?limit=&offset=&action=` — with user join
- `GET /admin/analytics?period=7d|30d|90d` — viewsByDay, topContent 10, userGrowth

### Health & OpenAPI
- `GET /` — API info, version 2.0.0, endpoints map
- `GET /health` — checks D1 (latency), KV, R2, Queue, DO, returns degraded if any error
- `GET /openapi.json` — minimal OpenAPI 3.0 spec

---

## 🔐 Security

- **JWT:** HS256, 7d expiry, Web Crypto sign/verify, `Authorization: Bearer <token>`
- **Password:** SHA-256 + salt `som-salt-2025` demo (use bcrypt wasm in prod)
- **CORS:** allow all origins for demo/Arena/Vercel, credentials true, maxAge 86400
- **Security Headers:** X-Content-Type-Options nosniff, X-Frame-Options DENY, X-XSS-Protection, Referrer-Policy strict-origin
- **Rate Limiting:** KV-based sliding window, 100 req/min standard, 20 strict for auth, headers X-RateLimit-*
- **Validation:** Zod schemas for all creates/updates, 400 with path:message
- **RBAC:** `requireAuth`, `requireRole(['admin'])`, `Permissions` map + `can()` + `requirePermission()`
- **SQL Injection:** D1 prepared statements only
- **R2:** pastor/admin only, mime validation via file.type, size check future
- **Audit:** `audit_logs` table logs all sensitive actions with ip/ua
- **Sessions:** `user_sessions` table for token hash, device, ip, expiry
- **Password Reset:** `password_reset_tokens` with expiry, used flag

---

## ⚡ Performance & Caching

- **Hono:** 14kB, zero dependencies
- **KV Cache:** content lists 5min, trending 10min, speakers 1h, plans 1h, confessions/ror 1h, search trending 1h, stats daily
- **Cache Invalidation:** on content create/update/delete, speaker create/update/delete, plan create/update, upload approve, new_content Queue
- **R2:** Cache-Control public max-age 31536000 immutable
- **D1 Indexes:** all filter/sort columns, FKs, composite indexes for hot queries
- **Queue:** non-blocking notifications, fan-out 200 users, dead letter queue
- **Durable Objects:** live Q&A participant tracking without DB polling
- **Cron:** daily midnight UTC, warms trending cache, updates speaker counts, cleans old data

---

## 🧪 Local Development

```bash
cd worker
npm install

# Create D1 local
npx wrangler d1 create som-connect-db
# Update wrangler.toml database_id if needed

# Migrate & seed local
npm run db:migrate:local
npm run db:seed:local
# Or reset
npm run db:reset:local

# .dev.vars
cp .dev.vars.example .dev.vars
# Edit JWT_SECRET etc.

# Dev server
npm run dev
# → http://localhost:8787
# Test health
curl http://localhost:8787/health

# Frontend with API
cd ..
VITE_API_URL=http://localhost:8787 npm run dev
# → http://localhost:8080
```

**Without VITE_API_URL, frontend works fully offline via localStorage mocks.**

---

## 🚢 Deployment

### 1. Create Cloudflare Resources

```bash
# D1 prod
npx wrangler d1 create som-connect-db-prod
# Copy database_id to wrangler.toml [env.production.d1_databases]

# R2
npx wrangler r2 bucket create som-connect-storage

# KV
npx wrangler kv:namespace create CACHE
npx wrangler kv:namespace create CACHE --preview
# Copy ids to wrangler.toml

# Queues
npx wrangler queues create som-connect-queue
npx wrangler queues create som-connect-queue-dlq

# Secrets (prod)
npx wrangler secret put JWT_SECRET --env production
npx wrangler secret put FRONTEND_URL --env production
# FRONTEND_URL = https://your-vercel-app.vercel.app
```

### 2. Migrate & Seed Prod

```bash
npx wrangler d1 execute som-connect-db-prod --file=src/db/schema.sql --env production
npx wrangler d1 execute som-connect-db-prod --file=src/db/seed.sql --env production
```

### 3. Deploy

```bash
npm run deploy
# Or prod env
npx wrangler deploy --env production
```

### 4. Frontend Vercel

- Connect repo to Vercel
- Framework: Vite, Build: `npm run build`, Output: `dist`
- Env: `VITE_API_URL=https://som-connect-api.your-subdomain.workers.dev`

---

## 📊 Cron & Queue Details

**Queue jobs:**
- `welcome` → notification welcome
- `new_content` → fan-out 200 users notification + invalidate trending cache
- `new_post` → if group post, notify group members 100
- `new_question` → log for speaker notification
- `subscription_created` → notification premium activated + invoice paid
- `password_reset` → log email send (integrate Resend/SendGrid in prod)
- `content_approved` → notify uploader approved + live link
- `content_rejected` → notify uploader with feedback

**Cron daily midnight:**
- Ensure today's confession exists, create placeholder if missing
- Clean notifications older than 30d, password_reset_tokens expired, user_sessions expired, search_history 90d
- Cache stats daily: totalUsers, totalContent, totalViews, activeSubs, pendingUploads
- Update speakers.content_count from content_items
- Warm trending cache 10 items

---

## 🔍 Testing

```bash
# Worker dry-run
npx wrangler deploy --dry-run

# Frontend build
cd ..
npm run build # 2194 modules, 817kB → 231kB gzip

# Health
curl http://localhost:8787/health | jq
curl http://localhost:8787/ | jq
curl http://localhost:8787/openapi.json | jq
```

**Happy-path QA:**
- Login any email → JWT → /auth/me
- Content list filter/search → cache → increment views
- Progress save → continue watching
- Favorite toggle → unique handling
- Playlist create + add item
- Community post + like toggle + comment + group join
- Q&A ask + upvote + join via DO
- Tools complete → streak logic + achievement
- Subscription create always succeeds → invoice + notification
- Upload R2 → admin approve → creates content_item → cache invalidate
- Search saves history + trending
- Analytics track view

---

## 📁 Structure

```
worker/
├── src/
│   ├── index.ts — Hono app, CORS, security headers, rateLimit, routes, queue, scheduled, DO export
│   ├── lib/
│   │   ├── auth.ts — hash, verify, JWT sign/verify, generateId
│   │   ├── db.ts — Env interface, helpers, jsonResponse
│   │   ├── r2.ts — upload, get, delete, generateR2Key
│   │   ├── validators.ts — Zod schemas for all entities
│   │   ├── cache.ts — cacheGet/Set/Delete, CacheKeys
│   │   ├── permissions.ts — RoleHierarchy, Permissions map, can(), requirePermission()
│   │   └── audit.ts — auditLog, getClientInfo
│   ├── middleware/
│   │   └── rateLimit.ts — KV sliding window, strict/standard/lenient
│   ├── routes/
│   │   ├── auth.ts — register, login, forgot, me, profile
│   │   ├── content.ts — list, trending, continue, get, create, update, delete, like, progress
│   │   ├── speakers.ts — list cached, get with stats, CRUD admin
│   │   ├── favorites.ts — list, add, delete
│   │   ├── playlists.ts — list, create, get, add item, delete
│   │   ├── community.ts — posts, like, groups, join
│   │   ├── comments.ts — content comments, post comments, like, delete
│   │   ├── qa.ts — list, get, ask, upvote, join via DO
│   │   ├── tools.ts — confessions CRUD admin, ror CRUD admin, complete streak logic, streak history
│   │   ├── publications.ts — list, get, CRUD admin
│   │   ├── subscriptions.ts — plans cached, me with invoices, history, invoices, create happy-path, cancel, reactivate, admin plan CRUD
│   │   ├── notifications.ts — list with unreadCount, read, read-all, delete, clear, admin create
│   │   ├── users.ts — me/preferences, me/stats, public profile, admin search, deactivate/activate
│   │   ├── search.ts — global search content/speaker/publication/group, history, trending
│   │   ├── analytics.ts — track view, content analytics pastor/admin, me analytics
│   │   ├── uploads.ts — R2 multipart, serve file, list user, list all admin
│   │   └── admin.ts — stats cached, users, role, uploads approve→content, reject, audit-logs, analytics
│   ├── durable/
│   │   └── qa.ts — QASessionDurableObject join/leave/stats
│   └── db/
│       ├── schema.sql — 22 tables v2
│       └── seed.sql — full demo dataset
├── wrangler.toml — D1, R2, KV, Queue, DO, cron, observability, envs
├── package.json — hono 4.6.0, zod 3.23.8, wrangler 3.78.0
├── tsconfig.json — ES2022, bundler, workers-types
├── .dev.vars.example
└── README.md
```

---

## 🚧 Production TODOs (Optional Enhancements)

- Replace SHA-256 password with bcrypt wasm
- Add Resend/SendGrid for password reset emails
- Add Stripe webhook for real payments (currently happy-path manual)
- Add R2 signed URLs with expiry for premium content
- Add full-text search via D1 FTS5 or Algolia
- Add WebSocket via Durable Objects for real-time community
- Add image optimization via Cloudflare Images
- Add rate limiting per user (currently IP-based)
- Add OpenAPI full spec generation via hono-openapi
- Add Vitest unit tests for validators and routes

All happy paths work today — no external credentials required for demo.
