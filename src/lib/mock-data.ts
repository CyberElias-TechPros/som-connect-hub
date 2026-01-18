// SOM CONNECT Mock Data

// User roles
export type UserRole = 'guest' | 'member' | 'pastor' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: UserRole;
  joinedDate: string;
  streak: number;
  bio?: string;
  affiliation?: string;
  preferences?: UserPreferences;
}

export interface UserPreferences {
  theme?: 'light' | 'dark' | 'system';
  language?: string;
  autoDownload?: boolean;
  notificationSettings?: NotificationSettings;
}

export interface NotificationSettings {
  pushNotifications?: boolean;
  newContent?: boolean;
  dailyReminders?: boolean;
  community?: boolean;
}

export const currentUser: User = {
  id: '1',
  name: 'David Emmanuel',
  email: 'david.emmanuel@example.com',
  avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
  role: 'member',
  joinedDate: '2024-01-15',
  streak: 45,
  bio: 'Passionate about spiritual growth and community building.',
  affiliation: 'Christ Embassy Lagos Zone',
  preferences: {
    theme: 'system',
    language: 'en',
    autoDownload: true,
    notificationSettings: {
      pushNotifications: true,
      newContent: true,
      dailyReminders: true,
      community: false,
    }
  }
};

// Content types
export interface Speaker {
  id: string;
  name: string;
  title: string;
  avatar: string;
}

export const speakers: Speaker[] = [
  {
    id: '1',
    name: 'Pastor Chris Oyakhilome',
    title: 'President, LoveWorld Inc.',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
  },
  {
    id: '2',
    name: 'Pastor Benny Hinn',
    title: 'Evangelist',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face',
  },
  {
    id: '3',
    name: 'Pastor Deola Phillips',
    title: 'Senior Pastor, The Waterbrook Church',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
  },
  {
    id: '4',
    name: 'Evangelist Dr. Eddy Owase',
    title: 'Director, Healing School',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop&crop=face',
  },
];

export interface ContentItem {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  duration: string;
  speaker: Speaker;
  date: string;
  category: 'conference' | 'workshop' | 'podcast' | 'media-series' | 'original';
  tags: string[];
  views: number;
  isPremium: boolean;
  isDownloaded?: boolean;
  progress?: number;
  isFavorited?: boolean;
}

export interface Playlist {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
  contentIds: string[];
  createdDate: string;
  isPublic: boolean;
}

export const playlists: Playlist[] = [
  {
    id: '1',
    name: 'Faith Building Teachings',
    description: 'Powerful messages to strengthen your faith and trust in God.',
    thumbnail: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=340&fit=crop',
    contentIds: ['1', '4', '5'],
    createdDate: '2025-01-01',
    isPublic: true,
  },
  {
    id: '2',
    name: 'Daily Inspiration',
    description: 'Short podcasts and teachings for daily motivation.',
    thumbnail: 'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=600&h=340&fit=crop',
    contentIds: ['10', '11'],
    createdDate: '2025-01-05',
    isPublic: false,
  },
];

export const featuredContent: ContentItem[] = [
  {
    id: '1',
    title: 'The Power of Faith in Action',
    description: 'Discover how to activate your faith and see miraculous results in your daily life. This powerful message will transform your understanding of faith.',
    thumbnail: 'https://images.unsplash.com/photo-1507692049790-de58290a4334?w=600&h=340&fit=crop',
    duration: '1:24:30',
    speaker: speakers[0],
    date: '2025-01-05',
    category: 'conference',
    tags: ['Faith', 'Miracles', 'Prayer'],
    views: 15420,
    isPremium: false,
    progress: 45,
    isFavorited: true,
  },
  {
    id: '2',
    title: 'Walking in Divine Health',
    description: 'Learn the principles of divine health and how to maintain a healthy body through the Word of God.',
    thumbnail: 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=600&h=340&fit=crop',
    duration: '58:15',
    speaker: speakers[1],
    date: '2025-01-03',
    category: 'workshop',
    tags: ['Health', 'Healing', 'Word'],
    views: 8930,
    isPremium: true,
    isFavorited: false,
  },
  {
    id: '3',
    title: 'The Art of Worship',
    description: 'Understanding true worship and how to create an atmosphere of His presence in your life.',
    thumbnail: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600&h=340&fit=crop',
    duration: '42:20',
    speaker: speakers[2],
    date: '2025-01-01',
    category: 'podcast',
    tags: ['Worship', 'Praise', 'Presence'],
    views: 12300,
    isPremium: false,
    isFavorited: true,
  },
];

export const conferences: ContentItem[] = [
  ...featuredContent.filter(c => c.category === 'conference'),
  {
    id: '4',
    title: 'IPPC 2024 Highlights',
    description: 'The best moments from the International Pastors and Partners Conference 2024.',
    thumbnail: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=600&h=340&fit=crop',
    duration: '2:30:00',
    speaker: speakers[0],
    date: '2024-12-15',
    category: 'conference',
    tags: ['IPPC', 'Conference', 'Partners'],
    views: 45000,
    isPremium: true,
    isDownloaded: true,
    progress: 100,
    isFavorited: false,
  },
  {
    id: '5',
    title: 'Global Communion Service',
    description: 'Monthly communion service with believers around the world.',
    thumbnail: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&h=340&fit=crop',
    duration: '1:45:00',
    speaker: speakers[0],
    date: '2024-12-01',
    category: 'conference',
    tags: ['Communion', 'Global', 'Unity'],
    views: 78500,
    isPremium: false,
    isDownloaded: false,
    progress: 75,
    isFavorited: true,
  },
];

export const podcasts: ContentItem[] = [
  {
    id: '10',
    title: 'Daily Inspiration Podcast - Episode 145',
    description: 'Start your day with powerful words of inspiration and motivation.',
    thumbnail: 'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=600&h=340&fit=crop',
    duration: '25:00',
    speaker: speakers[2],
    date: '2025-01-10',
    category: 'podcast',
    tags: ['Daily', 'Inspiration', 'Motivation'],
    views: 3200,
    isPremium: false,
    isDownloaded: true,
    progress: 100,
    isFavorited: false,
  },
  {
    id: '11',
    title: 'Leadership Insights with Pastor Deola',
    description: 'Learn leadership principles from a biblical perspective.',
    thumbnail: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=600&h=340&fit=crop',
    duration: '35:45',
    speaker: speakers[2],
    date: '2025-01-08',
    category: 'podcast',
    tags: ['Leadership', 'Ministry', 'Growth'],
    views: 2100,
    isPremium: true,
    isDownloaded: false,
    progress: 50,
    isFavorited: true,
  },
];

export const originals: ContentItem[] = [
  {
    id: '20',
    title: 'A Day in the Life: Pastor Chris',
    description: 'Get an exclusive behind-the-scenes look at a typical day in the life of Pastor Chris.',
    thumbnail: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&h=340&fit=crop',
    duration: '45:00',
    speaker: speakers[0],
    date: '2025-01-09',
    category: 'original',
    tags: ['Behind the Scenes', 'Exclusive', 'Day in Life'],
    views: 25000,
    isPremium: true,
    isDownloaded: true,
    progress: 100,
    isFavorited: true,
  },
  {
    id: '21',
    title: 'Bible Trivia Challenge - Episode 12',
    description: 'Test your Bible knowledge in this exciting game show format!',
    thumbnail: 'https://images.unsplash.com/photo-1606092195730-5d7b9af1efc5?w=600&h=340&fit=crop',
    duration: '30:00',
    speaker: speakers[3],
    date: '2025-01-07',
    category: 'original',
    tags: ['Game Show', 'Trivia', 'Fun'],
    views: 8900,
    isPremium: false,
    isDownloaded: false,
    progress: 0,
    isFavorited: false,
  },
  {
    id: '22',
    title: 'Come With Me: Jerusalem Tour',
    description: 'Join us on a spiritual journey through the holy land.',
    thumbnail: 'https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=600&h=340&fit=crop',
    duration: '1:20:00',
    speaker: speakers[1],
    date: '2025-01-05',
    category: 'original',
    tags: ['Travel', 'Jerusalem', 'Holy Land'],
    views: 18500,
    isPremium: true,
    isDownloaded: false,
    progress: 25,
    isFavorited: true,
  },
];

// Daily Tools
export interface DailyConfession {
  id: string;
  date: string;
  title: string;
  content: string;
  scripture: string;
  scriptureRef: string;
}

export const dailyConfessions: DailyConfession[] = [
  {
    id: '1',
    date: '2025-01-11',
    title: 'I Am More Than a Conqueror',
    content: 'I declare today that I am more than a conqueror through Christ who loves me. No weapon formed against me shall prosper, and every tongue that rises against me in judgment I condemn. This is my heritage as a servant of the Lord.',
    scripture: 'Nay, in all these things we are more than conquerors through him that loved us.',
    scriptureRef: 'Romans 8:37',
  },
  {
    id: '2',
    date: '2025-01-10',
    title: 'Divine Wisdom Flows Through Me',
    content: 'I walk in divine wisdom today. The wisdom of God is at work in me, guiding my decisions and directing my paths. I speak wisdom, and understanding flows from my lips.',
    scripture: 'If any of you lack wisdom, let him ask of God, that giveth to all men liberally.',
    scriptureRef: 'James 1:5',
  },
];

export interface RORReading {
  id: string;
  date: string;
  title: string;
  theme: string;
  scripture: string;
  scriptureRef: string;
  content: string;
  prayer: string;
  furtherStudy: string[];
  dailyScriptureReading: string[];
}

export const rorReadings: RORReading[] = [
  {
    id: '1',
    date: '2025-01-11',
    title: 'Living in the Spirit',
    theme: 'The Spirit-Filled Life',
    scripture: 'For as many as are led by the Spirit of God, they are the sons of God.',
    scriptureRef: 'Romans 8:14',
    content: 'The Christian life is one that is lived in and by the Spirit. We are not merely influenced by the Spirit; we are indwelt by Him. This means every action, thought, and decision should be Spirit-led. When you wake up each morning, acknowledge the Holy Spirit within you and yield to His guidance throughout the day.',
    prayer: 'Dear Father, I thank You for the gift of the Holy Spirit. I yield myself completely to His guidance today. I choose to walk in the Spirit and manifest the fruits of righteousness in all I do.',
    furtherStudy: ['Galatians 5:16-25', 'Romans 8:1-14', 'Ephesians 5:18-21'],
    dailyScriptureReading: ['Genesis 25-26', 'Matthew 11'],
  },
];

// Publications
export interface Publication {
  id: string;
  title: string;
  type: 'magazine' | 'newsletter';
  cover: string;
  issueDate: string;
  pages: number;
  description: string;
  isDownloaded?: boolean;
}

export const publications: Publication[] = [
  {
    id: '1',
    title: 'PK Magazine - January 2025',
    type: 'magazine',
    cover: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&h=560&fit=crop',
    issueDate: '2025-01-01',
    pages: 48,
    description: 'Start the year with powerful testimonies, faith-building articles, and inspiring stories.',
  },
  {
    id: '2',
    title: 'PK Magazine - December 2024',
    type: 'magazine',
    cover: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&h=560&fit=crop',
    issueDate: '2024-12-01',
    pages: 52,
    description: 'A year in review: Celebrating God\'s faithfulness throughout 2024.',
  },
  {
    id: '3',
    title: 'Ministry Newsletter - Week 2',
    type: 'newsletter',
    cover: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=400&h=560&fit=crop',
    issueDate: '2025-01-08',
    pages: 8,
    description: 'Weekly updates on ministry activities, outreach programs, and upcoming events.',
  },
];

// Q&A Sessions
export interface QASession {
  id: string;
  title: string;
  speaker: Speaker;
  date: string;
  status: 'upcoming' | 'live' | 'archived';
  thumbnail: string;
  duration?: string;
  questionsCount?: number;
}

export const qaSessions: QASession[] = [
  {
    id: '1',
    title: 'Live Q&A: Understanding End Times',
    speaker: speakers[0],
    date: '2025-01-15T19:00:00',
    status: 'upcoming',
    thumbnail: 'https://images.unsplash.com/photo-1558403194-611308249627?w=600&h=340&fit=crop',
  },
  {
    id: '2',
    title: 'Youth Ministry Q&A Session',
    speaker: speakers[2],
    date: '2025-01-11T14:00:00',
    status: 'live',
    thumbnail: 'https://images.unsplash.com/photo-1529070538774-1843cb3265df?w=600&h=340&fit=crop',
  },
  {
    id: '3',
    title: 'Faith & Finance Q&A',
    speaker: speakers[3],
    date: '2025-01-05',
    status: 'archived',
    thumbnail: 'https://images.unsplash.com/photo-1553729459-efe14ef6055d?w=600&h=340&fit=crop',
    duration: '1:15:00',
    questionsCount: 24,
  },
];

export interface Question {
  id: string;
  text: string;
  askedBy: string;
  upvotes: number;
  isAnswered: boolean;
  answer?: string;
}

export const sampleQuestions: Question[] = [
  {
    id: '1',
    text: 'How can I maintain consistency in my prayer life?',
    askedBy: 'John D.',
    upvotes: 45,
    isAnswered: true,
    answer: 'Consistency in prayer comes from understanding that prayer is communication with your Father. Set a specific time each day...',
  },
  {
    id: '2',
    text: 'What does it mean to walk in the Spirit daily?',
    askedBy: 'Mary K.',
    upvotes: 32,
    isAnswered: false,
  },
  {
    id: '3',
    text: 'How do I know if I\'m hearing from God?',
    askedBy: 'Samuel O.',
    upvotes: 28,
    isAnswered: true,
    answer: 'The Word of God is the primary way God speaks to us. When you study the Word and meditate on it...',
  },
];

// Community
export interface CommunityPost {
  id: string;
  author: User;
  content: string;
  timestamp: string;
  likes: number;
  comments: number;
  image?: string;
}

export const communityPosts: CommunityPost[] = [
  {
    id: '1',
    author: {
      id: '2',
      name: 'Grace Adeyemi',
      email: 'grace@example.com',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face',
      role: 'member',
      joinedDate: '2024-03-20',
      streak: 30,
    },
    content: 'Just completed my 30-day devotional streak! 🎉 The daily confessions have transformed my morning routine. Who else is on a streak?',
    timestamp: '2025-01-11T08:30:00',
    likes: 124,
    comments: 18,
  },
  {
    id: '2',
    author: {
      id: '3',
      name: 'Pastor Michael Udo',
      email: 'michael@example.com',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
      role: 'pastor',
      joinedDate: '2023-06-15',
      streak: 120,
    },
    content: 'Uploaded my latest teaching on "The Power of Unity in the Body of Christ". Check it out in the library! 📖✨',
    timestamp: '2025-01-10T16:45:00',
    likes: 89,
    comments: 12,
    image: 'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?w=600&h=400&fit=crop',
  },
];

export interface Group {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  cover: string;
  isJoined: boolean;
}

export const groups: Group[] = [
  {
    id: '1',
    name: 'Young Ministers Forum',
    description: 'A community for young ministers to connect, share, and grow together.',
    memberCount: 2450,
    cover: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=600&h=300&fit=crop',
    isJoined: true,
  },
  {
    id: '2',
    name: 'Worship Leaders Network',
    description: 'Connect with worship leaders from around the world.',
    memberCount: 1820,
    cover: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&h=300&fit=crop',
    isJoined: false,
  },
  {
    id: '3',
    name: 'Bible Study Group',
    description: 'Deep dive into scriptures with fellow believers.',
    memberCount: 3100,
    cover: 'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?w=600&h=300&fit=crop',
    isJoined: true,
  },
];

// Subscriptions
export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  interval: 'monthly' | 'annually';
  features: string[];
  isPopular?: boolean;
  isCurrent?: boolean;
}

export const subscriptionPlans: SubscriptionPlan[] = [
  {
    id: 'basic-monthly',
    name: 'Basic',
    price: 4.99,
    interval: 'monthly',
    features: [
      'Access to all public content',
      'Daily confessions & ROR',
      'Community access',
      'Standard quality streaming',
    ],
  },
  {
    id: 'premium-monthly',
    name: 'Premium',
    price: 9.99,
    interval: 'monthly',
    features: [
      'Everything in Basic',
      'Exclusive premium content',
      'HD quality streaming',
      'Offline downloads',
      'Ad-free experience',
      'Early access to new content',
    ],
    isPopular: true,
    isCurrent: true,
  },
  {
    id: 'premium-annually',
    name: 'Premium Annual',
    price: 99.99,
    interval: 'annually',
    features: [
      'Everything in Premium Monthly',
      'Save 17% with annual billing',
      'Priority support',
      'Exclusive annual member events',
    ],
  },
];

// Pastor Uploads (for pastor role)
export interface PastorUpload {
  id: string;
  title: string;
  type: 'video' | 'audio';
  status: 'pending' | 'approved' | 'rejected';
  submittedDate: string;
  reviewedDate?: string;
  thumbnail?: string;
  feedback?: string;
}

export const pastorUploads: PastorUpload[] = [
  {
    id: '1',
    title: 'Sunday Service - January 5th, 2025',
    type: 'video',
    status: 'approved',
    submittedDate: '2025-01-05',
    reviewedDate: '2025-01-06',
    thumbnail: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=170&fit=crop',
  },
  {
    id: '2',
    title: 'Midweek Teaching - Faith in Action',
    type: 'video',
    status: 'pending',
    submittedDate: '2025-01-10',
    thumbnail: 'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?w=300&h=170&fit=crop',
  },
  {
    id: '3',
    title: 'Prayer Session Recording',
    type: 'audio',
    status: 'rejected',
    submittedDate: '2025-01-02',
    reviewedDate: '2025-01-03',
    feedback: 'Audio quality is too low. Please re-record with better equipment.',
  },
];

// Admin Stats
export interface AdminStats {
  totalUsers: number;
  activeSubscribers: number;
  totalContent: number;
  pendingReviews: number;
  dailyActiveUsers: number;
  monthlyViews: number;
}

export const adminStats: AdminStats = {
  totalUsers: 125430,
  activeSubscribers: 45200,
  totalContent: 2340,
  pendingReviews: 12,
  dailyActiveUsers: 8500,
  monthlyViews: 1250000,
};

// Notifications
export interface Notification {
  id: string;
  type: 'content' | 'qa' | 'community' | 'system';
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  actionUrl?: string;
}

export const notifications: Notification[] = [
  {
    id: '1',
    type: 'content',
    title: 'New Content Available',
    message: 'A new teaching "The Power of Faith" has been uploaded.',
    timestamp: '2025-01-11T10:00:00',
    isRead: false,
    actionUrl: '/library/1',
  },
  {
    id: '2',
    type: 'qa',
    title: 'Q&A Session Starting Soon',
    message: 'Live Q&A with Pastor Chris starts in 30 minutes.',
    timestamp: '2025-01-11T09:30:00',
    isRead: false,
    actionUrl: '/qa/1',
  },
  {
    id: '3',
    type: 'community',
    title: 'Someone replied to your comment',
    message: 'Grace Adeyemi replied to your comment on the community post.',
    timestamp: '2025-01-10T18:00:00',
    isRead: true,
    actionUrl: '/community/post/1',
  },
];

// FAQ
export interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

export const faqItems: FAQItem[] = [
  {
    question: 'How do I cancel my subscription?',
    answer: 'You can cancel your subscription at any time from your Profile > Manage Subscription page. Your access will continue until the end of your current billing period.',
    category: 'Billing',
  },
  {
    question: 'Can I download content for offline viewing?',
    answer: 'Yes! Premium subscribers can download any content for offline viewing. Downloads are available for 30 days.',
    category: 'Content',
  },
  {
    question: 'How do I submit content as a pastor?',
    answer: 'Verified pastors can submit content through Profile > Upload. All submissions go through a review process before being published.',
    category: 'Uploads',
  },
  {
    question: 'What devices are supported?',
    answer: 'SOM CONNECT is available on iOS, Android, and web browsers. You can access your account from any device.',
    category: 'Technical',
  },
  {
    question: 'How do I reset my password?',
    answer: 'Click "Forgot Password" on the login screen and enter your email. You\'ll receive a password reset link within minutes.',
    category: 'Account',
  },
];
