/**
 * SOM CONNECT — API contract check.
 *
 * Every path the frontend service layer calls is exercised against a running
 * worker (through the Vite proxy by default, i.e. exactly what the browser
 * does). A check fails only when the worker has no such route
 * (`route_not_found`) or blows up (5xx) — expected 4xx (auth/validation) is a
 * pass, because that still proves the route, guard and handler exist.
 *
 *   node scripts/api-contract.mjs                     # via Vite proxy :8080
 *   node scripts/api-contract.mjs --api=http://127.0.0.1:8787
 *   node scripts/api-contract.mjs --api=... --verbose
 */
const args = process.argv.slice(2);
const verbose = args.includes('--verbose');
const apiArg = args.find((a) => a.startsWith('--api='));
const BASE = (apiArg ? apiArg.slice('--api='.length) : process.env.SOM_API_URL || 'http://127.0.0.1:8787').replace(/\/$/, '');

const DEMO = {
  member: { email: 'david.emmanuel@example.com', password: 'password123' },
  pastor: { email: 'pastor@example.com', password: 'pastor123' },
  admin: { email: 'admin@example.com', password: 'admin123' },
};

const formed = new FormData();
formed.append('type', 'video');
formed.append('title', 'Contract check');
formed.append('file', new Blob([new Uint8Array([0, 0, 0, 32])], { type: 'video/mp4' }), 'probe.mp4');

const jsonPost = (body) => ({ method: 'POST', body: JSON.stringify(body), contentType: 'application/json' });
const jsonPut = (body) => ({ method: 'PUT', body: JSON.stringify(body), contentType: 'application/json' });

/**
 * [name, path, { role, ...requestOptions }]
 * `role` picks the bearer token; `anon` runs signed-out.
 */
const CHECKS = [
  // meta / health
  ['meta.health', 'GET', '/health', { role: 'anon' }],
  ['meta.info', 'GET', '/meta', { role: 'anon' }],
  ['meta.speakers', 'GET', '/speakers', { role: 'anon' }],
  ['meta.speaker', 'GET', '/speakers/1', { role: 'anon' }],
  ['meta.search', 'GET', '/search?q=faith', { role: 'anon' }],
  ['meta.stats', 'GET', '/stats', { role: 'anon' }],

  // auth
  ['auth.demoAccounts', 'GET', '/auth/demo-accounts', { role: 'anon' }],
  ['auth.login', 'POST', '/auth/login', { role: 'anon', ...jsonPost(DEMO.member) }],
  ['auth.register', 'POST', '/auth/register', { role: 'anon', ...jsonPost({ name: 'Contract Probe', email: `contract-${Date.now()}@example.com`, password: 'password123' }) }],
  ['auth.forgot', 'POST', '/auth/forgot', { role: 'anon', ...jsonPost({ email: DEMO.member.email }) }],
  ['auth.reset', 'POST', '/auth/reset', { role: 'anon', ...jsonPost({ email: DEMO.member.email, token: 'invalid', password: 'password123' }) }],
  ['auth.me', 'GET', '/auth/me', { role: 'member' }],
  ['auth.session', 'GET', '/auth/session', { role: 'member' }],
  ['auth.updateProfile', 'PUT', '/auth/profile', { role: 'member', ...jsonPut({ name: 'David Emmanuel' }) }],
  ['auth.preferences', 'PUT', '/auth/preferences', { role: 'member', ...jsonPut({ theme: 'dark' }) }],
  ['auth.logout', 'POST', '/auth/logout', { role: 'member' }],

  // content
  ['content.list', 'GET', '/content?limit=4', { role: 'anon' }],
  ['content.featured', 'GET', '/content/featured', { role: 'anon' }],
  ['content.categories', 'GET', '/content/categories', { role: 'anon' }],
  ['content.detail', 'GET', '/content/1', { role: 'anon' }],
  ['content.continue', 'GET', '/content/user/continue', { role: 'member' }],
  ['content.progress', 'POST', '/content/1/progress', { role: 'member', ...jsonPost({ position: 42, duration: 600 }) }],
  ['content.progressList', 'GET', '/content/user/progress', { role: 'member' }],
  ['content.downloads', 'GET', '/content/downloads', { role: 'member' }],
  ['content.download', 'POST', '/content/1/download', { role: 'member' }],
  ['content.undownload', 'DELETE', '/content/1/download', { role: 'member' }],

  // favorites
  ['favorites.list', 'GET', '/favorites', { role: 'member' }],
  ['favorites.add', 'POST', '/favorites', { role: 'member', ...jsonPost({ contentId: '1' }) }],
  ['favorites.toggle', 'POST', '/favorites/2/toggle', { role: 'member' }],
  ['favorites.remove', 'DELETE', '/favorites/1', { role: 'member' }],
  ['favorites.clear', 'DELETE', '/favorites', { role: 'member' }],

  // playlists
  ['playlists.list', 'GET', '/playlists', { role: 'member' }],
  ['playlists.create', 'POST', '/playlists', { role: 'member', ...jsonPost({ name: 'Contract Playlist', description: 'probe', isPublic: false }) }],
  ['playlists.detail', 'GET', '/playlists/pl_seed_journey', { role: 'member' }],
  ['playlists.update', 'PUT', '/playlists/pl_seed_journey', { role: 'member', ...jsonPut({ name: 'My Faith Journey' }) }],
  ['playlists.addItem', 'POST', '/playlists/pl_seed_journey/items', { role: 'member', ...jsonPost({ contentId: '2' }) }],
  ['playlists.removeItem', 'DELETE', '/playlists/pl_seed_journey/items/2', { role: 'member' }],

  // community
  ['community.posts', 'GET', '/community/posts?limit=4&offset=0', { role: 'anon' }],
  ['community.post', 'GET', '/community/posts/1', { role: 'anon' }],
  ['community.createPost', 'POST', '/community/posts', { role: 'member', ...jsonPost({ content: 'Contract probe post' }) }],
  ['community.like', 'POST', '/community/posts/1/like', { role: 'member' }],
  ['community.comment', 'POST', '/community/posts/1/comments', { role: 'member', ...jsonPost({ content: 'Amen!' }) }],
  ['community.groups', 'GET', '/community/groups', { role: 'anon' }],
  ['community.joinGroup', 'POST', '/community/groups/1/join', { role: 'member' }],

  // Q&A
  ['qa.list', 'GET', '/qa', { role: 'anon' }],
  ['qa.detail', 'GET', '/qa/1', { role: 'anon' }],
  ['qa.ask', 'POST', '/qa/1/questions', { role: 'member', ...jsonPost({ text: 'Contract probe question?' }) }],
  // qa.upvote is added dynamically below, using the question qa.ask creates.
  ['qa.join', 'POST', '/qa/1/join', { role: 'member' }],
  ['qa.live', 'GET', '/qa/1/live', { role: 'member' }],
  ['qa.leave', 'POST', '/qa/1/leave', { role: 'member' }],

  // tools
  ['tools.bundle', 'GET', '/tools/bundle', { role: 'member' }],
  ['tools.confessions', 'GET', '/tools/confessions', { role: 'anon' }],
  ['tools.ror', 'GET', '/tools/ror', { role: 'anon' }],
  ['tools.streak', 'GET', '/tools/streak', { role: 'member' }],
  ['tools.complete', 'POST', '/tools/complete', { role: 'member', ...jsonPost({ type: 'confession' }) }],
  ['tools.publications', 'GET', '/tools/publications', { role: 'anon' }],
  ['tools.plan', 'GET', '/tools/plan?type=ror', { role: 'anon' }],

  // notifications
  ['notifications.list', 'GET', '/notifications', { role: 'member' }],
  ['notifications.unread', 'GET', '/notifications/unread-count', { role: 'member' }],
  ['notifications.settings', 'GET', '/notifications/settings', { role: 'member' }],
  ['notifications.saveSettings', 'PUT', '/notifications/settings', { role: 'member', ...jsonPut({ dailyReminders: true }) }],
  ['notifications.readAll', 'PUT', '/notifications/read-all', { role: 'member' }],
  ['notifications.read', 'PUT', '/notifications/1/read', { role: 'member' }],
  ['notifications.unreadOne', 'PUT', '/notifications/1/unread', { role: 'member' }],

  // payments / subscriptions
  ['subscriptions.plans', 'GET', '/subscriptions/plans', { role: 'anon' }],
  ['subscriptions.me', 'GET', '/subscriptions/me', { role: 'member' }],
  ['subscriptions.status', 'GET', '/subscriptions/status', { role: 'member' }],
  ['subscriptions.invoices', 'GET', '/subscriptions/invoices', { role: 'member' }],
  ['subscriptions.create', 'POST', '/subscriptions', { role: 'member', ...jsonPost({ planId: 'premium-monthly', paymentMethodId: 'pm_card_visa' }) }],
  ['subscriptions.cancel', 'POST', '/subscriptions/cancel', { role: 'member' }],
  ['subscriptions.resume', 'POST', '/subscriptions/resume', { role: 'member' }],
  ['payments.methods', 'GET', '/payments/methods', { role: 'member' }],
  ['payments.addMethod', 'POST', '/payments/methods', { role: 'member', ...jsonPost({ number: '4242424242424242', expiry: '12/30', cvc: '123', name: 'David Emmanuel' }) }],
  ['payments.billing', 'GET', '/payments/billing', { role: 'member' }],
  ['payments.saveBilling', 'PUT', '/payments/billing', { role: 'member', ...jsonPut({ country: 'NG' }) }],
  ['payments.history', 'GET', '/payments/history', { role: 'member' }],
  ['payments.intents', 'POST', '/payments/intents', { role: 'member', ...jsonPost({ amount: 9.99, currency: 'USD', planId: 'premium-monthly' }) }],
  ['payments.confirm', 'POST', '/payments/confirm', { role: 'member', ...jsonPost({ amount: 4.99, currency: 'USD', methodId: 'pm_card_visa', description: 'Contract probe' }) }],
  ['payments.validate', 'POST', '/payments/validate', { role: 'member', ...jsonPost({ number: '4242424242424242' }) }],
  ['payments.webhook', 'POST', '/payments/webhook', { role: 'anon', ...jsonPost({ id: 'evt_contract', type: 'customer.updated', data: { object: {} } }) }],
  ['subscriptions.renew', 'POST', '/subscriptions/renew', { role: 'pastor', ...jsonPost({}) }],
  ['subscriptions.processDue', 'POST', '/subscriptions/process-due', { role: 'admin', ...jsonPost({}) }],
  ['subscriptions.invoiceDetail', 'GET', '/subscriptions/invoices/inv_probe', { role: 'member' }],
  ['meta.devOutbox', 'GET', '/dev/outbox', { role: 'anon' }],

  // uploads
  ['uploads.create', 'POST', '/uploads', { role: 'pastor', body: formed }],
  ['uploads.mine', 'GET', '/uploads', { role: 'pastor' }],
  ['uploads.all', 'GET', '/uploads/all', { role: 'pastor' }],
  ['uploads.stats', 'GET', '/uploads/stats', { role: 'pastor' }],

  // admin
  ['admin.stats', 'GET', '/admin/stats', { role: 'admin' }],
  ['admin.analytics', 'GET', '/admin/analytics?days=7', { role: 'admin' }],
  ['admin.users', 'GET', '/admin/users?limit=5', { role: 'admin' }],
  ['admin.auditLogs', 'GET', '/admin/audit-logs?limit=5', { role: 'admin' }],
  ['admin.uploads', 'GET', '/admin/uploads', { role: 'admin' }],
  ['admin.moderation', 'GET', '/admin/moderation/posts', { role: 'admin' }],
  ['admin.broadcast', 'POST', '/admin/broadcast', { role: 'admin', ...jsonPost({ title: 'Probe', message: 'Contract probe broadcast' }) }],
];

async function token(role) {
  if (role === 'anon') return null;
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(DEMO[role]),
  });
  const json = await res.json().catch(() => ({}));
  const value = json?.data?.token ?? json?.token;
  if (!value) throw new Error(`could not sign in as ${role}: ${res.status} ${JSON.stringify(json).slice(0, 120)}`);
  return value;
}

async function request(path, method, options, bearer) {
  const headers = {};
  if (options.contentType) headers['Content-Type'] = options.contentType;
  if (bearer) headers.Authorization = `Bearer ${bearer}`;
  const res = await fetch(`${BASE}/api${path}`, {
    method,
    headers,
    body: method === 'GET' || method === 'HEAD' ? undefined : options.body,
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* html or empty */
  }
  const code = json?.code ?? json?.error?.code;
  const message = json?.error?.message ?? json?.error ?? json?.message ?? text.slice(0, 80);
  return { status: res.status, code, json, message: typeof message === 'string' ? message : JSON.stringify(message) };
}

const tokens = {};
let passed = 0;
let checked = 0;
const failures = [];
let askedQuestionId = null;

for (const [name, method, path, options = {}] of CHECKS) {
  checked += 1;
  const role = options.role ?? 'anon';
  try {
    if (role !== 'anon' && !tokens[role]) tokens[role] = await token(role);
    const bearer = role === 'anon' ? null : tokens[role];
    const { status, code, json, message } = await request(path, method, options, bearer);
    if (name === 'qa.ask') {
      askedQuestionId = json?.data?.id ?? json?.id ?? json?.data?.question?.id ?? null;
    }
    const broken = status >= 500 || code === 'route_not_found' || (status === 404 && /no api route/i.test(message));
    if (broken) {
      failures.push(`${name} ${method} ${path} → ${status} ${message}`);
      console.log(`✖ ${name.padEnd(26)} ${String(status).padEnd(4)} ${message}`);
    } else {
      passed += 1;
      if (verbose) console.log(`✔ ${name.padEnd(26)} ${String(status).padEnd(4)} ${message}`);
      else process.stdout.write('.');
    }
  } catch (error) {
    failures.push(`${name} ${method} ${path} → ${error?.message ?? error}`);
    console.log(`✖ ${name.padEnd(26)} ERR  ${error?.message ?? error}`);
  }
}

/* Dynamic: upvote the question qa.ask just created. */
checked += 1;
if (!askedQuestionId) {
  failures.push('qa.upvote → could not resolve a question id from qa.ask');
  console.log('✖ qa.upvote                 —    no question id from qa.ask');
} else {
  const { status, code, message } = await request(
    `/qa/1/questions/${askedQuestionId}/upvote`,
    'POST',
    {},
    tokens.member,
  );
  if (status >= 500 || code === 'route_not_found') {
    failures.push(`qa.upvote POST /qa/1/questions/${askedQuestionId}/upvote → ${status} ${message}`);
    console.log(`✖ qa.upvote                   ${String(status).padEnd(4)} ${message}`);
  } else {
    passed += 1;
    if (verbose) console.log(`✔ qa.upvote                   ${String(status).padEnd(4)} ${message}`);
    else process.stdout.write('.');
  }
}

console.log('\n');
if (failures.length) {
  console.log(`${passed}/${checked} routes reachable — missing:\n  - ${failures.join('\n  - ')}`);
  process.exit(1);
}
console.log(`${passed}/${checked} frontend API paths reachable on ${BASE} ✅`);
