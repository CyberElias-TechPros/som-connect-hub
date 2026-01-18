import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Heart, Plus, Play, Lock, Loader2, Search } from 'lucide-react';
import { conferences, podcasts, originals, playlists, ContentItem, Playlist } from '@/lib/mock-data';
import { ContentGuard } from '@/components/auth/PermissionGuard';

const allContent = [...conferences, ...podcasts, ...originals];

export default function Library() {
  const [favorites, setFavorites] = useState<ContentItem[]>(allContent.filter(c => c.isFavorited));
  const [userPlaylists, setUserPlaylists] = useState<Playlist[]>(playlists);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newPlaylistDesc, setNewPlaylistDesc] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [visibleItems, setVisibleItems] = useState<ContentItem[]>([]);
  const [loadedItems, setLoadedItems] = useState(12);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const observerRef = useRef<HTMLDivElement | null>(null);

  // Filter content based on active tab and search query
  const getFilteredContent = useCallback((): ContentItem[] => {
    let filteredContent: ContentItem[];
    
    switch (activeTab) {
      case 'conferences': filteredContent = conferences; break;
      case 'podcasts': filteredContent = podcasts; break;
      case 'originals': filteredContent = originals; break;
      case 'favorites': filteredContent = favorites; break;
      default: filteredContent = allContent;
    }
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      return filteredContent.filter(item =>
        item.title.toLowerCase().includes(query) ||
        item.speaker.name.toLowerCase().includes(query) ||
        item.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }
    
    return filteredContent;
  }, [activeTab, favorites, searchQuery]);

  // Load more items when scrolling
  const loadMoreItems = useCallback(() => {
    if (loading) return;
    
    setLoading(true);
    setTimeout(() => {
      const filteredContent = getFilteredContent();
      const newVisibleItems = filteredContent.slice(0, loadedItems + 12);
      setVisibleItems(newVisibleItems);
      setLoadedItems(prev => prev + 12);
      setLoading(false);
    }, 500); // Simulate network delay
  }, [loading, loadedItems, getFilteredContent]);

  // Initialize visible items
  useEffect(() => {
    const filteredContent = getFilteredContent();
    const initialItems = filteredContent.slice(0, 12);
    setVisibleItems(initialItems);
    setLoadedItems(12);
  }, [activeTab, getFilteredContent]);

  // Intersection observer for infinite scroll
  useEffect(() => {
    if (!observerRef.current) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMoreItems();
        }
      },
      { threshold: 0.1 }
    );
    
    observer.observe(observerRef.current);
    
    return () => {
      if (observerRef.current) {
        observer.unobserve(observerRef.current);
      }
    };
  }, [loadMoreItems]);

  const toggleFavorite = (content: ContentItem) => {
    setFavorites(prev => {
      const isFav = prev.some(f => f.id === content.id);
      if (isFav) {
        return prev.filter(f => f.id !== content.id);
      } else {
        return [...prev, content];
      }
    });
  };

  const createPlaylist = () => {
    if (newPlaylistName.trim()) {
      const newPlaylist: Playlist = {
        id: Date.now().toString(),
        name: newPlaylistName,
        description: newPlaylistDesc,
        thumbnail: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=600&h=340&fit=crop',
        contentIds: [],
        createdDate: new Date().toISOString().split('T')[0],
        isPublic: false,
      };
      setUserPlaylists(prev => [...prev, newPlaylist]);
      setNewPlaylistName('');
      setNewPlaylistDesc('');
      setIsCreateDialogOpen(false);
    }
  };

  const ContentCard = ({ content }: { content: ContentItem }) => (
    <ContentGuard isPremium={content.isPremium}>
      <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-300">
        <div className="relative aspect-video">
          <img 
            src={content.thumbnail} 
            alt={content.title} 
            className="w-full h-full object-cover" 
            loading="lazy"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=340&fit=crop';
            }}
          />
          {content.isPremium && <Badge className="absolute top-2 right-2 bg-accent">Premium</Badge>}
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-2 left-2 bg-black/50 hover:bg-black/70 text-white"
            onClick={(e) => {
              e.preventDefault();
              toggleFavorite(content);
            }}
            aria-label={favorites.some(f => f.id === content.id) ? 'Remove from favorites' : 'Add to favorites'}
          >
            <Heart className={`h-4 w-4 ${favorites.some(f => f.id === content.id) ? 'fill-red-500 text-red-500' : ''}`} />
          </Button>
          <span className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">{content.duration}</span>
        </div>
        <CardContent className="p-4">
          <h3 className="font-semibold line-clamp-1">{content.title}</h3>
          <p className="text-sm text-muted-foreground">{content.speaker.name}</p>
          <div className="flex flex-wrap gap-1 mt-2">
            {content.tags.slice(0, 2).map(tag => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </ContentGuard>
  );

  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  const filteredContent = getFilteredContent();
  const hasMoreItems = visibleItems.length < filteredContent.length;

  return (
    <div className="space-y-6 p-4 md:p-0">
      <h1 className="text-2xl font-bold">Library</h1>
      
      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search content..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
          aria-label="Search content"
        />
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="conferences">Conferences</TabsTrigger>
          <TabsTrigger value="podcasts">Podcasts</TabsTrigger>
          <TabsTrigger value="originals">Originals</TabsTrigger>
          <TabsTrigger value="playlists">Playlists</TabsTrigger>
          <TabsTrigger value="favorites">Favorites</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {visibleItems.map(c => (
              <Link key={c.id} to={`/library/${c.id}`} aria-label={`View ${c.title}`}>
                <ContentCard content={c} />
              </Link>
            ))}
          </div>
          {hasMoreItems && (
            <div ref={observerRef} className="flex justify-center py-6">
              {loading ? (
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              ) : (
                <Button variant="outline" onClick={loadMoreItems}>Load More</Button>
              )}
            </div>
          )}
          {!hasMoreItems && visibleItems.length > 0 && (
            <p className="text-center text-muted-foreground py-6">
              You've reached the end of the content
            </p>
          )}
          {visibleItems.length === 0 && (
            <p className="text-center text-muted-foreground py-6">
              No content found matching your search
            </p>
          )}
        </TabsContent>

        <TabsContent value="conferences" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {conferences.map(c => (
              <Link key={c.id} to={`/library/${c.id}`} aria-label={`View ${c.title}`}>
                <ContentCard content={c} />
              </Link>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="podcasts" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {podcasts.map(c => (
              <Link key={c.id} to={`/library/${c.id}`} aria-label={`View ${c.title}`}>
                <ContentCard content={c} />
              </Link>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="originals" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {originals.map(c => (
              <Link key={c.id} to={`/library/${c.id}`} aria-label={`View ${c.title}`}>
                <ContentCard content={c} />
              </Link>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="playlists" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Your Playlists</h2>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Playlist
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Playlist</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Input
                    placeholder="Playlist name"
                    value={newPlaylistName}
                    onChange={(e) => setNewPlaylistName(e.target.value)}
                    aria-label="Playlist name"
                  />
                  <Textarea
                    placeholder="Description (optional)"
                    value={newPlaylistDesc}
                    onChange={(e) => setNewPlaylistDesc(e.target.value)}
                    aria-label="Playlist description"
                  />
                  <Button onClick={createPlaylist} className="w-full">Create</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {userPlaylists.map(playlist => (
              <Card key={playlist.id} className="overflow-hidden hover:shadow-lg transition-shadow duration-300">
                <div className="relative aspect-video">
                  <img src={playlist.thumbnail} alt={playlist.name} className="w-full h-full object-cover" loading="lazy" />
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <Button variant="secondary" aria-label={`Play all in ${playlist.name}`}>
                      <Play className="h-4 w-4 mr-2" />
                      Play All
                    </Button>
                  </div>
                </div>
                <CardContent className="p-4">
                  <h3 className="font-semibold">{playlist.name}</h3>
                  <p className="text-sm text-muted-foreground">{playlist.contentIds.length} items</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="favorites" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {favorites.length === 0 ? (
              <p className="text-center text-muted-foreground col-span-full">No favorites yet</p>
            ) : (
              favorites.map(c => (
                <Link key={c.id} to={`/library/${c.id}`} aria-label={`View ${c.title}`}>
                  <ContentCard content={c} />
                </Link>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
