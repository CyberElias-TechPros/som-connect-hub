import { apiClient } from '@/lib/api-client';
import { CommunityPost, Group } from '@/lib/mock-data';

export const communityService = {
  async getPosts(limit = 20, offset = 0): Promise<CommunityPost[]> {
    return apiClient.tryApi(async () => {
      const data = await apiClient.get<{ items: any[] }>(`/community/posts?limit=${limit}&offset=${offset}`);
      return data.items.map((p: any) => ({
        id: p.id,
        author: p.author,
        content: p.content,
        timestamp: p.timestamp || p.created_at,
        likes: p.likes,
        comments: p.comments,
        image: p.image,
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

  async joinGroup(groupId: string): Promise<{ joined: boolean }> {
    return apiClient.tryApi(async () => {
      const data = await apiClient.post<{ joined: boolean }>(`/community/groups/${groupId}/join`, {});
      return data;
    }, async () => {
      return { joined: true };
    });
  },
};
