# SOM CONNECT — user stories, business rules and flows

This is the contract between the product and the code. The ordered list of
processes behind these stories is in [`PROCESSES.md`](./PROCESSES.md). Every story below is
implemented end-to-end (UI → service → API → D1/R2/KV/Queue/DO) and is asserted
by an automated flow in `scripts/stories-smoke.mjs` (API level) or
`scripts/page-smoke.mjs` (each route renders with live data).

Legend: **S** = story id, *Actor*, **Flow** = ordered steps, **Rules** = business
logic that must hold, **Edge** = the non-happy-path behaviour that is deliberate.

---

## Actors

| Actor | Who | Can |
| --- | --- | --- |
| Visitor | not signed in | browse library, search, read publications, view public Q&A, sign up |
| Member | free account | everything above + favorites, playlists, progress, community, daily tools, subscription |
| Premium member | member with active subscription | + HD/originals, offline downloads |
| Pastor | creator role | everything a member can + upload media, track submissions |
| Admin | platform staff | + moderation queue, user management, analytics, broadcast, billing ops |

Role rules: roles are hierarchical (`guest < member < pastor < admin`); guards are
`MemberRoute`, `PastorRoute`, `AdminRoute` on the client and `requireRole()` on
the Worker. A signed-in member hitting an admin route gets `403`, never a crash.

---

## 1. Onboarding and accounts

### S1 — First-run onboarding
*Visitor*
**Flow:** `/splash` → (first visit) `/onboarding` (3 slides) → `/register`
→ account created → welcome email + welcome notification → `/`.
**Rules:** onboarding completion is remembered in `som_seen_onboarding`; the
splash never traps a returning user — it routes to `/` or `/login`.
**Edge:** storage unavailable (private mode) still lets the user through.

### S2 — Create an account
*Visitor*
**Flow:** `/register` (name, email, password) → `POST /auth/register`
→ `201` with token + user → session persisted (`som_token_v2`, `som_auth_v2`)
→ queue job `welcome` → email template `welcome` + in-app notification.
**Rules:** duplicate email = `200` and signs the existing user in (never a dead
end); password is PBKDF2-SHA256 (210k iterations, per-user salt); the response
never contains the hash; role is derived from the email (`*pastor*`, `*admin*`,
otherwise member) unless explicitly requested by an authorized caller.
**Edge:** `STRICT_AUTH=true` (production) returns `409 email_taken` instead of
auto-signing in.

### S3 — Sign in
*Member / Pastor / Admin*
**Flow:** `/login` → `POST /auth/login` → token (HS256, 7 days, `{id,email,role}`)
→ `AuthContext` stores user → redirect to `/` (or back to the guarded page).
**Rules:** demo buttons are filled from `GET /auth/demo-accounts`; unknown emails
are provisioned as members when `STRICT_AUTH` is off; a wrong password for an
existing account is rejected (`401 invalid_credentials`) when strict, and
accepted otherwise (documented demo behaviour).
**Edge:** a revoked/expired token is cleared on any `401` and the user is signed
out cleanly instead of looping.

### S4 — Restore a session
*Any signed-in actor*
**Flow:** app boot → persisted user painted immediately → `GET /auth/me`
revalidates in the background → user object refreshed.
**Rules:** offline keeps the cached user (the app stays usable); a `401` clears
the session.
**Edge:** a missing `JWT_SECRET` degrades to "unauthenticated" and logs an
actionable error instead of 500-ing every route.

### S5 — Forgot / reset password
*Visitor*
**Flow:** `/forgot-password` → `POST /auth/forgot` → reset token stored
(`password_resets`, 30 min TTL) → queue `password_reset` → email with code +
deep link → inline "new password" form → `POST /auth/reset` → signed in.
**Rules:** the endpoint always answers `200` (no account enumeration); tokens are
single-use and expire; a used/expired token returns `400 invalid_token`.
**Edge:** non-production responses include the token so the flow is testable
without a mail provider — the outbox at `GET /api/dev/outbox` records the email
that was sent.

### S6 — Edit profile
*Member*
**Flow:** `/profile/edit` → `PUT /auth/profile` (name, bio, avatar, affiliation)
→ D1 updated → context refreshed → toast.
**Edge:** offline shows "saved locally, will sync".

---

## 2. Content discovery

### S7 — Browse the library
*Any*
**Flow:** `/library` → `GET /content?limit&sort&category&q` → grid with tabs
(All / Conferences / Podcasts / Originals / Favorites).
**Rules:** premium items carry a badge; the page paints bundled data instantly and
swaps in live rows; search filters title/speaker/tags client-side on top.
**Edge:** empty result set shows a next step, never a blank screen.

### S8 — Home rails
*Any*
**Flow:** `/` → `GET /content/featured` (trending, latest, premium, continue
watching, rails) + `GET /tools/bundle` in parallel.
**Rules:** continue-watching comes from `content_progress` for the signed-in user;
streak is shown from `users.streak`.

### S9 — Open a teaching
*Any*
**Flow:** `/library/:id` → `GET /content/:id` (increments views) → hero, meta,
speaker, related, comments → Play / Download / Share / Favorite.
**Edge:** unknown id falls back to a real item (no 404 dead end); `404` from the
API is handled by the service fallback.

### S10 — Search
*Any*
**Flow:** `/search?q=` → `GET /search?q=` (title, description, tags, speaker) →
results + category chips; the query lives in the URL so results are shareable.
**Edge:** empty query shows trending suggestions.

### S11 — Publications
*Any*
**Flow:** `/publications` → `GET /tools/publications` → newsletter/magazine cards.
**Edge:** no papers published → friendly empty state.

---

## 3. Playback and offline

### S12 — Play a teaching
*Any*
**Flow:** `/player/:id` → `GET /content/:id` → media from `video_url`/`audio_url`
(served from R2 through `GET /uploads/file/:key`) → controls + keyboard shortcuts
→ progress reported to `POST /content/:id/progress` every 15 s and on exit.
**Rules:** R2 media supports HTTP Range (`206` + `Content-Range`) so seeking works;
progress is a percentage (`0–100`) and drives continue-watching.

### S13 — Download for offline
*Member (Premium for premium items)*
**Flow:** Download → `POST /content/:id/download` → row in `downloads` →
`/offline` lists them → `DELETE /content/:id/download` removes.
**Rules:** downloads are per user; storage stats come from `GET /uploads/stats` +
`GET /content/downloads`.

### S14 — Favorites
*Member*
**Flow:** heart anywhere → optimistic UI → `POST /favorites` (or `/:id/toggle`) →
`/favorites` reads `GET /favorites` → remove / clear.
**Rules:** one row per (user, content) — the toggle is idempotent; the local mirror
(`som_favorites`) keeps the page correct offline; `favoritesService.sync()` makes
D1 the source of truth on load.

### S15 — Playlists
*Member*
**Flow:** `/playlists` → `GET /playlists` (with items) → create (`POST /playlists`)
→ add/remove items (`POST|DELETE /playlists/:id/items`) → delete playlist.
**Rules:** a playlist belongs to its owner; `is_public` toggles discoverability;
`sync()` keeps the local mirror honest.

---

## 4. Daily spiritual rhythm

### S16 — Daily tools
*Member*
**Flow:** `/tools` → `GET /tools/bundle` (today's confession + ROR + streak +
what is completed today) → "Mark complete" → `POST /tools/complete`.
**Rules:** a completion is unique per (user, type, date) — marking twice keeps the
streak; the streak counts distinct consecutive days across both types; a
completion writes a notification.

### S17 — ROR reading plan
*Member*
**Flow:** `/tools/ror-plan` → `GET /tools/plan?days=30` → 30 days with real
completion state → "Mark as read" (today) or "Catch up" (a missed past day) →
`POST /tools/complete {type:'ror', date}` → progress bar updates.
**Rules:** future days are visibly "Upcoming" and not actionable; a back-filled day
still counts toward the streak; today's reading is highlighted.

---

## 5. Community and live

### S18 — Community feed
*Any (posting: Member)*
**Flow:** `/community` → `GET /community/posts?limit&offset` (30 s poll) → create
post (`POST /community/posts`, optimistic) → like (`POST /community/posts/:id/like`)
→ comment (`POST /community/posts/:id/comments`) → delete own post.
**Rules:** likes are idempotent per user; `isLiked` reflects the caller; a new post
enqueues the `new_post` job.

### S19 — Groups
*Member*
**Flow:** join/leave → `POST /community/groups/:id/join` → membership reflected in
`GET /community/groups` (`isJoined`).
**Edge:** join is idempotent — double taps do not create duplicates.

### S20 — Q&A sessions
*Any (asking: Member)*
**Flow:** `/qa` → `GET /qa?status=` → `/qa/:id` → `GET /qa/:id` detail + questions →
ask (`POST /qa/:id/questions`) → upvote (`POST /qa/:id/questions/:qid/upvote`) →
join live (`POST /qa/:id/join`, Durable Object tracks participants) → live counts
from `GET /qa/:id/live`.
**Rules:** the DO caps a room at 50 questions and keeps participant counts;
leave is called on unmount; votes are unique per (question, user).

### S21 — Notifications
*Member*
**Flow:** bell/badge ← `GET /notifications/unread-count` (+ poll); `/notifications`
lists; mark read (`PUT /notifications/:id/read`), mark all (`PUT /notifications/read-all`),
delete, clear all.
**Rules:** notifications are per user and typed (`content`, `community`, `system`);
unread count is derived, never stored twice.

---

## 6. Money

Premium unlocks: HD streaming, offline downloads for premium items, originals.

### S22 — Choose a plan
*Member*
**Flow:** `/subscription` → `GET /subscriptions/plans` (current + pending flagged) →
select → `/payment` → `POST /payment/intents` → `POST /payment/confirm` (card
validated with Luhn/expiry/CVC) → `POST /subscriptions` → `201` + invoice +
receipt email + notification → `/manage-subscription`.

### S23 — Pay and get a receipt
**Rules:**
- A **successful** charge is recorded once per idempotency key
  (`payment_events`) — a replayed request returns the original result instead of
  charging twice. A **failed** charge does *not* lock the key, so the member can
  retry with the same or another card.
- Every successful charge writes an invoice with a **sequential number**
  (`INV-YYYY-NNNN`), the period it covers and a `paid_at` timestamp.
- The receipt is emailed (`subscription_created`) and readable at
  `GET /subscriptions/invoices/:id`.
- A card is validated (Luhn, expiry, CVC) before it is stored — an invalid one is
  refused with `400 invalid_card` and nothing is saved.
**Edge:** a decline returns `402` with the gateway code
(`card_declined`, `insufficient_funds`, `expired_card`, `processing_error`) and
creates **no** subscription; the UI keeps the form open and shows the reason.

### S24 — Upgrade mid-cycle (prorated)
*Premium member*
**Flow:** `/manage-subscription` → Change plan → `PUT /subscriptions/me`.
**Rules:** unused time on the current plan is credited at its daily rate; the new
plan is charged for the remaining days; the response returns
`{credit, charge, dueNow, daysRemaining}` and an invoice for `dueNow`
(a downgrade yields a credit, so `dueNow` can be `0`). Period boundaries are kept.
**Edge:** a failed prorated charge leaves the old plan active (`402`).

### S25 — Downgrade (scheduled)
**Rules:** downgrades never remove value already paid for — the change is stored in
`pending_plan_id` and applied when the current period ends, with the date shown to
the user.

### S26 — Cancel and resume
*Premium member*
**Flow:** Cancel → `POST /subscriptions/cancel` (default: at period end) → access
continues to `current_period_end`; Resume → `POST /subscriptions/resume`.
**Rules:** `cancel_at_period_end` keeps premium access until the period ends; an
immediate cancel ends access now; resume is only possible while the paid period is
still running, otherwise the user is told to start a new plan.
**Edge:** the nightly run expires anything cancelled at period end.

### S27 — Renewal, dunning and recovery
*Premium member*
**Flow (automated):** cron `5 0 * * *` → `processDueRenewals()` → charge each
subscription whose period ended → success: new period + invoice `INV-…`; failure:
`past_due`, `failed_payment_count += 1`, retry scheduled.
**Rules:** retry schedule is **+3, +5, +7 days**, then the subscription expires;
the nightly job **waits for `next_retry_at`** instead of retrying every night;
premium access is kept during `past_due` (grace period) so a declined card never
locks a member out mid-study; a successful retry resets the counters and issues a
receipt; the member is emailed and notified on each failure.
**Ops:** `POST /subscriptions/process-due` (admin) runs the same job on demand;
`POST /subscriptions/renew` retries the caller's own payment with a chosen method.

### S28 — Manage payment methods and billing profile
*Member*
**Flow:** `POST /payments/methods` (validated, brand + last4 stored — never the PAN)
→ `PUT /payments/methods/:id/default` → `DELETE /payments/methods/:id`; billing
profile via `GET|PUT /payments/billing`; history via `GET /payments/history`.
**Rules:** exactly one default method, and **the default is the card that gets
charged** — pointing the default at a method also moves the live subscription
onto it (that is what makes "use another card → retry" work). Deleting the
default promotes another; the raw card number never touches the database, only
`brand`, `last4` and the gateway token. A test card (e.g. `4000 0000 0000 9995`)
keeps its decline behaviour after it is stored, and is flagged `isTest` so the UI
can warn.

### S29 — Webhooks
*PSP → Worker*
**Flow:** `POST /payments/webhook` → signature verified (`t=…,v1=…` HMAC-SHA256,
300 s tolerance) → event recorded in `payment_events` (idempotent) → applied:
`payment_intent.succeeded` / `invoice.paid` → invoice; `payment_intent.payment_failed`
→ `past_due`; `customer.subscription.deleted` → cancelled.
**Rules:** a duplicate event id is acknowledged without side effects; a bad
signature is `401`; unknown types are recorded and acknowledged.

---

## 7. Creator and admin

### S30 — Pastor uploads
*Pastor*
**Flow:** `/upload` → pick file → `POST /uploads` (multipart: `type`, `title`,
`description`, `category`) → validated (mime + 100 MB cap) → stored in R2 under a
generated key → row in `pastor_uploads` (`pending`) → `/submissions` lists status
with feedback.
**Rules:** **only pastors and admins may submit teachings** — a member gets
`403 forbidden` (members keep their avatar upload at `POST /uploads/avatar`);
mime allowlist per type (video `mp4/webm/quicktime/x-matroska`, audio
`mpeg/mp3/wav/mp4/aac/ogg`, publication `pdf`) and a 100 MB cap; the uploader sees
only their own.

### S31 — Admin moderation
*Admin*
**Flow:** `/admin/moderation` → `GET /admin/uploads?status=pending` → approve
(`POST /admin/uploads/:id/approve`) or reject with feedback
(`POST /admin/uploads/:id/reject`).
**Rules:** approving a video/audio creates a published `content_items` row linked
to the upload; the submitter gets a notification **and** an email
(`upload_approved` / `upload_rejected`); the review is audit-logged.

### S32 — Admin dashboard and users
*Admin*
**Flow:** `/admin` (stats via `GET /admin/stats`, `/admin/analytics`), `/admin/users`
(list, search, role change, suspend/restore, delete), `/admin/moderation/posts`,
`POST /admin/broadcast`, `GET /admin/audit-logs`.
**Rules:** every mutating admin action is written to `audit_logs`; a non-admin gets
`403`; an admin cannot lock themselves out — neither by demoting themselves nor by
suspending their own account (both `400`).

---

## 8. Platform behaviour (cross-cutting)

- **Degrade, never dead-end.** Every service goes through `tryApi(...)`: on
  network errors, timeouts, `5xx`, `401/404/408/429` it falls back to bundled or
  cached data and surfaces "showing saved content" rather than an error screen.
- **Ordering on boot.** `ensureDatabase()` runs before routes: create schema (if
  `users` is missing) → seed (if no speakers) → cache the schema version in KV.
  A wiped database rebuilds itself, verified from an empty D1.
- **Errors.** `ApiError.friendly` maps status codes to human copy; toasts never
  show raw exceptions.
- **Security.** Security headers on every response; CORS restricted in production;
  passwords PBKDF2; tokens HS256 with a secret that must be set in production;
  webhook signatures verified; uploads validated by mime *and* size.
- **Accessibility & SEO.** Semantic landmarks, labelled controls, alt text, focus
  visible, `prefers-reduced-motion` respected, per-route document titles.

---

## Coverage map

Last full run: **61/61 story assertions · 118/118 worker paths · 96/96 API paths
· 43/43 frontend journeys · 32/32 pages**.

| Story | Automated flow |
| --- | --- |
| S1–S6 | `stories-smoke.mjs` §accounts · `page-smoke` `/splash /onboarding /login /register /forgot-password` |
| S7–S11 | `stories-smoke` §discovery · `page-smoke` `/ /library /library/:id /search /publications` |
| S12–S15 | `stories-smoke` §playback · `page-smoke` `/player/1 /offline /favorites /playlists` |
| S16–S17 | `stories-smoke` §daily · `page-smoke` `/tools /tools/ror-plan` |
| S18–S21 | `stories-smoke` §community · `page-smoke` `/community /qa /qa/:id /notifications` |
| S22–S29 | `stories-smoke` §billing · `worker/test/smoke.test.mjs` billing block |
| S30–S32 | `stories-smoke` §creator+admin · `page-smoke` `/upload /submissions /admin*` |
| Cross-cutting | `api-contract.mjs` (96 paths), `frontend-smoke.mjs` (43 journeys), `worker/test/smoke.test.mjs` (118 assertions) |
