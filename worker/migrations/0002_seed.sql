-- SOM CONNECT — demo seed data (generated from src/db/seed.sql)
-- SOM CONNECT — demo/seed dataset
-- Generated into migrations/0002_seed.sql by scripts/build-sql.mjs.
-- Every insert is INSERT OR IGNORE so re-running is safe.
-- Demo credentials (documented in the README):
--   david.emmanuel@example.com / password123   (member)
--   pastor@example.com         / pastor123     (pastor)
--   admin@example.com          / admin123      (admin)

INSERT OR IGNORE INTO speakers (id, name, title, avatar, bio) VALUES
('1', 'Pastor Chris Oyakhilome', 'President, LoveWorld Inc.', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face', 'Teacher of the Word with a global mandate.'),
('2', 'Pastor Benny Hinn', 'Evangelist', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face', 'Evangelist and author.'),
('3', 'Pastor Deola Phillips', 'Senior Pastor, The Waterbrook Church', 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face', 'Bible teacher and conference host.'),
('4', 'Evangelist Dr. Eddy Owase', 'Director, Healing School', 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop&crop=face', 'Director of the Healing School ministry.'),
('5', 'Pastor Lanre Alabi', 'Zonal Pastor, Lagos Zone', 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&h=150&fit=crop&crop=face', 'Zonal pastor and youth mentor.');

INSERT OR IGNORE INTO users (id, email, name, password_hash, avatar, role, bio, affiliation, streak, preferences, joined_date) VALUES
('1', 'david.emmanuel@example.com', 'David Emmanuel', 'pbkdf2$210000$c29tLWRlbW8tbWVtYmVyLTIwMjU=$R2pqBq4BO5MEM734bgVU8hmdjh1L02lUxpfo+9qxL/s=', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face', 'member', 'Passionate about spiritual growth and community building.', 'Christ Embassy Lagos Zone', 45, '{"theme":"system","language":"en","autoDownload":true,"notificationSettings":{"pushNotifications":true,"newContent":true,"dailyReminders":true,"community":false}}', '2024-01-15'),
('2', 'pastor@example.com', 'Pastor Michael', 'pbkdf2$210000$c29tLWRlbW8tcGFzdG9yLTIwMjU=$0qiXXM6aRx2zYGs4BCMnX9yRUKh/FPUi+5h7Nhp+kO0=', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face', 'pastor', 'Senior Pastor with 15 years of ministry experience.', 'Christ Embassy Lagos Zone', 120, '{"theme":"dark","language":"en","notificationSettings":{"pushNotifications":true,"newContent":true,"dailyReminders":true,"community":true}}', '2023-06-15'),
('3', 'admin@example.com', 'Admin User', 'pbkdf2$210000$c29tLWRlbW8tYWRtaW4tMjAyNQ==$/W3BacKibO1xVkCB+FfAV1FLUi+crd4hLYr+G7onlNU=', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face', 'admin', 'System Administrator for SOM Connect.', 'LoveWorld Inc.', 365, '{"theme":"light","language":"en"}', '2022-01-10'),
('4', 'grace.adeyemi@example.com', 'Grace Adeyemi', 'pbkdf2$210000$c29tLWRlbW8tbWVtYmVyLTIwMjU=$R2pqBq4BO5MEM734bgVU8hmdjh1L02lUxpfo+9qxL/s=', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face', 'member', 'Worship leader and community volunteer.', 'Christ Embassy Lagos Zone', 21, NULL, '2024-08-02');

INSERT OR IGNORE INTO content_items (id, title, description, thumbnail, duration, speaker_id, date, category, tags, views, is_premium) VALUES
('1', 'The Power of Faith in Action', 'Discover how to activate your faith and see miraculous results in your daily life.', 'https://images.unsplash.com/photo-1507692049790-de58290a4334?w=600&h=340&fit=crop', '1:24:30', '1', '2025-01-05', 'conference', '["Faith","Miracles","Prayer"]', 15420, 0),
('2', 'Walking in Divine Health', 'Learn the principles of divine health and how to maintain a healthy body through the Word.', 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=600&h=340&fit=crop', '58:15', '2', '2025-01-03', 'workshop', '["Health","Healing","Word"]', 8930, 1),
('3', 'The Art of Worship', 'Understanding true worship and how to create an atmosphere of His presence.', 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600&h=340&fit=crop', '42:20', '3', '2025-01-01', 'podcast', '["Worship","Praise","Presence"]', 12300, 0),
('4', 'IPPC 2024 Highlights', 'The best moments from the International Pastors and Partners Conference 2024.', 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=600&h=340&fit=crop', '2:30:00', '1', '2024-12-15', 'conference', '["IPPC","Conference","Partners"]', 45000, 1),
('5', 'Global Communion Service', 'Monthly communion service with believers around the world.', 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&h=340&fit=crop', '1:45:00', '1', '2024-12-01', 'conference', '["Communion","Global","Unity"]', 78500, 0),
('6', 'Foundations of Prayer', 'A workshop on building a consistent, effective prayer life.', 'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?w=600&h=340&fit=crop', '51:40', '5', '2025-01-12', 'workshop', '["Prayer","Discipline","Growth"]', 4120, 0),
('7', 'Marriage & Ministry', 'Practical wisdom for couples building a home and a ministry together.', 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=600&h=340&fit=crop', '1:05:10', '3', '2025-01-14', 'conference', '["Marriage","Family","Ministry"]', 6890, 1),
('10', 'Daily Inspiration Podcast - Episode 145', 'Start your day with powerful words of inspiration.', 'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=600&h=340&fit=crop', '25:00', '3', '2025-01-10', 'podcast', '["Daily","Inspiration","Motivation"]', 3200, 0),
('11', 'Leadership Insights with Pastor Deola', 'Learn leadership principles from a biblical perspective.', 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=600&h=340&fit=crop', '35:45', '3', '2025-01-08', 'podcast', '["Leadership","Ministry","Growth"]', 2100, 1),
('20', 'A Day in the Life: Pastor Chris', 'Exclusive behind-the-scenes look at a typical day.', 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&h=340&fit=crop', '45:00', '1', '2025-01-09', 'original', '["Behind the Scenes","Exclusive","Day in Life"]', 25000, 1),
('21', 'Bible Trivia Challenge - Episode 12', 'Test your Bible knowledge in exciting game show format!', 'https://images.unsplash.com/photo-1606092195730-5d7b9af1efc5?w=600&h=340&fit=crop', '30:00', '4', '2025-01-07', 'original', '["Game Show","Trivia","Fun"]', 8900, 0),
('22', 'Come With Me: Jerusalem Tour', 'Join us on a spiritual journey through the holy land.', 'https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=600&h=340&fit=crop', '1:20:00', '2', '2025-01-05', 'original', '["Travel","Jerusalem","Holy Land"]', 18500, 1),
('23', 'Healing School Live Session', 'A full session from the Healing School with testimonies and ministrations.', 'https://images.unsplash.com/photo-1438032005730-c779502df39b?w=600&h=340&fit=crop', '1:58:00', '4', '2025-01-16', 'conference', '["Healing","Testimony","Faith"]', 12140, 0),
('24', 'Media Series: The Word Works', 'Episode 3 — putting the Word to work in your career and business.', 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=600&h=340&fit=crop', '38:00', '5', '2025-01-18', 'media-series', '["Word","Career","Success"]', 5320, 0),
('25', 'Worship Night Highlights', 'Highlights from the all-night worship and praise encounter.', 'https://images.unsplash.com/photo-1470019693664-1d202d2c0907?w=600&h=340&fit=crop', '1:12:00', '3', '2025-01-20', 'media-series', '["Worship","Night","Praise"]', 9640, 0);

INSERT OR IGNORE INTO daily_confessions (id, date, title, content, scripture, scripture_ref) VALUES
('1', '2025-01-11', 'I Am More Than a Conqueror', 'I declare today that I am more than a conqueror through Christ who loves me. No weapon formed against me shall prosper.', 'Nay, in all these things we are more than conquerors through him that loved us.', 'Romans 8:37'),
('2', '2025-01-10', 'Divine Wisdom Flows Through Me', 'I walk in divine wisdom today. The wisdom of God is at work in me, guiding my decisions.', 'If any of you lack wisdom, let him ask of God, that giveth to all men liberally.', 'James 1:5');

INSERT OR IGNORE INTO ror_readings (id, date, title, theme, scripture, scripture_ref, content, prayer, further_study, daily_scripture_reading) VALUES
('1', '2025-01-11', 'Living in the Spirit', 'The Spirit-Filled Life', 'For as many as are led by the Spirit of God, they are the sons of God.', 'Romans 8:14', 'The Christian life is one that is lived in and by the Spirit. We are not merely influenced by the Spirit; we are indwelt by Him.', 'Dear Father, I thank You for the gift of the Holy Spirit. I yield myself completely to His guidance today.', '["Galatians 5:16-25","Romans 8:1-14","Ephesians 5:18-21"]', '["Genesis 25-26","Matthew 11"]'),
('2', '2025-01-10', 'The Word Is Your Foundation', 'Built on the Word', 'Heaven and earth shall pass away, but my words shall not pass away.', 'Matthew 24:35', 'Everything God has said is eternally settled. When you build your life on the Word, you build on an unshakeable foundation.', 'Father, Your Word is my foundation. I build my life, my family and my future on it today.', '["Psalm 119:89-105","Matthew 7:24-27","1 Peter 1:24-25"]', '["Genesis 23-24","Matthew 10"]');

INSERT OR IGNORE INTO publications (id, title, type, cover, issue_date, pages, description) VALUES
('1', 'PK Magazine - January 2025', 'magazine', 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&h=560&fit=crop', '2025-01-01', 48, 'Start the year with powerful testimonies, faith-building articles, and inspiring stories.'),
('2', 'PK Magazine - December 2024', 'magazine', 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&h=560&fit=crop', '2024-12-01', 52, 'A year in review: Celebrating God''s faithfulness throughout 2024.'),
('3', 'Ministry Newsletter - Week 2', 'newsletter', 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=400&h=560&fit=crop', '2025-01-08', 8, 'Weekly updates on ministry activities, outreach programs, and upcoming events.'),
('4', 'Ministry Newsletter - Week 3', 'newsletter', 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=400&h=560&fit=crop', '2025-01-15', 8, 'Healing School updates, new centres, and this month''s global outreach report.');

INSERT OR IGNORE INTO qa_sessions (id, title, description, speaker_id, date, status, thumbnail, duration, questions_count) VALUES
('1', 'Live Q&A: Understanding End Times', 'Bring your questions on prophecy, the rapture and the believer''s hope.', '1', '2025-01-15T19:00:00', 'upcoming', 'https://images.unsplash.com/photo-1558403194-611308249627?w=600&h=340&fit=crop', '1:30:00', 0),
('2', 'Youth Ministry Q&A Session', 'Real answers for young people navigating faith, school and purpose.', '3', '2025-01-11T14:00:00', 'live', 'https://images.unsplash.com/photo-1529070538774-1843cb3265df?w=600&h=340&fit=crop', '45:00', 2),
('3', 'Faith & Finance Q&A', 'Biblical principles for money, giving and stewardship.', '4', '2025-01-05T18:00:00', 'archived', 'https://images.unsplash.com/photo-1553729459-efe14ef6055d?w=600&h=340&fit=crop', '1:02:00', 1),
('4', 'Marriage & Family Q&A', 'Practical, Word-based answers for homes and relationships.', '5', '2025-01-22T18:30:00', 'upcoming', 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=600&h=340&fit=crop', '1:00:00', 0);

INSERT OR IGNORE INTO qa_questions (id, session_id, user_id, text, asked_by, upvotes) VALUES
('q1', '2', '4', 'How do I stay grounded in the Word when my friends mock my faith?', 'Grace Adeyemi', 12),
('q2', '2', '1', 'What does it mean to be led by the Spirit daily?', 'David Emmanuel', 7),
('q3', '3', '1', 'Should a believer take a loan to start a business?', 'David Emmanuel', 9);

INSERT OR IGNORE INTO groups (id, name, description, cover, category, member_count) VALUES
('1', 'Young Ministers Forum', 'A community for young ministers to connect, share, and grow together.', 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=600&h=300&fit=crop', 'ministry', 2450),
('2', 'Worship Leaders Network', 'Connect with worship leaders from around the world.', 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&h=300&fit=crop', 'worship', 1820),
('3', 'Bible Study Group', 'Deep dive into scriptures with fellow believers.', 'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?w=600&h=300&fit=crop', 'study', 3100),
('4', 'Healing School Testimonies', 'Share and celebrate what the Lord has done.', 'https://images.unsplash.com/photo-1438032005730-c779502df39b?w=600&h=300&fit=crop', 'testimony', 1275);

INSERT OR IGNORE INTO subscription_plans (id, name, price, currency, interval, features, trial_days, is_popular, sort_order) VALUES
('basic-monthly', 'Basic', 4.99, 'USD', 'monthly', '["Access to all public content","Daily confessions & ROR","Community access","Standard quality streaming"]', 7, 0, 1),
('premium-monthly', 'Premium', 9.99, 'USD', 'monthly', '["Everything in Basic","Exclusive premium content","HD quality streaming","Offline downloads","Ad-free experience","Early access to new content"]', 7, 1, 2),
('premium-annually', 'Premium Annual', 99.99, 'USD', 'annually', '["Everything in Premium Monthly","Save 17% with annual billing","Priority support","Exclusive annual member events"]', 14, 0, 3);

INSERT OR IGNORE INTO community_posts (id, author_id, content, likes, comments_count, created_at) VALUES
('1', '1', 'Just completed my 30-day devotional streak! 🎉 The daily confessions have transformed my morning routine. Who else is on a streak?', 124, 2, '2025-01-12T07:15:00Z'),
('2', '2', 'Uploaded my latest teaching on "The Power of Unity in the Body of Christ". Check it out in the library! 📖✨', 89, 1, '2025-01-11T16:40:00Z'),
('3', '4', 'Worship night was unforgettable. Thank you to everyone who served — the presence of God filled that place!', 156, 0, '2025-01-10T21:05:00Z');

INSERT OR IGNORE INTO post_comments (id, post_id, author_id, content, created_at) VALUES
('c1', '1', '4', 'Amen! Day 18 here — the confessions are my anchor every morning.', '2025-01-12T08:02:00Z'),
('c2', '1', '2', 'Proud of you David, keep pressing on.', '2025-01-12T09:20:00Z'),
('c3', '2', '1', 'Watching it tonight with my family. Thank you Pastor!', '2025-01-11T18:11:00Z');

INSERT OR IGNORE INTO group_members (id, group_id, user_id) VALUES
('gm1', '1', '1'),
('gm2', '3', '1');

INSERT OR IGNORE INTO notifications (id, user_id, type, title, message, is_read, action_url, created_at) VALUES
('1', '1', 'content', 'New Content Available', 'A new teaching "The Power of Faith in Action" has been uploaded.', 0, '/library/1', '2025-01-12T06:00:00Z'),
('2', '1', 'qa', 'Q&A Session Starting Soon', 'Live Q&A with Pastor Chris starts in 30 minutes.', 0, '/qa/1', '2025-01-12T05:30:00Z'),
('3', '1', 'community', 'Someone replied to your comment', 'Grace Adeyemi replied to your comment on the community post.', 1, '/community', '2025-01-11T20:10:00Z'),
('4', '2', 'system', 'Weekly ministry digest ready', 'Your weekly performance digest for uploaded teachings is ready to review.', 0, '/submissions', '2025-01-12T04:00:00Z');

INSERT OR IGNORE INTO pastor_uploads (id, user_id, title, description, type, status, thumbnail, category, submitted_date, reviewed_date, file_size, mime_type) VALUES
('1', '2', 'Sunday Service - January 5th, 2025', 'Full Sunday service recording including worship and the Word.', 'video', 'approved', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=170&fit=crop', 'conference', '2025-01-05', '2025-01-06', 734003200, 'video/mp4'),
('2', '2', 'Midweek Teaching - Faith in Action', 'Midweek Bible study on activating faith.', 'video', 'pending', 'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?w=300&h=170&fit=crop', 'workshop', '2025-01-10', NULL, 524288000, 'video/mp4'),
('3', '2', 'Prayer Session Recording', 'Audio recording of the Friday prayer session.', 'audio', 'rejected', NULL, 'podcast', '2025-01-02', '2025-01-03', 20971520, 'audio/mpeg');

INSERT OR IGNORE INTO payment_methods (id, user_id, type, brand, last4, expiry, holder, is_default) VALUES
('pm_visa_4242', '1', 'card', 'Visa', '4242', '12/28', 'David Emmanuel', 1);

INSERT OR IGNORE INTO billing_profiles (user_id, name, email, address, city, state, zip, country) VALUES
('1', 'David Emmanuel', 'david.emmanuel@example.com', '123 Faith Avenue', 'Lagos', 'Lagos', '100001', 'Nigeria');

INSERT OR IGNORE INTO user_subscriptions (id, user_id, plan_id, status, current_period_start, current_period_end, cancel_at_period_end) VALUES
('sub_seed_member', '1', 'premium-monthly', 'active', '2024-12-15T00:00:00Z', '2025-02-15T00:00:00Z', 0);

INSERT OR IGNORE INTO content_progress (id, user_id, content_id, progress, last_watched_at) VALUES
('prog_seed_1', '1', '1', 35, '2025-01-12T07:00:00Z'),
('prog_seed_2', '1', '4', 68, '2025-01-11T19:30:00Z');

INSERT OR IGNORE INTO favorites (id, user_id, content_id, notes, added_at) VALUES
('fav_seed_1', '1', '1', 'Powerful teaching on faith', '2025-01-11T07:00:00Z'),
('fav_seed_2', '1', '3', 'Great worship teaching', '2025-01-09T07:00:00Z'),
('fav_seed_3', '1', '20', 'Inspiring behind the scenes', '2025-01-08T07:00:00Z');

INSERT OR IGNORE INTO playlists (id, user_id, name, description, thumbnail, is_public, created_date) VALUES
('pl_seed_journey', '1', 'My Faith Journey', 'Teachings that have shaped my walk with God this year.', 'https://images.unsplash.com/photo-1507692049790-de58290a4334?w=600&h=340&fit=crop', 1, '2025-01-06'),
('pl_seed_mornings', '1', 'Morning Devotion', 'Short, powerful teachings to start the day.', 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=600&h=340&fit=crop', 1, '2025-01-10'),
('pl_seed_grace', '4', 'Grace''s Worship Set', 'Worship and praise favourites.', 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600&h=340&fit=crop', 1, '2025-01-12');

INSERT OR IGNORE INTO playlist_items (id, playlist_id, content_id, position) VALUES
('pli_1', 'pl_seed_journey', '1', 0),
('pli_2', 'pl_seed_journey', '3', 1),
('pli_3', 'pl_seed_journey', '5', 2),
('pli_4', 'pl_seed_mornings', '10', 0),
('pli_5', 'pl_seed_mornings', '11', 1),
('pli_6', 'pl_seed_grace', '3', 0);

INSERT OR IGNORE INTO invoices (id, user_id, subscription_id, amount, currency, status, description, issued_at) VALUES
('inv_seed_1', '1', 'sub_seed_member', 9.99, 'USD', 'paid', 'Premium (Monthly) — December 2024', '2024-12-15T00:00:00Z');
