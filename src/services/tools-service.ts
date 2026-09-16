import { apiClient } from '@/lib/api-client';
import { DailyConfession, RORReading, Publication } from '@/lib/mock-data';

export const toolsService = {
  /** GET /tools/bundle — today's devotionals + streak in one call. */
  async getBundle(): Promise<{
    date: string;
    confession: DailyConfession | null;
    ror: RORReading | null;
    streak: number;
    completed: string[];
  }> {
    const fallback = async () => ({
      date: new Date().toISOString().split('T')[0],
      confession: (await import('@/lib/mock-data')).dailyConfessions[0] ?? null,
      ror: (await import('@/lib/mock-data')).rorReadings[0] ?? null,
      streak: 5,
      completed: [] as string[],
    });

    return apiClient.tryApi(async () => {
      const data = await apiClient.get<any>('/tools/bundle');
      return {
        date: data.date,
        confession: data.confession
          ? {
              id: data.confession.id,
              date: data.confession.date,
              title: data.confession.title,
              content: data.confession.content,
              scripture: data.confession.scripture,
              scriptureRef: data.confession.scriptureRef,
            }
          : null,
        ror: data.ror
          ? {
              id: data.ror.id,
              date: data.ror.date,
              title: data.ror.title,
              theme: data.ror.theme,
              scripture: data.ror.scripture,
              scriptureRef: data.ror.scriptureRef,
              content: data.ror.content,
              prayer: data.ror.prayer,
              furtherStudy: data.ror.furtherStudy ?? [],
              dailyScriptureReading: data.ror.dailyScriptureReading ?? [],
            }
          : null,
        streak: data.streak ?? 0,
        completed: data.completed ?? [],
      };
    }, fallback, { label: 'daily bundle' });
  },

  /** GET /tools/plan — reading plan for the ROR plan screen. */
  async getPlan(days = 14, start?: string): Promise<{ date: string; label: string; completed: boolean }[]> {
    const params = new URLSearchParams({ days: String(days) });
    if (start) params.set('start', start);
    return apiClient.tryApi(
      async () => (await apiClient.get<{ items: any[] }>(`/tools/plan?${params.toString()}`)).items,
      () =>
        Array.from({ length: days }, (_, index) => {
          const date = new Date(Date.now() + index * 86400000).toISOString().split('T')[0];
          return { date, label: new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }), completed: index < 3 };
        }),
      { label: 'reading plan' },
    );
  },

  async getConfessions(): Promise<DailyConfession[]> {
    return apiClient.tryApi(async () => {
      const data = await apiClient.get<{ items: any[] }>('/tools/confessions');
      return data.items.map((c: any) => ({
        id: c.id,
        date: c.date,
        title: c.title,
        content: c.content,
        scripture: c.scripture,
        scriptureRef: c.scripture_ref || c.scriptureRef,
      }));
    }, async () => {
      const { dailyConfessions } = await import('@/lib/mock-data');
      return dailyConfessions;
    });
  },

  async getConfessionByDate(date: string): Promise<DailyConfession | null> {
    return apiClient.tryApi(async () => {
      const data = await apiClient.get<any>(`/tools/confessions?date=${date}`);
      return {
        id: data.id,
        date: data.date,
        title: data.title,
        content: data.content,
        scripture: data.scripture,
        scriptureRef: data.scripture_ref || data.scriptureRef,
      };
    }, async () => {
      const { dailyConfessions } = await import('@/lib/mock-data');
      return dailyConfessions.find(c => c.date === date) || dailyConfessions[0] || null;
    });
  },

  async getRORReadings(): Promise<RORReading[]> {
    return apiClient.tryApi(async () => {
      const data = await apiClient.get<{ items: any[] }>('/tools/ror');
      return data.items.map((r: any) => ({
        id: r.id,
        date: r.date,
        title: r.title,
        theme: r.theme,
        scripture: r.scripture,
        scriptureRef: r.scripture_ref || r.scriptureRef,
        content: r.content,
        prayer: r.prayer,
        furtherStudy: r.furtherStudy || [],
        dailyScriptureReading: r.dailyScriptureReading || [],
      }));
    }, async () => {
      const { rorReadings } = await import('@/lib/mock-data');
      return rorReadings;
    });
  },

  async getPublications(): Promise<Publication[]> {
    return apiClient.tryApi(async () => {
      const data = await apiClient.get<{ items: any[] }>('/tools/publications');
      return data.items.map((p: any) => ({
        id: p.id,
        title: p.title,
        type: p.type,
        cover: p.cover,
        issueDate: p.issue_date || p.issueDate,
        pages: p.pages,
        description: p.description,
      }));
    }, async () => {
      const { publications } = await import('@/lib/mock-data');
      return publications;
    });
  },

  /**
   * POST /tools/complete — marks a devotional done and returns the new streak.
   * `date` defaults to today on the Worker; pass one to back-fill a missed day
   * from the reading plan.
   */
  async markComplete(type: 'confession' | 'ror', date?: string): Promise<{ streak: number }> {
    return apiClient.tryApi(async () => {
      const data = await apiClient.post<{ streak: number }>('/tools/complete', date ? { type, date } : { type });
      return data;
    }, async () => {
      try {
        const key = 'som_daily_completions';
        const target = date ?? new Date().toISOString().split('T')[0];
        const stored = JSON.parse(localStorage.getItem(key) || '{}');
        if (!stored[target]) stored[target] = [];
        if (!stored[target].includes(type)) stored[target].push(type);
        localStorage.setItem(key, JSON.stringify(stored));
      } catch {}
      return { streak: Math.floor(Math.random()*20)+1 };
    });
  },

  async getStreak(): Promise<{ streak: number; todayCompleted: string[] }> {
    return apiClient.tryApi(async () => {
      const data = await apiClient.get<{ streak: number; todayCompleted: string[] }>('/tools/streak');
      return data;
    }, async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const stored = JSON.parse(localStorage.getItem('som_daily_completions') || '{}');
        return { streak: 5, todayCompleted: stored[today] || [] };
      } catch {
        return { streak: 0, todayCompleted: [] };
      }
    });
  },
};
