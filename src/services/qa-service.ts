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

  async joinSession(sessionId: string): Promise<{ joined: boolean; participants?: number }> {
    return apiClient.tryApi(async () => {
      const data = await apiClient.post<{ joined: boolean; participants: number }>(`/qa/${sessionId}/join`, {});
      return data;
    }, async () => {
      return { joined: true, participants: Math.floor(Math.random()*100)+10 };
    });
  },
};
