import { Playlist, ContentItem, currentUser } from '@/lib/mock-data';

interface UserPlaylist extends Playlist {
  userId: string;
  createdBy: string;
  updatedAt: string;
}

class PlaylistService {
  private playlists: UserPlaylist[];

  constructor() {
    this.playlists = [];
    this.initialize();
  }

  // Initialize with some default playlists
  initialize(): void {
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
    
    this.playlists = defaultPlaylists;
  }

  // Get all playlists for current user
  getUserPlaylists(): UserPlaylist[] {
    return this.playlists.filter(playlist => playlist.userId === currentUser.id);
  }

  // Get playlist by ID
  getPlaylistById(id: string): UserPlaylist | undefined {
    return this.playlists.find(playlist => playlist.id === id);
  }

  // Create a new playlist
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
    return newPlaylist;
  }

  // Update playlist
  updatePlaylist(id: string, updates: Partial<UserPlaylist>): UserPlaylist | undefined {
    const index = this.playlists.findIndex(playlist => playlist.id === id);
    if (index !== -1) {
      const updatedPlaylist = {
        ...this.playlists[index],
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      
      this.playlists[index] = updatedPlaylist;
      return updatedPlaylist;
    }
    return undefined;
  }

  // Delete playlist
  deletePlaylist(id: string): boolean {
    const index = this.playlists.findIndex(playlist => playlist.id === id);
    if (index !== -1) {
      this.playlists.splice(index, 1);
      return true;
    }
    return false;
  }

  // Add content to playlist
  addContentToPlaylist(playlistId: string, contentId: string): boolean {
    const playlist = this.getPlaylistById(playlistId);
    if (playlist) {
      if (!playlist.contentIds.includes(contentId)) {
        playlist.contentIds.push(contentId);
        playlist.updatedAt = new Date().toISOString();
        return true;
      }
    }
    return false;
  }

  // Remove content from playlist
  removeContentFromPlaylist(playlistId: string, contentId: string): boolean {
    const playlist = this.getPlaylistById(playlistId);
    if (playlist) {
      const index = playlist.contentIds.indexOf(contentId);
      if (index !== -1) {
        playlist.contentIds.splice(index, 1);
        playlist.updatedAt = new Date().toISOString();
        return true;
      }
    }
    return false;
  }

  // Check if content is in playlist
  isContentInPlaylist(playlistId: string, contentId: string): boolean {
    const playlist = this.getPlaylistById(playlistId);
    return playlist ? playlist.contentIds.includes(contentId) : false;
  }

  // Get content in playlist
  getContentInPlaylist(playlistId: string, allContent: ContentItem[]): ContentItem[] {
    const playlist = this.getPlaylistById(playlistId);
    if (playlist) {
      return allContent.filter(content => playlist.contentIds.includes(content.id));
    }
    return [];
  }

  // Get playlists containing specific content
  getPlaylistsWithContent(contentId: string): UserPlaylist[] {
    return this.playlists.filter(playlist => playlist.contentIds.includes(contentId));
  }

  // Search playlists
  searchPlaylists(query: string): UserPlaylist[] {
    const lowerQuery = query.toLowerCase();
    return this.playlists.filter(playlist =>
      playlist.name.toLowerCase().includes(lowerQuery) ||
      playlist.description.toLowerCase().includes(lowerQuery)
    );
  }

  // Get public playlists (from other users)
  getPublicPlaylists(): UserPlaylist[] {
    return this.playlists.filter(playlist => playlist.isPublic && playlist.userId !== currentUser.id);
  }

  // Get playlist count
  getPlaylistCount(): number {
    return this.playlists.length;
  }

  // Get total content across all playlists
  getTotalContentCount(): number {
    return this.playlists.reduce((total, playlist) => total + playlist.contentIds.length, 0);
  }

  // Reorder content in playlist
  reorderContentInPlaylist(playlistId: string, oldIndex: number, newIndex: number): boolean {
    const playlist = this.getPlaylistById(playlistId);
    if (playlist) {
      const contentIds = [...playlist.contentIds];
      const [removed] = contentIds.splice(oldIndex, 1);
      contentIds.splice(newIndex, 0, removed);
      
      playlist.contentIds = contentIds;
      playlist.updatedAt = new Date().toISOString();
      return true;
    }
    return false;
  }

  // Duplicate playlist
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
      return duplicatedPlaylist;
    }
    return undefined;
  }

  // Get recently updated playlists
  getRecentlyUpdatedPlaylists(limit: number = 5): UserPlaylist[] {
    return [...this.playlists]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, limit);
  }

  // Get most popular playlists (by content count)
  getPopularPlaylists(limit: number = 5): UserPlaylist[] {
    return [...this.playlists]
      .sort((a, b) => b.contentIds.length - a.contentIds.length)
      .slice(0, limit);
  }
}

export const playlistService = new PlaylistService();