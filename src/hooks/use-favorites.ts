import { useState, useEffect } from 'react';
import { favoritesService } from '@/services/favorites-service';
import { ContentItem } from '@/lib/mock-data';

interface FavoriteItem {
  contentId: string;
  addedAt: string;
  notes?: string;
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [favoritesCount, setFavoritesCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Initialize favorites
    const allFavorites = favoritesService.getAllFavorites();
    setFavorites(allFavorites);
    setFavoritesCount(allFavorites.length);
    setIsLoading(false);
  }, []);

  const refreshFavorites = () => {
    const allFavorites = favoritesService.getAllFavorites();
    setFavorites(allFavorites);
    setFavoritesCount(allFavorites.length);
  };

  const addToFavorites = (contentId: string, notes?: string) => {
    const result = favoritesService.addToFavorites(contentId, notes);
    refreshFavorites();
    return result;
  };

  const removeFromFavorites = (contentId: string) => {
    const success = favoritesService.removeFromFavorites(contentId);
    if (success) {
      refreshFavorites();
    }
    return success;
  };

  const isFavorited = (contentId: string) => {
    return favoritesService.isFavorited(contentId);
  };

  const getFavorite = (contentId: string) => {
    return favoritesService.getFavorite(contentId);
  };

  const updateFavoriteNotes = (contentId: string, notes: string) => {
    const result = favoritesService.updateFavoriteNotes(contentId, notes);
    if (result) {
      refreshFavorites();
    }
    return result;
  };

  const getRecentFavorites = (limit: number = 10) => {
    return favoritesService.getRecentFavorites(limit);
  };

  const getFavoritesWithContent = (allContent: ContentItem[]) => {
    return favoritesService.getFavoritesWithContent(allContent);
  };

  const searchFavorites = (query: string, allContent: ContentItem[]) => {
    return favoritesService.searchFavorites(query, allContent);
  };

  const getFavoritesByCategory = (category: string, allContent: ContentItem[]) => {
    return favoritesService.getFavoritesByCategory(category, allContent);
  };

  const getFavoritesBySpeaker = (speakerId: string, allContent: ContentItem[]) => {
    return favoritesService.getFavoritesBySpeaker(speakerId, allContent);
  };

  const clearAllFavorites = () => {
    favoritesService.clearAllFavorites();
    refreshFavorites();
  };

  const getFavoritesStats = (allContent: ContentItem[]) => {
    return favoritesService.getFavoritesStats(allContent);
  };

  return {
    favorites,
    favoritesCount,
    isLoading,
    refreshFavorites,
    addToFavorites,
    removeFromFavorites,
    isFavorited,
    getFavorite,
    updateFavoriteNotes,
    getRecentFavorites,
    getFavoritesWithContent,
    searchFavorites,
    getFavoritesByCategory,
    getFavoritesBySpeaker,
    clearAllFavorites,
    getFavoritesStats,
  };
}