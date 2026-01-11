import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Heart, Plus, Play } from 'lucide-react';
import { conferences, podcasts, originals, playlists, ContentItem, Playlist } from '@/lib/mock-data';

const allContent = [...conferences, ...podcasts, ...originals];

export default function Library() {
  const [favorites, setFavorites] = useState<ContentItem[]>(allContent.filter(c => c.isFavorited));
  const [userPlaylists, setUserPlaylists] = useState<Playlist[]>(playlists);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newPlaylistDesc, setNewPlaylistDesc] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

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
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <div className="relative aspect-video">
        <img src={content.thumbnail} alt={content.title} className="w-full h-full object-cover" loading="lazy" />
        {content.isPremium && <Badge className="absolute top-2 right-2 bg-accent">Premium</Badge>}
        <Button
          variant="ghost"
          size="sm"
          className="absolute top-2 left-2 bg-black/50 hover:bg-black/70 text-white"
          onClick={(e) => {
            e.preventDefault();
            toggleFavorite(content);
          }}
        >
          <Heart className={`h-4 w-4 ${favorites.some(f => f.id === content.id) ? 'fill-red-500 text-red-500' : ''}`} />
        </Button>
        <span className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">{content.duration}</span>
      </div>
      <CardContent className="p-4">
        <h3 className="font-semibold line-clamp-1">{content.title}</h3>
        <p className="text-sm text-muted-foreground">{content.speaker.name}</p>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6 p-4 md:p-0">
      <h1 className="text-2xl font-bold">Library</h1>
      <Tabs defaultValue="all">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="conferences">Conferences</TabsTrigger>
          <TabsTrigger value="podcasts">Podcasts</TabsTrigger>
          <TabsTrigger value="originals">Originals</TabsTrigger>
          <TabsTrigger value="playlists">Playlists</TabsTrigger>
          <TabsTrigger value="favorites">Favorites</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
          {allContent.map(c => (
            <Link key={c.id} to={`/library/${c.id}`}>
              <ContentCard content={c} />
            </Link>
          ))}
        </TabsContent>

        <TabsContent value="conferences" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
          {conferences.map(c => (
            <Link key={c.id} to={`/library/${c.id}`}>
              <ContentCard content={c} />
            </Link>
          ))}
        </TabsContent>

        <TabsContent value="podcasts" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
          {podcasts.map(c => (
            <Link key={c.id} to={`/library/${c.id}`}>
              <ContentCard content={c} />
            </Link>
          ))}
        </TabsContent>

        <TabsContent value="originals" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
          {originals.map(c => (
            <Link key={c.id} to={`/library/${c.id}`}>
              <ContentCard content={c} />
            </Link>
          ))}
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
                  />
                  <Textarea
                    placeholder="Description (optional)"
                    value={newPlaylistDesc}
                    onChange={(e) => setNewPlaylistDesc(e.target.value)}
                  />
                  <Button onClick={createPlaylist} className="w-full">Create</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {userPlaylists.map(playlist => (
              <Card key={playlist.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <div className="relative aspect-video">
                  <img src={playlist.thumbnail} alt={playlist.name} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <Button variant="secondary">
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

        <TabsContent value="favorites" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
          {favorites.length === 0 ? (
            <p className="text-center text-muted-foreground col-span-full">No favorites yet</p>
          ) : (
            favorites.map(c => (
              <Link key={c.id} to={`/library/${c.id}`}>
                <ContentCard content={c} />
              </Link>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
