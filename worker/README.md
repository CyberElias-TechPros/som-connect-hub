# SOM CONNECT — Cloudflare Workers API

Production-grade backend for the SOM CONNECT Hub frontend, running entirely on
Cloudflare's edge platform.

- **Runtime:** Cloudflare Workers + [Hono](https://hono.dev)
- **Database:** D1 (SQLite) — 30 tables, FKs, CHECK constraints, indexes
- **Storage:** R2 for video, audio, publications and avatars
- **Cache:** KV for rate limiting, daily stats and bootstrap markers
- **Queue:** Cloudflare Queues for background fan-out (welcome mail, new content,
  subscription events, password resets) with a dead-letter queue
- **Durable Objects:** `QASessionDurableObject` — live Q&A rooms over WebSockets
- **Cron:** daily `5 0 * * *` housekeeping (devotionals, expiry, reminders, cleanup)

Everything ships with a **self-healing bootstrap**: on the first request against
an empty database the worker creates the schema and seeds demo data, so a fresh
environment is usable with zero manual steps. `wrangler d1 migrations apply`
remains the canonical production path.

---

## Quick start (local)

```bash
cd worker
npm install
npm run db:build            # regenerate src/db/sql.generated.ts + migrations/
npm run db:migrate:local    # apply migrations to the local D1 database
npm run db:seed:local       # load demo data (optional — bootstrap does it too)
npm run dev                 # http://localhost:8787
npm test                    # 115-assertion happy-path smoke suite
```

The frontend (`../`, Vite on `:8080`) proxies `/api/*` to this worker, so no
`VITE_API_URL` is required for local development.

### Demo accounts

| Role   | Email                        | Password    |
| ------ | ---------------------------- | ----------- |
| Member | david.emmanuel@example.com   | password123 |
| Pastor | pastor@example.com           | pastor123   |
| Admin  | admin@example.com            | admin123    |
| Member | grace.adeyemi@example.com    | password123 |

`STRICT_AUTH=false` (the default outside production) makes sign-in happy-path:
unknown emails are provisioned on the fly and the demo passwords always work.
Set `STRICT_AUTH=true` in `.dev.vars` (or the production vars) for conventional
password verification.

---

## Scripts

| Script | Purpose |
| ------ | ------- |
| `npm run dev` | Local worker on `:8787` with local D1/R2/KV/Queues/DO |
| `npm run build` | Regenerate SQL artifacts + `tsc --noEmit` |
| `npm run typecheck` | TypeScript only |
| `npm run db:build` | SQL → `src/db/sql.generated.ts` + `migrations/*.sql` |
| `npm run db:create` | Create the remote D1 database |
| `npm run db:migrate:local` / `:remote` | Apply migrations |
| `npm run db:seed:local` / `:remote` | Load demo data |
| `npm run db:reset:local` | Wipe local D1, re-migrate and re-seed |
| `npm run db:console` | `SELECT id, email, role FROM users` (local) |
| `npm run storage:create` | Create the R2 bucket |
| `npm run queue:create` | Create the queue (+ DLQ) |
| `npm test` / `npm run test:ci` | Happy-path smoke suite |
| `npm run deploy` | Deploy to production (`--env production`) |
| `npm run deploy:staging` | Deploy to staging |

---

## Configuration

Non-secret configuration lives in `wrangler.toml`; secrets live in `.dev.vars`
locally and `wrangler secret put` in production.

| Variable | Default | Notes |
| -------- | ------- | ----- |
| `ENV` | `development` | `production` hides internal error details and stops returning reset tokens |
| `APP_NAME` / `APP_VERSION` | `SOM CONNECT API` / `1.0.0` | Surfaced by `/api/meta` |
| `FRONTEND_URL` | `http://localhost:8080` | Used for CORS + generated links |
| `ALLOWED_ORIGINS` | empty | Comma-separated extra origins |
| `ALLOW_ALL_ORIGINS` | `true` (dev) / `false` (prod) | Permissive CORS for preview hosts |
| `STRICT_AUTH` | `false` (dev) / `true` (prod) | Enforce real password checks |
| `R2_PUBLIC_BASE_URL` | empty | CDN domain for media; empty streams through `/uploads/file/:key` |
| `JWT_SECRET` | — | **Secret.** HS256 signing key, 32+ chars |

Bindings: `DB` (D1), `STORAGE` (R2), `CACHE` (KV), `QUEUE` (Queues),
`QA_SESSION` (Durable Object), plus optional `[assets]` static hosting of the
built SPA (see the bottom of `wrangler.toml`).

---

## API surface

All routes are served both at the root (`/content`) and under `/api`
(`/api/content`); the frontend uses `/api`.

| Area | Routes |
| ---- | ------ |
| Meta | `GET /health`, `GET /meta`, `GET /stats`, `GET /config`, `GET /speakers[/:id]`, `GET /search?q=`, `POST /newsletter` |
| Auth | `POST /auth/register`, `POST /auth/login`, `POST /auth/forgot`, `POST /auth/reset`, `GET /auth/me`, `GET /auth/session`, `PUT|POST|PATCH /auth/profile`, `PUT /auth/preferences`, `POST /auth/logout`, `GET /auth/demo-accounts` |
| Content | `GET /content`, `/content/categories`, `/content/featured`, `/content/user/continue`, `/content/user/progress`, `/content/downloads`, `/content/:id`; `POST /content` (pastor/admin), `POST /content/:id/progress`, `POST /content/:id/download`, `DELETE /content/:id/download` |
| Library | `GET|POST|DELETE /favorites`, `DELETE /favorites/:contentId`, `POST /favorites/:contentId/toggle`; `GET|POST /playlists`, `GET|PUT|DELETE /playlists/:id`, `POST /playlists/:id/items`, `DELETE /playlists/:id/items/:contentId` |
| Community | `GET|POST /community/posts`, `GET|DELETE /community/posts/:id`, `POST /community/posts/:id/like`, `POST /community/posts/:id/comments`, `GET /community/groups`, `POST /community/groups/:id/join` |
| Q&A | `GET /qa`, `GET /qa/:id`, `GET /qa/:id/live`, `GET /qa/:id/ws`, `POST /qa/:id/questions`, `POST /qa/:id/questions/:questionId/upvote`, `POST /qa/:id/join`, `POST /qa/:id/leave` |
| Daily tools | `GET /tools/bundle`, `/tools/confessions[/:date]`, `/tools/ror[/:date]`, `/tools/streak`, `/tools/plan`, `/tools/completions`, `/tools/publications`; `POST /tools/complete` |
| Notifications | `GET|POST /notifications`, `GET /notifications/unread-count`, `PUT /notifications/read-all`, `PUT /notifications/:id/read`, `PUT /notifications/:id/unread`, `DELETE /notifications[/:id]`, `GET|PUT /notifications/settings` |
| Subscriptions | `GET /subscriptions/plans`, `/subscriptions/me`, `/subscriptions/status`, `/subscriptions/invoices`; `POST /subscriptions`, `PUT /subscriptions/me`, `POST /subscriptions/cancel`, `POST /subscriptions/resume` |
| Payments | `GET|POST /payments/methods`, `DELETE /payments/methods/:id`, `PUT /payments/methods/:id/default`, `GET|PUT /payments/billing`, `POST /payments/intents`, `POST /payments/confirm`, `POST /payments/validate`, `GET /payments/history` |
| Uploads | `POST /uploads` (multipart → R2), `GET /uploads`, `GET /uploads/all`, `GET /uploads/stats`, `GET /uploads/file/:key` (public media), `POST /uploads/avatar`, `DELETE /uploads/:id` |
| Admin | `GET /admin/stats`, `/admin/dashboard`, `/admin/analytics`, `/admin/users`, `/admin/uploads`, `/admin/moderation/posts`, `/admin/audit-logs`; `PUT /admin/users/:id/role`, `/admin/users/:id/status`, `DELETE /admin/users/:id`, `POST /admin/uploads/:id/approve|reject`, `POST /admin/broadcast`, `POST /admin/maintenance` |

Response conventions:

```jsonc
// success
{ "ok": true, "items": [...], "total": 12, "limit": 20, "offset": 0 }

// error (4xx/5xx)
{ "ok": false, "error": "Human readable message.", "code": "not_found", "status": 404 }
```

---

## Database

`src/db/schema.sql` and `src/db/seed.sql` are the source of truth.
`npm run db:build` compiles them into:

- `src/db/sql.generated.ts` — runtime bootstrap SQL (comment-free, statement-split)
- `migrations/0001_init.sql`, `migrations/0002_seed.sql` — wrangler D1 migrations
- `migrations/README.md` — migration notes

The local reset path is `npm run db:reset:local`. Direct SQL is also fine:

```bash
npx wrangler d1 execute som-connect-db --local --persist-to .wrangler/state \
  --file=./src/db/schema.sql
```

---

## Background work

- **Queue jobs:** `welcome`, `new_content`, `subscription_created`, `password_reset`
- **Cron (`5 0 * * *`):** ensure today's confession/ROR exist, expire lapsed
  subscriptions, send daily reminders (up to 500 users), delete notifications
  older than 60 days and expired reset tokens, warm the KV `stats:daily` cache
- **Durable Object:** per-session rooms; HTTP `join`/`leave`/`question`/
  `broadcast`/`stats` plus WebSocket upgrades, with D1 fallbacks when the DO is
  unreachable

---

## Testing

```bash
npm test                                   # 115 happy-path assertions
node test/smoke.test.mjs --base=http://127.0.0.1:8787
```

The suite covers health, auth (member/pastor/admin), content, favorites,
playlists, community, Q&A, daily tools, notifications, subscriptions, payments,
uploads, admin and the graceful-failure paths (401/403/400/404). It exits `1` on
any failure, so it can run in CI right after `wrangler dev` boots.
