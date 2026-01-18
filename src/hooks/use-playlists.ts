import { useState, useEffect } from 'react';
import { playlistService } from '@/services/playlist-service';
import { Playlist, ContentItem } from '@/lib/mock-data';

interface UserPlaylist extends Playlist {
  userId: string;
  createdBy: string;
  updatedAt: string;
}

export function usePlaylists() {
  const [playlists, setPlaylists] = useState<UserPlaylist[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Initialize playlists
    const userPlaylists = playlistService.getUserPlaylists();
    setPlaylists(userPlaylists);
    setIsLoading(false);
  }, []);

  const refreshPlaylists = () => {
    const userPlaylists = playlistService.getUserPlaylists();
    setPlaylists(userPlaylists);
  };

  const createPlaylist = (name: string, description: string, isPublic: boolean = false) => {
    const newPlaylist = playlistService.createPlaylist(name, description, isPublic);
    refreshPlaylists();
    return newPlaylist;
  };

  const updatePlaylist = (id: string, updates: Partial<UserPlaylist>) => {
    const updatedPlaylist = playlistService.updatePlaylist(id, updates);
    if (updatedPlaylist) {
      refreshPlaylists();
    }
    return updatedPlaylist;
  };

  const deletePlaylist = (id: string) => {
    const success = playlistService.deletePlaylist(id);
    if (success) {
      refreshPlaylists();
    }
    return success;
  };

  const addContentToPlaylist = (playlistId: string, contentId: string) => {
    const success = playlistService.addContentToPlaylist(playlistId, contentId);
    if (success) {
      refreshPlaylists();
    }
    return success;
  };

  const removeContentFromPlaylist = (playlistId: string, contentId: string) => {
    const success = playlistService.removeContentFromPlaylist(playlistId, contentId);
    if (success) {
      refreshPlaylists();
    }
    return success;
  };

  const isContentInPlaylist = (playlistId: string, contentId: string) => {
    return playlistService.isContentInPlaylist(playlistId, contentId);
  };

  const getContentInPlaylist = (playlistId: string, allContent: ContentItem[]) => {
    return playlistService.getContentInPlaylist(playlistId, allContent);
  };

  const getPlaylistsWithContent = (contentId: string) => {
    return playlistService.getPlaylistsWithContent(contentId);
  };

  const searchPlaylists = (query: string) => {
    return playlistService.searchPlaylists(query);
  };

  const getPublicPlaylists = () => {
    return playlistService.getPublicPlaylists();
  };

  const reorderContentInPlaylist = (playlistId: string, oldIndex: number, newIndex: number) => {
    const success = playlistService.reorderContentInPlaylist(playlistId, oldIndex, newIndex);
    if (success) {
      refreshPlaylists();
    }
    return success;
  };

  const duplicatePlaylist = (playlistId: string) => {
    const duplicatedPlaylist = playlistService.duplicatePlaylist(playlistId);
    if (duplicatedPlaylist) {
      refreshPlaylists();
    }
    return duplicatedPlaylist;
  };

  const getRecentlyUpdatedPlaylists = (limit: number = 5) => {
    return playlistService.getRecentlyUpdatedPlaylists(limit);
  };

  const getPopularPlaylists = (limit: number = 5) => {
    return playlistService.getPopularPlaylists(limit);
  };

  return {
    playlists,
    isLoading,
    refreshPlaylists,
    createPlaylist,
    updatePlaylist,
    deletePlaylist,
    addContentToPlaylist,
    removeContentFromPlaylist,
    isContentInPlaylist,
    getContentInPlaylist,
    getPlaylistsWithContent,
    searchPlaylists,
    getPublicPlaylists,
    reorderContentInPlaylist,
    duplicatePlaylist,
    getRecentlyUpdatedPlaylists,
    getPopularPlaylists,
  };
}