import { ContentItem, currentUser } from '@/lib/mock-data';

interface FavoriteItem {
  contentId: string;
  addedAt: string;
  notes?: string;
}

class FavoritesService {
  private favorites: FavoriteItem[];

  constructor() {
    this.favorites = [];
    this.initialize();
  }

  // Initialize with some default favorites
  initialize(): void {
    const defaultFavorites: FavoriteItem[] = [
      {
        contentId: '1',
        addedAt: new Date(Date.now() - 86400000).toISOString(), // Yesterday
        notes: 'Powerful teaching on faith',
      },
      {
        contentId: '3',
        addedAt: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
        notes: 'Great worship teaching',
      },
      {
        contentId: '20',
        addedAt: new Date(Date.now() - 259200000).toISOString(), // 3 days ago
        notes: 'Inspiring behind the scenes',
      },
    ];
    
    this.favorites = defaultFavorites;
  }

  // Get all favorites
  getAllFavorites(): FavoriteItem[] {
    return this.favorites;
  }

  // Add to favorites
  addToFavorites(contentId: string, notes?: string): FavoriteItem {
    // Check if already favorited
    const existing = this.favorites.find(fav => fav.contentId === contentId);
    if (existing) {
      return existing; // Already favorited
    }

    const newFavorite: FavoriteItem = {
      contentId,
      addedAt: new Date().toISOString(),
      notes,
    };
    
    this.favorites.push(newFavorite);
    return newFavorite;
  }

  // Remove from favorites
  removeFromFavorites(contentId: string): boolean {
    const index = this.favorites.findIndex(fav => fav.contentId === contentId);
    if (index !== -1) {
      this.favorites.splice(index, 1);
      return true;
    }
    return false;
  }

  // Check if content is favorited
  isFavorited(contentId: string): boolean {
    return this.favorites.some(fav => fav.contentId === contentId);
  }

  // Get favorite by content ID
  getFavorite(contentId: string): FavoriteItem | undefined {
    return this.favorites.find(fav => fav.contentId === contentId);
  }

  // Update favorite notes
  updateFavoriteNotes(contentId: string, notes: string): FavoriteItem | undefined {
    const favorite = this.getFavorite(contentId);
    if (favorite) {
      favorite.notes = notes;
      return favorite;
    }
    return undefined;
  }

  // Get favorites count
  getFavoritesCount(): number {
    return this.favorites.length;
  }

  // Get recently added favorites
  getRecentFavorites(limit: number = 10): FavoriteItem[] {
    return [...this.favorites]
      .sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime())
      .slice(0, limit);
  }

  // Get favorites with content details
  getFavoritesWithContent(allContent: ContentItem[]): (FavoriteItem & { content: ContentItem })[] {
    return this.favorites
      .map(favorite => {
        const content = allContent.find(c => c.id === favorite.contentId);
        return content ? { ...favorite, content } : null;
      })
      .filter(Boolean) as (FavoriteItem & { content: ContentItem })[];
  }

  // Clear all favorites
  clearAllFavorites(): void {
    this.favorites = [];
  }

  // Search favorites
  searchFavorites(query: string, allContent: ContentItem[]): (FavoriteItem & { content: ContentItem })[] {
    const lowerQuery = query.toLowerCase();
    return this.getFavoritesWithContent(allContent)
      .filter(item =>
        item.content.title.toLowerCase().includes(lowerQuery) ||
        item.content.description.toLowerCase().includes(lowerQuery) ||
        (item.notes && item.notes.toLowerCase().includes(lowerQuery))
      );
  }

  // Get favorites by category
  getFavoritesByCategory(category: string, allContent: ContentItem[]): (FavoriteItem & { content: ContentItem })[] {
    return this.getFavoritesWithContent(allContent)
      .filter(item => item.content.category === category);
  }

  // Get favorites by speaker
  getFavoritesBySpeaker(speakerId: string, allContent: ContentItem[]): (FavoriteItem & { content: ContentItem })[] {
    return this.getFavoritesWithContent(allContent)
      .filter(item => item.content.speaker.id === speakerId);
  }

  // Export favorites (for backup)
  exportFavorites(): FavoriteItem[] {
    return this.favorites;
  }

  // Import favorites (for restore)
  importFavorites(favorites: FavoriteItem[]): void {
    this.favorites = favorites;
  }

  // Get favorites statistics
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