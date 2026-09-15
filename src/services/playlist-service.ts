import { Playlist, ContentItem, currentUser } from '@/lib/mock-data';
import { apiClient } from '@/lib/api-client';

interface UserPlaylist extends Playlist {
  userId: string;
  createdBy: string;
  updatedAt: string;
}

class PlaylistService {
  private playlists: UserPlaylist[];
  private initialized = false;

  constructor() {
    this.playlists = [];
    this.initialize();
  }

  initialize(): void {
    if (this.initialized) return;
    this.initialized = true;
    const defaultPlaylists: UserPlaylist[] = [
      {
        id: 'user-1',
        name: 'My Faith Journey',
        description: 'Content that has impacted my spiritual growth.',
        thumbnail: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=340&fit=crop',
        contentIds: ['1', '3', '5'],
        createdDate: '2025-01-01',
        isPublic: false,
        userId: currentUser.id,
        createdBy: currentUser.name,
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'user-2',
        name: 'Morning Devotion',
        description: 'Short teachings for daily inspiration.',
        thumbnail: 'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=600&h=340&fit=crop',
        contentIds: ['10', '11'],
        createdDate: '2025-01-05',
        isPublic: false,
        userId: currentUser.id,
        createdBy: currentUser.name,
        updatedAt: new Date().toISOString(),
      },
    ];
    try {
      const stored = localStorage.getItem('som_playlists');
      if (stored) this.playlists = JSON.parse(stored);
      else this.playlists = defaultPlaylists;
    } catch {
      this.playlists = defaultPlaylists;
    }
    this.syncFromApi().catch(()=>{});
  }

  private persist() {
    try { localStorage.setItem('som_playlists', JSON.stringify(this.playlists)); } catch {}
  }

  /** Pull playlists from the Worker (source of truth when signed in). */
  async sync(): Promise<UserPlaylist[]> {
    return this.syncFromApi();
  }

  private async syncFromApi(): Promise<UserPlaylist[]> {
    try {
      const data = await apiClient.get<{ items: any[] }>('/playlists');
      if (Array.isArray(data?.items)) {
        this.playlists = data.items.map((p: any) => ({
          id: p.id,
          name: p.name,
          description: p.description,
          thumbnail: p.thumbnail,
          contentIds: p.contentIds || [],
          createdDate: p.created_at || p.createdDate,
          isPublic: !!p.is_public || !!p.isPublic,
          userId: p.user_id || currentUser.id,
          createdBy: currentUser.name,
          updatedAt: p.updated_at || new Date().toISOString(),
        }));
        this.persist();
      }
    } catch {
      /* offline — keep local copy */
    }
    return this.playlists;
  }

  getUserPlaylists(): UserPlaylist[] {
    return this.playlists.filter(playlist => playlist.userId === currentUser.id);
  }

  getPlaylistById(id: string): UserPlaylist | undefined {
    return this.playlists.find(playlist => playlist.id === id);
  }

  createPlaylist(name: string, description: string, isPublic: boolean = false): UserPlaylist {
    const newPlaylist: UserPlaylist = {
      id: `user-${Date.now()}`,
      name,
      description,
      thumbnail: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=340&fit=crop',
      contentIds: [],
      createdDate: new Date().toISOString(),
      isPublic,
      userId: currentUser.id,
      createdBy: currentUser.name,
      updatedAt: new Date().toISOString(),
    };
    this.playlists.push(newPlaylist);
    this.persist();
    if (apiClient.hasApi) {
      apiClient.post('/playlists', { name, description, isPublic }).catch(()=>{});
    }
    return newPlaylist;
  }

  updatePlaylist(id: string, updates: Partial<UserPlaylist>): UserPlaylist | undefined {
    const index = this.playlists.findIndex(playlist => playlist.id === id);
    if (index !== -1) {
      const updatedPlaylist = { ...this.playlists[index], ...updates, updatedAt: new Date().toISOString() };
      this.playlists[index] = updatedPlaylist;
      this.persist();
      return updatedPlaylist;
    }
    return undefined;
  }

  deletePlaylist(id: string): boolean {
    const index = this.playlists.findIndex(playlist => playlist.id === id);
    if (index !== -1) {
      this.playlists.splice(index, 1);
      this.persist();
      if (apiClient.hasApi) apiClient.delete(`/playlists/${id}`).catch(()=>{});
      return true;
    }
    return false;
  }

  addContentToPlaylist(playlistId: string, contentId: string): boolean {
    const playlist = this.getPlaylistById(playlistId);
    if (playlist) {
      if (!playlist.contentIds.includes(contentId)) {
        playlist.contentIds.push(contentId);
        playlist.updatedAt = new Date().toISOString();
        this.persist();
        if (apiClient.hasApi) apiClient.post(`/playlists/${playlistId}/items`, { contentId }).catch(()=>{});
        return true;
      }
    }
    return false;
  }

  removeContentFromPlaylist(playlistId: string, contentId: string): boolean {
    const playlist = this.getPlaylistById(playlistId);
    if (playlist) {
      const index = playlist.contentIds.indexOf(contentId);
      if (index !== -1) {
        playlist.contentIds.splice(index, 1);
        playlist.updatedAt = new Date().toISOString();
        this.persist();
        if (apiClient.hasApi) apiClient.delete(`/playlists/${playlistId}/items/${contentId}`).catch(()=>{});
        return true;
      }
    }
    return false;
  }

  isContentInPlaylist(playlistId: string, contentId: string): boolean {
    const playlist = this.getPlaylistById(playlistId);
    return playlist ? playlist.contentIds.includes(contentId) : false;
  }

  getContentInPlaylist(playlistId: string, allContent: ContentItem[]): ContentItem[] {
    const playlist = this.getPlaylistById(playlistId);
    if (playlist) return allContent.filter(content => playlist.contentIds.includes(content.id));
    return [];
  }

  getPlaylistsWithContent(contentId: string): UserPlaylist[] {
    return this.playlists.filter(playlist => playlist.contentIds.includes(contentId));
  }

  searchPlaylists(query: string): UserPlaylist[] {
    const lowerQuery = query.toLowerCase();
    return this.playlists.filter(playlist =>
      playlist.name.toLowerCase().includes(lowerQuery) ||
      playlist.description.toLowerCase().includes(lowerQuery)
    );
  }

  getPublicPlaylists(): UserPlaylist[] {
    return this.playlists.filter(playlist => playlist.isPublic && playlist.userId !== currentUser.id);
  }

  getPlaylistCount(): number { return this.playlists.length; }
  getTotalContentCount(): number { return this.playlists.reduce((total, playlist) => total + playlist.contentIds.length, 0); }

  reorderContentInPlaylist(playlistId: string, oldIndex: number, newIndex: number): boolean {
    const playlist = this.getPlaylistById(playlistId);
    if (playlist) {
      const contentIds = [...playlist.contentIds];
      const [removed] = contentIds.splice(oldIndex, 1);
      contentIds.splice(newIndex, 0, removed);
      playlist.contentIds = contentIds;
      playlist.updatedAt = new Date().toISOString();
      this.persist();
      return true;
    }
    return false;
  }

  duplicatePlaylist(playlistId: string): UserPlaylist | undefined {
    const originalPlaylist = this.getPlaylistById(playlistId);
    if (originalPlaylist) {
      const duplicatedPlaylist: UserPlaylist = {
        ...originalPlaylist,
        id: `user-${Date.now()}`,
        name: `${originalPlaylist.name} (Copy)`,
        createdDate: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      this.playlists.push(duplicatedPlaylist);
      this.persist();
      return duplicatedPlaylist;
    }
    return undefined;
  }

  getRecentlyUpdatedPlaylists(limit: number = 5): UserPlaylist[] {
    return [...this.playlists].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, limit);
  }

  getPopularPlaylists(limit: number = 5): UserPlaylist[] {
    return [...this.playlists].sort((a, b) => b.contentIds.length - a.contentIds.length).slice(0, limit);
  }
}

export const playlistService = new PlaylistService();
