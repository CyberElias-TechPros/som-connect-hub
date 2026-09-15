-- Seed data for SOM CONNECT

-- Speakers
INSERT OR IGNORE INTO speakers (id, name, title, avatar) VALUES
('1', 'Pastor Chris Oyakhilome', 'President, LoveWorld Inc.', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face'),
('2', 'Pastor Benny Hinn', 'Evangelist', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face'),
('3', 'Pastor Deola Phillips', 'Senior Pastor, The Waterbrook Church', 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face'),
('4', 'Evangelist Dr. Eddy Owase', 'Director, Healing School', 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop&crop=face');

-- Users (password: password123 hashed as bcrypt would be, but for demo use simple)
INSERT OR IGNORE INTO users (id, email, name, password_hash, avatar, role, bio, affiliation, streak, joined_date) VALUES
('1', 'david.emmanuel@example.com', 'David Emmanuel', '$2a$10$demo_hash_member', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face', 'member', 'Passionate about spiritual growth and community building.', 'Christ Embassy Lagos Zone', 45, '2024-01-15'),
('2', 'pastor@example.com', 'Pastor Michael', '$2a$10$demo_hash_pastor', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face', 'pastor', 'Senior Pastor with 15 years of ministry experience.', 'Christ Embassy Lagos Zone', 120, '2023-06-15'),
('3', 'admin@example.com', 'Admin User', '$2a$10$demo_hash_admin', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face', 'admin', 'System Administrator for SOM Connect.', 'LoveWorld Inc.', 365, '2022-01-10');

-- Content
INSERT OR IGNORE INTO content_items (id, title, description, thumbnail, duration, speaker_id, date, category, tags, views, is_premium) VALUES
('1', 'The Power of Faith in Action', 'Discover how to activate your faith and see miraculous results in your daily life.', 'https://images.unsplash.com/photo-1507692049790-de58290a4334?w=600&h=340&fit=crop', '1:24:30', '1', '2025-01-05', 'conference', '["Faith","Miracles","Prayer"]', 15420, 0),
('2', 'Walking in Divine Health', 'Learn the principles of divine health and how to maintain a healthy body through the Word.', 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=600&h=340&fit=crop', '58:15', '2', '2025-01-03', 'workshop', '["Health","Healing","Word"]', 8930, 1),
('3', 'The Art of Worship', 'Understanding true worship and how to create an atmosphere of His presence.', 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600&h=340&fit=crop', '42:20', '3', '2025-01-01', 'podcast', '["Worship","Praise","Presence"]', 12300, 0),
('4', 'IPPC 2024 Highlights', 'The best moments from the International Pastors and Partners Conference 2024.', 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=600&h=340&fit=crop', '2:30:00', '1', '2024-12-15', 'conference', '["IPPC","Conference","Partners"]', 45000, 1),
('5', 'Global Communion Service', 'Monthly communion service with believers around the world.', 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&h=340&fit=crop', '1:45:00', '1', '2024-12-01', 'conference', '["Communion","Global","Unity"]', 78500, 0),
('10', 'Daily Inspiration Podcast - Episode 145', 'Start your day with powerful words of inspiration.', 'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=600&h=340&fit=crop', '25:00', '3', '2025-01-10', 'podcast', '["Daily","Inspiration","Motivation"]', 3200, 0),
('11', 'Leadership Insights with Pastor Deola', 'Learn leadership principles from a biblical perspective.', 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=600&h=340&fit=crop', '35:45', '3', '2025-01-08', 'podcast', '["Leadership","Ministry","Growth"]', 2100, 1),
('20', 'A Day in the Life: Pastor Chris', 'Exclusive behind-the-scenes look at a typical day.', 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&h=340&fit=crop', '45:00', '1', '2025-01-09', 'original', '["Behind the Scenes","Exclusive","Day in Life"]', 25000, 1),
('21', 'Bible Trivia Challenge - Episode 12', 'Test your Bible knowledge in exciting game show format!', 'https://images.unsplash.com/photo-1606092195730-5d7b9af1efc5?w=600&h=340&fit=crop', '30:00', '4', '2025-01-07', 'original', '["Game Show","Trivia","Fun"]', 8900, 0),
('22', 'Come With Me: Jerusalem Tour', 'Join us on a spiritual journey through the holy land.', 'https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=600&h=340&fit=crop', '1:20:00', '2', '2025-01-05', 'original', '["Travel","Jerusalem","Holy Land"]', 18500, 1);

-- Daily Confessions
INSERT OR IGNORE INTO daily_confessions (id, date, title, content, scripture, scripture_ref) VALUES
('1', '2025-01-11', 'I Am More Than a Conqueror', 'I declare today that I am more than a conqueror through Christ who loves me. No weapon formed against me shall prosper.', 'Nay, in all these things we are more than conquerors through him that loved us.', 'Romans 8:37'),
('2', '2025-01-10', 'Divine Wisdom Flows Through Me', 'I walk in divine wisdom today. The wisdom of God is at work in me, guiding my decisions.', 'If any of you lack wisdom, let him ask of God, that giveth to all men liberally.', 'James 1:5');

-- ROR Readings
INSERT OR IGNORE INTO ror_readings (id, date, title, theme, scripture, scripture_ref, content, prayer, further_study, daily_scripture_reading) VALUES
('1', '2025-01-11', 'Living in the Spirit', 'The Spirit-Filled Life', 'For as many as are led by the Spirit of God, they are the sons of God.', 'Romans 8:14', 'The Christian life is one that is lived in and by the Spirit. We are not merely influenced by the Spirit; we are indwelt by Him.', 'Dear Father, I thank You for the gift of the Holy Spirit. I yield myself completely to His guidance today.', '["Galatians 5:16-25","Romans 8:1-14","Ephesians 5:18-21"]', '["Genesis 25-26","Matthew 11"]');

-- Publications
INSERT OR IGNORE INTO publications (id, title, type, cover, issue_date, pages, description) VALUES
('1', 'PK Magazine - January 2025', 'magazine', 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&h=560&fit=crop', '2025-01-01', 48, 'Start the year with powerful testimonies, faith-building articles, and inspiring stories.'),
('2', 'PK Magazine - December 2024', 'magazine', 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&h=560&fit=crop', '2024-12-01', 52, 'A year in review: Celebrating God''s faithfulness throughout 2024.'),
('3', 'Ministry Newsletter - Week 2', 'newsletter', 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=400&h=560&fit=crop', '2025-01-08', 8, 'Weekly updates on ministry activities, outreach programs, and upcoming events.');

-- Q&A Sessions
INSERT OR IGNORE INTO qa_sessions (id, title, speaker_id, date, status, thumbnail) VALUES
('1', 'Live Q&A: Understanding End Times', '1', '2025-01-15T19:00:00', 'upcoming', 'https://images.unsplash.com/photo-1558403194-611308249627?w=600&h=340&fit=crop'),
('2', 'Youth Ministry Q&A Session', '3', '2025-01-11T14:00:00', 'live', 'https://images.unsplash.com/photo-1529070538774-1843cb3265df?w=600&h=340&fit=crop'),
('3', 'Faith & Finance Q&A', '4', '2025-01-05', 'archived', 'https://images.unsplash.com/photo-1553729459-efe14ef6055d?w=600&h=340&fit=crop');

-- Groups
INSERT OR IGNORE INTO groups (id, name, description, cover, member_count) VALUES
('1', 'Young Ministers Forum', 'A community for young ministers to connect, share, and grow together.', 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=600&h=300&fit=crop', 2450),
('2', 'Worship Leaders Network', 'Connect with worship leaders from around the world.', 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&h=300&fit=crop', 1820),
('3', 'Bible Study Group', 'Deep dive into scriptures with fellow believers.', 'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?w=600&h=300&fit=crop', 3100);

-- Subscription Plans
INSERT OR IGNORE INTO subscription_plans (id, name, price, interval, features, is_popular) VALUES
('basic-monthly', 'Basic', 4.99, 'monthly', '["Access to all public content","Daily confessions & ROR","Community access","Standard quality streaming"]', 0),
('premium-monthly', 'Premium', 9.99, 'monthly', '["Everything in Basic","Exclusive premium content","HD quality streaming","Offline downloads","Ad-free experience","Early access to new content"]', 1),
('premium-annually', 'Premium Annual', 99.99, 'annually', '["Everything in Premium Monthly","Save 17% with annual billing","Priority support","Exclusive annual member events"]', 0);

-- Community Posts
INSERT OR IGNORE INTO community_posts (id, author_id, content, likes, comments_count) VALUES
('1', '1', 'Just completed my 30-day devotional streak! 🎉 The daily confessions have transformed my morning routine. Who else is on a streak?', 124, 18),
('2', '2', 'Uploaded my latest teaching on "The Power of Unity in the Body of Christ". Check it out in the library! 📖✨', 89, 12);

-- Notifications
INSERT OR IGNORE INTO notifications (id, user_id, type, title, message, is_read, action_url) VALUES
('1', '1', 'content', 'New Content Available', 'A new teaching "The Power of Faith" has been uploaded.', 0, '/library/1'),
('2', '1', 'qa', 'Q&A Session Starting Soon', 'Live Q&A with Pastor Chris starts in 30 minutes.', 0, '/qa/1'),
('3', '1', 'community', 'Someone replied to your comment', 'Grace Adeyemi replied to your comment on the community post.', 1, '/community');

-- Pastor Uploads
INSERT OR IGNORE INTO pastor_uploads (id, user_id, title, type, status, thumbnail, submitted_date, reviewed_date) VALUES
('1', '2', 'Sunday Service - January 5th, 2025', 'video', 'approved', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=170&fit=crop', '2025-01-05', '2025-01-06'),
('2', '2', 'Midweek Teaching - Faith in Action', 'video', 'pending', 'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?w=300&h=170&fit=crop', '2025-01-10', NULL),
('3', '2', 'Prayer Session Recording', 'audio', 'rejected', NULL, '2025-01-02', '2025-01-03');
