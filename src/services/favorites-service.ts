import { ContentItem, currentUser } from '@/lib/mock-data';
import { apiClient } from '@/lib/api-client';

interface FavoriteItem {
  contentId: string;
  addedAt: string;
  notes?: string;
}

class FavoritesService {
  private favorites: FavoriteItem[];
  private initialized = false;

  constructor() {
    this.favorites = [];
    this.initialize();
  }

  // Initialize with some default favorites + localStorage
  initialize(): void {
    if (this.initialized) return;
    this.initialized = true;
    const defaultFavorites: FavoriteItem[] = [
      { contentId: '1', addedAt: new Date(Date.now() - 86400000).toISOString(), notes: 'Powerful teaching on faith' },
      { contentId: '3', addedAt: new Date(Date.now() - 172800000).toISOString(), notes: 'Great worship teaching' },
      { contentId: '20', addedAt: new Date(Date.now() - 259200000).toISOString(), notes: 'Inspiring behind the scenes' },
    ];
    try {
      const stored = localStorage.getItem('som_favorites');
      if (stored) this.favorites = JSON.parse(stored);
      else this.favorites = defaultFavorites;
    } catch {
      this.favorites = defaultFavorites;
    }
    // Try to sync from API if available
    this.syncFromApi().catch(()=>{});
  }

  private persist() {
    try { localStorage.setItem('som_favorites', JSON.stringify(this.favorites)); } catch {}
  }

  /** Pull the signed-in user's favorites from the Worker (source of truth). */
  async sync(): Promise<FavoriteItem[]> {
    return this.syncFromApi();
  }

  private async syncFromApi(): Promise<FavoriteItem[]> {
    try {
      const data = await apiClient.get<{ items: any[] }>('/favorites');
      if (Array.isArray(data?.items)) {
        this.favorites = data.items.map((r: any) => ({
          contentId: r.contentId ?? r.content_id,
          addedAt: r.addedAt ?? r.added_at,
          notes: r.notes,
        }));
        this.persist();
        this.initialized = true;
      }
    } catch {
      /* offline — keep the local copy */
    }
    return this.favorites;
  }

  // Get all favorites
  getAllFavorites(): FavoriteItem[] {
    return this.favorites;
  }

  // Add to favorites
  addToFavorites(contentId: string, notes?: string): FavoriteItem {
    const existing = this.favorites.find(fav => fav.contentId === contentId);
    if (existing) return existing;

    const newFavorite: FavoriteItem = {
      contentId,
      addedAt: new Date().toISOString(),
      notes,
    };
    this.favorites.push(newFavorite);
    this.persist();

    // API fire-and-forget
    if (apiClient.hasApi) {
      apiClient.post('/favorites', { contentId, notes }).catch(()=>{});
    }

    return newFavorite;
  }

  // Remove from favorites
  removeFromFavorites(contentId: string): boolean {
    const index = this.favorites.findIndex(fav => fav.contentId === contentId);
    if (index !== -1) {
      this.favorites.splice(index, 1);
      this.persist();
      if (apiClient.hasApi) {
        apiClient.delete(`/favorites/${contentId}`).catch(()=>{});
      }
      return true;
    }
    return false;
  }

  isFavorited(contentId: string): boolean {
    return this.favorites.some(fav => fav.contentId === contentId);
  }

  getFavorite(contentId: string): FavoriteItem | undefined {
    return this.favorites.find(fav => fav.contentId === contentId);
  }

  updateFavoriteNotes(contentId: string, notes: string): FavoriteItem | undefined {
    const favorite = this.getFavorite(contentId);
    if (favorite) {
      favorite.notes = notes;
      this.persist();
      if (apiClient.hasApi) {
        apiClient.post('/favorites', { contentId, notes }).catch(()=>{});
      }
      return favorite;
    }
    return undefined;
  }

  getFavoritesCount(): number {
    return this.favorites.length;
  }

  getRecentFavorites(limit: number = 10): FavoriteItem[] {
    return [...this.favorites]
      .sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime())
      .slice(0, limit);
  }

  getFavoritesWithContent(allContent: ContentItem[]): (FavoriteItem & { content: ContentItem })[] {
    return this.favorites
      .map(favorite => {
        const content = allContent.find(c => c.id === favorite.contentId);
        return content ? { ...favorite, content } : null;
      })
      .filter(Boolean) as (FavoriteItem & { content: ContentItem })[];
  }

  clearAllFavorites(): void {
    this.favorites = [];
    this.persist();
    if (apiClient.hasApi) {
      apiClient.delete('/favorites').catch(()=>{});
    }
  }

  searchFavorites(query: string, allContent: ContentItem[]): (FavoriteItem & { content: ContentItem })[] {
    const lowerQuery = query.toLowerCase();
    return this.getFavoritesWithContent(allContent)
      .filter(item =>
        item.content.title.toLowerCase().includes(lowerQuery) ||
        item.content.description.toLowerCase().includes(lowerQuery) ||
        (item.notes && item.notes.toLowerCase().includes(lowerQuery))
      );
  }

  getFavoritesByCategory(category: string, allContent: ContentItem[]): (FavoriteItem & { content: ContentItem })[] {
    return this.getFavoritesWithContent(allContent)
      .filter(item => item.content.category === category);
  }

  getFavoritesBySpeaker(speakerId: string, allContent: ContentItem[]): (FavoriteItem & { content: ContentItem })[] {
    return this.getFavoritesWithContent(allContent)
      .filter(item => item.content.speaker.id === speakerId);
  }

  exportFavorites(): FavoriteItem[] {
    return this.favorites;
  }

  importFavorites(favorites: FavoriteItem[]): void {
    this.favorites = favorites;
    this.persist();
  }

  getFavoritesStats(allContent: ContentItem[]): {
    total: number;
    byCategory: Record<string, number>;
    bySpeaker: Record<string, number>;
  } {
    const byCategory: Record<string, number> = {};
    const bySpeaker: Record<string, number> = {};
    this.getFavoritesWithContent(allContent).forEach(item => {
      byCategory[item.content.category] = (byCategory[item.content.category] || 0) + 1;
      bySpeaker[item.content.speaker.name] = (bySpeaker[item.content.speaker.name] || 0) + 1;
    });
    return {
      total: this.favorites.length,
      byCategory,
      bySpeaker,
    };
  }
}

export const favoritesService = new FavoritesService();
