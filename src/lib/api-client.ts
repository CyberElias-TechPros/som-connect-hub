// SOM CONNECT API Client — Works with Cloudflare Workers backend or falls back to mock/localStorage
// Happy-path guaranteed: if API unavailable, falls back to local mock

const API_URL = (import.meta as any).env?.VITE_API_URL?.replace(/\/$/, '') || '';
const HAS_API = !!API_URL && API_URL.startsWith('http');

function getToken(): string | null {
  try {
    return localStorage.getItem('som_token_v2') || localStorage.getItem('som_token') || null;
  } catch { return null; }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  if (!HAS_API) throw new Error('NO_API');

  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as any || {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    let errJson: any = null;
    try { errJson = JSON.parse(errText); } catch {}
    throw new Error(errJson?.error || errText || `API ${res.status}`);
  }

  // No content
  if (res.status === 204) return null as any;
  const data = await res.json().catch(() => null);
  return data as T;
}

export const apiClient = {
  hasApi: HAS_API,
  apiUrl: API_URL,

  get: <T>(path: string) => request<T>(path, { method: 'GET' }),
  post: <T>(path: string, body?: any) => request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: any) => request<T>(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),

  // FormData upload
  upload: async <T>(path: string, formData: FormData): Promise<T> => {
    if (!HAS_API) throw new Error('NO_API');
    const token = getToken();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers,
      body: formData,
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(txt || `Upload failed ${res.status}`);
    }
    return await res.json() as T;
  },

  // Helper: try API, fallback to function
  tryApi: async <T>(apiCall: () => Promise<T>, fallback: () => Promise<T> | T): Promise<T> => {
    if (!HAS_API) return await fallback();
    try {
      return await apiCall();
    } catch (e: any) {
      if (e?.message === 'NO_API') return await fallback();
      // If API is configured but fails, log and fallback for happy path
      console.warn('[api-client] API failed, falling back to mock', e?.message);
      return await fallback();
    }
  }
};
