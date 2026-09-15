# SOM CONNECT — Full-Stack Deployment Guide

## Architecture Overview

```
Vercel (Frontend) → Cloudflare Workers (API) → D1, R2, KV, Queue, Durable Objects
```

- **Frontend:** Vite React 18, 2194 modules, 817kB → 231kB gzip, API-first with localStorage fallback
- **Backend:** Hono 4.6.0, 338 KiB → 65 KiB gzip, 50+ endpoints, Zod validation, audit logs, rate limiting

---

## Backend — Cloudflare Workers

### Resources to Create (One-Time)

```bash
cd worker

# D1 Database — production
npx wrangler d1 create som-connect-db-prod
# Copy database_id to wrangler.toml [env.production.d1_databases]

# R2 Bucket
npx wrangler r2 bucket create som-connect-storage

# KV Namespace
npx wrangler kv:namespace create CACHE
npx wrangler kv:namespace create CACHE --preview
# Copy ids to wrangler.toml

# Queues
npx wrangler queues create som-connect-queue
npx wrangler queues create som-connect-queue-dlq

# Secrets — production
npx wrangler secret put JWT_SECRET --env production
# Generate: openssl rand -base64 32
# Value: 32+ chars, e.g., som-connect-prod-secret-32-chars-min

npx wrangler secret put FRONTEND_URL --env production
# Value: https://your-vercel-app.vercel.app
```

### Migrate & Seed

```bash
# Schema — 22 tables
npx wrangler d1 execute som-connect-db-prod --file=src/db/schema.sql --env production

# Seed — speakers, users, content, confessions, ROR, publications, QA, groups, plans, posts, etc.
npx wrangler d1 execute som-connect-db-prod --file=src/db/seed.sql --env production

# Verify
npx wrangler d1 execute som-connect-db-prod --command="SELECT COUNT(*) FROM users" --env production
```

### Deploy

```bash
# Dry-run check
npx wrangler deploy --dry-run

# Deploy to production
npx wrangler deploy --env production

# Or default (development)
npm run deploy
```

Worker URL will be: `https://som-connect-api.<your-subdomain>.workers.dev`

### Local Development (Full Stack)

```bash
# Terminal 1 — Worker
cd worker
cp .dev.vars.example .dev.vars
# Edit .dev.vars: JWT_SECRET, FRONTEND_URL=http://localhost:8080
npm run db:reset:local
npm run dev
# → http://localhost:8787
# Health: http://localhost:8787/health
# API info: http://localhost:8787/

# Terminal 2 — Frontend with API
cd ..
VITE_API_URL=http://localhost:8787 npm run dev
# → http://localhost:8080

# Without VITE_API_URL, frontend works offline via mocks
npm run dev
```

### Cron & Queue

- **Cron:** `0 0 * * *` daily midnight UTC — defined in wrangler.toml [triggers]
  - Ensures today's confession exists
  - Cleans notifications 30d, password_reset_tokens, user_sessions, search_history 90d
  - Caches daily stats
  - Updates speaker content counts
  - Warms trending cache

- **Queue:** `som-connect-queue` — producer binding QUEUE, consumer max_batch 10, timeout 30s, retries 3, DLQ
  - Jobs: welcome, new_content fan-out 200 users, new_post group members, new_question, subscription_created + invoice, password_reset, content_approved/rejected

### Durable Objects

- `QASessionDurableObject` — class_name QASessionDurableObject, binding QA_SESSION
- Migration v1 new_classes
- Used for live Q&A participant tracking: join/leave/stats

---

## Frontend — Vercel

### Deploy to Vercel

1. Connect GitHub repo `CyberElias-TechPros/som-connect-hub` to Vercel
2. Framework: Vite
3. Build Command: `npm run build`
4. Output Directory: `dist`
5. Environment Variables:
   ```
   VITE_API_URL=https://som-connect-api.your-subdomain.workers.dev
   VITE_ENV=production
   VITE_ENABLE_OFFLINE=true
   VITE_ENABLE_NOTIFICATIONS=true
   VITE_HAPPY_PATH=true
   ```

### Without Backend

If `VITE_API_URL` not set, frontend falls back to localStorage mocks — fully functional happy-path:

- Any email + password ≥3 chars → creates member user
- Demo roles via email substring: *pastor* → pastor, *admin* → admin
- Favorites, playlists, community, QA, tools, subscriptions all work offline

---

## Environment Variables

### Frontend (.env.local or Vercel)

```
VITE_API_URL=https://som-connect-api.your-subdomain.workers.dev
VITE_ENV=development
VITE_ENABLE_OFFLINE=true
VITE_ENABLE_NOTIFICATIONS=true
VITE_HAPPY_PATH=true
```

### Worker (.dev.vars for local, secrets for prod)

```
JWT_SECRET=your-32+chars-secret
FRONTEND_URL=http://localhost:8080 or https://your-vercel.app
ENV=development or production
```

Set via:

```bash
# Local
cp .dev.vars.example .dev.vars

# Prod secrets
npx wrangler secret put JWT_SECRET --env production
npx wrangler secret put FRONTEND_URL --env production
```

---

## API Endpoints — Quick Test

```bash
API=https://som-connect-api.your-subdomain.workers.dev

# Health
curl $API/health | jq
curl $API/ | jq

# Auth — happy path any email works
curl -X POST $API/auth/register -H "Content-Type: application/json" -d '{"email":"test@example.com","password":"123","name":"Test"}' | jq
TOKEN=$(curl -s -X POST $API/auth/login -H "Content-Type: application/json" -d '{"email":"test@example.com","password":"123"}' | jq -r .token)

# Content
curl $API/content?limit=5 | jq
curl $API/content/trending | jq
curl $API/content/c_1 -H "Authorization: Bearer $TOKEN" | jq

# Search
curl "$API/search?q=faith" | jq
curl $API/search/trending | jq

# Speakers
curl $API/speakers | jq

# Favorites
curl $API/favorites -H "Authorization: Bearer $TOKEN" | jq
curl -X POST $API/favorites -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"contentId":"c_1"}' | jq

# Community
curl $API/community/posts | jq
curl $API/community/groups -H "Authorization: Bearer $TOKEN" | jq

# Q&A
curl $API/qa | jq

# Tools
curl $API/tools/confessions | jq
curl $API/tools/ror | jq
curl $API/tools/streak -H "Authorization: Bearer $TOKEN" | jq

# Subscriptions — always succeeds
curl $API/subscriptions/plans | jq
curl -X POST $API/subscriptions -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"planId":"premium-monthly"}' | jq

# Admin stats
curl $API/admin/stats -H "Authorization: Bearer $TOKEN" | jq
```

---

## Security Checklist

- [x] JWT HS256 7d expiry, Web Crypto sign/verify
- [x] Password SHA-256 + salt demo (replace with bcrypt wasm in prod)
- [x] CORS allowlist + Arena/Vercel preview
- [x] Security headers: nosniff, DENY, XSS, strict-origin
- [x] Rate limiting KV sliding window 100/min standard, 20/min strict
- [x] Zod validation all creates/updates
- [x] RBAC requireAuth, requireRole, Permissions map
- [x] SQL injection prevention via D1 prepared statements
- [x] R2 pastor/admin only, mime check
- [x] Audit logs with ip/ua
- [x] User sessions, password reset tokens with expiry
- [ ] Replace SHA-256 with bcrypt wasm for prod
- [ ] Add Resend/SendGrid for emails
- [ ] Add Stripe webhook for real payments
- [ ] Add R2 signed URLs with expiry for premium

---

## Performance

- Worker 338 KiB → 65 KiB gzip
- Frontend 817 KiB → 231 KiB gzip
- KV cache: content lists 5min, trending 10min, speakers 1h, plans 1h, confessions/ror 1h, search trending 1h, stats daily
- R2 Cache-Control 1yr immutable
- D1 indexes on all hot paths
- Queue non-blocking
- Cron warms cache

---

## Troubleshooting

- **D1 not found:** Check database_id in wrangler.toml matches `wrangler d1 list`
- **KV not found:** Check id/preview_id from `wrangler kv:namespace list`
- **R2 not found:** `wrangler r2 bucket list`
- **Queue not found:** `wrangler queues list`
- **JWT invalid:** Ensure JWT_SECRET same across deploys, 32+ chars
- **CORS error:** Set FRONTEND_URL secret to your Vercel URL
- **Frontend fallback:** If VITE_API_URL not set or API fails, frontend uses localStorage mocks — check console.warn

---

## PR & Branch

- Branch: `arena/01a0a431-som-connect-hub`
- PR: https://github.com/CyberElias-TechPros/som-connect-hub/pull/1
- Builds verified: frontend 2194 modules, worker dry-run 338 KiB
