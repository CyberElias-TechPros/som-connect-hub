/**
 * SOM CONNECT — /uploads
 * R2-backed media pipeline for pastor/admin submissions, plus the public file
 * proxy used by the player and PDF viewer.
 */
import { Hono } from 'hono';
import { getFromR2, generateR2Key, isAllowedMime, publicFileUrl, MAX_UPLOAD_BYTES } from '../lib/r2';
import { audit, type AppEnv } from '../lib/middleware';
import { errorResponse, ok } from '../lib/http';
import { generateId } from '../lib/auth';

const uploads = new Hono<AppEnv>();

const VALID_TYPES = ['video', 'audio', 'thumbnail', 'avatar', 'publication'] as const;
type UploadType = (typeof VALID_TYPES)[number];

/* ------------------------------------------------------------------ *
 * GET /uploads/file/* — serve an object from R2
 * (registered before the auth-guarded list routes so media stays public)
 * ------------------------------------------------------------------ */
uploads.get('/file/*', async (c) => {
  const key = decodeURIComponent(c.req.path.replace(/^.*\/uploads\/file\//, ''));
  if (!key) return errorResponse('A storage key is required.', 400);

  const rangeHeader = c.req.header('range');
  let range: R2Range | undefined;
  let partial = false;

  if (rangeHeader) {
    // `bytes=START-END` / `bytes=START-` / `bytes=-SUFFIX` — video seeking needs
    // 206 responses, otherwise players refuse to scrub.
    const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim());
    if (match) {
      const [, startRaw, endRaw] = match;
      if (startRaw === '' && endRaw !== '') {
        range = { suffix: Number(endRaw) };
      } else if (startRaw !== '') {
        const offset = Number(startRaw);
        range = endRaw !== '' ? { offset, length: Math.max(0, Number(endRaw) - offset + 1) } : { offset };
      }
      partial = true;
    }
  }

  const object = await getFromR2(c.env.STORAGE, key, range).catch(() => null);
  if (!object) return errorResponse('That file is not available.', 404);

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);
  headers.set('Cache-Control', headers.get('Cache-Control') ?? 'public, max-age=31536000, immutable');
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Access-Control-Expose-Headers', 'Content-Range, Accept-Ranges, Content-Length');
  headers.set('Accept-Ranges', 'bytes');

  const body = (object as R2ObjectBody).body;
  const ranged = (object as { range?: { offset: number; length?: number } }).range;
  const total = (object as R2Object).size;

  if (partial && body && ranged) {
    const length = ranged.length ?? Math.max(0, total - ranged.offset);
    headers.set('Content-Range', `bytes ${ranged.offset}-${ranged.offset + length - 1}/${total}`);
    headers.set('Content-Length', String(length));
    return new Response(body, { status: 206, headers });
  }

  return new Response(body, { headers });
});

/* ------------------------------------------------------------------ *
 * POST /uploads — multipart form: file, type, title, description?
 * ------------------------------------------------------------------ */
uploads.post('/', async (c) => {
  const user = c.get('user');
  if (!user) return errorResponse('Authentication required.', 401);
  // Submitting teaching media is a creator action (story S30): pastors and
  // admins only. Members keep their avatar upload via POST /uploads/avatar.
  if (!['pastor', 'admin'].includes(user.role)) {
    return errorResponse('Only pastors and administrators can upload teachings.', 403, 'forbidden');
  }

  let form: FormData;
  try {
    form = await c.req.formData();
  } catch {
    return errorResponse('Send the upload as multipart/form-data.', 400);
  }

  const file = form.get('file');
  if (!file || typeof file === 'string') return errorResponse('Attach a file to upload.', 400);

  const type = (VALID_TYPES as readonly string[]).includes(String(form.get('type')))
    ? (String(form.get('type')) as UploadType)
    : 'video';
  const title = String(form.get('title') ?? '').trim() || (file as File).name.replace(/\.[^.]+$/, '') || 'Untitled';
  const description = String(form.get('description') ?? '');
  const categoryRaw = String(form.get('category') ?? '');
  const category = ['conference', 'workshop', 'podcast', 'media-series', 'original'].includes(categoryRaw) ? categoryRaw : null;

  const size = (file as File).size ?? 0;
  if (size > MAX_UPLOAD_BYTES) {
    return errorResponse(`Files are limited to ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)} MB per upload.`, 413);
  }
  const mime = (file as File).type || 'application/octet-stream';
  if (!isAllowedMime(type, mime)) {
    return errorResponse(`That file type (${mime}) is not supported for ${type} uploads.`, 415, 'unsupported_media_type');
  }

  const buffer = await (file as File).arrayBuffer();
  const key = generateR2Key(type, (file as File).name || `${type}.bin`, mime);

  try {
    await c.env.STORAGE.put(key, buffer, {
      httpMetadata: { contentType: mime, cacheControl: 'public, max-age=31536000, immutable' },
      customMetadata: { uploadedBy: user.id, title, type },
    });
  } catch (error: any) {
    console.error('[uploads] R2 put failed', error);
    return errorResponse('The file could not be stored. Please try again.', 502, 'storage_unavailable');
  }

  const id = generateId('up_');
  const url = publicFileUrl(c.env, key);
  const autoApprove = user.role === 'admin';

  await c.env.DB.prepare(
    `INSERT INTO pastor_uploads (id, user_id, title, description, type, status, file_url, file_size, mime_type, category, reviewed_date, reviewed_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      id,
      user.id,
      title,
      description || null,
      type,
      autoApprove ? 'approved' : 'pending',
      key,
      size,
      mime,
      category,
      autoApprove ? new Date().toISOString().slice(0, 10) : null,
      autoApprove ? user.id : null,
    )
    .run();

  audit(c, 'upload.create', 'pastor_upload', id, { type, size });

  // Admins publish straight to the library (happy path with no extra clicks).
  let contentId: string | null = null;
  if (autoApprove && (type === 'video' || type === 'audio')) {
    contentId = generateId('c_');
    const speaker = await c.env.DB.prepare('SELECT id FROM speakers ORDER BY id LIMIT 1').first<{ id: string }>();
    await c.env.DB.prepare(
      `INSERT INTO content_items (id, title, description, thumbnail, duration, speaker_id, date, category, tags, is_premium, video_url, audio_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, '[]', 0, ?, ?)`,
    )
      .bind(
        contentId,
        title,
        description || `Uploaded by ${user.name}`,
        'https://images.unsplash.com/photo-1507692049790-de58290a4334?w=600&h=340&fit=crop',
        '45:00',
        speaker?.id ?? '1',
        new Date().toISOString().slice(0, 10),
        category ?? 'workshop',
        type === 'video' ? url : null,
        type === 'audio' ? url : null,
      )
      .run();
    await c.env.DB.prepare('UPDATE pastor_uploads SET content_id = ? WHERE id = ?').bind(contentId, id).run();
  }

  return ok(
    {
      id,
      key,
      url,
      contentId,
      status: autoApprove ? 'approved' : 'pending',
      size,
      type,
      title,
      message: autoApprove
        ? 'Upload complete and published to the library.'
        : 'Upload received. It is now pending review.',
    },
    201,
  );
});

/* GET /uploads — list the caller's uploads */
uploads.get('/', async (c) => {
  const user = c.get('user');
  if (!user) return errorResponse('Authentication required.', 401);
  const rows = await c.env.DB.prepare(
    'SELECT * FROM pastor_uploads WHERE user_id = ? ORDER BY created_at DESC',
  )
    .bind(user.id)
    .all<any>();
  return ok({ items: (rows.results ?? []).map(mapUpload) });
});

/* GET /uploads/all — admin view */
uploads.get('/all', async (c) => {
  const user = c.get('user');
  if (!user) return errorResponse('Authentication required.', 401);
  if (user.role !== 'admin') return errorResponse('Only administrators can view all uploads.', 403);

  const status = c.req.query('status');
  const query =
    status && status !== 'all'
      ? 'SELECT pu.*, u.name AS user_name FROM pastor_uploads pu JOIN users u ON pu.user_id = u.id WHERE pu.status = ? ORDER BY pu.created_at DESC'
      : 'SELECT pu.*, u.name AS user_name FROM pastor_uploads pu JOIN users u ON pu.user_id = u.id ORDER BY pu.created_at DESC';

  const rows = status && status !== 'all'
    ? await c.env.DB.prepare(query).bind(status).all<any>()
    : await c.env.DB.prepare(query).all<any>();

  return ok({ items: (rows.results ?? []).map(mapUpload) });
});

/* GET /uploads/stats — moderation dashboard counters */
uploads.get('/stats', async (c) => {
  const rows = await c.env.DB.prepare('SELECT status, COUNT(*) AS n FROM pastor_uploads GROUP BY status').all<any>();
  const counts: Record<string, number> = { pending: 0, approved: 0, rejected: 0 };
  for (const row of rows.results ?? []) counts[row.status] = row.n;
  return ok({ counts, total: Object.values(counts).reduce((sum, n) => sum + n, 0) });
});

/* DELETE /uploads/:id */
uploads.delete('/:id', async (c) => {
  const user = c.get('user');
  if (!user) return errorResponse('Authentication required.', 401);
  const id = c.req.param('id');
  const row = await c.env.DB.prepare('SELECT * FROM pastor_uploads WHERE id = ?').bind(id).first<any>();
  if (!row) return errorResponse('Upload not found.', 404);
  if (row.user_id !== user.id && user.role !== 'admin') return errorResponse('You can only remove your own uploads.', 403);

  if (row.file_url) await c.env.STORAGE.delete(row.file_url).catch(() => undefined);
  await c.env.DB.prepare('DELETE FROM pastor_uploads WHERE id = ?').bind(id).run();
  return ok({ id, message: 'Upload removed.' });
});

/* ------------------------------------------------------------------ *
 * POST /uploads/avatar — quick avatar upload, no moderation
 * ------------------------------------------------------------------ */
uploads.post('/avatar', async (c) => {
  const user = c.get('user');
  if (!user) return errorResponse('Authentication required.', 401);

  const form = await c.req.formData().catch(() => null);
  const file = form?.get('file');
  if (!file || typeof file === 'string') return errorResponse('Attach an image to upload.', 400);

  const mime = (file as File).type || 'image/png';
  if (!isAllowedMime('avatar', mime)) return errorResponse('Avatars must be a JPEG, PNG, WebP or GIF image.', 415);
  if ((file as File).size > 5 * 1024 * 1024) return errorResponse('Avatars are limited to 5 MB.', 413);

  const key = generateR2Key('avatar', (file as File).name || 'avatar.png', mime);
  await c.env.STORAGE.put(key, await (file as File).arrayBuffer(), {
    httpMetadata: { contentType: mime, cacheControl: 'public, max-age=86400' },
  });

  const url = publicFileUrl(c.env, key);
  await c.env.DB.prepare('UPDATE users SET avatar = ?, updated_at = ? WHERE id = ?')
    .bind(url, new Date().toISOString(), user.id)
    .run();

  return ok({ url, key, message: 'Profile photo updated.' });
});

function mapUpload(row: any) {
  return {
    id: row.id,
    userId: row.user_id,
    userName: row.user_name ?? undefined,
    title: row.title,
    description: row.description ?? '',
    type: row.type,
    status: row.status,
    thumbnail: row.thumbnail ?? null,
    fileUrl: row.file_url ?? null,
    url: row.file_url ? `/uploads/file/${row.file_url}` : null,
    fileSize: row.file_size ?? 0,
    mimeType: row.mime_type ?? null,
    category: row.category ?? null,
    feedback: row.feedback ?? null,
    contentId: row.content_id ?? null,
    submittedDate: row.submitted_date,
    reviewedDate: row.reviewed_date ?? null,
    createdAt: row.created_at,
  };
}

export default uploads;
export { mapUpload };
