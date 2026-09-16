/**
 * SOM CONNECT — transactional email.
 *
 * One `sendEmail()` entry point with two transports:
 *
 *  - **Resend** when `RESEND_API_KEY` is configured (production/staging).
 *  - **Outbox** otherwise: the message is logged and kept in KV so local dev,
 *    tests and previews can read exactly what *would* have been sent
 *    (`GET /api/dev/outbox`). No flow ever depends on a live provider, which
 *    keeps the happy path working with zero setup — the same philosophy as the
 *    rest of the API.
 *
 * All app emails are built here as templates so the copy lives in one place.
 */
import type { Env } from './db';

const OUTBOX_KEY = 'email:outbox';
const OUTBOX_LIMIT = 50;

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
  /** Machine-readable label used by tests and the dev outbox. */
  tag: string;
  replyTo?: string;
}

export interface EmailResult {
  id: string;
  delivered: boolean;
  transport: 'resend' | 'outbox';
  error?: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* ------------------------------------------------------------------ *
 * Layout
 * ------------------------------------------------------------------ */

export function layout(title: string, body: string, cta?: { label: string; url: string }): string {
  const button = cta
    ? `<tr><td style="padding:8px 32px 32px"><a href="${cta.url}" style="display:inline-block;background:#0B0F1A;color:#fff;text-decoration:none;padding:14px 26px;border-radius:999px;font-weight:600;font-family:Helvetica,Arial,sans-serif;font-size:15px">${escapeHtml(cta.label)}</a></td></tr>`
    : '';
  return `<!doctype html><html><body style="margin:0;background:#F5F5F4;padding:32px 12px;font-family:Helvetica,Arial,sans-serif;color:#0B0F1A">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:24px;overflow:hidden">
  <tr><td style="padding:28px 32px 12px;font-size:13px;letter-spacing:.14em;text-transform:uppercase;color:#71717A">SOM CONNECT</td></tr>
  <tr><td style="padding:0 32px 12px;font-size:26px;line-height:1.2;font-weight:700">${escapeHtml(title)}</td></tr>
  <tr><td style="padding:0 32px 24px;font-size:15px;line-height:1.65;color:#3F3F46">${body}</td></tr>
  ${button}
  <tr><td style="padding:20px 32px 28px;border-top:1px solid #E4E4E7;font-size:12px;color:#71717A">
    SOM CONNECT — School of Ministry. You are receiving this because you have an account.
    Need help? Reply to this email or visit the Help centre in the app.
  </td></tr>
</table></td></tr></table></body></html>`;
}

/* ------------------------------------------------------------------ *
 * Templates
 * ------------------------------------------------------------------ */

export const templates = {
  welcome: (name: string): Omit<EmailMessage, 'to'> => ({
    tag: 'welcome',
    subject: 'Welcome to SOM CONNECT 🎉',
    html: layout(
      `Welcome, ${name}!`,
      `Your account is ready. Inside you'll find thousands of teachings, daily confessions, the Rhapsody reading plan, live Q&amp;A and a global community.<br/><br/>Everything works offline too — download what you love and keep growing.`,
      { label: 'Open SOM CONNECT', url: '/' },
    ),
    text: `Welcome to SOM CONNECT, ${name}! Your account is ready. Open the app to explore teachings, daily tools and community.`,
  }),

  passwordReset: (name: string, token: string, link: string): Omit<EmailMessage, 'to'> => ({
    tag: 'password_reset',
    subject: 'Reset your SOM CONNECT password',
    html: layout(
      'Reset your password',
      `Hi ${escapeHtml(name)}, we received a request to reset your password. This link is valid for 30 minutes.<br/><br/>Your reset code is <strong>${escapeHtml(token)}</strong>.`,
      { label: 'Choose a new password', url: link },
    ),
    text: `Hi ${name}, reset your SOM CONNECT password here: ${link} (code ${token}). Valid for 30 minutes. If you did not ask for this, ignore this email.`,
  }),

  subscriptionCreated: (name: string, plan: string, amount: string, invoiceId: string): Omit<EmailMessage, 'to'> => ({
    tag: 'subscription_created',
    subject: `Your SOM CONNECT ${plan} subscription is active`,
    html: layout(
      'Premium activated',
      `Thanks ${escapeHtml(name)} — your <strong>${escapeHtml(plan)}</strong> plan is active and invoice ${escapeHtml(invoiceId)} has been paid (${escapeHtml(amount)}).<br/><br/>You now have HD streaming, offline downloads and exclusive teachings.`,
      { label: 'Manage subscription', url: '/manage-subscription' },
    ),
    text: `Thanks ${name} — your ${plan} plan is active. Invoice ${invoiceId} paid (${amount}). Manage it at /manage-subscription.`,
  }),

  uploadReviewed: (name: string, title: string, approved: boolean, feedback: string): Omit<EmailMessage, 'to'> => ({
    tag: approved ? 'upload_approved' : 'upload_rejected',
    subject: approved ? `"${title}" is now live` : `Update on "${title}"`,
    html: layout(
      approved ? 'Your teaching is live' : 'Your submission needs a change',
      approved
        ? `Hi ${escapeHtml(name)}, "<strong>${escapeHtml(title)}</strong>" passed review and is now available in the library. Thank you for building the body of Christ!`
        : `Hi ${escapeHtml(name)}, "<strong>${escapeHtml(title)}</strong>" was not approved yet.<br/><br/><em>${escapeHtml(feedback || 'Please review the guidelines and resubmit.')}</em>`,
      { label: approved ? 'See it in the library' : 'Open submissions', url: approved ? '/library' : '/submissions' },
    ),
    text: approved
      ? `Your teaching "${title}" is now live in SOM CONNECT.`
      : `"${title}" was not approved. ${feedback || 'Please review the guidelines and resubmit.'}`,
  }),

  newContent: (name: string, title: string, url: string): Omit<EmailMessage, 'to'> => ({
    tag: 'new_content',
    subject: `New teaching: ${title}`,
    html: layout(
      'New this week',
      `Hi ${escapeHtml(name)}, "<strong>${escapeHtml(title)}</strong>" has just been published — watch it now while it's fresh.`,
      { label: 'Watch now', url },
    ),
    text: `New in SOM CONNECT: "${title}". Watch it at ${url}`,
  }),
};

/* ------------------------------------------------------------------ *
 * Sending
 * ------------------------------------------------------------------ */

async function writeOutbox(env: Env, message: EmailMessage, id: string, error?: string): Promise<void> {
  if (!env.CACHE) return;
  try {
    const existing = (await env.CACHE.get<{ id: string; to: string; subject: string; tag: string; text: string; at: string; error?: string }[]>(OUTBOX_KEY, 'json')) ?? [];
    const next = [
      ...existing.slice(-(OUTBOX_LIMIT - 1)),
      { id, to: message.to, subject: message.subject, tag: message.tag, text: message.text, at: new Date().toISOString(), error },
    ];
    await env.CACHE.put(OUTBOX_KEY, JSON.stringify(next), { expirationTtl: 86_400 });
  } catch {
    /* the outbox is a convenience — never fail a user flow over it */
  }
}

export async function sendEmail(env: Env, message: EmailMessage): Promise<EmailResult> {
  const id = `em_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  const apiKey = env.RESEND_API_KEY?.trim();
  const from = env.EMAIL_FROM?.trim() || 'SOM CONNECT <no-reply@somconnect.org>';

  if (!apiKey) {
    console.log(`[email:outbox] ${message.tag} → ${message.to} :: ${message.subject}`);
    await writeOutbox(env, message, id);
    return { id, delivered: true, transport: 'outbox' };
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: [message.to],
        subject: message.subject,
        html: message.html,
        text: message.text,
        reply_to: message.replyTo ?? env.SUPPORT_EMAIL,
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new Error(`Resend responded ${response.status}: ${detail.slice(0, 200)}`);
    }

    const payload = (await response.json().catch(() => ({}))) as { id?: string };
    await writeOutbox(env, message, payload.id ?? id);
    return { id: payload.id ?? id, delivered: true, transport: 'resend' };
  } catch (error: any) {
    // Never let a provider outage break the product flow: log, record, carry on.
    console.error('[email] send failed', message.tag, error?.message ?? error);
    await writeOutbox(env, message, id, error?.message ?? 'send failed');
    return { id, delivered: false, transport: 'resend', error: error?.message ?? 'send failed' };
  }
}

/** Read the dev outbox (local/preview only — the route guards by ENV). */
export async function readOutbox(env: Env): Promise<any[]> {
  if (!env.CACHE) return [];
  return (await env.CACHE.get<any[]>(OUTBOX_KEY, 'json')) ?? [];
}

/** Test helper: wipe the outbox between assertions. */
export async function clearOutbox(env: Env): Promise<void> {
  await env.CACHE?.delete(OUTBOX_KEY).catch(() => undefined);
}

export function appBaseUrl(env: Env): string {
  return (env.FRONTEND_URL?.trim() || 'http://localhost:8080').replace(/\/$/, '');
}
