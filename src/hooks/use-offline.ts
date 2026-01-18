import { useState, useEffect } from 'react';
import { offlineService } from '@/services/offline-service';
import { ContentItem, Playlist, Publication } from '@/lib/mock-data';

export function useOffline() {
  const [cachedItems, setCachedItems] = useState(offlineService.getCachedItems());
  const [storageUsed, setStorageUsed] = useState(offlineService.getStorageUsed());
  const [storageLimit, setStorageLimit] = useState(offlineService.getStorageLimit());
  const [autoDownloadEnabled, setAutoDownloadEnabled] = useState(offlineService.isAutoDownloadEnabled());
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Initialize offline service
    offlineService.initialize();
    setIsInitialized(true);
    
    // Update state with current values
    setCachedItems(offlineService.getCachedItems());
    setStorageUsed(offlineService.getStorageUsed());
    setStorageLimit(offlineService.getStorageLimit());
    setAutoDownloadEnabled(offlineService.isAutoDownloadEnabled());
  }, []);

  const refreshCache = () => {
    setCachedItems(offlineService.getCachedItems());
    setStorageUsed(offlineService.getStorageUsed());
  };

  const toggleAutoDownload = () => {
    if (autoDownloadEnabled) {
      offlineService.disableAutoDownload();
    } else {
      offlineService.enableAutoDownload();
    }
    setAutoDownloadEnabled(!autoDownloadEnabled);
  };

  const cacheItem = async (item: ContentItem | Playlist | Publication) => {
    try {
      const success = await offlineService.cacheItem(item);
      if (success) {
        refreshCache();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to cache item:', error);
      return false;
    }
  };

  const removeCachedItem = (id: string) => {
    const success = offlineService.removeCachedItem(id);
    if (success) {
      refreshCache();
    }
    return success;
  };

  const clearAllCache = () => {
    offlineService.clearAllCache();
    refreshCache();
  };

  const setStorageLimitMB = (limit: number) => {
    offlineService.setStorageLimit(limit);
    setStorageLimit(limit);
  };

  const isCached = (id: string) => {
    return offlineService.isCached(id);
  };

  const getCachedItem = (id: string) => {
    return offlineService.getCachedItem(id);
  };

  const getStorageUsagePercentage = () => {
    return offlineService.getStorageUsagePercentage();
  };

  const getAvailableStorage = () => {
    return offlineService.getAvailableStorage();
  };

  const getCachedContent = () => {
    return offlineService.getCachedContent();
  };

  const getCachedPlaylists = () => {
    return offlineService.getCachedPlaylists();
  };

  const getCachedPublications = () => {
    return offlineService.getCachedPublications();
  };

  const simulateDownloadProgress = (id: string, callback: (progress: number) => void) => {
    offlineService.simulateDownloadProgress(id, callback);
  };

  return {
    cachedItems,
    storageUsed,
    storageLimit,
    autoDownloadEnabled,
    isInitialized,
    refreshCache,
    toggleAutoDownload,
    cacheItem,
    removeCachedItem,
    clearAllCache,
    setStorageLimitMB,
    isCached,
    getCachedItem,
    getStorageUsagePercentage,
    getAvailableStorage,
    getCachedContent,
    getCachedPlaylists,
    getCachedPublications,
    simulateDownloadProgress,
  };
}