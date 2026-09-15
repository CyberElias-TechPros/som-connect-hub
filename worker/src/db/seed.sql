-- SOM CONNECT — Seed Data v2 — Full Demo Dataset

-- Speakers
INSERT OR IGNORE INTO speakers (id, name, title, avatar, bio, verified, content_count, followers) VALUES
('spk_1', 'Pastor Chris Oyakhilome', 'President, LoveWorld Inc.', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face', 'President of LoveWorld Inc. and Christ Embassy, global evangelist.', 1, 450, 1250000),
('spk_2', 'Pastor Benny Hinn', 'Evangelist', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face', 'World-renowned evangelist and teacher of the Word.', 1, 320, 890000),
('spk_3', 'Pastor Deola Phillips', 'Senior Pastor, The Waterbrook Church', 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face', 'Senior Pastor and leadership mentor.', 1, 180, 450000),
('spk_4', 'Evangelist Dr. Eddy Owase', 'Director, Healing School', 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop&crop=face', 'Director of Healing School, passionate about divine healing.', 1, 210, 520000);

-- Users (demo: member, pastor, admin) — password_hash is demo sha256 of 'password123' etc.
INSERT OR IGNORE INTO users (id, email, name, password_hash, avatar, role, bio, affiliation, streak, longest_streak, preferences, email_verified, joined_date) VALUES
('u_demo_member', 'david.emmanuel@example.com', 'David Emmanuel', 'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face', 'member', 'Passionate about spiritual growth and community building.', 'Christ Embassy Lagos Zone', 45, 67, '{"theme":"system","language":"en","autoDownload":true,"notificationSettings":{"pushNotifications":true,"newContent":true,"dailyReminders":true,"community":false}}', 1, '2024-01-15'),
('u_demo_pastor', 'pastor@example.com', 'Pastor Michael', 'a0b1c2d3e4f5demo_pastor_hash', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face', 'pastor', 'Senior Pastor with 15 years of ministry experience.', 'Christ Embassy Lagos Zone', 120, 150, '{"theme":"dark","language":"en","autoDownload":true}', 1, '2023-06-15'),
('u_demo_admin', 'admin@example.com', 'Admin User', 'admin_demo_hash_123', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face', 'admin', 'System Administrator for SOM Connect.', 'LoveWorld Inc.', 365, 365, '{"theme":"light"}', 1, '2022-01-10'),
('u_grace', 'grace@example.com', 'Grace Adeyemi', 'hash_grace', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face', 'member', 'Worship leader and intercessor.', 'CE Lagos', 30, 45, '{}', 1, '2024-03-20'),
('u_john', 'john.doe@example.com', 'John Doe', 'hash_john', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face', 'member', 'Faith builder.', 'CE Abuja', 12, 20, '{}', 1, '2024-08-10');

-- Content Items (10+)
INSERT OR IGNORE INTO content_items (id, title, description, thumbnail, duration, speaker_id, date, category, tags, views, likes, is_premium, is_published, video_url) VALUES
('c_1', 'The Power of Faith in Action', 'Discover how to activate your faith and see miraculous results in your daily life. This powerful message will transform your understanding of faith.', 'https://images.unsplash.com/photo-1507692049790-de58290a4334?w=600&h=340&fit=crop', '1:24:30', 'spk_1', '2025-01-05', 'conference', '["Faith","Miracles","Prayer"]', 15420, 892, 0, 1, 'https://storage.som-connect/videos/faith-in-action.mp4'),
('c_2', 'Walking in Divine Health', 'Learn the principles of divine health and how to maintain a healthy body through the Word of God.', 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=600&h=340&fit=crop', '58:15', 'spk_2', '2025-01-03', 'workshop', '["Health","Healing","Word"]', 8930, 445, 1, 1, 'https://storage.som-connect/videos/divine-health.mp4'),
('c_3', 'The Art of Worship', 'Understanding true worship and how to create an atmosphere of His presence in your life.', 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600&h=340&fit=crop', '42:20', 'spk_3', '2025-01-01', 'podcast', '["Worship","Praise","Presence"]', 12300, 623, 0, 1, 'https://storage.som-connect/videos/art-of-worship.mp4'),
('c_4', 'IPPC 2024 Highlights', 'The best moments from the International Pastors and Partners Conference 2024.', 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=600&h=340&fit=crop', '2:30:00', 'spk_1', '2024-12-15', 'conference', '["IPPC","Conference","Partners"]', 45000, 2100, 1, 1, 'https://storage.som-connect/videos/ippc-2024.mp4'),
('c_5', 'Global Communion Service', 'Monthly communion service with believers around the world.', 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&h=340&fit=crop', '1:45:00', 'spk_1', '2024-12-01', 'conference', '["Communion","Global","Unity"]', 78500, 3400, 0, 1, 'https://storage.som-connect/videos/communion.mp4'),
('c_10', 'Daily Inspiration Podcast - Episode 145', 'Start your day with powerful words of inspiration and motivation.', 'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=600&h=340&fit=crop', '25:00', 'spk_3', '2025-01-10', 'podcast', '["Daily","Inspiration","Motivation"]', 3200, 210, 0, 1, 'https://storage.som-connect/videos/daily-145.mp4'),
('c_11', 'Leadership Insights with Pastor Deola', 'Learn leadership principles from a biblical perspective.', 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=600&h=340&fit=crop', '35:45', 'spk_3', '2025-01-08', 'podcast', '["Leadership","Ministry","Growth"]', 2100, 156, 1, 1, 'https://storage.som-connect/videos/leadership.mp4'),
('c_20', 'A Day in the Life: Pastor Chris', 'Get an exclusive behind-the-scenes look at a typical day in the life of Pastor Chris.', 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&h=340&fit=crop', '45:00', 'spk_1', '2025-01-09', 'original', '["Behind the Scenes","Exclusive","Day in Life"]', 25000, 1200, 1, 1, 'https://storage.som-connect/videos/day-in-life.mp4'),
('c_21', 'Bible Trivia Challenge - Episode 12', 'Test your Bible knowledge in this exciting game show format!', 'https://images.unsplash.com/photo-1606092195730-5d7b9af1efc5?w=600&h=340&fit=crop', '30:00', 'spk_4', '2025-01-07', 'original', '["Game Show","Trivia","Fun"]', 8900, 432, 0, 1, 'https://storage.som-connect/videos/trivia-12.mp4'),
('c_22', 'Come With Me: Jerusalem Tour', 'Join us on a spiritual journey through the holy land.', 'https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=600&h=340&fit=crop', '1:20:00', 'spk_2', '2025-01-05', 'original', '["Travel","Jerusalem","Holy Land"]', 18500, 876, 1, 1, 'https://storage.som-connect/videos/jerusalem.mp4');

-- Daily Confessions
INSERT OR IGNORE INTO daily_confessions (id, date, title, content, scripture, scripture_ref) VALUES
('conf_1', '2025-01-11', 'I Am More Than a Conqueror', 'I declare today that I am more than a conqueror through Christ who loves me. No weapon formed against me shall prosper, and every tongue that rises against me in judgment I condemn. This is my heritage as a servant of the Lord.', 'Nay, in all these things we are more than conquerors through him that loved us.', 'Romans 8:37'),
('conf_2', '2025-01-10', 'Divine Wisdom Flows Through Me', 'I walk in divine wisdom today. The wisdom of God is at work in me, guiding my decisions and directing my paths. I speak wisdom, and understanding flows from my lips.', 'If any of you lack wisdom, let him ask of God, that giveth to all men liberally.', 'James 1:5'),
('conf_3', '2025-01-09', 'I Walk in Health', 'I declare that divine health is my heritage. Sickness and disease have no place in my body. I am strong, vibrant, and full of life.', 'But he was wounded for our transgressions, he was bruised for our iniquities.', 'Isaiah 53:5');

-- ROR Readings
INSERT OR IGNORE INTO ror_readings (id, date, title, theme, scripture, scripture_ref, content, prayer, further_study, daily_scripture_reading) VALUES
('ror_1', '2025-01-11', 'Living in the Spirit', 'The Spirit-Filled Life', 'For as many as are led by the Spirit of God, they are the sons of God.', 'Romans 8:14', 'The Christian life is one that is lived in and by the Spirit. We are not merely influenced by the Spirit; we are indwelt by Him. This means every action, thought, and decision should be Spirit-led.', 'Dear Father, I thank You for the gift of the Holy Spirit. I yield myself completely to His guidance today.', '["Galatians 5:16-25","Romans 8:1-14","Ephesians 5:18-21"]', '["Genesis 25-26","Matthew 11"]'),
('ror_2', '2025-01-10', 'The Power of Words', 'Faith and Confession', 'Death and life are in the power of the tongue.', 'Proverbs 18:21', 'Your words are powerful. They shape your world and determine your future. Speak life, speak health, speak prosperity.', 'Father, I thank You for the power of my words. I choose to speak life today.', '["Mark 11:23","Proverbs 12:14","James 3:1-12"]', '["Genesis 27-28","Matthew 12"]');

-- Publications
INSERT OR IGNORE INTO publications (id, title, type, cover, issue_date, pages, description, is_premium) VALUES
('pub_1', 'PK Magazine - January 2025', 'magazine', 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&h=560&fit=crop', '2025-01-01', 48, 'Start the year with powerful testimonies, faith-building articles, and inspiring stories.', 0),
('pub_2', 'PK Magazine - December 2024', 'magazine', 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&h=560&fit=crop', '2024-12-01', 52, 'A year in review: Celebrating God''s faithfulness throughout 2024.', 1),
('pub_3', 'Ministry Newsletter - Week 2', 'newsletter', 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=400&h=560&fit=crop', '2025-01-08', 8, 'Weekly updates on ministry activities, outreach programs, and upcoming events.', 0);

-- QA Sessions
INSERT OR IGNORE INTO qa_sessions (id, title, description, speaker_id, date, status, thumbnail, duration, questions_count, participants_count) VALUES
('qa_1', 'Live Q&A: Understanding End Times', 'Deep dive into eschatology and what the Bible says about the end times.', 'spk_1', '2025-01-15T19:00:00', 'upcoming', 'https://images.unsplash.com/photo-1558403194-611308249627?w=600&h=340&fit=crop', NULL, 12, 0),
('qa_2', 'Youth Ministry Q&A Session', 'Practical guidance for youth ministers and young leaders.', 'spk_3', '2025-01-11T14:00:00', 'live', 'https://images.unsplash.com/photo-1529070538774-1843cb3265df?w=600&h=340&fit=crop', NULL, 8, 145),
('qa_3', 'Faith & Finance Q&A', 'Biblical principles for financial stewardship and prosperity.', 'spk_4', '2025-01-05', 'archived', 'https://images.unsplash.com/photo-1553729459-efe14ef6055d?w=600&h=340&fit=crop', '1:15:00', 24, 320);

-- QA Questions
INSERT OR IGNORE INTO qa_questions (id, session_id, user_id, text, asked_by, upvotes, is_answered, answer) VALUES
('qq_1', 'qa_3', 'u_grace', 'How can I maintain consistency in my prayer life?', 'John D.', 45, 1, 'Consistency in prayer comes from understanding that prayer is communication with your Father. Set a specific time each day...'),
('qq_2', 'qa_3', 'u_john', 'What does it mean to walk in the Spirit daily?', 'Mary K.', 32, 0, NULL),
('qq_3', 'qa_3', 'u_demo_member', 'How do I know if I''m hearing from God?', 'Samuel O.', 28, 1, 'The Word of God is the primary way God speaks to us. When you study the Word and meditate on it...');

-- Groups
INSERT OR IGNORE INTO groups (id, name, description, cover, member_count, post_count, is_private, is_verified, created_by) VALUES
('grp_1', 'Young Ministers Forum', 'A community for young ministers to connect, share, and grow together.', 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=600&h=300&fit=crop', 2450, 120, 0, 1, 'u_demo_pastor'),
('grp_2', 'Worship Leaders Network', 'Connect with worship leaders from around the world.', 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&h=300&fit=crop', 1820, 89, 0, 1, 'u_grace'),
('grp_3', 'Bible Study Group', 'Deep dive into scriptures with fellow believers.', 'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?w=600&h=300&fit=crop', 3100, 210, 0, 1, 'u_demo_member');

-- Group Members
INSERT OR IGNORE INTO group_members (id, group_id, user_id, role) VALUES
('gm_1', 'grp_1', 'u_demo_member', 'member'),
('gm_2', 'grp_3', 'u_demo_member', 'member'),
('gm_3', 'grp_1', 'u_grace', 'moderator'),
('gm_4', 'grp_2', 'u_grace', 'member');

-- Subscription Plans
INSERT OR IGNORE INTO subscription_plans (id, name, description, price, currency, interval, features, is_popular, is_active, trial_days) VALUES
('basic-monthly', 'Basic', 'Essential access for every believer', 4.99, 'USD', 'monthly', '["Access to all public content","Daily confessions & ROR","Community access","Standard quality streaming"]', 0, 1, 7),
('premium-monthly', 'Premium', 'Complete experience with exclusive content', 9.99, 'USD', 'monthly', '["Everything in Basic","Exclusive premium content","HD quality streaming","Offline downloads","Ad-free experience","Early access to new content"]', 1, 1, 7),
('premium-annually', 'Premium Annual', 'Best value — save 17%', 99.99, 'USD', 'annually', '["Everything in Premium Monthly","Save 17% with annual billing","Priority support","Exclusive annual member events"]', 0, 1, 14),
('lifetime', 'Lifetime', 'One-time payment, lifetime access', 299.99, 'USD', 'lifetime', '["Everything in Premium","Lifetime access","Founders badge","Direct line to pastors"]', 0, 1, 0);

-- Community Posts
INSERT OR IGNORE INTO community_posts (id, author_id, content, likes, comments_count, created_at) VALUES
('post_1', 'u_grace', 'Just completed my 30-day devotional streak! 🎉 The daily confessions have transformed my morning routine. Who else is on a streak?', 124, 18, '2025-01-11T08:30:00'),
('post_2', 'u_demo_pastor', 'Uploaded my latest teaching on "The Power of Unity in the Body of Christ". Check it out in the library! 📖✨', 89, 12, '2025-01-10T16:45:00'),
('post_3', 'u_john', 'Question: How do you balance ministry and family? Looking for wisdom from experienced ministers.', 45, 8, '2025-01-09T12:00:00');

-- Post Comments
INSERT OR IGNORE INTO post_comments (id, post_id, user_id, text, likes) VALUES
('pc_1', 'post_1', 'u_demo_member', 'Congratulations Grace! I''m on day 15, inspired by your post!', 5),
('pc_2', 'post_1', 'u_john', 'Amazing! Keep going!', 2),
('pc_3', 'post_2', 'u_grace', 'Can''t wait to watch it, Pastor!', 3);

-- Content Comments
INSERT OR IGNORE INTO content_comments (id, content_id, user_id, text, likes) VALUES
('cc_1', 'c_1', 'u_grace', 'This teaching changed my life! Thank you Pastor Chris.', 12),
('cc_2', 'c_1', 'u_john', 'Powerful message on faith. I''ve been applying these principles daily.', 8);

-- Notifications
INSERT OR IGNORE INTO notifications (id, user_id, type, title, message, is_read, action_url) VALUES
('notif_1', 'u_demo_member', 'content', 'New Content Available', 'A new teaching "The Power of Faith" has been uploaded.', 0, '/library/c_1'),
('notif_2', 'u_demo_member', 'qa', 'Q&A Session Starting Soon', 'Live Q&A with Pastor Chris starts in 30 minutes.', 0, '/qa/qa_1'),
('notif_3', 'u_demo_member', 'community', 'Someone replied to your comment', 'Grace Adeyemi replied to your comment on the community post.', 1, '/community/post_1'),
('notif_4', 'u_grace', 'achievement', 'Streak Milestone!', 'You''ve reached a 30-day streak! Keep it up!', 0, '/tools');

-- Pastor Uploads
INSERT OR IGNORE INTO pastor_uploads (id, user_id, title, description, type, category, status, thumbnail, file_url, submitted_date) VALUES
('up_1', 'u_demo_pastor', 'Sunday Service - January 5th, 2025', 'Powerful Sunday service message', 'video', 'conference', 'approved', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=170&fit=crop', 'videos/sunday-jan5.mp4', '2025-01-05'),
('up_2', 'u_demo_pastor', 'Midweek Teaching - Faith in Action', 'Midweek faith teaching', 'video', 'workshop', 'pending', 'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?w=300&h=170&fit=crop', 'videos/midweek-faith.mp4', '2025-01-10'),
('up_3', 'u_demo_pastor', 'Prayer Session Recording', 'Early morning prayer', 'audio', 'original', 'rejected', NULL, 'audio/prayer-jan2.mp3', '2025-01-02');

-- User Subscriptions (demo)
INSERT OR IGNORE INTO user_subscriptions (id, user_id, plan_id, status, current_period_start, current_period_end, payment_provider) VALUES
('sub_demo_1', 'u_demo_member', 'premium-monthly', 'active', '2024-12-15T00:00:00Z', '2025-02-15T00:00:00Z', 'manual'),
('sub_demo_2', 'u_grace', 'basic-monthly', 'active', '2024-12-01T00:00:00Z', '2025-01-01T00:00:00Z', 'manual');

-- Favorites
INSERT OR IGNORE INTO favorites (id, user_id, content_id, notes) VALUES
('fav_1', 'u_demo_member', 'c_1', 'Powerful teaching on faith'),
('fav_2', 'u_demo_member', 'c_3', 'Great worship teaching'),
('fav_3', 'u_demo_member', 'c_20', 'Inspiring behind the scenes');

-- Playlists
INSERT OR IGNORE INTO playlists (id, user_id, name, description, thumbnail, is_public, content_count) VALUES
('pl_1', 'u_demo_member', 'Faith Building Teachings', 'Powerful messages to strengthen your faith and trust in God.', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=340&fit=crop', 1, 3),
('pl_2', 'u_demo_member', 'Daily Inspiration', 'Short podcasts and teachings for daily motivation.', 'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=600&h=340&fit=crop', 0, 2);

INSERT OR IGNORE INTO playlist_items (id, playlist_id, content_id, position) VALUES
('pli_1', 'pl_1', 'c_1', 0),
('pli_2', 'pl_1', 'c_4', 1),
('pli_3', 'pl_1', 'c_5', 2),
('pli_4', 'pl_2', 'c_10', 0),
('pli_5', 'pl_2', 'c_11', 1);

-- Daily Completions
INSERT OR IGNORE INTO daily_completions (id, user_id, type, date) VALUES
('dc_1', 'u_demo_member', 'confession', '2025-01-11'),
('dc_2', 'u_demo_member', 'ror', '2025-01-11'),
('dc_3', 'u_demo_member', 'confession', '2025-01-10');
