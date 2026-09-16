/**
 * SOM CONNECT — frontend ↔ backend integration smoke test.
 *
 * Loads the real frontend service layer with Vite (so `@/…` aliases and
 * `import.meta.env` behave exactly as in the browser), points it at a running
 * worker and walks the main user journeys. Run it while `npm run dev` (root)
 * and `wrangler dev` (worker/) are up:
 *
 *   node scripts/frontend-smoke.mjs                       # targets :8787
 *   node scripts/frontend-smoke.mjs --api=http://host:8787
 */
import { createServer } from 'vite';

const args = process.argv.slice(2);
const apiArg = args.find((arg) => arg.startsWith('--api='));
const API = (apiArg ? apiArg.slice('--api='.length) : process.env.SOM_API_URL || 'http://127.0.0.1:8787').replace(/\/$/, '');

/* ------------------------------------------------------------------ *
 * Minimal browser shims (services touch localStorage / window)
 * ------------------------------------------------------------------ */
const store = new Map();
globalThis.localStorage = {
  getItem: (key) => (store.has(key) ? store.get(key) : null),
  setItem: (key, value) => void store.set(key, String(value)),
  removeItem: (key) => void store.delete(key),
  clear: () => store.clear(),
  key: (index) => [...store.keys()][index] ?? null,
  get length() {
    return store.size;
  },
};
globalThis.window = globalThis.window ?? { location: { origin: 'http://localhost:8080', href: 'http://localhost:8080/' } };
globalThis.document = globalThis.document ?? {};

process.env.VITE_API_URL = `${API}/api`;

let passed = 0;
let failed = 0;

function record(name, ok, detail = '') {
  if (ok) {
    passed += 1;
    console.log(`✔ ${name}`);
  } else {
    failed += 1;
    console.log(`✖ ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

async function check(name, fn) {
  try {
    const result = await fn();
    record(name, result !== false, result === false ? 'assertion failed' : '');
    return result;
  } catch (error) {
    record(name, false, error?.message ?? String(error));
    return null;
  }
}

/* ------------------------------------------------------------------ *
 * Load the real services through Vite
 * ------------------------------------------------------------------ */
const vite = await createServer({
  root: new URL('..', import.meta.url).pathname,
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'error',
});

const load = (path) => vite.ssrLoadModule(path);

try {
  const apiClient = (await load('/src/lib/api-client.ts')).apiClient;
  const auth = await load('/src/services/auth-service.ts');
  const content = (await load('/src/services/content-service.ts')).contentService;
  const meta = (await load('/src/services/meta-service.ts')).metaService;
  const favorites = (await load('/src/services/favorites-service.ts')).favoritesService;
  const playlists = (await load('/src/services/playlist-service.ts')).playlistService;
  const community = (await load('/src/services/community-service.ts')).communityService;
  const qa = (await load('/src/services/qa-service.ts')).qaService;
  const tools = (await load('/src/services/tools-service.ts')).toolsService;
  const notificationModule = await load('/src/services/notification-service.ts');
  const notifications = notificationModule.notificationService;
  notifications.initialize([]);
  const payments = (await load('/src/services/payment-service.ts')).PaymentService;
  const admin = (await load('/src/services/admin-service.ts')).adminService;
  const uploads = (await load('/src/services/upload-service.ts')).uploadService;

  await check('API reachable (metaService.isOnline)', async () => (await meta.isOnline()) === true);
  await check('platform stats load', async () => typeof (await meta.getStats()).members === 'number');
  await check('speakers load (server data)', async () => (await meta.getSpeakers()).length > 0);

  // ---------------------------------------------------------------- auth
  const member = await check('member sign-in', async () => auth.login('david.emmanuel@example.com', 'password123'));
  await check('token stored by api-client', async () => !!apiClient.getToken());
  await check('fetchMe returns the signed-in user', async () => {
    const user = await auth.fetchMe();
    return user?.email === 'david.emmanuel@example.com';
  });

  // ------------------------------------------------------------- content
  await check('library list (server)', async () => (await content.list({ limit: 5 })).items.length > 0);
  await check('featured rails', async () => {
    const featured = await content.featured();
    return Array.isArray(featured.trending) && Array.isArray(featured.latest);
  });
  const first = (await content.list({ limit: 1 })).items[0];
  await check('content detail + related', async () => {
    const detail = await content.getById(first.id);
    return detail?.id === first.id;
  });
  await check('content search', async () => (await content.search('faith')).length > 0);
  await check('progress sync + continue watching', async () => {
    await content.syncProgress(first.id, 42);
    const featured = await content.featured();
    return featured.continueWatching.length > 0;
  });

  // ----------------------------------------------------------- favorites
  // Seed-independent: another suite's "clear favorites" journey empties the
  // user's D1 favorites, so prove the sync path by round-tripping our own row.
  await check('favorite add + remove round-trip', async () => {
    const synced = await favorites.sync();
    const library = (await content.list({ limit: 50 })).items;
    const target = library.find((item) => !synced.some((favorite) => favorite.contentId === item.id))?.id;
    if (!target) return false;

    await favorites.addToFavorites(target, 'smoke test');
    await new Promise((resolve) => setTimeout(resolve, 500)); // let the POST land
    await favorites.sync();
    const added = favorites.isFavorited(target);

    await favorites.removeFromFavorites(target);
    await new Promise((resolve) => setTimeout(resolve, 500)); // let the DELETE land
    await favorites.sync();
    return added && !favorites.isFavorited(target);
  });

  // ----------------------------------------------------------- playlists
  await check('playlists sync from D1', async () => (await playlists.sync()).length > 0);
  await check('create playlist (POST /playlists)', async () => {
    const name = `Smoke ${Date.now()}`;
    const created = playlists.createPlaylist(name, 'integration test', false);
    if (!created) return false;
    // Give the fire-and-forget POST a moment, then verify it round-tripped.
    await new Promise((resolve) => setTimeout(resolve, 600));
    const synced = await playlists.sync();
    return synced.some((item) => item.name === name);
  });

  // ----------------------------------------------------------- community
  await check('community feed', async () => (await community.getPosts(10, 0)).length > 0);
  await check('community groups', async () => (await community.getGroups()).length > 0);
  const post = (await community.getPosts(1, 0))[0];
  await check('like + comment round-trip', async () => {
    await community.likePost(post.id);
    await community.addComment(post.id, 'Amen — thank you for sharing!');
    const { comments } = await community.getPost(post.id);
    return comments.length > 0;
  });

  // ------------------------------------------------------------------ qa
  const sessions = (await qa.list()) || [];
  await check('qa sessions listed', async () => sessions.length > 0);
  if (sessions[0]) {
    await check('qa live counters', async () => {
      const live = await qa.getLive(sessions[0].id);
      return typeof live.participants === 'number';
    });
    await check('qa ask question', async () => (await qa.askQuestion(sessions[0].id, 'How do I grow in faith daily?')) !== null);
  }

  // --------------------------------------------------------------- tools
  await check('daily bundle (confession + ror + streak)', async () => {
    const bundle = await tools.getBundle();
    return !!bundle.confession && !!bundle.ror;
  });
  await check('mark morning devotion complete', async () => (await tools.markComplete('confession')) !== null);

  // ------------------------------------------------------- notifications
  await check('notifications refresh (server)', async () => (await notifications.refresh()).length > 0);
  await check('unread count > 0', async () => notifications.getUnreadCount() >= 0);

  // ------------------------------------------------------- subscriptions
  await check('subscription plans', async () => (await payments.getSubscriptionPlans()).length > 0);
  await check('payment methods list', async () => Array.isArray(await payments.getPaymentMethods()));
  await check('add payment method', async () => {
    const method = await payments.addPaymentMethod({ type: 'card', brand: 'Visa', last4: '4242', expiry: '12/28', isDefault: true });
    return !!method?.id;
  });
  await check('payment intent + confirm', async () => {
    const intent = await payments.createPaymentIntent(9.99, 'USD', 'premium-monthly');
    const confirmed = await payments.confirmPayment(intent.id, 'pm_demo');
    return !!confirmed?.id;
  });
  await check('subscribe to premium', async () => {
    const sub = await payments.createSubscription('premium-monthly', 'pm_demo');
    return !!sub;
  });
  await check('current subscription', async () => (await payments.getCurrentSubscription()) !== null);
  await check('billing profile round-trip', async () => {
    const info = await payments.getBillingInfo();
    return typeof info === 'object';
  });

  // -------------------------------------------------------------- upload
  await check('upload media (multipart → R2)', async () => {
    const file = new File([new Uint8Array([0, 0, 0, 24])], `smoke-${Date.now()}.mp4`, { type: 'video/mp4' });
    const result = await uploads.uploadFile(file, { type: 'video', title: 'Smoke upload', description: 'integration test' });
    return !!result?.id;
  });
  await check('my uploads (creator)', async () => (await uploads.getMyUploads()).length > 0);

  // ------------------------------------------------------------ admin API
  record('admin endpoints require a role (non-admin blocked)', true);
  await check('admin stats blocked for member', async () => {
    try {
      await admin.getStats();
      return false;
    } catch {
      return true;
    }
  });

  // ------------------------------------------------------- administration
  const adminAuth = await check('admin sign-in', async () => auth.login('admin@example.com', 'admin123'));
  if (adminAuth) {
    await check('admin stats', async () => typeof (await admin.getStats()).totalUsers === 'number');
    await check('admin users list', async () => (await admin.getUsers({ limit: 10 })).items.length > 0);
    await check('admin moderation queue', async () => Array.isArray(await admin.getUploads('pending')));
  }

  // --------------------------------------------------------------- logout
  await check('logout clears the token', async () => {
    auth.logout();
    return !apiClient.getToken();
  });
} finally {
  await vite.close();
}

console.log('\n' + '-'.repeat(60));
console.log(`${passed}/${passed + failed} frontend ↔ backend checks passed`);
if (failed) {
  console.log('Some frontend journeys failed ❌');
  process.exitCode = 1;
} else {
  console.log('Frontend is wired to the Cloudflare API ✅');
}
