// Meta service — health, runtime config, speakers, platform stats and search.
import { apiClient } from '@/lib/api-client';
import { speakers as mockSpeakers, type Speaker } from '@/lib/mock-data';

export interface PlatformMeta {
  app: { name: string; version: string; environment: string; authentication: string };
  categories: { id: string; count: number }[];
  features: Record<string, boolean>;
  user: { id: string; name: string; role: string; avatar?: string; streak: number } | null;
  serverTime: string;
}

export interface PlatformStats {
  members: number;
  teachings: number;
  totalViews: number;
  communityPosts: number;
  dailyCompletions: number;
  countries?: number;
  uptime?: string;
}

export interface SearchResults {
  query: string;
  content: any[];
  groups: {
    content: any[];
    speakers: Speaker[];
    posts: any[];
    sessions: any[];
    publications: any[];
  };
}

export const metaService = {
  /** GET /health — true when the Worker (and its bindings) are reachable. */
  async isOnline(): Promise<boolean> {
    return apiClient.ping();
  },

  /** GET /meta */
  async getMeta(): Promise<PlatformMeta | null> {
    return apiClient.tryApi(
      async () => apiClient.get<PlatformMeta>('/meta'),
      () => null,
      { label: 'runtime meta', strict: false },
    );
  },

  /** GET /stats */
  async getStats(): Promise<PlatformStats> {
    return apiClient.tryApi(
      async () => apiClient.get<PlatformStats>('/stats'),
      () => ({ members: 12500, teachings: 480, totalViews: 1240000, communityPosts: 3200, dailyCompletions: 8900 }),
      { label: 'platform stats' },
    );
  },

  /** GET /speakers */
  async getSpeakers(): Promise<Speaker[]> {
    return apiClient.tryApi(
      async () => (await apiClient.get<{ items: Speaker[] }>('/speakers')).items,
      () => mockSpeakers,
      { label: 'speakers' },
    );
  },

  /** GET /search?q= — grouped global search. */
  async search(query: string): Promise<SearchResults> {
    const empty: SearchResults = { query, content: [], groups: { content: [], speakers: [], posts: [], sessions: [], publications: [] } };
    if (!query.trim()) return empty;
    return apiClient.tryApi(
      async () => {
        const data = await apiClient.get<SearchResults>(`/search?q=${encodeURIComponent(query)}`);
        return { ...empty, ...data, groups: { ...empty.groups, ...(data.groups ?? {}) } };
      },
      () => empty,
      { label: 'global search' },
    );
  },
};

export default metaService;
