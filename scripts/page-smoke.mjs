/**
 * SOM CONNECT — DOM-level page smoke test.
 *
 * Renders the real app (every route) inside a jsdom document with the real
 * service layer pointed at a running worker, then asserts that each page shows
 * live data from D1 (not just mock fallback) and that no page trips the
 * ErrorBoundary. This is the closest thing to clicking through the app that can
 * run without a headless browser.
 *
 *   node scripts/page-smoke.mjs                          # via Vite proxy :8080
 *   node scripts/page-smoke.mjs --api=http://127.0.0.1:8787
 *
 * The Vite dev server only has to be reachable for module loading; API traffic
 * goes straight to `--api`.
 */
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';

const args = process.argv.slice(2);
const apiArg = args.find((a) => a.startsWith('--api='));
const API = (apiArg ? apiArg.slice('--api='.length) : process.env.SOM_API_URL || 'http://127.0.0.1:8787').replace(/\/$/, '');
/** Max time to keep flushing React work while waiting for live data. */
const SETTLE_MS = Number(args.find((a) => a.startsWith('--settle='))?.slice('--settle='.length) ?? 5000);
const only = args.find((a) => a.startsWith('--only='))?.slice('--only='.length);

/* ------------------------------------------------------------------ *
 * jsdom environment
 * ------------------------------------------------------------------ */
const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
  url: 'http://localhost:8080/',
  pretendToBeVisual: true,
});

const { window } = dom;
globalThis.window = window;
globalThis.document = window.document;
globalThis.self = window;
try {
  Object.defineProperty(globalThis, 'navigator', { value: window.navigator, configurable: true, writable: true });
} catch {
  /* node 22 exposes a read-only navigator */
}
for (const key of [
  'HTMLElement', 'HTMLDivElement', 'HTMLInputElement', 'HTMLButtonElement', 'HTMLAnchorElement', 'HTMLImageElement',
  'HTMLCanvasElement', 'SVGElement', 'Element', 'Node', 'NodeList', 'Event', 'CustomEvent', 'MouseEvent',
  'PointerEvent', 'KeyboardEvent', 'FocusEvent', 'InputEvent', 'DragEvent', 'TouchEvent', 'FileList', 'File',
  'Blob', 'FormData', 'DocumentFragment', 'MutationObserver', 'ResizeObserver', 'IntersectionObserver',
  'DOMRect', 'Range', 'Selection', 'CSSStyleDeclaration', 'getComputedStyle', 'requestAnimationFrame',
  'cancelAnimationFrame', 'DOMParser', 'XMLSerializer', 'Image', 'AbortSignal', 'AbortController',
]) {
  if (!(key in globalThis) || globalThis[key] === undefined) {
    try {
      globalThis[key] = window[key];
    } catch {
      /* read-only global */
    }
  }
}
if (!window.matchMedia) {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent: () => false,
  });
}
globalThis.matchMedia = window.matchMedia;

class IntersectionObserverStub {
  constructor(callback) {
    this.callback = callback;
    this.elements = new Set();
  }
  observe(element) {
    this.elements.add(element);
    this.callback([{ target: element, isIntersecting: true, intersectionRatio: 1, boundingClientRect: element.getBoundingClientRect?.() ?? {} }], this);
  }
  unobserve(element) {
    this.elements.delete(element);
  }
  disconnect() {
    this.elements.clear();
  }
  takeRecords() {
    return [];
  }
}
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
class WebSocketStub {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;
  constructor(url) {
    this.url = String(url);
    this.readyState = WebSocketStub.CONNECTING;
  }
  send() {}
  close() {
    this.readyState = WebSocketStub.CLOSED;
  }
  addEventListener() {}
  removeEventListener() {}
  dispatchEvent() {
    return false;
  }
}
for (const [key, value] of Object.entries({ IntersectionObserver: IntersectionObserverStub, ResizeObserver: ResizeObserverStub, WebSocket: WebSocketStub })) {
  globalThis[key] = value;
  try {
    Object.defineProperty(window, key, { value, configurable: true, writable: true });
  } catch {
    /* ignore */
  }
}
window.scrollTo = () => {};
window.HTMLElement.prototype.scrollIntoView = () => {};
window.fetch = globalThis.fetch.bind(globalThis);
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

/* localStorage mirrors what the browser would hold. */
const store = new Map();
const storageShim = {
  getItem: (key) => (store.has(key) ? store.get(key) : null),
  setItem: (key, value) => void store.set(key, String(value)),
  removeItem: (key) => void store.delete(key),
  clear: () => store.clear(),
  key: (index) => [...store.keys()][index] ?? null,
  get length() {
    return store.size;
  },
};
globalThis.localStorage = storageShim;
try {
  Object.defineProperty(window, 'localStorage', { value: storageShim, configurable: true, writable: true });
} catch {
  /* jsdom owns it; the shim on globalThis is what the services read */
}

process.env.VITE_API_URL = `${API}/api`;

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function signIn(email, password) {
  const res = await fetch(`${API}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const json = await res.json();
  const token = json?.data?.token ?? json?.token;
  if (!token) throw new Error(`login failed for ${email}: ${JSON.stringify(json).slice(0, 140)}`);
  return { token, user: json?.data?.user ?? json?.user };
}

const errorBoundaryMarkers = ['Application Error', 'something went wrong with this page', 'Error Details'];

/* ------------------------------------------------------------------ *
 * Runner
 * ------------------------------------------------------------------ */
const server = await createServer({
  configFile: 'vite.config.ts',
  server: { middlewareMode: true, hmr: false },
  appType: 'custom',
  logLevel: 'error',
});

const AppModule = await server.ssrLoadModule('/src/App.tsx');
const App = AppModule.default;

/* Seed the fixtures the pages assert on, so a run never depends on the state a
   previous script (or an earlier run of this one) left in local D1. */
async function seedFixtures(tokens) {
  const auth = { Authorization: `Bearer ${tokens.member}`, 'Content-Type': 'application/json' };
  const favoriteFor = '25'; // Worship Night Highlights
  await fetch(`${API}/api/favorites`, { method: 'POST', headers: auth, body: JSON.stringify({ contentId: favoriteFor }) }).catch(() => undefined);
  const body = `Smoke test post ${new Date().toISOString().slice(0, 19)}`;
  await fetch(`${API}/api/community/posts`, { method: 'POST', headers: auth, body: JSON.stringify({ content: body }) }).catch(() => undefined);
  return body;
}

const sessions = {
  member: await signIn('david.emmanuel@example.com', 'password123'),
  pastor: await signIn('pastor@example.com', 'pastor123'),
  admin: await signIn('admin@example.com', 'admin123'),
};

const smokePost = await seedFixtures({ member: sessions.member.token });

const ROUTES = [
  { path: '/', label: 'home', live: ['Global Communion Service'] },
  { path: '/library', label: 'library', live: ['Worship Night Highlights', 'Foundations of Prayer'] },
  { path: '/library/1', label: 'content detail', live: ['The Power of Faith in Action'] },
  { path: '/search?q=prayer', label: 'search', live: ['Foundations of Prayer'] },
  { path: '/tools', label: 'tools', live: ['Confession', 'Rhapsody'] },
  { path: '/tools/ror-plan', label: 'ror plan', live: ['Mark as read', 'Today'] },
  { path: '/publications', label: 'publications', live: ['Ministry Newsletter'] },
  { path: '/community', label: 'community', live: [smokePost] },
  { path: '/qa', label: 'qa sessions', live: ['Q&A Session'] },
  { path: '/qa/1', label: 'qa session', live: ['Question'] },
  { path: '/player/1', label: 'player', live: ['The Power of Faith in Action'], anon: true },
  { path: '/favorites', label: 'favorites', live: ['Worship Night Highlights'], role: 'member' },
  { path: '/playlists', label: 'playlists', live: ['My Faith Journey'], role: 'member' },
  { path: '/profile', label: 'profile', live: ['David'], role: 'member' },
  { path: '/profile/edit', label: 'edit profile', live: ['David'], role: 'member' },
  { path: '/subscription', label: 'subscription', live: ['Premium'], role: 'member' },
  { path: '/payment', label: 'payment', live: ['', ''], role: 'member' },
  { path: '/manage-subscription', label: 'manage subscription', live: ['Premium'], role: 'member' },
  { path: '/settings', label: 'settings', live: ['Setting'], role: 'member' },
  { path: '/notifications', label: 'notifications', live: [''], role: 'member' },
  { path: '/notifications-settings', label: 'notification settings', live: ['Daily'], role: 'member' },
  { path: '/offline', label: 'offline', live: ['Download'], role: 'member' },
  { path: '/help', label: 'help', live: ['Help'], role: 'member' },
  { path: '/upload', label: 'upload', live: ['Upload'], role: 'pastor' },
  { path: '/submissions', label: 'submissions', live: ['Submission'], role: 'pastor' },
  { path: '/admin', label: 'admin dashboard', live: ['Admin'], role: 'admin' },
  { path: '/admin/users', label: 'admin users', live: ['User'], role: 'admin' },
  { path: '/admin/moderation', label: 'admin moderation', live: ['Moderation'], role: 'admin' },
  { path: '/login', label: 'login (public)', live: ['Sign'], anon: true },
  { path: '/register', label: 'register (public)', live: ['Create'], anon: true },
  { path: '/splash', label: 'splash (public)', live: ['SOM'], anon: true },
  { path: '/this-route-does-not-exist', label: 'not found', live: ['404'], anon: true },
];

let passed = 0;
let failed = 0;
const failures = [];

const titles = {};

async function renderRoute(route) {
  const { path, role, anon } = route;
  const needles = (route.live ?? []).filter(Boolean);
  store.clear();
  if (!anon && role) {
    const session = sessions[role];
    store.set('som_token_v2', session.token);
    store.set('som_token', session.token);
    store.set('som_auth_v2', JSON.stringify(session.user));
  }
  window.history.pushState({}, '', path);
  const container = window.document.createElement('div');
  window.document.body.appendChild(container);
  const root = createRoot(container);
  const errors = [];
  const originalError = console.error;
  console.error = (...parts) => {
    const text = parts.map(String).join(' ');
    if (/ErrorBoundary caught|Uncaught \[/.test(text)) errors.push(text.slice(0, 200));
    originalError.apply(console, parts);
  };
  try {
    await act(async () => {
      root.render(React.createElement(App));
      await sleep(50);
    });
    // Flush React in rounds until the page shows its live data (or we run out
    // of patience): the auth provider resolves first, then the page mounts and
    // starts its own fetches, so a single fixed wait is never exact.
    const deadline = Date.now() + SETTLE_MS;
    let text = container.textContent ?? '';
    while (Date.now() < deadline) {
      await act(async () => {
        await sleep(150);
      });
      text = container.textContent ?? '';
      if (needles.length === 0 ? Date.now() > deadline - SETTLE_MS + 900 : needles.every((needle) => text.includes(needle))) {
        break;
      }
    }
    return { text, errors, container };
  } finally {
    console.error = originalError;
    await act(async () => {
      root.unmount();
    });
    container.remove();
    // Drain anything the page left in flight (polling timers, late 401s) while
    // this route's token is still in place, so it cannot land mid-way through
    // the next route and clear that route's token.
    await act(async () => {
      await sleep(350);
    });
  }
}

for (const route of ROUTES) {
  if (only && !route.path.includes(only) && !route.label.includes(only)) continue;
  try {
    const { text, errors } = await renderRoute(route);
    titles[route.path] = text.length;
    const boundary = errorBoundaryMarkers.find((marker) => text.includes(marker));
    const expected = (route.live ?? []).filter(Boolean);
    const missing = expected.filter((needle) => !text.includes(needle));

    if (boundary || errors.length) {
      const detail = errors[0] ? ` — ${errors[0]}` : ` — ErrorBoundary: "${text.slice(0, 120)}"`;
      failures.push(`${route.path} ${route.label}${detail}`);
      console.log(`✖ ${route.path.padEnd(32)} ${route.label}`);
      failed += 1;
      continue;
    }
    if (missing.length) {
      failures.push(`${route.path} missing live data: ${missing.join(', ')} (rendered ${text.length} chars)`);
      console.log(`✖ ${route.path.padEnd(32)} ${route.label} — missing ${missing.join(', ')}`);
      failed += 1;
      continue;
    }
    console.log(`✔ ${route.path.padEnd(32)} ${route.label}`);
    passed += 1;
  } catch (error) {
    failures.push(`${route.path} threw: ${error?.stack ?? error}`);
    console.log(`✖ ${route.path.padEnd(32)} ${route.label} — ${error?.message ?? error}`);
    failed += 1;
  }
}

await server.close();

console.log(`\n${passed}/${passed + failed} pages rendered with live backend data ✅`);
if (failures.length) {
  console.log('\nFailures:');
  for (const failure of failures) console.log(` - ${failure}`);
  process.exit(1);
}
