# SOM CONNECT — Premium Spiritual Streaming Platform

> **A world-class, cinematic, immersive digital experience for School of Ministry.**

SOM CONNECT is a premium streaming platform for School of Ministry (SOM) — featuring thousands of teachings, daily confessions, Rhapsody of Realities, live Q&A sessions, community groups, offline downloads, and a global believer network. Rebuilt as an award-winning digital product with fluid motion, editorial typography, and meticulous attention to detail.

**Full-stack now:** Vercel frontend + Cloudflare Workers API + D1 + R2 + KV + Queues + Durable Objects.

---

## ✨ Product Vision

**Problem:** Spiritual content platforms are often generic, uninspired, and fragmented — poor UX, weak offline, no community, no daily rhythms.

**Solution:** SOM CONNECT unifies:

- **Cinematic Library** — 12K+ teachings, conferences, podcasts, originals with bento-grid discovery
- **Daily Tools** — Daily confessions + Rhapsody of Realities with streaks, audio, completion
- **Community** — Feed + groups, post creation, likes, join/leave — happy path
- **Q&A Sessions** — Live, upcoming, archived with questions, upvotes, reminders (Durable Objects for live coordination)
- **Premium Experience** — Offline, playlists, favorites, publications, search
- **Creator Tools** — Pastor uploads to R2, moderation queue (role-based)
- **Subscriptions** — Premium monthly/annual with happy-path checkout
- **Notifications** — Real-time via Queue + KV cache

Every flow is a **happy path** — no dead ends, no broken buttons, no mock failures.

---

## 🏗️ Architecture — Full Stack

```
Users
  → Vercel (Vite React frontend, 817kB → 231kB gzipped)
  → Cloudflare Workers (Hono API, ~14kB, edge)
      → D1 (SQLite at edge, 18 tables, FKs, indexes, CHECK)
      → R2 (video, audio, thumbnails, avatars, publications)
      → KV (trending, stats, cache, 5min TTL)
      → Queue (welcome, new_content fan-out, subscription, password_reset)
      → Durable Object (QASessionDurableObject live participant tracking)
      → Cron (daily cleanup, confession generation, stats)
```

### Frontend
- **Stack:** Vite 5 + React 18 + TypeScript 5 + Tailwind CSS 3 + Framer Motion 12
- **UI:** shadcn/ui + Radix + Lucide
- **State:** React Context (Auth, Theme, Notifications, Loading) + TanStack Query
- **Routing:** React Router 6 with protected routes
- **API Client:** `src/lib/api-client.ts` — tries `VITE_API_URL`, falls back to localStorage mock for 100% offline happy path
- **Build:** 2194 modules, 817kB → 231kB gzipped, CSS 110kB → 18kB

### Backend — Cloudflare Workers (`/worker`)
- **Runtime:** Workers + Hono 4.6.0 + `hono/jwt` + Web Crypto
- **Database:** D1 — see `worker/src/db/schema.sql` (18 tables) + `seed.sql`
- **Storage:** R2 with presigned uploads, cache-control 1 year
- **Cache:** KV for content lists, stats
- **Queue:** background jobs
- **Durable Object:** `QA_SESSION` for live Q&A
- **Cron:** `0 0 * * *` daily

**Endpoints:** 40+ — auth, content, favorites, playlists, community, QA, tools, subscriptions, notifications, admin, uploads, speakers, search, health.

See `worker/README.md` for full endpoint list and deployment.

---

## 🔐 Authentication — Happy Path + JWT

**Frontend (`src/services/auth-service.ts`)** is API-first with fallback:
- If `VITE_API_URL` set → calls `POST /auth/login`, `POST /auth/register`, `GET /auth/me`, `PUT /auth/profile`, `POST /auth/forgot`
- If no API or API fails → localStorage mock, **any email + any password (min 3 chars) succeeds**
- Demo roles via email substring:
  - `*pastor*` → pastor (can upload)
  - `*admin*` → admin (dashboard)
  - else → member
- Persistence: `som_auth_v2` + `som_token_v2`

**Backend (`worker/src/routes/auth.ts`):**
- JWT HS256, 7-day expiry, Web Crypto sign/verify
- `hashPassword` SHA-256 + salt (demo; use bcrypt wasm in prod)
- `POST /auth/login` — happy path: auto-creates member if not exists
- `POST /auth/register` — if exists, auto-logins
- Queue: welcome notification on register

**Flows:**
- `/splash` → onboarding check → `/onboarding` or `/login`
- `/onboarding` → 3 cinematic slides → register
- `/login` → happy path, demo buttons
- `/register` → happy path
- `/forgot-password` → always succeeds

**Protected Routes:** `PastorRoute`, `AdminRoute`, authenticated.

---

## 📚 Features — End-to-End Happy Paths

### Home `/`
- Cinematic hero with parallax, gold glow, live indicator, streak, stats, search
- Continue watching (from `GET /content/user/continue` or localStorage)
- Daily tools split, trending bento, recommended, quick access

### Library `/library`
- Tabs: All, Conferences, Podcasts, Originals, Favorites
- Search with live filter → `GET /content?q=` or `GET /search?q=`
- Favorite toggle → `POST /favorites` + localStorage fallback
- Premium badges, category pills, empty state

### Content Detail `/library/:id`
- Hero with play, meta, speaker → `GET /content/:id` increments views
- Actions: Play, Download, Share, Favorite, Bookmark
- Speaker card, related, comments

### Player `/player/:id`
- Immersive full-screen, blurred ambient, controls, keyboard shortcuts
- Progress → `POST /content/:id/progress`

### Daily Tools `/tools`
- Streak card 7-day visual → `GET /tools/streak`
- Confession + ROR → `GET /tools/confessions`, `GET /tools/ror`
- Mark completed → `POST /tools/complete` → streak++ + notification

### Community `/community`
- Feed → `GET /community/posts`, create → `POST /community/posts`
- Like → `POST /community/posts/:id/like`
- Groups → `GET /community/groups`, join/leave → `POST /community/groups/:id/join`

### Q&A `/qa` & `/qa/:id`
- List → `GET /qa?status=`, detail → `GET /qa/:id`
- Ask → `POST /qa/:id/questions`, upvote → `POST /qa/:id/questions/:qid/upvote`
- Join live → `POST /qa/:id/join` via Durable Object

### Search `/search?q=`
- Query from URL, live filter, chips, grid

### Favorites `/favorites`
- `favoritesService` API-aware + localStorage, search, remove, clear

### Playlists `/playlists`
- `playlistService` API-aware, create, search, hover play
- `POST /playlists`, `POST /playlists/:id/items`

### Profile `/profile` & Edit `/profile/edit`
- Header with streak, role, links: upload (pastor), subscription, settings, notifications, help, admin
- Edit → `PUT /auth/profile`

### Subscription `/subscription` & Payment `/payment`
- Plans → `GET /subscriptions/plans`, current → `GET /subscriptions/me`
- Select → payment → `POST /subscriptions` always succeeds → toast → home
- Manage `/manage-subscription`: active plan, billing history, cancel → `POST /subscriptions/cancel`

### Offline `/offline`
- Storage stats, auto-download toggle, items, clear

### Notifications `/notifications`
- `GET /notifications`, mark read, clear, real-time via Queue + polling
- `notificationService` API-aware

### Settings `/settings`
- Theme, notifications toggles, save toast, sign out

### Help `/help`
- Search FAQs, category pills, chat + email cards

### Admin `/admin`
- Stats → `GET /admin/stats`, moderation → `GET /admin/uploads`, users → `GET /admin/users`
- Approve/reject → `POST /admin/uploads/:id/approve`

### Upload `/upload` & Submissions `/submissions`
- Upload → `POST /uploads` multipart to R2, pending review
- Submission status → `GET /uploads`

---

## 🛠️ Local Development

### Frontend
```bash
npm i
npm run dev # http://localhost:8080
npm run build
npm run preview
```

**Env (.env.local):**
```
VITE_API_URL=http://localhost:8787
VITE_ENV=development
VITE_ENABLE_OFFLINE=true
VITE_ENABLE_NOTIFICATIONS=true
VITE_HAPPY_PATH=true
```

### Backend
```bash
cd worker
npm install

# Create D1 locally
npx wrangler d1 create som-connect-db
# Update wrangler.toml database_id

# Migrations (local)
npx wrangler d1 execute som-connect-db --file=src/db/schema.sql --local
npx wrangler d1 execute som-connect-db --file=src/db/seed.sql --local

# Dev
npm run dev # http://localhost:8787

# Set .dev.vars from .dev.vars.example
cp .dev.vars.example .dev.vars
```

### Full Stack Local
- Terminal 1: `cd worker && npm run dev` (8787)
- Terminal 2: `VITE_API_URL=http://localhost:8787 npm run dev` (8080)

Without `VITE_API_URL`, frontend works fully offline via mocks.

---

## 🚢 Deployment

### Frontend → Vercel
1. Connect repo to Vercel
2. Framework: Vite, Build: `npm run build`, Output: `dist`
3. Env: `VITE_API_URL=https://som-connect-api.your-subdomain.workers.dev`

### Backend → Cloudflare Workers
```bash
cd worker
# D1 prod
npx wrangler d1 create som-connect-db-prod
npx wrangler d1 execute som-connect-db-prod --file=src/db/schema.sql
npx wrangler d1 execute som-connect-db-prod --file=src/db/seed.sql

# R2
npx wrangler r2 bucket create som-connect-storage

# KV
npx wrangler kv:namespace create CACHE
npx wrangler kv:namespace create CACHE --preview

# Queue
npx wrangler queues create som-connect-queue

# Secrets
npx wrangler secret put JWT_SECRET
npx wrangler secret put FRONTEND_URL # https://your-vercel.app

# Deploy
npm run deploy
```

See `worker/README.md` for full details.

---

## ♿ Accessibility & SEO

- Semantic HTML, aria-label, focus-visible, skip link, prefers-reduced-motion
- WCAG AA contrast, 44px touch targets
- Title, meta, OG, Twitter, structured data, sitemap ready, semantic headings

---

## ⚡ Performance

- GPU transforms only, clamp fluid type, lazy images
- Frontend: 2194 modules, 817kB → 231kB gzipped
- Backend: Hono 14kB, KV 5min cache, R2 1yr cache, D1 indexes, Queue non-blocking

---

## 🧪 Testing — Happy Paths Verified

- [x] Splash → Onboarding → Register → Home (API + mock)
- [x] Login any email → Home (auto-creates member)
- [x] Pastor upload → R2 → pending → admin approve
- [x] Admin dashboard → stats from D1
- [x] Library search → filter → detail → player → progress saved
- [x] Favorite toggle → API + localStorage → Favorites page
- [x] Playlists create → API
- [x] Tools mark completed → streak++ → D1 + notification
- [x] Community create post → like → groups join
- [x] Q&A ask question → upvote → join live via Durable Object
- [x] Subscription select → payment always succeeds → active in D1
- [x] Profile edit → API
- [x] Notifications real-time + poll
- [x] Settings theme toggle persists
- [x] 404 → home

**Builds:** `npm run build` (frontend) and `npx tsc --noEmit` (worker) pass.

---

## 📁 Project Structure

```
src/
├── components/layout/ AppLayout, TopBar, DesktopSidebar, BottomNav
├── components/auth/ ProtectedRoute
├── components/community/ CreatePostDialog
├── components/ui/ shadcn + custom
├── contexts/ Auth, Theme, Notification, Loading
├── hooks/ use-mobile, use-permissions, use-favorites, etc.
├── lib/
│   ├── mock-data.ts (fallback)
│   ├── api-client.ts (API-first with fallback)
│   └── permissions, utils
├── services/
│   ├── auth-service.ts (API-aware)
│   ├── content-service.ts (API-first)
│   ├── favorites-service.ts (API + localStorage)
│   ├── playlist-service.ts (API + localStorage)
│   ├── community-service.ts, qa-service.ts, tools-service.ts
│   ├── notification-service.ts, payment-service.ts, offline-service.ts
└── pages/ Index, Library, ContentDetail, Player, Tools, Community, Q&A, etc.

worker/
├── src/
│   ├── index.ts (Hono app, CORS, queue, scheduled, DO export)
│   ├── lib/auth.ts, db.ts, r2.ts
│   ├── routes/ auth, content, favorites, playlists, community, qa, tools, subscriptions, notifications, admin, uploads
│   ├── durable/qa.ts (QASessionDurableObject)
│   └── db/schema.sql (18 tables), seed.sql
├── wrangler.toml (D1, R2, KV, Queue, DO, cron)
├── package.json (hono 4.6.0, wrangler 3.78.0)
└── README.md
```

---

## 🔒 Security

- JWT HS256, 7-day expiry, Web Crypto
- CORS allowlist + Arena preview
- Role middleware, prepared statements, R2 mime validation, audit_logs
- No secrets in client, tokens in localStorage (demo, use httpOnly cookies in prod)

---

## 📄 License

Private — SOM CONNECT © 2025

---

## 🙏 Credits

Crafted as a premium, award-winning, immersive digital experience — editorial typography, cinematic motion, tactile interactions, and spiritual depth. Now full-stack with Cloudflare edge.

> **“Grow in the Word. Live the Word.”**
