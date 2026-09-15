/**
 * SOM CONNECT — API client
 *
 * Talks to the Cloudflare Workers API. Resolution order for the base URL:
 *   1. VITE_API_URL when it is set to an absolute URL (production / staging).
 *   2. `/api` — served by the Vite dev proxy (see vite.config.ts) and by the
 *      Worker/Pages route in production, so the app never needs a hardcoded
 *      backend host and works behind any preview domain.
 *
 * Every helper is failure tolerant: if the API cannot be reached the caller can
 * fall back to local mock data (see `tryApi`) so no screen ever dead-ends.
 */

const RAW_BASE = ((import.meta as any).env?.VITE_API_URL ?? '').toString().trim();

function resolveBase(): string {
  if (RAW_BASE.startsWith('http')) return RAW_BASE.replace(/\/+$/, '');
  if (RAW_BASE && RAW_BASE.startsWith('/')) return RAW_BASE.replace(/\/+$/, '');
  return '/api';
}

export const API_BASE = resolveBase();

const TOKEN_KEYS = ['som_token_v2', 'som_token'];
const REQUEST_TIMEOUT_MS = 20000;

/* ------------------------------------------------------------------ *
 * Errors
 * ------------------------------------------------------------------ */

export class ApiError extends Error {
  status: number;
  code: string;
  body: any;
  unavailable: boolean;

  constructor(message: string, status = 0, code = 'error', body: any = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.body = body;
    this.unavailable = status === 0 || status >= 500 || code === 'no_api' || code === 'timeout';
  }

  /** Friendly copy safe to show in a toast. */
  get friendly(): string {
    if (this.status === 401) return 'Please sign in to continue.';
    if (this.status === 403) return this.message || 'You do not have access to that yet.';
    if (this.status === 404) return this.message || 'We could not find that.';
    if (this.unavailable) return 'You appear to be offline — showing saved content.';
    return this.message || 'Something went wrong. Please try again.';
  }
}

/* ------------------------------------------------------------------ *
 * Token storage
 * ------------------------------------------------------------------ */

function readToken(): string | null {
  try {
    for (const key of TOKEN_KEYS) {
      const value = localStorage.getItem(key);
      if (value) return value;
    }
  } catch {
    /* storage unavailable (private mode) */
  }
  return null;
}

function writeToken(token: string | null): void {
  try {
    if (token) {
      localStorage.setItem('som_token_v2', token);
      localStorage.setItem('som_token', token);
    } else {
      TOKEN_KEYS.forEach((key) => localStorage.removeItem(key));
    }
  } catch {
    /* ignore */
  }
}

/* ------------------------------------------------------------------ *
 * Core request
 * ------------------------------------------------------------------ */

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: any;
  /** Skip the Authorization header (login/register/public endpoints). */
  anonymous?: boolean;
  /** Raw body (FormData etc.) — sent as-is. */
  rawBody?: BodyInit;
  timeoutMs?: number;
  /** Internal: prevents infinite retry loops. */
  retried?: boolean;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const url = path.startsWith('http') ? path : `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;
  const token = options.anonymous ? null : readToken();

  const headers = new Headers(options.headers as HeadersInit | undefined);
  if (!options.rawBody && options.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (!headers.has('Accept')) headers.set('Accept', 'application/json');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      method: options.method ?? (options.body !== undefined || options.rawBody ? 'POST' : 'GET'),
      headers,
      credentials: 'omit',
      signal: controller.signal,
      body: options.rawBody ?? (options.body !== undefined ? JSON.stringify(options.body) : undefined),
    });
  } catch (error: any) {
    clearTimeout(timeout);

    // One automatic retry for transient network hiccups (not for aborts).
    if (!options.retried && error?.name !== 'AbortError') {
      return request<T>(path, { ...options, retried: true });
    }

    const timeoutHit = error?.name === 'AbortError';
    throw new ApiError(
      timeoutHit ? 'The request timed out.' : 'We could not reach the SOM CONNECT service.',
      0,
      timeoutHit ? 'timeout' : 'network_error',
    );
  } finally {
    clearTimeout(timeout);
  }

  const contentType = response.headers.get('content-type') ?? '';

  if (response.status === 204) return null as unknown as T;

  // A dev server returning index.html for /api means the backend is not running.
  if (!contentType.includes('application/json')) {
    const text = await response.text().catch(() => '');
    if (text.trim().startsWith('<')) {
      throw new ApiError('The SOM CONNECT API is not reachable from this build.', 0, 'no_api');
    }
    throw new ApiError(text.slice(0, 200) || `Unexpected response (${response.status}).`, response.status);
  }

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    if (response.status === 401) writeToken(null); // stale token — drop it
    throw new ApiError(
      payload?.error ?? `Request failed (${response.status}).`,
      response.status,
      payload?.code ?? 'error',
      payload,
    );
  }

  return payload as T;
}

export interface TryApiOptions {
  /** Statuses that should trigger the fallback (defaults to graceful ones). */
  fallbackOn?: number[];
  /** Label used in console warnings. */
  label?: string;
  /** Throw instead of falling back (used by flows that must surface errors). */
  strict?: boolean;
}

const DEFAULT_FALLBACK_STATUSES = [401, 404, 408, 429, 500, 502, 503, 504];

/* ------------------------------------------------------------------ *
 * Public client
 * ------------------------------------------------------------------ */

export const apiClient = {
  /** Base URL actually in use (useful for diagnostics screens). */
  apiUrl: API_BASE,
  /** Kept for backwards compatibility with existing services. */
  hasApi: true,

  getToken: readToken,
  setToken: writeToken,
  clearToken: () => writeToken(null),

  get: <T>(path: string, options: RequestOptions = {}) => request<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: any, options: RequestOptions = {}) => request<T>(path, { ...options, method: 'POST', body }),
  put: <T>(path: string, body?: any, options: RequestOptions = {}) => request<T>(path, { ...options, method: 'PUT', body }),
  patch: <T>(path: string, body?: any, options: RequestOptions = {}) => request<T>(path, { ...options, method: 'PATCH', body }),
  delete: <T>(path: string, options: RequestOptions = {}) => request<T>(path, { ...options, method: 'DELETE' }),

  /** Multipart upload (R2 backed). */
  upload: async <T>(path: string, formData: FormData): Promise<T> =>
    request<T>(path, { method: 'POST', rawBody: formData, timeoutMs: 120000 }),

  /** Health probe used by the offline banner / diagnostics. */
  async ping(): Promise<boolean> {
    try {
      const data = await request<any>('/health', { anonymous: true, timeoutMs: 6000 });
      return data?.healthy !== false;
    } catch {
      return false;
    }
  },

  /**
   * Runs an API call and transparently falls back to local/mock data when the
   * backend is unreachable (offline, cold start, or a status we can degrade on).
   */
  /**
   * `T` is inferred from the API call so the fallback (mock/demo data) can be
   * looser than the real payload without fighting the compiler.
   */
  async tryApi<T>(apiCall: () => Promise<T> | T, fallback: () => any, options: TryApiOptions = {}): Promise<T> {
    try {
      return await apiCall();
    } catch (error: any) {
      const apiError = error instanceof ApiError ? error : new ApiError(error?.message ?? 'Unknown error');
      const fallbackStatuses = options.fallbackOn ?? DEFAULT_FALLBACK_STATUSES;
      const canFallback =
        !options.strict &&
        (apiError.unavailable || apiError.status === 0 || fallbackStatuses.includes(apiError.status));

      if (canFallback) {
        console.warn(`[api-client] falling back to local data${options.label ? ` (${options.label})` : ''}:`, apiError.message);
        return await fallback();
      }
      throw apiError;
    }
  },
};

export type ApiClient = typeof apiClient;
