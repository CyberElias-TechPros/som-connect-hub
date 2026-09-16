import { apiClient } from '@/lib/api-client';
import { QASession, Question } from '@/lib/mock-data';

export const qaService = {
  async list(status?: string): Promise<QASession[]> {
    return apiClient.tryApi(async () => {
      const qs = status ? `?status=${status}` : '';
      const data = await apiClient.get<{ items: any[] }>(`/qa${qs}`);
      return data.items.map((s: any) => ({
        id: s.id,
        title: s.title,
        speaker: s.speaker,
        date: s.date,
        status: s.status,
        thumbnail: s.thumbnail,
        duration: s.duration,
        questionsCount: s.questionsCount || s.questions_count,
      }));
    }, async () => {
      const { qaSessions } = await import('@/lib/mock-data');
      if (status && status !== 'all') return qaSessions.filter(s => s.status === status);
      return qaSessions;
    });
  },

  async getById(id: string): Promise<{ session: QASession; questions: Question[] } | null> {
    return apiClient.tryApi(async () => {
      const data = await apiClient.get<any>(`/qa/${id}`);
      return {
        session: {
          id: data.id,
          title: data.title,
          speaker: data.speaker,
          date: data.date,
          status: data.status,
          thumbnail: data.thumbnail,
          duration: data.duration,
          questionsCount: data.questions?.length || 0,
        },
        questions: (data.questions || []).map((q: any) => ({
          id: q.id,
          text: q.text,
          askedBy: q.asked_by || q.askedBy,
          upvotes: q.upvotes,
          isAnswered: !!q.answer,
          answer: q.answer,
        })),
      };
    }, async () => {
      const { qaSessions, sampleQuestions } = await import('@/lib/mock-data');
      const session = qaSessions.find(s => s.id === id);
      if (!session) return null;
      return { session, questions: sampleQuestions };
    });
  },

  async askQuestion(sessionId: string, text: string): Promise<{ id: string }> {
    return apiClient.tryApi(async () => {
      const data = await apiClient.post<{ id: string }>(`/qa/${sessionId}/questions`, { text });
      return data;
    }, async () => {
      return { id: `q_${Date.now()}` };
    });
  },

  async upvoteQuestion(sessionId: string, questionId: string): Promise<void> {
    return apiClient.tryApi(async () => {
      await apiClient.post(`/qa/${sessionId}/questions/${questionId}/upvote`, {});
    }, async () => {});
  },

  /** GET /qa/:id/live — participant + question counters. */
  async getLive(sessionId: string): Promise<{ participants: number; questions: number; realtime: boolean }> {
    return apiClient.tryApi(
      async () => apiClient.get<{ participants: number; questions: number; realtime: boolean }>(`/qa/${sessionId}/live`),
      () => ({ participants: 1, questions: 0, realtime: false }),
      { label: 'qa live' },
    );
  },

  async leaveSession(sessionId: string): Promise<void> {
    await apiClient.post(`/qa/${sessionId}/leave`, {}, {}).catch(() => undefined);
  },

  /**
   * Opens a live WebSocket channel for a session when the backend exposes one.
   * Returns a disposer; callers can keep polling `/qa/:id/live` as a fallback.
   */
  connectLive(sessionId: string, handlers: { onEvent?: (event: string, data: any) => void } = {}): () => void {
    const base = apiClient.apiUrl;
    let socket: WebSocket | null = null;
    try {
      const url = new URL(`${base}/qa/${sessionId}/ws`, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
      url.protocol = url.protocol.replace('http', 'ws');
      socket = new WebSocket(url.toString());
      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(String(event.data));
          handlers.onEvent?.(payload.event, payload.data);
        } catch {
          /* ignore malformed frames */
        }
      };
      socket.onerror = () => socket?.close();
    } catch {
      socket = null;
    }
    return () => socket?.close();
  },

  async joinSession(sessionId: string): Promise<{ joined: boolean; participants?: number }> {
    return apiClient.tryApi(async () => {
      const data = await apiClient.post<{ joined: boolean; participants: number }>(`/qa/${sessionId}/join`, {});
      return data;
    }, async () => {
      return { joined: true, participants: Math.floor(Math.random()*100)+10 };
    });
  },
};
