import { apiClient } from '@/lib/api-client';
import { CommunityPost, Group } from '@/lib/mock-data';

export const communityService = {
  async getPosts(limit = 20, offset = 0): Promise<CommunityPost[]> {
    return apiClient.tryApi<CommunityPost[]>(async () => {
      const data = await apiClient.get<{ items: any[] }>(`/community/posts?limit=${limit}&offset=${offset}`);
      return data.items.map((p: any) => ({
        id: p.id,
        author: p.author,
        content: p.content,
        timestamp: p.timestamp || p.created_at,
        likes: p.likes,
        comments: p.comments,
        image: p.image,
        isLiked: !!p.isLiked,
      }));
    }, async () => {
      const { communityPosts } = await import('@/lib/mock-data');
      return communityPosts;
    });
  },

  async createPost(content: string, imageUrl?: string): Promise<{ id: string }> {
    return apiClient.tryApi(async () => {
      const data = await apiClient.post<{ id: string }>('/community/posts', { content, imageUrl });
      return data;
    }, async () => {
      return { id: `post_${Date.now()}` };
    });
  },

  async likePost(postId: string): Promise<{ liked: boolean }> {
    return apiClient.tryApi(async () => {
      const data = await apiClient.post<{ liked: boolean }>(`/community/posts/${postId}/like`, {});
      return data;
    }, async () => {
      return { liked: true };
    });
  },

  async getGroups(): Promise<Group[]> {
    return apiClient.tryApi(async () => {
      const data = await apiClient.get<{ items: any[] }>('/community/groups');
      return data.items.map((g: any) => ({
        id: g.id,
        name: g.name,
        description: g.description,
        memberCount: g.memberCount || g.member_count,
        cover: g.cover,
        isJoined: g.isJoined || g.is_joined || false,
      }));
    }, async () => {
      const { groups } = await import('@/lib/mock-data');
      return groups;
    });
  },

  /** GET /community/posts/:id — post plus its comments. */
  async getPost(postId: string): Promise<{ post: CommunityPost | null; comments: any[] }> {
    return apiClient.tryApi(
      async () => {
        const data = await apiClient.get<{ post: any; comments: any[] }>(`/community/posts/${postId}`);
        return {
          post: {
            id: data.post.id,
            author: data.post.author,
            content: data.post.content,
            timestamp: data.post.timestamp,
            likes: data.post.likes,
            comments: data.post.comments,
            image: data.post.image,
            isLiked: !!data.post.isLiked,
          } as CommunityPost,
          comments: data.comments ?? [],
        };
      },
      () => ({ post: null, comments: [] }),
      { label: 'post detail' },
    );
  },

  /** POST /community/posts/:id/comments */
  async addComment(postId: string, content: string): Promise<any> {
    return apiClient.tryApi(
      async () => (await apiClient.post<{ comment: any }>(`/community/posts/${postId}/comments`, { content })).comment,
      () => ({ id: `comment_${Date.now()}`, content, timestamp: new Date().toISOString() }),
      { label: 'add comment' },
    );
  },

  async deletePost(postId: string): Promise<void> {
    await apiClient.delete(`/community/posts/${postId}`);
  },

  async joinGroup(groupId: string): Promise<{ joined: boolean }> {
    return apiClient.tryApi(async () => {
      const data = await apiClient.post<{ joined: boolean }>(`/community/groups/${groupId}/join`, {});
      return data;
    }, async () => {
      return { joined: true };
    });
  },
};
