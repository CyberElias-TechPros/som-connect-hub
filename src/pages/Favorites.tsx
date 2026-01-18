import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Heart, Trash2, Star, Filter, List, Grid, Bookmark, Calendar, User, Tag, Edit } from 'lucide-react';
import { useFavorites } from '@/hooks/use-favorites';
import { useToast } from '@/hooks/use-toast';
import { conferences, podcasts, originals } from '@/lib/mock-data';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export default function Favorites() {
  const {
    favorites,
    favoritesCount,
    isLoading,
    removeFromFavorites,
    getFavoritesWithContent,
    getRecentFavorites,
    getFavoritesByCategory,
    getFavoritesBySpeaker,
    getFavoritesStats,
    updateFavoriteNotes,
    clearAllFavorites,
  } = useFavorites();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [activeTab, setActiveTab] = useState('all');
  const [selectedFavorite, setSelectedFavorite] = useState<{contentId: string, notes?: string} | null>(null);
  const [editNotes, setEditNotes] = useState('');
  const { toast } = useToast();
  const navigate = useNavigate();

  const allContent = [...conferences, ...podcasts, ...originals];
  const favoritesWithContent = getFavoritesWithContent(allContent);
  const recentFavorites = getRecentFavorites(10);
  const stats = getFavoritesStats(allContent);

  const filteredFavorites = favoritesWithContent.filter(item =>
    item.content.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.content.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.notes && item.notes.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleRemoveFavorite = (contentId: string) => {
    if (confirm('Are you sure you want to remove this from favorites?')) {
      removeFromFavorites(contentId);
      toast({
        title: 'Success',
        description: 'Removed from favorites',
      });
    }
  };

  const handleClearAll = () => {
    if (confirm('Are you sure you want to clear all favorites? This cannot be undone.')) {
      clearAllFavorites();
      toast({
        title: 'Success',
        description: 'All favorites cleared',
      });
    }
  };

  const handleUpdateNotes = () => {
    if (selectedFavorite) {
      updateFavoriteNotes(selectedFavorite.contentId, editNotes);
      toast({
        title: 'Success',
        description: 'Notes updated successfully',
      });
      setSelectedFavorite(null);
      setEditNotes('');
    }
  };

  const openNotesDialog = (contentId: string, currentNotes?: string) => {
    setSelectedFavorite({ contentId, notes: currentNotes });
    setEditNotes(currentNotes || '');
  };

  if (isLoading) {
    return (
      <div className="space-y-6 p-4 md:p-0">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Favorites</h1>
        </div>
        <p className="text-center text-muted-foreground">Loading favorites...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-0">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Heart className="h-6 w-6 text-red-500 fill-red-500" />
            My Favorites ({favoritesCount})
          </h1>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}>
              {viewMode === 'grid' ? <List className="h-4 w-4" /> : <Grid className="h-4 w-4" />}
            </Button>
            {favoritesCount > 0 && (
              <Button variant="outline" size="sm" onClick={handleClearAll} className="gap-2">
                <Trash2 className="h-4 w-4" />
                Clear All
              </Button>
            )}
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search favorites..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 max-w-md"
          />
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setActiveTab('all')}>
            <Bookmark className="h-4 w-4" />
            All ({favoritesCount})
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setActiveTab('recent')}>
            <Calendar className="h-4 w-4" />
            Recent
          </Button>
          {Object.entries(stats.byCategory).map(([category, count]) => (
            <Button key={category} variant="outline" size="sm" className="gap-2" 
                    onClick={() => setActiveTab(`category-${category}`)}>
              <Tag className="h-4 w-4" />
              {category} ({count})
            </Button>
          ))}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">All Favorites</TabsTrigger>
          <TabsTrigger value="recent">Recent</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="speakers">Speakers</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          {filteredFavorites.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">No favorites found</p>
              {searchQuery ? (
                <Button variant="outline" onClick={() => setSearchQuery('')}>Clear search</Button>
              ) : (
                <p>Start adding content to your favorites!</p>
              )}
            </div>
          ) : (
            <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-4'}>
              {filteredFavorites.map((item) => (
                <Card key={item.content.id} className={viewMode === 'list' ? 'flex items-center gap-4 p-4' : ''}>
                  <CardContent className={viewMode === 'grid' ? 'p-0' : 'p-0 flex-1'}>
                    {viewMode === 'grid' ? (
                      <div className="space-y-4">
                        <div className="relative">
                          <img
                            src={item.content.thumbnail}
                            alt={item.content.title}
                            className="w-full h-40 object-cover rounded-t-lg"
                          />
                          <Badge 
                            variant="secondary" 
                            className="absolute top-2 right-2 gap-1"
                          >
                            {item.content.category}
                          </Badge>
                          <Button
                            variant="ghost" 
                            size="icon" 
                            className="absolute top-2 left-2 h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm"
                            onClick={() => handleRemoveFavorite(item.content.id)}
                          >
                            <Heart className="h-4 w-4 text-red-500 fill-red-500" />
                          </Button>
                        </div>
                        <div className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-medium truncate">{item.content.title}</h3>
                            <Button variant="ghost" size="sm" onClick={() => navigate(`/library/${item.content.id}`)}>
                              <Star className="h-4 w-4" />
                            </Button>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{item.content.speaker.name}</p>
                          <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{item.content.description}</p>
                          <div className="flex items-center justify-between text-sm text-muted-foreground">
                            <span>{item.content.duration}</span>
                            <span>{new Date(item.addedAt).toLocaleDateString()}</span>
                          </div>
                          {item.notes && (
                            <div className="mt-2 p-2 bg-secondary rounded text-sm">
                              <p className="text-muted-foreground">Notes: {item.notes}</p>
                            </div>
                          )}
                          <div className="flex items-center gap-2 mt-3">
                            <Button variant="outline" size="sm" className="flex-1" 
                                    onClick={() => openNotesDialog(item.content.id, item.notes)}>
                              Edit Notes
                            </Button>
                            <Button variant="outline" size="sm" 
                                    onClick={() => handleRemoveFavorite(item.content.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-4 w-full">
                        <img
                          src={item.content.thumbnail}
                          alt={item.content.title}
                          className="w-16 h-16 object-cover rounded"
                        />
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <h3 className="font-medium truncate">{item.content.title}</h3>
                            <Badge variant="secondary">{item.content.category}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground truncate">{item.content.speaker.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{item.content.description}</p>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                            <span>{item.content.duration}</span>
                            <span>{new Date(item.addedAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm" onClick={() => navigate(`/library/${item.content.id}`)}>
                            <Star className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => openNotesDialog(item.content.id, item.notes)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleRemoveFavorite(item.content.id)}>
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
        </TabsContent>

        <TabsContent value="recent" className="mt-4">
          {recentFavorites.length === 0 ? (
            <p className="text-center text-muted-foreground">No recent favorites</p>
          ) : (
            <div className="space-y-4">
              {recentFavorites.map((fav) => {
                const content = allContent.find(c => c.id === fav.contentId);
                if (!content) return null;
                
                return (
                  <Card key={fav.contentId}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <img src={content.thumbnail} alt={content.title} className="w-16 h-16 object-cover rounded" />
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <h3 className="font-medium">{content.title}</h3>
                            <span className="text-sm text-muted-foreground">
                              {new Date(fav.addedAt).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">{content.speaker.name}</p>
                          <p className="text-xs text-muted-foreground">{content.duration}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm" onClick={() => navigate(`/library/${content.id}`)}>
                            <Star className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleRemoveFavorite(content.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="categories" className="mt-4">
          <div className="space-y-6">
            {Object.entries(stats.byCategory).map(([category, count]) => {
              const categoryFavorites = getFavoritesByCategory(category, allContent);
              
              return (
                <div key={category} className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold capitalize">{category} ({count})</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {categoryFavorites.map((item) => (
                      <Card key={item.content.id}>
                        <CardContent className="p-0">
                          <div className="space-y-4">
                            <div className="relative">
                              <img
                                src={item.content.thumbnail}
                                alt={item.content.title}
                                className="w-full h-40 object-cover rounded-t-lg"
                              />
                              <Button
                                variant="ghost" 
                                size="icon" 
                                className="absolute top-2 left-2 h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm"
                                onClick={() => handleRemoveFavorite(item.content.id)}
                              >
                                <Heart className="h-4 w-4 text-red-500 fill-red-500" />
                              </Button>
                            </div>
                            <div className="p-4">
                              <h3 className="font-medium truncate mb-1">{item.content.title}</h3>
                              <p className="text-sm text-muted-foreground mb-2">{item.content.speaker.name}</p>
                              <div className="flex items-center justify-between text-sm text-muted-foreground">
                                <span>{item.content.duration}</span>
                                <span>{new Date(item.addedAt).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="speakers" className="mt-4">
          <div className="space-y-6">
            {Object.entries(stats.bySpeaker).map(([speakerName, count]) => {
              const speakerFavorites = favoritesWithContent.filter(item => 
                item.content.speaker.name === speakerName
              );
              
              return (
                <div key={speakerName} className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">{speakerName} ({count})</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {speakerFavorites.map((item) => (
                      <Card key={item.content.id}>
                        <CardContent className="p-0">
                          <div className="space-y-4">
                            <div className="relative">
                              <img
                                src={item.content.thumbnail}
                                alt={item.content.title}
                                className="w-full h-40 object-cover rounded-t-lg"
                              />
                              <Button
                                variant="ghost" 
                                size="icon" 
                                className="absolute top-2 left-2 h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm"
                                onClick={() => handleRemoveFavorite(item.content.id)}
                              >
                                <Heart className="h-4 w-4 text-red-500 fill-red-500" />
                              </Button>
                            </div>
                            <div className="p-4">
                              <h3 className="font-medium truncate mb-1">{item.content.title}</h3>
                              <p className="text-sm text-muted-foreground mb-2">{item.content.category}</p>
                              <div className="flex items-center justify-between text-sm text-muted-foreground">
                                <span>{item.content.duration}</span>
                                <span>{new Date(item.addedAt).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={!!selectedFavorite} onOpenChange={() => setSelectedFavorite(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Notes</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Label htmlFor="notes">Personal Notes</Label>
            <Textarea
              id="notes"
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              placeholder="Add personal notes about this content..."
              className="min-h-[100px]"
            />
          </div>
          <Button onClick={handleUpdateNotes} className="w-full">
            Save Notes
          </Button>
        </DialogContent>
      </Dialog>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Favorites Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-sm text-muted-foreground">Total Favorites</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{Object.keys(stats.byCategory).length}</p>
              <p className="text-sm text-muted-foreground">Categories</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{Object.keys(stats.bySpeaker).length}</p>
              <p className="text-sm text-muted-foreground">Speakers</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{recentFavorites.length}</p>
              <p className="text-sm text-muted-foreground">Recent</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}