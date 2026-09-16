# SOM CONNECT — processes, in the order they run

Everything that has to happen for the product to work, in dependency order:
**schema → money/rules engine → routes → background jobs → frontend flows →
verification → provisioning → deploy**. Each section states what it is, when it
runs, the command, and how to tell it worked.

---

## 0. One-time setup

```bash
# frontend
npm ci

# worker
cd worker && npm ci

# local dev secrets (optional integrations)
cp .dev.vars.example .dev.vars       # JWT_SECRET, RESEND_API_KEY, STRIPE_*, …
```

Nothing else is required locally: a missing database, missing tables or missing
seed data rebuild itself on the first request (`ensureDatabase()` in the Worker).

---

## 1. Schema (source of truth)

| Step | Command | Output |
| --- | --- | --- |
| Define/change tables | edit `worker/src/db/schema.sql` | — |
| Bump the version when it changes | `SCHEMA_VERSION` in `worker/scripts/build-sql.mjs` | — |
| Regenerate | `cd worker && npm run db:build` | `src/db/sql.generated.ts`, `migrations/0001_init.sql`, `migrations/0002_seed.sql` |
| Apply locally (fresh) | `npm run db:reset:local` | an empty-file → working DB |
| Apply locally (keep data) | `npm run db:migrate:local` | migrations applied |
| Apply remotely | `npm run db:migrate:remote` | production schema |

Current version: **6** — adds `payment_methods.token` (the gateway reference a
stored card charges through, so a test card keeps declining) and
`payment_intents.payment_method_id` (what an intent settled with).

> A schema change regenerates `0001_init.sql`. Pre-launch environments can be
> reset; once live, add a numbered `0003_*.sql` with `ALTER TABLE` instead.

Boot order inside the Worker (`ensureDatabase`): create schema if `users` is
missing → seed if `speakers` is empty → cache the schema version in KV. A wiped
database rebuilds itself; this is asserted by the smoke suites.

---

## 2. Business rules and the money engine

Order inside the codebase: **pure rules → engine → routes**.

| Layer | File | Responsibility |
| --- | --- | --- |
| Rules (pure) | `worker/src/lib/payments.ts` | invoice numbering, proration, plan-change mode, dunning schedule, card validation (Luhn/expiry/CVC), brand detection, test-card tokens, webhook signature, `hasPremiumAccess`, `canResume` |
| Engine | `worker/src/lib/billing.ts` | `startSubscription`, `renewSubscription`, `processDueRenewals`, `changePlan`, `cancelSubscription`, `resumeSubscription`, `premiumStatus`; idempotent charging; receipts + emails + notifications |
| Notifications | `worker/src/lib/email.ts` | Resend when `RESEND_API_KEY` is set, otherwise the KV outbox (`GET|DELETE /api/dev/outbox`) |
| Access | `worker/src/lib/middleware.ts` | `resolveAuth`, `requireRole`, security headers, CORS |

Money lifecycle, in the order events happen:

```
 choose plan → POST /payments/intents → POST /payments/confirm
   → POST /subscriptions  → charge (idempotency key) → invoice INV-YYYY-NNNN
     → receipt email + in-app notification → premium access = active|trialing|past_due

 period ends → cron 5 0 * * *  → processDueRenewals()
   success → new period + invoice + receipt (failed counters reset)
   failure → past_due, failed_payment_count+1, retryAt = +3d / +5d / +7d, then expire
             premium access is KEPT during the grace window

 user actions → PUT /subscriptions/me  (upgrade = prorated charge now,
                                        downgrade = pending_plan_id at period end)
               POST /subscriptions/cancel (at period end, or immediately)
               POST /subscriptions/resume (only while the paid period is running)
               POST /subscriptions/renew  (retry now, 402 on decline)

 gateway → POST /payments/webhook (HMAC verified, event recorded once,
           succeeded/paid → invoice, failed → past_due, deleted → cancelled)
```

Rules that must never regress:

- **A successful charge locks its idempotency key; a failed one does not.**
  Retrying after a decline charges again; replaying a success never double-charges.
- **Every successful charge writes an invoice** with a sequential number, the
  period it covers and `paid_at`.
- **Only brand + last4 + a gateway token are stored** — never a PAN. A card sent
  to the API is validated first (`400 invalid_card`).
- **"Default card" means "the card we charge"** — pointing the default at a
  method also points the live subscription at it.
- **Dunning respects its schedule** — the nightly job retries only when
  `next_retry_at` has arrived (+3/+5/+7 days), then expires the subscription.

---

## 3. HTTP routes

`worker/src/index.ts` mounts Hono once at `/` and once at `/api` (so `/api/x` and
`/x` both work), then:

```
request → cors → security headers → pretty JSON → resolveAuth (verify JWT → load user)
        → route group → role guard (requireRole) → validate body → D1 / R2 / KV / DO
        → side effects (queue job, email, notification, audit log) → JSON
```

Route groups: `auth`, `content`, `favorites`, `playlists`, `community`, `qa`,
`daily/tools`, `notifications`, `subscriptions`, `payments`, `uploads`, `admin`,
`search`, `meta` (+ `GET|DELETE /api/dev/outbox` in non-production).

---

## 4. Background processes

| Process | Trigger | Does |
| --- | --- | --- |
| Queue consumer | any producer (`/auth/register`, `/auth/forgot`, posts, questions, uploads reviewed, subscriptions) | `welcome`, `password_reset`, `new_content`, `new_post`, `new_question`, `subscription_created`, `upload_reviewed` → notifications/emails. Batches on `max_batch_timeout` (**5 s**) |
| Cron | `5 0 * * *` | `processDueRenewals(env)` → renew/retry/expire, then expire lapsed at-period-end cancellations |
| Dead-letter queue | consumer failures | `som-connect-jobs-dlq`, inspected with `wrangler queues` |
| Durable Object | `/qa/:id/join`, `/qa/:id/live` | live Q&A participants + question queue (max 50) |

Run the cron locally:

```bash
cd worker
npx wrangler dev --test-scheduled       # then:
curl "http://127.0.0.1:8787/__scheduled?cron=5+0+*+*+*"
# or run just the money job, without cron:
curl -X POST http://127.0.0.1:8787/api/subscriptions/process-due -H "Authorization: Bearer <admin>" 
```

Inspect what the queue sent (dev):

```bash
curl http://127.0.0.1:8787/api/dev/outbox          # what would have been emailed
curl -X DELETE http://127.0.0.1:8787/api/dev/outbox
```

---

## 5. Frontend flows

Every screen follows the same contract:

```
screen → useApiData(loader, bundled fallback) → service → apiClient.tryApi(
           api call,                                        // happy path
           local/mock fallback,                             // offline, 5xx, 401/404/408/429
           { label }                                        // for the "showing saved data" note
         ) → optimistic UI → toast
```

Money actions deliberately do **not** fall back on a `402`: a decline is shown to
the user (`Payment.tsx` keeps the form open, `ManageSubscription.tsx` offers
"retry payment" / "use another card"). Only transport-level failures fall back.

Per-story wiring is tabulated in `docs/USER_STORIES.md`.

---

## 6. Verification (the order to run it in)

```bash
# 0. types must compile before anything else
cd worker && npm run typecheck

# 1. deploy gate: config, bindings, generated SQL freshness, secrets
npm run preflight              # staging
npm run preflight:prod         # production (blocks on placeholders/secrets)

# 2. start the stack
npm run dev                    # worker  :8787
npm run dev                    # frontend :8080 (second terminal, repo root)

# 3. worker journeys (118 assertions)
cd worker && npm test          # or: npm test -- --ci

# 4. everything else (repo root)
npm run test:api               # 96 API paths the frontend calls
npm run test:frontend          # 43 frontend ↔ backend journeys (needs :8080)
npm run test:pages             # 32 routes rendered with live data (jsdom)
npm run test:stories           # 61 story assertions across S1–S32
npm test                       # all four in order
```

Last full run on this branch: **118/118 worker · 96/96 contract · 43/43 frontend
· 32/32 pages · 61/61 stories**, `tsc --noEmit` clean on both projects, `npm run
build` green.

The story suite can be pointed at one story while debugging:

```bash
node scripts/stories-smoke.mjs --story=S24 --verbose   # assumes earlier stories ran
node scripts/stories-smoke.mjs --api=https://api.example.com
```

---

## 7. First-time Cloudflare provisioning (ordered)

```bash
cd worker
npm run provision:check            # auth + config only, changes nothing
npm run provision:staging          # or: npm run provision:prod
```

`provision.mjs` performs, in this order:

1. preflight — wrangler auth present, `wrangler.toml` readable, placeholders listed
2. `wrangler d1 create` (both envs when needed) → database ids
3. write each `database_id` into the matching `[env.*]` block of `wrangler.toml`
4. `wrangler r2 bucket create som-connect-storage`
5. `wrangler kv:namespace create CACHE` (+ preview) → ids into `wrangler.toml`
6. `wrangler queues create som-connect-jobs` and `…-dlq`
7. apply migrations + seed remotely (`wrangler d1 migrations apply --remote`)
8. prompt for the secrets it does not own: `JWT_SECRET`, `FRONTEND_URL`,
   `RESEND_API_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
   `PAYMENT_WEBHOOK_SECRET`
9. optionally deploy (`--deploy`)

Flags: `--env=staging|production`, `--check`, `--no-write`, `--db=<id>`,
`--deploy`.

**This sandbox has no Cloudflare credentials** (`wrangler whoami` → not
authenticated), so provisioning must be run where `CLOUDFLARE_API_TOKEN` (or
`wrangler login`) is available. `provision:check` was run here and correctly
reported the missing auth and the 4 outstanding placeholders.

---

## 8. Deploy order

```bash
cd worker
npm run preflight                  # 0 errors required (warnings are informational)
npm run db:migrate:remote          # schema before code
npm run deploy:staging             # or deploy:prod
# then point the frontend at it
VITE_API_URL=https://som-connect-api.<subdomain>.workers.dev npm run build
```

After deploying, in this order:

1. `curl https://<worker>/api/health` → `healthy: true` (DB, KV, R2, Queue, DO bound)
2. `GET /api/subscriptions/plans` → plans present (seed applied)
3. sign in with a demo account → `/api/auth/me`
4. `POST /api/subscriptions/process-due` with an admin token → `summary` returned
5. Configure the gateway webhook to `POST /api/payments/webhook` and set
   `PAYMENT_WEBHOOK_SECRET`; a bad signature must return `401`
6. Verify a real email by setting `RESEND_API_KEY` and registering a test user
   (without it, emails land in the KV outbox and `/api/dev/outbox` is disabled in
   production, exactly as intended)

---

## 9. Operational runbook (recurring)

| Situation | Do |
| --- | --- |
| Change the schema | bump `SCHEMA_VERSION`, `npm run db:build`, `npm run db:reset:local`, re-run the suites |
| Local DB corrupt / after a D1 reset | stop the worker, `rm -rf .wrangler/state/v3/d1`, `npm run db:migrate:local`, restart the worker (Miniflare caches the SQLite handle) |
| Renewals look stuck | `POST /api/subscriptions/process-due` (admin) and compare `summary` with `SELECT status, next_retry_at FROM user_subscriptions` |
| Member says "payment failed" | `GET /subscriptions/me` → `failedPaymentCount`, `lastPaymentError`, `nextRetryAt`; retry via `POST /subscriptions/renew` |
| Check what a user was charged | `GET /subscriptions/invoices` (numbers, periods, `paid_at`) and `payment_events` for gateway idempotency records |
| Emails not arriving in dev | the queue batches on `max_batch_timeout` (5 s) — wait a few seconds, then `GET /api/dev/outbox` |
| Suspended user still browsing | access is revoked on the next request (`is_active` is checked in `resolveAuth`) |
