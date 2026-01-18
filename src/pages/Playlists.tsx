import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, List, Grid, Search, Trash2, Edit, Users, Globe, Lock, Copy, Star } from 'lucide-react';
import { usePlaylists } from '@/hooks/use-playlists';
import { useToast } from '@/hooks/use-toast';
import { conferences, podcasts, originals } from '@/lib/mock-data';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

export default function Playlists() {
  const {
    playlists,
    isLoading,
    createPlaylist,
    deletePlaylist,
    getContentInPlaylist,
    getPublicPlaylists,
    getRecentlyUpdatedPlaylists,
    getPopularPlaylists,
  } = usePlaylists();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newPlaylistDescription, setNewPlaylistDescription] = useState('');
  const [newPlaylistIsPublic, setNewPlaylistIsPublic] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const allContent = [...conferences, ...podcasts, ...originals];
  const publicPlaylists = getPublicPlaylists();
  const recentPlaylists = getRecentlyUpdatedPlaylists();
  const popularPlaylists = getPopularPlaylists();

  const filteredPlaylists = playlists.filter(playlist =>
    playlist.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    playlist.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreatePlaylist = () => {
    if (!newPlaylistName.trim()) {
      toast({
        title: 'Error',
        description: 'Playlist name is required',
        variant: 'destructive',
      });
      return;
    }

    createPlaylist(newPlaylistName, newPlaylistDescription, newPlaylistIsPublic);
    
    toast({
      title: 'Success',
      description: 'Playlist created successfully',
    });
    
    // Reset form
    setNewPlaylistName('');
    setNewPlaylistDescription('');
    setNewPlaylistIsPublic(false);
    setIsCreateDialogOpen(false);
  };

  const handleDeletePlaylist = (id: string) => {
    if (confirm('Are you sure you want to delete this playlist?')) {
      deletePlaylist(id);
      toast({
        title: 'Success',
        description: 'Playlist deleted successfully',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 p-4 md:p-0">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Playlists</h1>
        </div>
        <p className="text-center text-muted-foreground">Loading playlists...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-0">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">My Playlists</h1>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}>
              {viewMode === 'grid' ? <List className="h-4 w-4" /> : <Grid className="h-4 w-4" />}
            </Button>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Create Playlist
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Playlist</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="playlist-name">Playlist Name</Label>
                    <Input
                      id="playlist-name"
                      value={newPlaylistName}
                      onChange={(e) => setNewPlaylistName(e.target.value)}
                      placeholder="e.g., Morning Devotion"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="playlist-description">Description</Label>
                    <Input
                      id="playlist-description"
                      value={newPlaylistDescription}
                      onChange={(e) => setNewPlaylistDescription(e.target.value)}
                      placeholder="Optional description"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="playlist-public">Public Playlist</Label>
                    <Switch
                      id="playlist-public"
                      checked={newPlaylistIsPublic}
                      onCheckedChange={setNewPlaylistIsPublic}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Public playlists can be seen by other users
                  </p>
                </div>
                <Button onClick={handleCreatePlaylist} className="w-full">
                  Create Playlist
                </Button>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search playlists..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 max-w-md"
          />
        </div>
      </div>

      {filteredPlaylists.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">No playlists found</p>
          {searchQuery ? (
            <Button variant="outline" onClick={() => setSearchQuery('')}>Clear search</Button>
          ) : (
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Playlist
            </Button>
          )}
        </div>
      ) : (
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-4'}>
          {filteredPlaylists.map((playlist) => (
            <Card key={playlist.id} className={viewMode === 'list' ? 'flex items-center gap-4 p-4' : ''}>
              <CardContent className={viewMode === 'grid' ? 'p-0' : 'p-0 flex-1'}>
                {viewMode === 'grid' ? (
                  <div className="space-y-4">
                    <div className="relative">
                      <img
                        src={playlist.thumbnail}
                        alt={playlist.name}
                        className="w-full h-40 object-cover rounded-t-lg"
                      />
                      <Badge 
                        variant="secondary" 
                        className="absolute top-2 right-2 gap-1"
                      >
                        {playlist.isPublic ? (
                          <><Globe className="h-3 w-3" /> Public</>
                        ) : (
                          <><Lock className="h-3 w-3" /> Private</>
                        )}
                      </Badge>
                    </div>
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium truncate">{playlist.name}</h3>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm" onClick={() => navigate(`/playlists/${playlist.id}`)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDeletePlaylist(playlist.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{playlist.description}</p>
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>{getContentInPlaylist(playlist.id, allContent).length} items</span>
                        <span>{new Date(playlist.updatedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-4 w-full">
                    <img
                      src={playlist.thumbnail}
                      alt={playlist.name}
                      className="w-16 h-16 object-cover rounded"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-medium truncate">{playlist.name}</h3>
                        <Badge variant="secondary" className="gap-1">
                          {playlist.isPublic ? (
                            <><Globe className="h-3 w-3" /> Public</>
                          ) : (
                            <><Lock className="h-3 w-3" /> Private</>
                          )}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{playlist.description}</p>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                        <span>{getContentInPlaylist(playlist.id, allContent).length} items</span>
                        <span>{new Date(playlist.updatedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" onClick={() => navigate(`/playlists/${playlist.id}`)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDeletePlaylist(playlist.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="space-y-6">
        {recentPlaylists.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Recently Updated</h2>
              <Link to="/playlists" className="text-sm text-primary hover:underline">
                View All
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recentPlaylists.map((playlist) => (
                <Card key={playlist.id} className="cursor-pointer hover:shadow-lg transition-shadow" 
                      onClick={() => navigate(`/playlists/${playlist.id}`)}>
                  <CardContent className="p-0">
                    <div className="relative">
                      <img
                        src={playlist.thumbnail}
                        alt={playlist.name}
                        className="w-full h-40 object-cover rounded-t-lg"
                      />
                      <Badge variant="secondary" className="absolute top-2 right-2 gap-1">
                        {playlist.isPublic ? (
                          <><Globe className="h-3 w-3" /> Public</>
                        ) : (
                          <><Lock className="h-3 w-3" /> Private</>
                        )}
                      </Badge>
                    </div>
                    <div className="p-4">
                      <h3 className="font-medium truncate mb-1">{playlist.name}</h3>
                      <p className="text-sm text-muted-foreground truncate mb-2">{playlist.description}</p>
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>{getContentInPlaylist(playlist.id, allContent).length} items</span>
                        <span>{new Date(playlist.updatedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {popularPlaylists.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Most Popular</h2>
              <Link to="/playlists" className="text-sm text-primary hover:underline">
                View All
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {popularPlaylists.map((playlist) => (
                <Card key={playlist.id} className="cursor-pointer hover:shadow-lg transition-shadow" 
                      onClick={() => navigate(`/playlists/${playlist.id}`)}>
                  <CardContent className="p-0">
                    <div className="relative">
                      <img
                        src={playlist.thumbnail}
                        alt={playlist.name}
                        className="w-full h-40 object-cover rounded-t-lg"
                      />
                      <Badge variant="secondary" className="absolute top-2 right-2 gap-1">
                        {playlist.isPublic ? (
                          <><Globe className="h-3 w-3" /> Public</>
                        ) : (
                          <><Lock className="h-3 w-3" /> Private</>
                        )}
                      </Badge>
                    </div>
                    <div className="p-4">
                      <h3 className="font-medium truncate mb-1">{playlist.name}</h3>
                      <p className="text-sm text-muted-foreground truncate mb-2">{playlist.description}</p>
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>{getContentInPlaylist(playlist.id, allContent).length} items</span>
                        <span>{new Date(playlist.updatedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {publicPlaylists.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Community Playlists</h2>
              <Link to="/playlists/community" className="text-sm text-primary hover:underline">
                Browse All
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {publicPlaylists.slice(0, 3).map((playlist) => (
                <Card key={playlist.id} className="cursor-pointer hover:shadow-lg transition-shadow" 
                      onClick={() => navigate(`/playlists/${playlist.id}`)}>
                  <CardContent className="p-0">
                    <div className="relative">
                      <img
                        src={playlist.thumbnail}
                        alt={playlist.name}
                        className="w-full h-40 object-cover rounded-t-lg"
                      />
                      <Badge variant="secondary" className="absolute top-2 right-2 gap-1">
                        <Users className="h-3 w-3" /> {playlist.createdBy}
                      </Badge>
                    </div>
                    <div className="p-4">
                      <h3 className="font-medium truncate mb-1">{playlist.name}</h3>
                      <p className="text-sm text-muted-foreground truncate mb-2">{playlist.description}</p>
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>{getContentInPlaylist(playlist.id, allContent).length} items</span>
                        <span>{new Date(playlist.updatedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}