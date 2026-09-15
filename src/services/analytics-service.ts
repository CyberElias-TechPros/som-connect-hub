import { apiClient } from '@/lib/api-client';

export const analyticsService = {
  async trackView(contentId: string, watchedSeconds = 0, completed = false): Promise<void> {
    return apiClient.tryApi(async () => {
      await apiClient.post('/analytics/view', {
        contentId,
        watchedSeconds,
        completed,
        deviceType: /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
        country: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
    }, async () => {
      // Fallback: store in localStorage for later sync
      try {
        const key = 'som_analytics_views';
        const existing = JSON.parse(localStorage.getItem(key) || '[]');
        existing.push({ contentId, watchedSeconds, completed, timestamp: new Date().toISOString() });
        localStorage.setItem(key, JSON.stringify(existing.slice(-100)));
      } catch {}
    });
  },

  async getMyAnalytics(): Promise<any> {
    return apiClient.tryApi(async () => {
      const data = await apiClient.get('/analytics/me');
      return data;
    }, async () => {
      try {
        const views = JSON.parse(localStorage.getItem('som_analytics_views') || '[]');
        const totalSeconds = views.reduce((sum: number, v: any) => sum + (v.watchedSeconds || 0), 0);
        return {
          totalWatched: views.length,
          totalSeconds,
          completed: views.filter((v: any) => v.completed).length,
          byCategory: [],
          recent: views.slice(-10),
        };
      } catch {
        return { totalWatched: 0, totalSeconds: 0, completed: 0, byCategory: [], recent: [] };
      }
    });
  },

  async getContentAnalytics(contentId: string): Promise<any> {
    return apiClient.tryApi(async () => {
      const data = await apiClient.get(`/analytics/content/${contentId}`);
      return data;
    }, async () => {
      return null;
    });
  },
};
