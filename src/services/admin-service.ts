// Admin service — dashboard stats, user management and moderation queue.
import { apiClient } from '@/lib/api-client';
import { adminStats as mockStats, pastorUploads as mockUploads } from '@/lib/mock-data';

export interface AdminStats {
  totalUsers: number;
  activeSubscribers: number;
  totalContent: number;
  pendingReviews: number;
  monthlyViews: number;
  dailyActiveUsers: number;
  newUsers30d?: number;
  revenue?: number;
  communityPosts?: number;
  qaQuestions?: number;
  dailyCompletions?: number;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'guest' | 'member' | 'pastor' | 'admin';
  streak?: number;
  affiliation?: string;
  joinedDate?: string;
  isActive?: boolean;
}

export interface ModerationUpload {
  id: string;
  userId: string;
  userName?: string;
  title: string;
  description?: string;
  type: 'video' | 'audio' | 'publication' | 'thumbnail';
  status: 'pending' | 'approved' | 'rejected';
  thumbnail?: string | null;
  fileUrl?: string | null;
  url?: string | null;
  feedback?: string | null;
  submittedDate: string;
  reviewedDate?: string | null;
  contentId?: string | null;
}

export const adminService = {
  /** GET /admin/stats */
  async getStats(): Promise<AdminStats> {
    return apiClient.tryApi(
      async () => {
        const data = await apiClient.get<AdminStats>('/admin/stats');
        return data;
      },
      () => mockStats as AdminStats,
      { label: 'admin stats' },
    );
  },

  /** GET /admin/analytics */
  async getAnalytics(days = 7) {
    return apiClient.tryApi(
      async () => apiClient.get<{ series: any[]; topContent: any[] }>(`/admin/analytics?days=${days}`),
      () => ({ series: [], topContent: [] }),
      { label: 'admin analytics' },
    );
  },

  /** GET /admin/users */
  async getUsers(params: { q?: string; role?: string; limit?: number; offset?: number } = {}): Promise<{ items: AdminUser[]; total: number }> {
    const search = new URLSearchParams();
    if (params.q) search.set('q', params.q);
    if (params.role && params.role !== 'all') search.set('role', params.role);
    search.set('limit', String(params.limit ?? 50));
    search.set('offset', String(params.offset ?? 0));

    return apiClient.tryApi(
      async () => apiClient.get<{ items: AdminUser[]; total: number }>(`/admin/users?${search.toString()}`),
      () => ({ items: [], total: 0 }),
      { label: 'admin users' },
    );
  },

  /** PUT /admin/users/:id/role */
  async updateUserRole(userId: string, role: AdminUser['role']): Promise<void> {
    await apiClient.put(`/admin/users/${userId}/role`, { role });
  },

  async setUserActive(userId: string, isActive: boolean): Promise<void> {
    await apiClient.put(`/admin/users/${userId}/status`, { isActive });
  },

  async deleteUser(userId: string): Promise<void> {
    await apiClient.delete(`/admin/users/${userId}`);
  },

  /** GET /admin/uploads?status= */
  async getUploads(status: 'all' | 'pending' | 'approved' | 'rejected' = 'all'): Promise<ModerationUpload[]> {
    return apiClient.tryApi(
      async () => {
        const data = await apiClient.get<{ items: ModerationUpload[] }>(`/admin/uploads?status=${status}`);
        return data.items;
      },
      () =>
        (mockUploads as unknown as ModerationUpload[]).filter((upload) => status === 'all' || upload.status === status),
      { label: 'admin uploads' },
    );
  },

  async approveUpload(id: string, feedback?: string): Promise<void> {
    await apiClient.post(`/admin/uploads/${id}/approve`, { feedback });
  },

  async rejectUpload(id: string, feedback: string): Promise<void> {
    await apiClient.post(`/admin/uploads/${id}/reject`, { feedback });
  },

  /** GET /admin/moderation/posts */
  async getFlaggedPosts() {
    return apiClient.tryApi(
      async () => (await apiClient.get<{ items: any[] }>('/admin/moderation/posts')).items,
      () => [],
      { label: 'moderation posts' },
    );
  },

  /** POST /admin/broadcast */
  async broadcast(title: string, message: string): Promise<number> {
    return apiClient.tryApi(
      async () => (await apiClient.post<{ sent: number }>('/admin/broadcast', { title, message })).sent,
      () => 0,
      { label: 'admin broadcast' },
    );
  },

  /** GET /admin/audit-logs */
  async getAuditLogs(limit = 50) {
    return apiClient.tryApi(
      async () => (await apiClient.get<{ items: any[] }>(`/admin/audit-logs?limit=${limit}`)).items,
      () => [],
      { label: 'audit logs' },
    );
  },
};

export default adminService;
