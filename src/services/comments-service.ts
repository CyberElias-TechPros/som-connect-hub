import { apiClient } from '@/lib/api-client';

export interface Comment {
  id: string;
  text: string;
  likes: number;
  parentId?: string | null;
  isEdited?: boolean;
  user: { id: string; name: string; avatar?: string; role?: string };
  createdAt: string;
}

export const commentsService = {
  // Content comments
  async getContentComments(contentId: string, limit = 20, offset = 0): Promise<Comment[]> {
    return apiClient.tryApi(async () => {
      const data = await apiClient.get<{ items: any[] }>(`/comments/content/${contentId}?limit=${limit}&offset=${offset}`);
      return data.items.map((c: any) => ({
        id: c.id,
        text: c.text,
        likes: c.likes,
        parentId: c.parentId,
        isEdited: c.isEdited,
        user: c.user,
        createdAt: c.createdAt,
      }));
    }, async () => {
      // Fallback: mock from localStorage
      try {
        const stored = JSON.parse(localStorage.getItem(`som_comments_content_${contentId}`) || '[]');
        return stored;
      } catch { return []; }
    });
  },

  async addContentComment(contentId: string, text: string, parentId?: string): Promise<{ id: string }> {
    return apiClient.tryApi(async () => {
      const data = await apiClient.post<{ id: string }>(`/comments/content/${contentId}`, { text, parentId });
      return data;
    }, async () => {
      const id = `cc_${Date.now()}`;
      try {
        const key = `som_comments_content_${contentId}`;
        const existing = JSON.parse(localStorage.getItem(key) || '[]');
        existing.unshift({
          id,
          text,
          likes: 0,
          parentId: parentId || null,
          user: { id: 'me', name: 'You', avatar: '' },
          createdAt: new Date().toISOString(),
        });
        localStorage.setItem(key, JSON.stringify(existing));
      } catch {}
      return { id };
    });
  },

  async likeContentComment(contentId: string, commentId: string): Promise<void> {
    return apiClient.tryApi(async () => {
      await apiClient.post(`/comments/content/${contentId}/${commentId}/like`, {});
    }, async () => {});
  },

  async deleteContentComment(commentId: string): Promise<void> {
    return apiClient.tryApi(async () => {
      await apiClient.delete(`/comments/content/${commentId}`);
    }, async () => {
      // Fallback: remove from all content comment keys
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key?.startsWith('som_comments_content_')) {
            const existing = JSON.parse(localStorage.getItem(key) || '[]');
            const filtered = existing.filter((c: any) => c.id !== commentId);
            localStorage.setItem(key, JSON.stringify(filtered));
          }
        }
      } catch {}
    });
  },

  // Post comments (community)
  async getPostComments(postId: string): Promise<Comment[]> {
    return apiClient.tryApi(async () => {
      const data = await apiClient.get<{ items: any[] }>(`/comments/post/${postId}`);
      return data.items.map((c: any) => ({
        id: c.id,
        text: c.text,
        likes: c.likes,
        parentId: c.parentId,
        user: c.user,
        createdAt: c.createdAt,
      }));
    }, async () => {
      try {
        const stored = JSON.parse(localStorage.getItem(`som_comments_post_${postId}`) || '[]');
        return stored;
      } catch { return []; }
    });
  },

  async addPostComment(postId: string, text: string, parentId?: string): Promise<{ id: string }> {
    return apiClient.tryApi(async () => {
      const data = await apiClient.post<{ id: string }>(`/comments/post/${postId}`, { text, parentId });
      return data;
    }, async () => {
      const id = `pc_${Date.now()}`;
      try {
        const key = `som_comments_post_${postId}`;
        const existing = JSON.parse(localStorage.getItem(key) || '[]');
        existing.push({
          id,
          text,
          likes: 0,
          parentId: parentId || null,
          user: { id: 'me', name: 'You', avatar: '' },
          createdAt: new Date().toISOString(),
        });
        localStorage.setItem(key, JSON.stringify(existing));
      } catch {}
      return { id };
    });
  },

  async deletePostComment(commentId: string): Promise<void> {
    return apiClient.tryApi(async () => {
      await apiClient.delete(`/comments/post/${commentId}`);
    }, async () => {
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key?.startsWith('som_comments_post_')) {
            const existing = JSON.parse(localStorage.getItem(key) || '[]');
            const filtered = existing.filter((c: any) => c.id !== commentId);
            localStorage.setItem(key, JSON.stringify(filtered));
          }
        }
      } catch {}
    });
  },
};
