-- SOM CONNECT — D1 Schema v2 — Full Production Model
-- 22 tables, FKs, indexes, CHECKs, UNIQUEs, FTS-ready

PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

-- ==================== CORE ====================

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL COLLATE NOCASE,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  avatar TEXT,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('guest','member','pastor','admin')),
  bio TEXT,
  affiliation TEXT,
  streak INTEGER DEFAULT 0 CHECK (streak >=0),
  longest_streak INTEGER DEFAULT 0,
  preferences TEXT DEFAULT '{}', -- JSON: theme, language, autoDownload, notificationSettings
  email_verified INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  last_login_at TEXT,
  joined_date TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d', 'now')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_joined ON users(joined_date DESC);

CREATE TABLE IF NOT EXISTS speakers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  title TEXT NOT NULL,
  avatar TEXT NOT NULL,
  bio TEXT,
  verified INTEGER DEFAULT 1,
  content_count INTEGER DEFAULT 0,
  followers INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_speakers_name ON speakers(name);

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
  views INTEGER DEFAULT 0 CHECK (views >=0),
  likes INTEGER DEFAULT 0,
  is_premium INTEGER DEFAULT 0,
  is_published INTEGER DEFAULT 1,
  video_url TEXT, -- R2 key or URL
  audio_url TEXT,
  file_size INTEGER, -- bytes
  language TEXT DEFAULT 'en',
  transcript TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_content_category ON content_items(category);
CREATE INDEX IF NOT EXISTS idx_content_speaker ON content_items(speaker_id);
CREATE INDEX IF NOT EXISTS idx_content_date ON content_items(date DESC);
CREATE INDEX IF NOT EXISTS idx_content_views ON content_items(views DESC);
CREATE INDEX IF NOT EXISTS idx_content_premium ON content_items(is_premium);
CREATE INDEX IF NOT EXISTS idx_content_published ON content_items(is_published);
CREATE INDEX IF NOT EXISTS idx_content_title ON content_items(title);
-- FTS virtual table for search (optional, populated via trigger in app layer)
-- CREATE VIRTUAL TABLE IF NOT EXISTS content_fts USING fts5(title, description, tags, content='content_items', content_rowid='rowid');

-- Content progress per user
CREATE TABLE IF NOT EXISTS content_progress (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content_id TEXT NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
  progress INTEGER DEFAULT 0 CHECK (progress >=0 AND progress <=100),
  watched_seconds INTEGER DEFAULT 0,
  last_watched_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  completed_at TEXT,
  UNIQUE(user_id, content_id)
);
CREATE INDEX IF NOT EXISTS idx_progress_user ON content_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_progress_content ON content_progress(content_id);
CREATE INDEX IF NOT EXISTS idx_progress_last ON content_progress(last_watched_at DESC);

-- Content likes (separate from favorites)
CREATE TABLE IF NOT EXISTS content_likes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content_id TEXT NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  UNIQUE(user_id, content_id)
);
CREATE INDEX IF NOT EXISTS idx_clikes_user ON content_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_clikes_content ON content_likes(content_id);

-- Content comments
CREATE TABLE IF NOT EXISTS content_comments (
  id TEXT PRIMARY KEY,
  content_id TEXT NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_id TEXT REFERENCES content_comments(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  likes INTEGER DEFAULT 0,
  is_edited INTEGER DEFAULT 0,
  is_deleted INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_ccomments_content ON content_comments(content_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ccomments_user ON content_comments(user_id);

-- Favorites
CREATE TABLE IF NOT EXISTS favorites (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content_id TEXT NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
  notes TEXT,
  added_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  UNIQUE(user_id, content_id)
);
CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_content ON favorites(content_id);

-- Playlists
CREATE TABLE IF NOT EXISTS playlists (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  thumbnail TEXT,
  is_public INTEGER DEFAULT 0,
  is_collaborative INTEGER DEFAULT 0,
  content_count INTEGER DEFAULT 0,
  created_date TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d', 'now')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_playlists_user ON playlists(user_id);
CREATE INDEX IF NOT EXISTS idx_playlists_public ON playlists(is_public);

CREATE TABLE IF NOT EXISTS playlist_items (
  id TEXT PRIMARY KEY,
  playlist_id TEXT NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  content_id TEXT NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
  position INTEGER DEFAULT 0,
  added_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  added_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  UNIQUE(playlist_id, content_id)
);
CREATE INDEX IF NOT EXISTS idx_playlist_items_playlist ON playlist_items(playlist_id, position);
CREATE INDEX IF NOT EXISTS idx_playlist_items_content ON playlist_items(content_id);

-- ==================== DAILY TOOLS ====================

CREATE TABLE IF NOT EXISTS daily_confessions (
  id TEXT PRIMARY KEY,
  date TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  scripture TEXT NOT NULL,
  scripture_ref TEXT NOT NULL,
  audio_url TEXT,
  video_url TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_confessions_date ON daily_confessions(date DESC);

CREATE TABLE IF NOT EXISTS ror_readings (
  id TEXT PRIMARY KEY,
  date TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  theme TEXT NOT NULL,
  scripture TEXT NOT NULL,
  scripture_ref TEXT NOT NULL,
  content TEXT NOT NULL,
  prayer TEXT NOT NULL,
  further_study TEXT DEFAULT '[]', -- JSON
  daily_scripture_reading TEXT DEFAULT '[]', -- JSON
  audio_url TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_ror_date ON ror_readings(date DESC);

CREATE TABLE IF NOT EXISTS publications (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('magazine','newsletter','book','devotional')),
  cover TEXT NOT NULL,
  issue_date TEXT NOT NULL,
  pages INTEGER NOT NULL CHECK (pages >0),
  description TEXT NOT NULL,
  file_url TEXT, -- R2 key
  file_size INTEGER,
  download_count INTEGER DEFAULT 0,
  is_premium INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_publications_date ON publications(issue_date DESC);
CREATE INDEX IF NOT EXISTS idx_publications_type ON publications(type);

-- Daily completions for streak
CREATE TABLE IF NOT EXISTS daily_completions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('confession','ror','bible','prayer')),
  date TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  UNIQUE(user_id, type, date)
);
CREATE INDEX IF NOT EXISTS idx_completions_user_date ON daily_completions(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_completions_date ON daily_completions(date DESC);

-- ==================== Q&A ====================

CREATE TABLE IF NOT EXISTS qa_sessions (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  speaker_id TEXT NOT NULL REFERENCES speakers(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('upcoming','live','archived','cancelled')),
  thumbnail TEXT NOT NULL,
  duration TEXT,
  max_participants INTEGER DEFAULT 1000,
  questions_count INTEGER DEFAULT 0,
  participants_count INTEGER DEFAULT 0,
  recording_url TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_qa_status ON qa_sessions(status);
CREATE INDEX IF NOT EXISTS idx_qa_date ON qa_sessions(date DESC);
CREATE INDEX IF NOT EXISTS idx_qa_speaker ON qa_sessions(speaker_id);

CREATE TABLE IF NOT EXISTS qa_questions (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES qa_sessions(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  text TEXT NOT NULL,
  asked_by TEXT NOT NULL,
  upvotes INTEGER DEFAULT 0 CHECK (upvotes >=0),
  is_answered INTEGER DEFAULT 0,
  is_pinned INTEGER DEFAULT 0,
  answer TEXT,
  answered_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  answered_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_qa_questions_session ON qa_questions(session_id, upvotes DESC);
CREATE INDEX IF NOT EXISTS idx_qa_questions_user ON qa_questions(user_id);

CREATE TABLE IF NOT EXISTS qa_question_upvotes (
  id TEXT PRIMARY KEY,
  question_id TEXT NOT NULL REFERENCES qa_questions(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  UNIQUE(question_id, user_id)
);

CREATE TABLE IF NOT EXISTS qa_participants (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES qa_sessions(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  left_at TEXT,
  UNIQUE(session_id, user_id)
);

-- ==================== COMMUNITY ====================

CREATE TABLE IF NOT EXISTS community_posts (
  id TEXT PRIMARY KEY,
  author_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  image_url TEXT,
  video_url TEXT,
  likes INTEGER DEFAULT 0 CHECK (likes >=0),
  comments_count INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  is_pinned INTEGER DEFAULT 0,
  is_edited INTEGER DEFAULT 0,
  visibility TEXT DEFAULT 'public' CHECK (visibility IN ('public','group','private')),
  group_id TEXT REFERENCES groups(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_posts_author ON community_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_date ON community_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_group ON community_posts(group_id);
CREATE INDEX IF NOT EXISTS idx_posts_visibility ON community_posts(visibility);

CREATE TABLE IF NOT EXISTS post_likes (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  UNIQUE(post_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_post_likes_post ON post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_user ON post_likes(user_id);

CREATE TABLE IF NOT EXISTS post_comments (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_id TEXT REFERENCES post_comments(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  likes INTEGER DEFAULT 0,
  is_edited INTEGER DEFAULT 0,
  is_deleted INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_post_comments_post ON post_comments(post_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_post_comments_user ON post_comments(user_id);

CREATE TABLE IF NOT EXISTS groups (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  cover TEXT NOT NULL,
  avatar TEXT,
  member_count INTEGER DEFAULT 0 CHECK (member_count >=0),
  post_count INTEGER DEFAULT 0,
  is_private INTEGER DEFAULT 0,
  is_verified INTEGER DEFAULT 0,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_groups_private ON groups(is_private);
CREATE INDEX IF NOT EXISTS idx_groups_members ON groups(member_count DESC);

CREATE TABLE IF NOT EXISTS group_members (
  id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('member','moderator','admin')),
  joined_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  UNIQUE(group_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_group_members_group ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user ON group_members(user_id);

-- ==================== SUBSCRIPTIONS ====================

CREATE TABLE IF NOT EXISTS subscription_plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price REAL NOT NULL CHECK (price >=0),
  currency TEXT DEFAULT 'USD',
  interval TEXT NOT NULL CHECK (interval IN ('monthly','annually','lifetime')),
  interval_count INTEGER DEFAULT 1,
  features TEXT NOT NULL DEFAULT '[]', -- JSON
  is_popular INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  trial_days INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_plans_active ON subscription_plans(is_active);

CREATE TABLE IF NOT EXISTS user_subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL REFERENCES subscription_plans(id),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','cancelled','expired','past_due','trialing','incomplete')),
  current_period_start TEXT NOT NULL,
  current_period_end TEXT NOT NULL,
  trial_end TEXT,
  cancel_at_period_end INTEGER DEFAULT 0,
  payment_provider TEXT DEFAULT 'manual' CHECK (payment_provider IN ('stripe','paypal','manual')),
  provider_subscription_id TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON user_subscriptions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_period ON user_subscriptions(current_period_end);

CREATE TABLE IF NOT EXISTS payment_methods (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('card','paypal','bank')),
  brand TEXT,
  last4 TEXT,
  expiry_month INTEGER,
  expiry_year INTEGER,
  is_default INTEGER DEFAULT 0,
  provider_pm_id TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_pm_user ON payment_methods(user_id);

CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subscription_id TEXT REFERENCES user_subscriptions(id) ON DELETE SET NULL,
  amount REAL NOT NULL,
  currency TEXT DEFAULT 'USD',
  status TEXT DEFAULT 'paid' CHECK (status IN ('draft','open','paid','void','uncollectible')),
  invoice_url TEXT,
  pdf_url TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_invoices_user ON invoices(user_id, created_at DESC);

-- ==================== UPLOADS & MODERATION ====================

CREATE TABLE IF NOT EXISTS pastor_uploads (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('video','audio','thumbnail','avatar','publication','other')),
  category TEXT CHECK (category IN ('conference','workshop','podcast','media-series','original')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','processing','published')),
  thumbnail TEXT,
  file_url TEXT, -- R2 key
  file_size INTEGER,
  duration TEXT,
  speaker_id TEXT REFERENCES speakers(id) ON DELETE SET NULL,
  tags TEXT DEFAULT '[]',
  feedback TEXT,
  reviewed_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  submitted_date TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d', 'now')),
  reviewed_date TEXT,
  published_content_id TEXT REFERENCES content_items(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_uploads_user ON pastor_uploads(user_id, status);
CREATE INDEX IF NOT EXISTS idx_uploads_status ON pastor_uploads(status, created_at DESC);

-- ==================== NOTIFICATIONS & ACTIVITY ====================

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('content','qa','community','system','subscription','achievement','mention','comment')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read INTEGER DEFAULT 0,
  is_archived INTEGER DEFAULT 0,
  action_url TEXT,
  image_url TEXT,
  metadata TEXT DEFAULT '{}', -- JSON
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_date ON notifications(created_at DESC);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL, -- e.g., user.login, content.create, upload.approve
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  details TEXT, -- JSON
  ip_address TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_date ON audit_logs(created_at DESC);

CREATE TABLE IF NOT EXISTS user_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  device_info TEXT,
  ip_address TEXT,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  last_active_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON user_sessions(expires_at);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_prt_user ON password_reset_tokens(user_id);

-- Analytics
CREATE TABLE IF NOT EXISTS content_views (
  id TEXT PRIMARY KEY,
  content_id TEXT NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  watched_seconds INTEGER DEFAULT 0,
  completed INTEGER DEFAULT 0,
  device_type TEXT,
  country TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_cviews_content ON content_views(content_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cviews_user ON content_views(user_id);
CREATE INDEX IF NOT EXISTS idx_cviews_date ON content_views(created_at DESC);

CREATE TABLE IF NOT EXISTS search_history (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  results_count INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_search_user ON search_history(user_id, created_at DESC);
