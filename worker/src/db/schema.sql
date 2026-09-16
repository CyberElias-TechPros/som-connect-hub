-- SOM CONNECT — Cloudflare D1 schema
-- Single source of truth: scripts/build-sql.mjs generates
--   src/db/sql.generated.ts   (runtime bootstrap)
--   migrations/0001_init.sql  (wrangler d1 migrations apply)
-- Every statement is idempotent (IF NOT EXISTS) so it can be re-run safely.

-- Users
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  avatar TEXT,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('guest','member','pastor','admin')),
  bio TEXT,
  affiliation TEXT,
  streak INTEGER NOT NULL DEFAULT 0,
  last_streak_date TEXT,
  preferences TEXT, -- JSON: theme, language, autoDownload, notificationSettings
  is_active INTEGER NOT NULL DEFAULT 1,
  joined_date TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d', 'now')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_created ON users(created_at DESC);

-- Speakers
CREATE TABLE IF NOT EXISTS speakers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  title TEXT NOT NULL,
  avatar TEXT NOT NULL,
  bio TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_speakers_name ON speakers(name);

-- Content library
CREATE TABLE IF NOT EXISTS content_items (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  thumbnail TEXT NOT NULL,
  duration TEXT NOT NULL,
  speaker_id TEXT NOT NULL REFERENCES speakers(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('conference','workshop','podcast','media-series','original')),
  tags TEXT NOT NULL DEFAULT '[]', -- JSON array
  views INTEGER NOT NULL DEFAULT 0,
  is_premium INTEGER NOT NULL DEFAULT 0,
  video_url TEXT, -- /uploads/file/<r2-key>
  audio_url TEXT,
  published INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_content_category ON content_items(category);
CREATE INDEX IF NOT EXISTS idx_content_speaker ON content_items(speaker_id);
CREATE INDEX IF NOT EXISTS idx_content_date ON content_items(date DESC);
CREATE INDEX IF NOT EXISTS idx_content_views ON content_items(views DESC);
CREATE INDEX IF NOT EXISTS idx_content_premium ON content_items(is_premium);
CREATE INDEX IF NOT EXISTS idx_content_published ON content_items(published);

-- Per-user playback progress
CREATE TABLE IF NOT EXISTS content_progress (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content_id TEXT NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  position_seconds INTEGER NOT NULL DEFAULT 0,
  completed INTEGER NOT NULL DEFAULT 0,
  last_watched_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  UNIQUE(user_id, content_id)
);
CREATE INDEX IF NOT EXISTS idx_progress_user ON content_progress(user_id, last_watched_at DESC);

-- Downloads (offline library registry)
CREATE TABLE IF NOT EXISTS downloads (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content_id TEXT NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
  size_mb REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'ready' CHECK (status IN ('queued','downloading','ready','failed')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  UNIQUE(user_id, content_id)
);
CREATE INDEX IF NOT EXISTS idx_downloads_user ON downloads(user_id);

-- Favorites
CREATE TABLE IF NOT EXISTS favorites (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content_id TEXT NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
  notes TEXT,
  added_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  UNIQUE(user_id, content_id)
);
CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id, added_at DESC);
CREATE INDEX IF NOT EXISTS idx_favorites_content ON favorites(content_id);

-- Playlists
CREATE TABLE IF NOT EXISTS playlists (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  thumbnail TEXT,
  is_public INTEGER NOT NULL DEFAULT 0,
  created_date TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d', 'now')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_playlists_user ON playlists(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_playlists_public ON playlists(is_public);

-- Playlist items
CREATE TABLE IF NOT EXISTS playlist_items (
  id TEXT PRIMARY KEY,
  playlist_id TEXT NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  content_id TEXT NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  added_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  UNIQUE(playlist_id, content_id)
);
CREATE INDEX IF NOT EXISTS idx_playlist_items_playlist ON playlist_items(playlist_id, position);
CREATE INDEX IF NOT EXISTS idx_playlist_items_content ON playlist_items(content_id);

-- Daily confessions
CREATE TABLE IF NOT EXISTS daily_confessions (
  id TEXT PRIMARY KEY,
  date TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  scripture TEXT NOT NULL,
  scripture_ref TEXT NOT NULL,
  audio_url TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_confessions_date ON daily_confessions(date DESC);

-- Rhapsody of Realities readings
CREATE TABLE IF NOT EXISTS ror_readings (
  id TEXT PRIMARY KEY,
  date TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  theme TEXT NOT NULL,
  scripture TEXT NOT NULL,
  scripture_ref TEXT NOT NULL,
  content TEXT NOT NULL,
  prayer TEXT NOT NULL,
  further_study TEXT NOT NULL DEFAULT '[]',
  daily_scripture_reading TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_ror_date ON ror_readings(date DESC);

-- Publications
CREATE TABLE IF NOT EXISTS publications (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('magazine','newsletter')),
  cover TEXT NOT NULL,
  issue_date TEXT NOT NULL,
  pages INTEGER NOT NULL DEFAULT 0,
  description TEXT NOT NULL,
  file_url TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_publications_date ON publications(issue_date DESC);

-- Q&A sessions
CREATE TABLE IF NOT EXISTS qa_sessions (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  speaker_id TEXT NOT NULL REFERENCES speakers(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('upcoming','live','archived')),
  thumbnail TEXT NOT NULL,
  duration TEXT,
  stream_url TEXT,
  questions_count INTEGER NOT NULL DEFAULT 0,
  participants INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_qa_status ON qa_sessions(status);
CREATE INDEX IF NOT EXISTS idx_qa_date ON qa_sessions(date DESC);

-- Q&A questions
CREATE TABLE IF NOT EXISTS qa_questions (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES qa_sessions(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  text TEXT NOT NULL,
  asked_by TEXT NOT NULL,
  upvotes INTEGER NOT NULL DEFAULT 0,
  is_answered INTEGER NOT NULL DEFAULT 0,
  answer TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_qa_questions_session ON qa_questions(session_id, upvotes DESC);
CREATE INDEX IF NOT EXISTS idx_qa_questions_user ON qa_questions(user_id);

-- Q&A question upvotes (one per user per question)
CREATE TABLE IF NOT EXISTS qa_question_votes (
  id TEXT PRIMARY KEY,
  question_id TEXT NOT NULL REFERENCES qa_questions(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  UNIQUE(question_id, user_id)
);

-- Community posts
CREATE TABLE IF NOT EXISTS community_posts (
  id TEXT PRIMARY KEY,
  author_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  image_url TEXT,
  group_id TEXT REFERENCES groups(id) ON DELETE SET NULL,
  likes INTEGER NOT NULL DEFAULT 0,
  comments_count INTEGER NOT NULL DEFAULT 0,
  is_flagged INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_posts_author ON community_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_date ON community_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_group ON community_posts(group_id);

-- Post likes
CREATE TABLE IF NOT EXISTS post_likes (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  UNIQUE(post_id, user_id)
);

-- Post comments
CREATE TABLE IF NOT EXISTS post_comments (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  author_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_comments_post ON post_comments(post_id, created_at);

-- Groups
CREATE TABLE IF NOT EXISTS groups (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  cover TEXT NOT NULL,
  category TEXT,
  member_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- Group members
CREATE TABLE IF NOT EXISTS group_members (
  id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  UNIQUE(group_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_group_members_group ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user ON group_members(user_id);

-- Subscription plans
CREATE TABLE IF NOT EXISTS subscription_plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  interval TEXT NOT NULL CHECK (interval IN ('monthly','annually')),
  features TEXT NOT NULL DEFAULT '[]',
  trial_days INTEGER NOT NULL DEFAULT 0,
  is_popular INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- User subscriptions
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL REFERENCES subscription_plans(id),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','trialing','cancelled','expired','past_due')),
  payment_method_id TEXT,
  current_period_start TEXT NOT NULL,
  current_period_end TEXT NOT NULL,
  cancel_at_period_end INTEGER NOT NULL DEFAULT 0,
  cancelled_at TEXT,
  -- Bill at this amount (kept when a plan's price changes later).
  amount REAL,
  currency TEXT NOT NULL DEFAULT 'USD',
  -- Downgrades apply when the paid period ends.
  pending_plan_id TEXT REFERENCES subscription_plans(id) ON DELETE SET NULL,
  -- Dunning: failed renewal bookkeeping.
  failed_payment_count INTEGER NOT NULL DEFAULT 0,
  last_payment_error TEXT,
  next_retry_at TEXT,
  last_charge_reference TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON user_subscriptions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_period_end ON user_subscriptions(current_period_end);

-- Payment methods (tokenised references only — never raw PANs)
CREATE TABLE IF NOT EXISTS payment_methods (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'card' CHECK (type IN ('card','paypal','bank')),
  brand TEXT NOT NULL,
  last4 TEXT NOT NULL,
  expiry TEXT,
  holder TEXT,
  is_default INTEGER NOT NULL DEFAULT 0,
  token TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_payment_methods_user ON payment_methods(user_id);

-- Billing profiles
CREATE TABLE IF NOT EXISTS billing_profiles (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  country TEXT,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- Payment intents (happy-path charges always settle)
CREATE TABLE IF NOT EXISTS payment_intents (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'requires_payment_method'
    CHECK (status IN ('requires_payment_method','requires_confirmation','processing','succeeded','failed')),
  plan_id TEXT,
  client_secret TEXT NOT NULL,
  description TEXT,
  payment_method_id TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_payment_intents_user ON payment_intents(user_id, created_at DESC);

-- Subscription/invoice ledger
CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  number TEXT, -- sequential per year: INV-2026-0007
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subscription_id TEXT REFERENCES user_subscriptions(id) ON DELETE SET NULL,
  amount REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'paid' CHECK (status IN ('paid','open','void')),
  description TEXT,
  period_start TEXT,
  period_end TEXT,
  paid_at TEXT,
  issued_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_invoices_user ON invoices(user_id, issued_at DESC);

-- Pastor uploads / moderation queue
CREATE TABLE IF NOT EXISTS pastor_uploads (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('video','audio','publication','thumbnail')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  thumbnail TEXT,
  file_url TEXT,
  file_size INTEGER NOT NULL DEFAULT 0,
  mime_type TEXT,
  category TEXT CHECK (category IS NULL OR category IN ('conference','workshop','podcast','media-series','original')),
  feedback TEXT,
  content_id TEXT,
  submitted_date TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d', 'now')),
  reviewed_date TEXT,
  reviewed_by TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_uploads_user ON pastor_uploads(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_uploads_status ON pastor_uploads(status, created_at DESC);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('content','qa','community','system')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read INTEGER NOT NULL DEFAULT 0,
  action_url TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_date ON notifications(created_at DESC);

-- Daily tool completions (streak source of truth)
CREATE TABLE IF NOT EXISTS daily_completions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('confession','ror')),
  date TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  UNIQUE(user_id, type, date)
);
CREATE INDEX IF NOT EXISTS idx_completions_user_date ON daily_completions(user_id, date DESC);

-- Password reset tokens
CREATE TABLE IF NOT EXISTS password_resets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token);

-- Audit log
-- Webhook (and charge) idempotency: one row per gateway event, so a retried
-- delivery can never double-apply a payment or duplicate an invoice.
CREATE TABLE IF NOT EXISTS payment_events (
  id TEXT PRIMARY KEY, -- gateway event id, or our own key for internal retries
  type TEXT NOT NULL,
  user_id TEXT,
  subscription_id TEXT,
  amount REAL,
  payload TEXT,
  processed_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_payment_events_type ON payment_events(type);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  details TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_date ON audit_logs(created_at DESC);
