import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(3).max(128),
  name: z.string().min(2).max(100),
  affiliation: z.string().max(200).optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(3),
});

export const contentCreateSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().min(10).max(5000),
  thumbnail: z.string().url().optional(),
  duration: z.string().regex(/^\d+:\d{2}(:\d{2})?$/).or(z.string().min(2)).default('45:00'),
  speakerId: z.string().min(1),
  category: z.enum(['conference','workshop','podcast','media-series','original']),
  tags: z.array(z.string()).max(10).default([]),
  isPremium: z.boolean().optional().default(false),
  videoUrl: z.string().optional(),
});

export const confessionSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  title: z.string().min(3).max(200),
  content: z.string().min(10).max(5000),
  scripture: z.string().min(5).max(1000),
  scriptureRef: z.string().min(2).max(200),
});

export const rorSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  title: z.string().min(3).max(200),
  theme: z.string().min(3).max(200),
  scripture: z.string().min(5).max(1000),
  scriptureRef: z.string().min(2).max(200),
  content: z.string().min(20).max(10000),
  prayer: z.string().min(10).max(2000),
  furtherStudy: z.array(z.string()).optional(),
  dailyScriptureReading: z.array(z.string()).optional(),
});

export const qaSessionSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().max(2000).optional(),
  speakerId: z.string().min(1),
  date: z.string(), // ISO
  status: z.enum(['upcoming','live','archived','cancelled']).default('upcoming'),
  thumbnail: z.string().url().optional(),
  duration: z.string().optional(),
});

export const communityPostSchema = z.object({
  content: z.string().min(1).max(5000),
  imageUrl: z.string().url().optional().nullable(),
  videoUrl: z.string().url().optional().nullable(),
  visibility: z.enum(['public','group','private']).optional().default('public'),
  groupId: z.string().optional().nullable(),
});

export const commentSchema = z.object({
  text: z.string().min(1).max(2000),
  parentId: z.string().optional().nullable(),
});

export const playlistSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
  thumbnail: z.string().url().optional().nullable(),
  isPublic: z.boolean().optional().default(false),
  isCollaborative: z.boolean().optional().default(false),
});

export const subscriptionPlanSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
  price: z.number().min(0),
  currency: z.string().default('USD'),
  interval: z.enum(['monthly','annually','lifetime']),
  features: z.array(z.string()),
  isPopular: z.boolean().optional().default(false),
  trialDays: z.number().min(0).optional().default(0),
});

export const publicationSchema = z.object({
  title: z.string().min(3).max(200),
  type: z.enum(['magazine','newsletter','book','devotional']),
  cover: z.string().url(),
  issueDate: z.string(),
  pages: z.number().min(1),
  description: z.string().min(10).max(2000),
  isPremium: z.boolean().optional().default(false),
});

export const speakerSchema = z.object({
  name: z.string().min(2).max(100),
  title: z.string().min(2).max(200),
  avatar: z.string().url(),
  bio: z.string().max(2000).optional(),
});

export function validate<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data);
  if (!result.success) {
    const msg = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
    return { success: false, error: msg };
  }
  return { success: true, data: result.data };
}
