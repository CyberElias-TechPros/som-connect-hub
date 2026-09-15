// Content Service — API-first with mock fallback
import { ContentItem, speakers, featuredContent, conferences, podcasts, originals } from '@/lib/mock-data';
import { apiClient } from '@/lib/api-client';

const mockAll: ContentItem[] = [...featuredContent, ...conferences, ...podcasts, ...originals].filter((v,i,a)=>a.findIndex(t=>t.id===v.id)===i);

export interface ContentListParams {
  category?: string;
  q?: string;
  premium?: boolean;
  limit?: number;
  offset?: number;
  sort?: 'date' | 'views' | 'title';
}

export const contentService = {
  async list(params: ContentListParams = {}): Promise<{ items: ContentItem[]; total: number }> {
    return apiClient.tryApi(async () => {
      const search = new URLSearchParams();
      if (params.category) search.set('category', params.category);
      if (params.q) search.set('q', params.q);
      if (params.premium !== undefined) search.set('premium', String(params.premium));
      if (params.limit) search.set('limit', String(params.limit));
      if (params.offset) search.set('offset', String(params.offset));
      if (params.sort) search.set('sort', params.sort);
      const data = await apiClient.get<{ items: any[]; total: number }>(`/content?${search.toString()}`);
      const items: ContentItem[] = data.items.map((r: any) => ({
        id: r.id,
        title: r.title,
        description: r.description,
        thumbnail: r.thumbnail,
        duration: r.duration,
        speaker: r.speaker || speakers[0],
        date: r.date,
        category: r.category,
        tags: r.tags || [],
        views: r.views,
        isPremium: r.isPremium,
        progress: r.progress,
        isFavorited: r.isFavorited,
      }));
      return { items, total: data.total };
    }, async () => {
      // Fallback mock filtering
      let base = mockAll as ContentItem[];
      if (params.category && params.category !== 'all') base = base.filter(c => c.category === params.category);
      if (params.q) {
        const q = params.q.toLowerCase();
        base = base.filter(c => c.title.toLowerCase().includes(q) || c.description.toLowerCase().includes(q));
      }
      if (params.premium === true) base = base.filter(c => c.isPremium);
      if (params.premium === false) base = base.filter(c => !c.isPremium);
      if (params.sort === 'views') base = [...base].sort((a,b)=>b.views-a.views);
      else if (params.sort === 'title') base = [...base].sort((a,b)=>a.title.localeCompare(b.title));
      else base = [...base].sort((a,b)=>new Date(b.date).getTime()-new Date(a.date).getTime());
      const offset = params.offset || 0;
      const limit = params.limit || 20;
      return { items: base.slice(offset, offset+limit), total: base.length };
    });
  },

  async getById(id: string): Promise<ContentItem | null> {
    return apiClient.tryApi(async () => {
      const r = await apiClient.get<any>(`/content/${id}`);
      return {
        id: r.id,
        title: r.title,
        description: r.description,
        thumbnail: r.thumbnail,
        duration: r.duration,
        speaker: r.speaker || speakers[0],
        date: r.date,
        category: r.category,
        tags: r.tags || [],
        views: r.views,
        isPremium: r.isPremium,
      } as ContentItem;
    }, async () => {
      return (mockAll as ContentItem[]).find(c => c.id === id) || null;
    });
  },

  async updateProgress(contentId: string, progress: number): Promise<void> {
    return apiClient.tryApi(async () => {
      await apiClient.post(`/content/${contentId}/progress`, { progress });
    }, async () => {
      // Mock: store in localStorage
      try {
        const key = 'som_progress';
        const existing = JSON.parse(localStorage.getItem(key) || '{}');
        existing[contentId] = progress;
        localStorage.setItem(key, JSON.stringify(existing));
      } catch {}
    });
  },

  async continueWatching(): Promise<ContentItem[]> {
    return apiClient.tryApi(async () => {
      const data = await apiClient.get<{ items: any[] }>('/content/user/continue');
      return data.items.map((r: any) => ({
        id: r.id,
        title: r.title,
        thumbnail: r.thumbnail,
        duration: r.duration,
        speaker: r.speaker,
        progress: r.progress,
        date: '',
        description: '',
        category: 'conference' as any,
        tags: [],
        views: 0,
        isPremium: false,
      }));
    }, async () => {
      try {
        const key = 'som_progress';
        const existing = JSON.parse(localStorage.getItem(key) || '{}');
        const ids = Object.keys(existing).filter(k => existing[k] > 0 && existing[k] < 100);
        return (mockAll as ContentItem[]).filter(c => ids.includes(c.id)).slice(0,3).map(c => ({ ...c, progress: existing[c.id] }));
      } catch { return []; }
    });
  },

  async search(q: string): Promise<ContentItem[]> {
    return apiClient.tryApi(async () => {
      const data = await apiClient.get<{ items: any[] }>(`/search?q=${encodeURIComponent(q)}`);
      return data.items as ContentItem[];
    }, async () => {
      const lower = q.toLowerCase();
      return (mockAll as ContentItem[]).filter(c => c.title.toLowerCase().includes(lower) || c.description.toLowerCase().includes(lower));
    });
  },
};
