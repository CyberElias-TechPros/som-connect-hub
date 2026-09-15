/**
 * SOM CONNECT — daily spiritual tools content pipeline.
 *
 * Confessions and Rhapsody-of-Realities readings are deterministic per date:
 * the same day always yields the same devotional for every user, and any date
 * can be generated on demand (so the app never dead-ends on "not found").
 */
import type { Env } from './db';
import { generateId } from './auth';

export interface ConfessionTemplate {
  title: string;
  content: string;
  scripture: string;
  scriptureRef: string;
}

export interface RorTemplate {
  title: string;
  theme: string;
  scripture: string;
  scriptureRef: string;
  content: string;
  prayer: string;
  furtherStudy: string[];
  dailyScriptureReading: string[];
}

export const CONFESSION_TEMPLATES: ConfessionTemplate[] = [
  { title: 'I Am More Than a Conqueror', content: 'I declare today that I am more than a conqueror through Christ who loves me. No weapon formed against me shall prosper, and every contrary situation bows to the Name of Jesus.', scripture: 'Nay, in all these things we are more than conquerors through him that loved us.', scriptureRef: 'Romans 8:37' },
  { title: 'Divine Wisdom Flows Through Me', content: 'I walk in divine wisdom today. The wisdom of God is at work in me, guiding my decisions, my words and my steps, causing me to excel in everything I do.', scripture: 'If any of you lack wisdom, let him ask of God, that giveth to all men liberally.', scriptureRef: 'James 1:5' },
  { title: 'I Walk in Divine Health', content: 'The life of God is at work in every part of my body. I am strong, I am whole, and I am full of vitality because the same Spirit that raised Christ dwells in me.', scripture: 'But if the Spirit of him that raised up Jesus from the dead dwell in you, he shall quicken your mortal bodies.', scriptureRef: 'Romans 8:11' },
  { title: 'Favoured Everywhere I Go', content: 'I am favoured of God and of men. Doors of opportunity open to me today, and I find grace in the sight of everyone I meet.', scripture: 'For thou shalt be in league with the stones of the field: and the beasts of the field shall be at peace with thee.', scriptureRef: 'Job 5:23' },
  { title: 'I Am the Light of the World', content: 'I am the light of the world; my life brings glory to God. Everywhere I go, I dispel darkness and bring hope, joy and healing.', scripture: 'Ye are the light of the world. A city that is set on an hill cannot be hid.', scriptureRef: 'Matthew 5:14' },
  { title: 'Peace Rules in My Heart', content: 'The peace of God, which surpasses all understanding, guards my heart and my mind today. I refuse to be anxious about anything.', scripture: 'And the peace of God, which passeth all understanding, shall keep your hearts and minds through Christ Jesus.', scriptureRef: 'Philippians 4:7' },
  { title: 'I Am Blessed to Be a Blessing', content: 'God has blessed me richly so that I can be a blessing to others. Today, my words, my resources and my time bring life to everyone around me.', scripture: 'Blessed be the God and Father of our Lord Jesus Christ, who hath blessed us with all spiritual blessings in heavenly places in Christ.', scriptureRef: 'Ephesians 1:3' },
];

export const ROR_TEMPLATES: RorTemplate[] = [
  { title: 'Living in the Spirit', theme: 'The Spirit-Filled Life', scripture: 'For as many as are led by the Spirit of God, they are the sons of God.', scriptureRef: 'Romans 8:14', content: 'The Christian life is one that is lived in and by the Spirit. We are not merely influenced by the Spirit; we are indwelt by Him. As you yield to Him today, His wisdom directs your decisions and His power confirms your words.', prayer: 'Dear Father, I thank You for the gift of the Holy Spirit. I yield myself completely to His guidance today, in Jesus Name. Amen.', furtherStudy: ['Galatians 5:16-25', 'Romans 8:1-14', 'Ephesians 5:18-21'], dailyScriptureReading: ['Genesis 25-26', 'Matthew 11'] },
  { title: 'The Word Is Your Foundation', theme: 'Built on the Word', scripture: 'Heaven and earth shall pass away, but my words shall not pass away.', scriptureRef: 'Matthew 24:35', content: 'Everything God has said is eternally settled. When you build your life on the Word, you build on an unshakeable foundation that no storm can move. Give the Word first place today.', prayer: 'Father, Your Word is my foundation. I build my life, my family and my future on it today, in Jesus Name. Amen.', furtherStudy: ['Psalm 119:89-105', 'Matthew 7:24-27', '1 Peter 1:24-25'], dailyScriptureReading: ['Genesis 23-24', 'Matthew 10'] },
  { title: 'Pray Without Ceasing', theme: 'The Life of Prayer', scripture: 'Pray without ceasing. In every thing give thanks.', scriptureRef: '1 Thessalonians 5:17-18', content: 'Prayer is not an event in your day, it is the atmosphere of your life. Continuous communion with the Father keeps your heart steady, your vision clear and your spirit strong.', prayer: 'Lord, I keep my heart in fellowship with You today. Thank You for hearing me always, in Jesus Name. Amen.', furtherStudy: ['Luke 18:1-8', 'Ephesians 6:18', 'James 5:16'], dailyScriptureReading: ['Genesis 27-28', 'Matthew 12'] },
  { title: 'Grace for Every Assignment', theme: 'Sufficient Grace', scripture: 'My grace is sufficient for thee: for my strength is made perfect in weakness.', scriptureRef: '2 Corinthians 12:9', content: 'The Lord has given you an assignment matched by His grace. Whatever He calls you to do comes with the ability to do it well. Do not shrink back; step forward in His strength.', prayer: 'Father, thank You for the grace that empowers me for every assignment. I step forward boldly today, in Jesus Name. Amen.', furtherStudy: ['2 Corinthians 9:8', 'Philippians 4:13', 'Hebrews 4:16'], dailyScriptureReading: ['Genesis 29-30', 'Matthew 13'] },
  { title: 'A Heart of Gratitude', theme: 'Thanksgiving Wins', scripture: 'In every thing give thanks: for this is the will of God in Christ Jesus concerning you.', scriptureRef: '1 Thessalonians 5:18', content: 'Gratitude is the language of faith. When you give thanks in everything, you acknowledge that God is working all things for your good, and your joy becomes unshakeable.', prayer: 'Dear Father, thank You for Your goodness and mercy. I choose gratitude today, in Jesus Name. Amen.', furtherStudy: ['Psalm 100', 'Colossians 3:15-17', 'Philippians 4:6-7'], dailyScriptureReading: ['Genesis 31-32', 'Matthew 14'] },
  { title: 'Soul Winning Priority', theme: 'Fishers of Men', scripture: 'Follow me, and I will make you fishers of men.', scriptureRef: 'Matthew 4:19', content: 'We are called to be witnesses. Every believer carries a divine mandate to bring the lost into the knowledge of Christ. Be intentional today; someone is waiting for your word.', prayer: 'Lord, use me today as a vessel of salvation. Give me boldness and the right words, in Jesus Name. Amen.', furtherStudy: ['Acts 1:8', 'Luke 15:1-10', 'Romans 10:13-15'], dailyScriptureReading: ['Genesis 33-34', 'Matthew 15'] },
  { title: 'Growing in the Word', theme: 'Spiritual Growth', scripture: 'As newborn babes, desire the sincere milk of the word, that ye may grow thereby.', scriptureRef: '1 Peter 2:2', content: 'Growth is intentional. Feeding on the Word daily builds spiritual stamina and insight, causing you to mature into all God has called you to be.', prayer: 'Father, I hunger for Your Word. Feed me daily and cause me to grow into maturity, in Jesus Name. Amen.', furtherStudy: ['2 Timothy 3:14-17', 'Joshua 1:8', 'Psalm 1:1-3'], dailyScriptureReading: ['Genesis 35-36', 'Matthew 16'] },
];

/** Days since epoch — stable, timezone-independent rotation index. */
export function dayIndex(date: string): number {
  const parsed = Date.parse(`${date}T00:00:00Z`);
  if (Number.isNaN(parsed)) return 0;
  return Math.floor(parsed / 86_400_000);
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function isValidDate(value: string | undefined): value is string {
  return !!value && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

export function confessionForDate(date: string) {
  const template = CONFESSION_TEMPLATES[((dayIndex(date) % CONFESSION_TEMPLATES.length) + CONFESSION_TEMPLATES.length) % CONFESSION_TEMPLATES.length];
  return { id: `conf_${date}`, date, ...template, audio_url: '/audio/daily-confession.mp3' };
}

export function rorForDate(date: string) {
  const template = ROR_TEMPLATES[((dayIndex(date) % ROR_TEMPLATES.length) + ROR_TEMPLATES.length) % ROR_TEMPLATES.length];
  return {
    id: `ror_${date}`,
    date,
    ...template,
    further_study: JSON.stringify(template.furtherStudy),
    daily_scripture_reading: JSON.stringify(template.dailyScriptureReading),
  };
}

/** Insert into daily_confessions if the date has no row yet. Returns the row. */
export async function ensureConfessionForDate(env: Env, date: string) {
  const existing = await env.DB.prepare('SELECT * FROM daily_confessions WHERE date = ?').bind(date).first<any>();
  if (existing) return existing;
  const generated = confessionForDate(date);
  await env.DB.prepare(
    'INSERT INTO daily_confessions (id, date, title, content, scripture, scripture_ref, audio_url) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(date) DO NOTHING',
  )
    .bind(generated.id, generated.date, generated.title, generated.content, generated.scripture, generated.scriptureRef, generated.audio_url)
    .run();
  return (await env.DB.prepare('SELECT * FROM daily_confessions WHERE date = ?').bind(date).first<any>()) ?? generated;
}

/** Insert into ror_readings if the date has no row yet. Returns the row. */
export async function ensureRorForDate(env: Env, date: string) {
  const existing = await env.DB.prepare('SELECT * FROM ror_readings WHERE date = ?').bind(date).first<any>();
  if (existing) return existing;
  const generated = rorForDate(date);
  await env.DB.prepare(
    'INSERT INTO ror_readings (id, date, title, theme, scripture, scripture_ref, content, prayer, further_study, daily_scripture_reading) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(date) DO NOTHING',
  )
    .bind(generated.id, generated.date, generated.title, generated.theme, generated.scripture, generated.scriptureRef, generated.content, generated.prayer, generated.further_study, generated.daily_scripture_reading)
    .run();
  return (await env.DB.prepare('SELECT * FROM ror_readings WHERE date = ?').bind(date).first<any>()) ?? generated;
}

/**
 * Streak maths: consecutive calendar days (ending today or yesterday) with at
 * least one completed daily tool.
 */
export function computeStreak(dates: string[], today = todayISO()): number {
  const unique = Array.from(new Set(dates)).sort((a, b) => (a < b ? 1 : -1));
  if (!unique.length) return 0;
  const dayMs = 86_400_000;
  const todayMs = Date.parse(`${today}T00:00:00Z`);
  const newest = Date.parse(`${unique[0]}T00:00:00Z`);
  const gapFromToday = Math.round((todayMs - newest) / dayMs);
  if (gapFromToday > 1) return 0;

  let streak = 1;
  for (let i = 1; i < unique.length; i += 1) {
    const prev = Date.parse(`${unique[i - 1]}T00:00:00Z`);
    const current = Date.parse(`${unique[i]}T00:00:00Z`);
    if (Math.round((prev - current) / dayMs) === 1) streak += 1;
    else break;
  }
  return streak;
}

/** Notification fan-out helper shared by routes and the queue consumer. */
export async function createNotification(
  env: Env,
  userId: string,
  type: 'content' | 'qa' | 'community' | 'system',
  title: string,
  message: string,
  actionUrl?: string,
): Promise<string> {
  const id = generateId('notif_');
  await env.DB.prepare(
    'INSERT INTO notifications (id, user_id, type, title, message, action_url) VALUES (?, ?, ?, ?, ?, ?)',
  )
    .bind(id, userId, type, title, message, actionUrl ?? null)
    .run();
  return id;
}
