#!/usr/bin/env node
/**
 * SOM CONNECT — end-to-end happy-path smoke test
 *
 * Runs against a live worker (local `wrangler dev` or a deployed URL) and walks
 * every user journey the frontend performs. Usage:
 *
 *   npm test                                   # http://127.0.0.1:8787
 *   node test/smoke.test.mjs --base=https://api.example.com
 *   node test/smoke.test.mjs --ci               # compact output for CI
 */
const args = process.argv.slice(2);
const baseArg = args.find((arg) => arg.startsWith('--base='));
const BASE = (baseArg ? baseArg.split('=')[1] : 'http://127.0.0.1:8787').replace(/\/$/, '');
const CI = args.includes('--ci');

const state = { token: null, userId: null, contentId: null, playlistId: null, postId: null, sessionId: null, planId: null, uploadId: null };
const results = [];

function log(...parts) {
  if (!CI) console.log(...parts);
}

async function call(method, path, { body, token = state.token, raw = false, headers = {} } = {}) {
  const response = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      ...(raw ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: raw ? body : body === undefined ? undefined : JSON.stringify(body),
  });

  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text.slice(0, 200) };
  }
  return { status: response.status, ok: response.ok, json };
}

function record(name, passed, detail = '') {
  results.push({ name, passed, detail });
  const icon = passed ? '✔' : '✘';
  const suffix = detail ? ` — ${String(detail).replace(/\s+/g, ' ').slice(0, 160)}` : '';
  console.log(`${icon} ${name}${suffix}`);
}

async function expect(name, method, path, options = {}, assertion = () => true) {
  try {
    const response = await call(method, path, options);
    // Some happy paths are "graceful failure": 4xx with a friendly JSON body.
    const expectedStatuses = options.expectStatus ? [options.expectStatus].flat() : null;
    if (!response.ok && !(expectedStatuses && expectedStatuses.includes(response.status))) {
      record(name, false, `HTTP ${response.status} ${JSON.stringify(response.json)?.slice(0, 140)}`);
      return response;
    }
    const check = assertion(response.json, response);
    if (check !== true) {
      record(name, false, typeof check === 'string' ? check : 'assertion failed');
      return response;
    }
    record(name, true, `HTTP ${response.status}`);
    return response;
  } catch (error) {
    record(name, false, error.message);
    return { status: 0, ok: false, json: null };
  }
}

/* ------------------------------------------------------------------ */
/* Journeys                                                            */
/* ------------------------------------------------------------------ */

async function main() {
  console.log(`\nSOM CONNECT smoke test → ${BASE}\n${'-'.repeat(60)}`);

  /* 1. Health & meta */
  await expect('health check', 'GET', '/api/health', {}, (json) => json?.healthy !== false || 'unhealthy');
  await expect('api root', 'GET', '/api', {}, (json) => json?.status === 'operational' || 'missing status');
  await expect('runtime meta', 'GET', '/api/meta', {}, (json) => !!json?.features || 'missing features');
  await expect('platform stats', 'GET', '/api/stats', {}, (json) => typeof json?.members === 'number' || 'missing members');
  await expect('legacy root health (unprefixed)', 'GET', '/health', {}, (json) => !!json?.status || 'no status');

  /* 2. Auth */
  const email = `smoke.${Date.now()}@example.com`;
  const register = await expect(
    'register new member',
    'POST',
    '/api/auth/register',
    { token: null, body: { email, password: 'password123', name: 'Smoke Tester', affiliation: 'SOM Community' } },
    (json) => json?.token && json?.user?.email === email ? true : 'missing token/user',
  );
  if (register.json?.token) {
    state.token = register.json.token;
    state.userId = register.json.user.id;
  }

  await expect('register existing email auto-signs in', 'POST', '/api/auth/register', {
    body: { email, password: 'password123', name: 'Smoke Tester' },
  }, (json) => !!json?.token || 'no token');

  const demoLogin = await expect('seeded member login (documented password)', 'POST', '/api/auth/login', {
    token: null,
    body: { email: 'david.emmanuel@example.com', password: 'password123' },
  }, (json) => !!json?.token || 'no token');

  await expect('login provisions unknown email (happy path)', 'POST', '/api/auth/login', {
    token: null,
    body: { email: `newcomer.${Date.now()}@example.com`, password: 'welcome1' },
  }, (json) => !!json?.token || 'no token');

  await expect('demo accounts listing', 'GET', '/api/auth/demo-accounts', { token: null }, (json) => Array.isArray(json?.items) || 'not an array');
  await expect('session probe', 'GET', '/api/auth/session', {}, (json) => json?.authenticated === true || 'not authenticated');
  await expect('current user', 'GET', '/api/auth/me', {}, (json) => json?.user?.id === state.userId ? true : 'wrong user');
  await expect('profile update', 'PUT', '/api/auth/profile', {
    body: { bio: 'Smoke tested bio', affiliation: 'SOM Community', preferences: { theme: 'dark' } },
  }, (json) => json?.user?.bio === 'Smoke tested bio' || 'bio not saved');
  await expect('forgot password issues reset', 'POST', '/api/auth/forgot', { body: { email } }, (json) => !!json?.resetToken || 'no reset token');
  await expect('password reset completes', 'POST', '/api/auth/reset', {
    body: { email, password: 'password456' },
  }, (json) => !!json?.token || 'no token');

  // Restore token to the primary smoke user.
  if (register.json?.token) state.token = register.json.token;

  /* 3. Content library */
  const content = await expect('content list', 'GET', '/api/content?limit=5', {}, (json) => Array.isArray(json?.items) || 'no items');
  state.contentId = content.json?.items?.[0]?.id ?? '1';

  await expect('content list is filterable', 'GET', '/api/content?category=podcast&limit=3', {}, (json) => (json?.items ?? []).every((i) => i.category === 'podcast') || 'filter failed');
  await expect('content sorting by views', 'GET', '/api/content?sort=views&limit=3', {}, (json) => {
    const views = (json?.items ?? []).map((i) => i.views);
    return views.every((v, i) => i === 0 || views[i - 1] >= v) || 'not sorted';
  });
  await expect('premium filter', 'GET', '/api/content?premium=true&limit=3', {}, (json) => (json?.items ?? []).every((i) => i.isPremium) || 'premium filter failed');
  await expect('content categories', 'GET', '/api/content/categories', {}, (json) => Array.isArray(json?.items) || 'no categories');
  await expect('featured rails', 'GET', '/api/content/featured', {}, (json) => Array.isArray(json?.rails) || 'no rails');
  await expect('content detail', 'GET', `/api/content/${state.contentId}`, {}, (json) => json?.id === state.contentId ? true : 'wrong item');
  await expect('content detail returns related', 'GET', `/api/content/${state.contentId}`, {}, (json) => Array.isArray(json?.related) || 'no related');
  await expect(
    'missing content returns friendly 404',
    'GET',
    '/api/content/does-not-exist',
    { token: null, expectStatus: 404 },
    (json) => (json?.ok === false && typeof json?.error === 'string' ? true : 'no friendly error body'),
  );
  await expect('progress saved', 'POST', `/api/content/${state.contentId}/progress`, { body: { progress: 42, positionSeconds: 900 } }, (json) => json?.progress === 42 || 'progress mismatch');
  await expect('continue watching', 'GET', '/api/content/user/continue', {}, (json) => Array.isArray(json?.items) || 'no items');
  await expect('progress map', 'GET', '/api/content/user/progress', {}, (json) => !!json?.map || 'no map');
  await expect('download register', 'POST', `/api/content/${state.contentId}/download`, {}, (json) => !!json?.message || 'no message');
  await expect('download list', 'GET', '/api/content/downloads', {}, (json) => Array.isArray(json?.items) || 'no items');
  await expect('download remove', 'DELETE', `/api/content/${state.contentId}/download`, {}, (json) => !!json?.message || 'no message');

  /* 4. Speakers & search */
  await expect('speakers list', 'GET', '/api/speakers', {}, (json) => Array.isArray(json?.items) || 'no speakers');
  await expect('speaker detail', 'GET', '/api/speakers/1', {}, (json) => !!json?.speaker || 'no speaker');
  await expect('global search', 'GET', '/api/search?q=faith', {}, (json) => !!json?.groups || 'no groups');
  await expect('empty search is safe', 'GET', '/api/search?q=', { token: null }, (json) => Array.isArray(json?.items) || 'no items');

  /* 5. Favorites & playlists */
  await expect('add favorite', 'POST', '/api/favorites', { body: { contentId: state.contentId, notes: 'Smoke note' } }, (json) => json?.contentId === state.contentId || 'not added');
  await expect('favorites list', 'GET', '/api/favorites', {}, (json) => (json?.items ?? []).some((i) => i.contentId === state.contentId) || 'favorite missing');
  await expect('favorite toggle', 'POST', `/api/favorites/${state.contentId}/toggle`, {}, (json) => typeof json?.isFavorited === 'boolean' || 'no toggle state');
  await expect('favorite toggle again', 'POST', `/api/favorites/${state.contentId}/toggle`, {}, (json) => json?.isFavorited === true || 'toggle back failed');

  const playlist = await expect('create playlist', 'POST', '/api/playlists', { body: { name: 'Smoke Playlist', description: 'Created by smoke test', contentIds: [state.contentId] } }, (json) => !!json?.id || 'no id');
  state.playlistId = playlist.json?.id;
  await expect('playlists list', 'GET', '/api/playlists', {}, (json) => Array.isArray(json?.items) || 'no items');
  await expect('playlist detail', 'GET', `/api/playlists/${state.playlistId}`, {}, (json) => Array.isArray(json?.items) || 'no items');
  await expect('playlist update', 'PUT', `/api/playlists/${state.playlistId}`, { body: { isPublic: true } }, (json) => json?.playlist?.isPublic === true || 'not updated');
  await expect('add playlist item (duplicate safe)', 'POST', `/api/playlists/${state.playlistId}/items`, { body: { contentId: '2' } }, (json) => !!json?.message || 'no message');
  await expect('remove playlist item', 'DELETE', `/api/playlists/${state.playlistId}/items/2`, {}, (json) => !!json?.message || 'no message');

  /* 6. Community */
  const post = await expect('create community post', 'POST', '/api/community/posts', { body: { content: 'Smoke test praise report 🙌' } }, (json) => !!json?.id || 'no id');
  state.postId = post.json?.id;
  await expect('community feed', 'GET', '/api/community/posts?limit=5', {}, (json) => Array.isArray(json?.items) || 'no items');
  await expect('like post', 'POST', `/api/community/posts/${state.postId}/like`, {}, (json) => json?.liked === true || 'not liked');
  await expect('unlike post', 'POST', `/api/community/posts/${state.postId}/like`, {}, (json) => json?.liked === false || 'not unliked');
  await expect('comment on post', 'POST', `/api/community/posts/${state.postId}/comments`, { body: { content: 'Amen!' } }, (json) => !!json?.id || 'no comment id');
  await expect('post detail with comments', 'GET', `/api/community/posts/${state.postId}`, {}, (json) => (json?.comments ?? []).length >= 1 || 'no comments');
  await expect('groups list', 'GET', '/api/community/groups', {}, (json) => Array.isArray(json?.items) || 'no groups');
  await expect('join group', 'POST', '/api/community/groups/1/join', {}, (json) => typeof json?.joined === 'boolean' || 'no join state');

  /* 7. Q&A */
  const sessions = await expect('qa sessions list', 'GET', '/api/qa', {}, (json) => Array.isArray(json?.items) || 'no sessions');
  state.sessionId = sessions.json?.items?.[0]?.id ?? '1';
  await expect('qa session detail', 'GET', `/api/qa/${state.sessionId}`, {}, (json) => Array.isArray(json?.questions) || 'no questions');
  const question = await expect('ask a question', 'POST', `/api/qa/${state.sessionId}/questions`, { body: { text: 'Smoke test question?' } }, (json) => !!json?.id || 'no id');
  const questionId = question.json?.id;
  if (questionId) {
    await expect('upvote question', 'POST', `/api/qa/${state.sessionId}/questions/${questionId}/upvote`, {}, (json) => typeof json?.upvotes === 'number' || 'no upvotes');
  }
  await expect('join live session (durable object)', 'POST', `/api/qa/${state.sessionId}/join`, {}, (json) => json?.joined === true || 'not joined');
  await expect('live counters', 'GET', `/api/qa/${state.sessionId}/live`, {}, (json) => typeof json?.participants === 'number' || 'no participants');
  await expect('leave session', 'POST', `/api/qa/${state.sessionId}/leave`, {}, (json) => json?.left === true || 'not left');

  /* 8. Daily tools */
  await expect('daily bundle', 'GET', '/api/tools/bundle', {}, (json) => !!json?.confession && !!json?.ror ? true : 'missing devotionals');
  await expect('confessions list', 'GET', '/api/tools/confessions', {}, (json) => Array.isArray(json?.items) || 'no items');
  await expect('confession for any date (generated)', 'GET', '/api/tools/confessions?date=2031-03-04', {}, (json) => json?.date === '2031-03-04' ? true : 'wrong date');
  await expect('ror list', 'GET', '/api/tools/ror', {}, (json) => Array.isArray(json?.items) || 'no items');
  await expect('ror for any date (generated)', 'GET', '/api/tools/ror?date=2031-03-04', {}, (json) => json?.date === '2031-03-04' ? true : 'wrong date');
  await expect('complete confession', 'POST', '/api/tools/complete', { body: { type: 'confession' } }, (json) => typeof json?.streak === 'number' || 'no streak');
  await expect('complete is idempotent', 'POST', '/api/tools/complete', { body: { type: 'confession' } }, (json) => json?.alreadyCompleted === true || 'not idempotent');
  await expect('complete ror', 'POST', '/api/tools/complete', { body: { type: 'ror' } }, (json) => typeof json?.streak === 'number' || 'no streak');
  await expect('streak summary', 'GET', '/api/tools/streak', {}, (json) => typeof json?.streak === 'number' || 'no streak');
  await expect('reading plan', 'GET', '/api/tools/plan?days=7', {}, (json) => (json?.items ?? []).length === 7 || 'wrong plan length');
  await expect('publications', 'GET', '/api/tools/publications', {}, (json) => Array.isArray(json?.items) || 'no publications');

  /* 9. Notifications */
  await expect('notifications list', 'GET', '/api/notifications', {}, (json) => Array.isArray(json?.items) || 'no items');
  await expect('unread count', 'GET', '/api/notifications/unread-count', {}, (json) => typeof json?.unreadCount === 'number' || 'no count');
  await expect('notification settings read', 'GET', '/api/notifications/settings', {}, (json) => !!json?.settings || 'no settings');
  await expect('notification settings write', 'PUT', '/api/notifications/settings', { body: { pushNotifications: true } }, (json) => !!json?.preferences || 'not saved');
  await expect('mark all read', 'PUT', '/api/notifications/read-all', {}, (json) => json?.unreadCount === 0 || 'unread remains');

  /* 10. Subscriptions & payments */
  const plans = await expect('subscription plans', 'GET', '/api/subscriptions/plans', {}, (json) => (json?.items ?? []).length > 0 || 'no plans');
  state.planId = plans.json?.items?.find((p) => p.isPopular)?.id ?? plans.json?.items?.[0]?.id ?? 'premium-monthly';
  await expect('subscribe (happy path)', 'POST', '/api/subscriptions', { body: { planId: state.planId } }, (json) => json?.subscription?.status === 'active' || 'not active');
  await expect('my subscription', 'GET', '/api/subscriptions/me', {}, (json) => !!json?.subscription || 'no subscription');
  await expect('subscription status', 'GET', '/api/subscriptions/status', {}, (json) => json?.isPremium === true || 'not premium');
  await expect('change plan', 'PUT', '/api/subscriptions/me', { body: { planId: 'basic-monthly' } }, (json) => !!json?.subscription || 'no subscription');
  await expect('invoices', 'GET', '/api/subscriptions/invoices', {}, (json) => Array.isArray(json?.items) || 'no invoices');
  await expect('cancel at period end', 'POST', '/api/subscriptions/cancel', { body: {} }, (json) => !!json?.message || 'no message');
  await expect('resume subscription', 'POST', '/api/subscriptions/resume', {}, (json) => !!json?.message || 'no message');
  await expect('payment methods', 'GET', '/api/payments/methods', {}, (json) => Array.isArray(json?.items) || 'no methods');
  await expect('add payment method', 'POST', '/api/payments/methods', { body: { cardNumber: '4242424242424242', expiry: '12/28', cvc: '123' } }, (json) => !!json?.method || 'no method');
  await expect('validate card', 'POST', '/api/payments/validate', { body: { cardNumber: '4242424242424242', expiry: '12/28', cvc: '123' } }, (json) => json?.valid === true || 'invalid card');
  const intent = await expect('create payment intent', 'POST', '/api/payments/intents', { body: { planId: state.planId } }, (json) => !!json?.paymentIntent?.clientSecret || 'no client secret');
  await expect('confirm payment', 'POST', '/api/payments/confirm', { body: { paymentIntentId: intent.json?.paymentIntent?.id } }, (json) => json?.paymentIntent?.status === 'succeeded' || 'not succeeded');
  await expect('billing profile read', 'GET', '/api/payments/billing', {}, (json) => !!json?.billingInfo || 'no billing info');
  await expect('billing profile write', 'PUT', '/api/payments/billing', { body: { city: 'Lagos', country: 'Nigeria' } }, (json) => json?.billingInfo?.city === 'Lagos' || 'not saved');
  await expect('payment history', 'GET', '/api/payments/history', {}, (json) => Array.isArray(json?.items) || 'no history');

  /* 11. Uploads (member → pastor/admin) */
  const form = new FormData();
  form.append('file', new Blob([new TextEncoder().encode('smoke test audio payload')], { type: 'audio/mpeg' }), 'smoke.mp3');
  form.append('type', 'audio');
  form.append('title', 'Smoke Test Upload');
  await expect('member upload accepted', 'POST', '/api/uploads', { raw: true, body: form, headers: {} }, (json) => !!json?.id || 'no upload id');
  await expect('my uploads', 'GET', '/api/uploads', {}, (json) => Array.isArray(json?.items) || 'no items');
  await expect('upload stats', 'GET', '/api/uploads/stats', {}, (json) => !!json?.counts || 'no counts');
  await expect(
    'upload without a file returns a friendly 400',
    'POST',
    '/api/uploads',
    { raw: true, expectStatus: 400, body: (() => { const f = new FormData(); f.append('title', 'no file'); return f; })() },
    (json) => (json?.ok === false ? true : 'no error body'),
  );

  /* 12. Admin journeys (seed admin credentials) */
  const adminLogin = await expect('admin login', 'POST', '/api/auth/login', {
    token: null,
    body: { email: 'admin@example.com', password: 'admin123' },
  }, (json) => !!json?.token || 'no token');

  const adminToken = adminLogin.json?.token ?? state.token;
  await expect('admin stats', 'GET', '/api/admin/stats', { token: adminToken }, (json) => typeof json?.totalUsers === 'number' || 'no stats');
  await expect('admin analytics', 'GET', '/api/admin/analytics?days=7', { token: adminToken }, (json) => (json?.series ?? []).length === 7 || 'wrong series');
  await expect('admin users', 'GET', '/api/admin/users?limit=5', { token: adminToken }, (json) => Array.isArray(json?.items) || 'no users');
  await expect('admin user role update', 'PUT', `/api/admin/users/${state.userId}/role`, { token: adminToken, body: { role: 'pastor' } }, (json) => json?.role === 'pastor' || 'role not set');
  await expect('admin uploads queue', 'GET', '/api/admin/uploads?status=pending', { token: adminToken }, (json) => Array.isArray(json?.items) || 'no uploads');
  await expect('admin broadcast', 'POST', '/api/admin/broadcast', { token: adminToken, body: { title: 'Smoke', message: 'Broadcast test' } }, (json) => typeof json?.sent === 'number' || 'no count');
  await expect('admin audit log', 'GET', '/api/admin/audit-logs', { token: adminToken }, (json) => Array.isArray(json?.items) || 'no logs');
  await expect('admin moderation posts', 'GET', '/api/admin/moderation/posts', { token: adminToken }, (json) => Array.isArray(json?.items) || 'no posts');
  await expect('admin maintenance', 'POST', '/api/admin/maintenance', { token: adminToken }, (json) => Array.isArray(json?.tables) || 'no tables');

  /* 13. Cleanup: role restore, playlist delete, post delete */
  await expect('restore member role', 'PUT', `/api/admin/users/${state.userId}/role`, { token: adminToken, body: { role: 'member' } }, (json) => json?.role === 'member' || 'role not restored');
  await expect('delete playlist', 'DELETE', `/api/playlists/${state.playlistId}`, {}, (json) => !!json?.message || 'no message');
  await expect('delete post', 'DELETE', `/api/community/posts/${state.postId}`, {}, (json) => !!json?.message || 'no message');
  await expect('clear favorites', 'DELETE', '/api/favorites', {}, (json) => !!json?.message || 'no message');

  /* 14. Guard rails (must fail cleanly, never 5xx) */
  const unauthorized = await call('GET', '/api/favorites', { token: null });
  record('unauthenticated request returns 401', unauthorized.status === 401, `HTTP ${unauthorized.status}`);

  const forbidden = await call('GET', '/api/admin/stats', { token: state.token });
  record('member blocked from admin (403)', forbidden.status === 403, `HTTP ${forbidden.status}`);

  const badUpload = await call('POST', '/api/uploads', { raw: true, body: (() => { const f = new FormData(); f.append('title', 'no file'); return f; })() });
  record('upload without file returns 4xx (no 5xx)', badUpload.status >= 400 && badUpload.status < 500, `HTTP ${badUpload.status}`);

  const notFound = await call('GET', '/api/nope', { token: null });
  record('unknown api route returns 404 json', notFound.status === 404 && !!notFound.json?.error, `HTTP ${notFound.status}`);

  const badJson = await call('POST', '/api/auth/login', { raw: true, body: '{not json', token: null, headers: { 'Content-Type': 'application/json' } });
  record('malformed JSON is handled gracefully', badJson.status >= 400 && badJson.status < 500, `HTTP ${badJson.status}`);

  if (demoLogin.json?.token) {
    const logout = await call('POST', '/api/auth/logout', { token: demoLogin.json.token });
    record('logout', logout.ok, `HTTP ${logout.status}`);
  }

  /* Summary */
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed);
  console.log(`${'-'.repeat(60)}`);
  console.log(`${passed}/${results.length} happy paths verified${failed.length ? ` — ${failed.length} failing` : ''}`);
  if (failed.length) {
    for (const failure of failed) console.log(`  ✘ ${failure.name} :: ${failure.detail}`);
    process.exit(1);
  }
  console.log('All happy paths pass ✅\n');
}

main().catch((error) => {
  console.error('Smoke test crashed:', error);
  process.exit(1);
});
