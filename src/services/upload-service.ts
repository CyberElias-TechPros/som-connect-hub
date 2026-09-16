// Upload service — R2 backed media pipeline (pastor/admin publishes straight to
// the library; everyone else lands in the moderation queue).
import { apiClient } from '@/lib/api-client';
import { pastorUploads as mockUploads } from '@/lib/mock-data';
import type { ModerationUpload } from './admin-service';

export interface UploadResult {
  id: string;
  key?: string;
  url: string;
  status: 'pending' | 'approved' | 'rejected';
  contentId?: string | null;
  message?: string;
}

export const uploadService = {
  /**
   * POST /uploads (multipart). `onProgress` is approximate: fetch has no upload
   * progress events, so we report staged progress around the request.
   */
  async uploadFile(
    file: File,
    options: { type?: 'video' | 'audio' | 'thumbnail' | 'publication'; title?: string; description?: string; category?: string } = {},
    onProgress?: (percent: number) => void,
  ): Promise<UploadResult> {
    const form = new FormData();
    form.append('file', file);
    form.append('type', options.type ?? 'video');
    form.append('title', options.title ?? file.name.replace(/\.[^.]+$/, ''));
    if (options.description) form.append('description', options.description);
    if (options.category) form.append('category', options.category);

    onProgress?.(10);
    const timer = setInterval(() => onProgress?.(Math.min(90, Math.round(Math.random() * 40) + 50)), 400);

    try {
      const result = await apiClient.upload<UploadResult>('/uploads', form);
      onProgress?.(100);
      return result;
    } finally {
      clearInterval(timer);
    }
  },

  async uploadAvatar(file: File): Promise<{ url: string }> {
    const form = new FormData();
    form.append('file', file);
    return apiClient.upload<{ url: string }>('/uploads/avatar', form);
  },

  /** GET /uploads — the signed-in user's submissions. */
  async getMyUploads(): Promise<ModerationUpload[]> {
    return apiClient.tryApi(
      async () => (await apiClient.get<{ items: ModerationUpload[] }>('/uploads')).items,
      () => mockUploads as unknown as ModerationUpload[],
      { label: 'my uploads' },
    );
  },

  /** GET /uploads/stats */
  async getStats(): Promise<Record<string, number>> {
    return apiClient.tryApi(
      async () => (await apiClient.get<{ counts: Record<string, number> }>('/uploads/stats')).counts,
      () => ({ pending: 0, approved: 0, rejected: 0 }),
      { label: 'upload stats' },
    );
  },

  async deleteUpload(id: string): Promise<void> {
    await apiClient.delete(`/uploads/${id}`);
  },

  /** Public URL for an R2 key (falls back to the API proxy route). */
  fileUrl(upload: Pick<ModerationUpload, 'fileUrl' | 'url'>): string {
    if (upload.url) return upload.url;
    if (upload.fileUrl) return upload.fileUrl.startsWith('http') ? upload.fileUrl : `/uploads/file/${upload.fileUrl}`;
    return '';
  },
};

export default uploadService;
