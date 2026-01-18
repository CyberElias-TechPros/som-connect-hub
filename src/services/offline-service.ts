import { ContentItem, Playlist, Publication } from '@/lib/mock-data';

interface CachedContent {
  id: string;
  type: 'content' | 'playlist' | 'publication';
  data: ContentItem | Playlist | Publication;
  timestamp: string;
  size: number; // in MB
}

class OfflineService {
  private cachedItems: CachedContent[];
  private storageLimit: number; // in MB
  private autoDownloadEnabled: boolean;

  constructor() {
    this.cachedItems = [];
    this.storageLimit = 5000; // 5GB default
    this.autoDownloadEnabled = false;
  }

  // Initialize with existing cached content
  initialize(): void {
    // In a real app, this would load from IndexedDB or localStorage
    console.log('Offline service initialized');
    this.loadFromStorage();
  }

  // Load cached content from storage (simulated)
  private loadFromStorage(): void {
    // Simulate loading from storage
    const mockCachedItems: CachedContent[] = [
      {
        id: '1',
        type: 'content',
        data: {
          id: '1',
          title: 'The Power of Faith in Action',
          description: 'Discover how to activate your faith and see miraculous results in your daily life.',
          thumbnail: 'https://images.unsplash.com/photo-1507692049790-de58290a4334?w=600&h=340&fit=crop',
          duration: '1:24:30',
          speaker: {
            id: '1',
            name: 'Pastor Chris Oyakhilome',
            title: 'President, LoveWorld Inc.',
            avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
          },
          date: '2025-01-05',
          category: 'conference',
          tags: ['Faith', 'Miracles', 'Prayer'],
          views: 15420,
          isPremium: false,
          isDownloaded: true,
          progress: 100,
          isFavorited: true,
        },
        timestamp: new Date(Date.now() - 86400000).toISOString(), // Yesterday
        size: 250, // 250MB
      },
      {
        id: '2',
        type: 'content',
        data: {
          id: '20',
          title: 'A Day in the Life: Pastor Chris',
          description: 'Get an exclusive behind-the-scenes look at a typical day in the life of Pastor Chris.',
          thumbnail: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&h=340&fit=crop',
          duration: '45:00',
          speaker: {
            id: '1',
            name: 'Pastor Chris Oyakhilome',
            title: 'President, LoveWorld Inc.',
            avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
          },
          date: '2025-01-09',
          category: 'original',
          tags: ['Behind the Scenes', 'Exclusive', 'Day in Life'],
          views: 25000,
          isPremium: true,
          isDownloaded: true,
          progress: 100,
          isFavorited: true,
        },
        timestamp: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
        size: 180, // 180MB
      },
    ];
    
    this.cachedItems = mockCachedItems;
  }

  // Enable auto-download
  enableAutoDownload(): void {
    this.autoDownloadEnabled = true;
    console.log('Auto-download enabled');
  }

  // Disable auto-download
  disableAutoDownload(): void {
    this.autoDownloadEnabled = false;
    console.log('Auto-download disabled');
  }

  // Check if auto-download is enabled
  isAutoDownloadEnabled(): boolean {
    return this.autoDownloadEnabled;
  }

  // Get all cached items
  getCachedItems(): CachedContent[] {
    return this.cachedItems;
  }

  // Get cached items by type
  getCachedItemsByType(type: 'content' | 'playlist' | 'publication'): CachedContent[] {
    return this.cachedItems.filter(item => item.type === type);
  }

  // Cache an item
  cacheItem(item: ContentItem | Playlist | Publication): Promise<boolean> {
    return new Promise((resolve) => {
      // Simulate caching process
      setTimeout(() => {
        const cachedItem: CachedContent = {
          id: item.id,
          type: this.getItemType(item),
          data: item,
          timestamp: new Date().toISOString(),
          size: this.calculateSize(item),
        };
        
        this.cachedItems.push(cachedItem);
        console.log(`Cached item: ${item.id}`);
        resolve(true);
      }, 1000); // Simulate network delay
    });
  }

  // Remove cached item
  removeCachedItem(id: string): boolean {
    const index = this.cachedItems.findIndex(item => item.id === id);
    if (index !== -1) {
      this.cachedItems.splice(index, 1);
      console.log(`Removed cached item: ${id}`);
      return true;
    }
    return false;
  }

  // Clear all cached items
  clearAllCache(): void {
    this.cachedItems = [];
    console.log('Cleared all cached items');
  }

  // Get total storage used
  getStorageUsed(): number {
    return this.cachedItems.reduce((total, item) => total + item.size, 0);
  }

  // Get storage limit
  getStorageLimit(): number {
    return this.storageLimit;
  }

  // Set storage limit
  setStorageLimit(limit: number): void {
    this.storageLimit = limit;
    console.log(`Storage limit set to ${limit}MB`);
  }

  // Check if item is cached
  isCached(id: string): boolean {
    return this.cachedItems.some(item => item.id === id);
  }

  // Get item from cache
  getCachedItem(id: string): CachedContent | undefined {
    return this.cachedItems.find(item => item.id === id);
  }

  // Calculate size of item (mock implementation)
  private calculateSize(item: ContentItem | Playlist | Publication): number {
    if (this.getItemType(item) === 'content') {
      const content = item as ContentItem;
      // Mock size calculation based on duration
      const durationParts = content.duration.split(':');
      const minutes = parseInt(durationParts[0]) * 60 + parseInt(durationParts[1]);
      return Math.round(minutes * 2.5); // ~2.5MB per minute
    }
    return 5; // 5MB for playlists/publications
  }

  // Get item type
  private getItemType(item: ContentItem | Playlist | Publication): 'content' | 'playlist' | 'publication' {
    if ('speaker' in item) return 'content';
    if ('contentIds' in item) return 'playlist';
    if ('pages' in item) return 'publication';
    return 'content';
  }

  // Get cached content items
  getCachedContent(): ContentItem[] {
    return this.cachedItems
      .filter(item => item.type === 'content')
      .map(item => item.data as ContentItem);
  }

  // Get cached playlists
  getCachedPlaylists(): Playlist[] {
    return this.cachedItems
      .filter(item => item.type === 'playlist')
      .map(item => item.data as Playlist);
  }

  // Get cached publications
  getCachedPublications(): Publication[] {
    return this.cachedItems
      .filter(item => item.type === 'publication')
      .map(item => item.data as Publication);
  }

  // Simulate download progress
  simulateDownloadProgress(id: string, callback: (progress: number) => void): void {
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 10;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
      }
      callback(Math.round(progress));
    }, 300);
  }

  // Get storage usage percentage
  getStorageUsagePercentage(): number {
    return (this.getStorageUsed() / this.getStorageLimit()) * 100;
  }

  // Get available storage
  getAvailableStorage(): number {
    return this.getStorageLimit() - this.getStorageUsed();
  }
}

export const offlineService = new OfflineService();