import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Play, Download, Share2, Heart, Clock, Eye, Calendar, Lock, Bookmark, MessageSquare, Loader2 } from 'lucide-react';
import { featuredContent, conferences, podcasts, originals } from '@/lib/mock-data';
import { ContentGuard } from '@/components/auth/PermissionGuard';
import { useToast } from '@/components/ui/use-toast';

const allContent = [...featuredContent, ...conferences, ...podcasts, ...originals];

export default function ContentDetail() {
  const { id } = useParams();
  const content = allContent.find(c => c.id === id) || allContent[0];
  const [isFavorited, setIsFavorited] = useState(content.isFavorited || false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const { toast } = useToast();

  const toggleFavorite = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsFavorited(!isFavorited);
      setIsLoading(false);
      toast({
        title: isFavorited ? 'Removed from favorites' : 'Added to favorites',
        description: `"${content.title}" has been ${isFavorited ? 'removed from' : 'added to'} your favorites.`,
      });
    }, 300);
  };

  const toggleBookmark = () => {
    setIsBookmarked(!isBookmarked);
    toast({
      title: isBookmarked ? 'Bookmark removed' : 'Bookmark added',
      description: `"${content.title}" has been ${isBookmarked ? 'removed from' : 'added to'} your bookmarks.`,
    });
  };

  const handleDownload = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      toast({
        title: 'Download started',
        description: `"${content.title}" is being downloaded and will be available offline.`,
      });
    }, 1000);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: content.title,
        text: `Check out "${content.title}" by ${content.speaker.name} on SOM Connect`,
        url: window.location.href,
      }).catch(err => {
        console.error('Error sharing:', err);
      });
    } else {
      // Fallback for browsers that don't support Web Share API
      toast({
        title: 'Share this content',
        description: 'Copy the URL from your browser to share this content.',
      });
    }
  };

  const toggleDescription = () => {
    setShowFullDescription(!showFullDescription);
  };

  // Simulate loading state
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);
    
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <ContentGuard isPremium={content.isPremium}>
      <div className="space-y-6 p-4 md:p-0">
        <div className="relative aspect-video rounded-xl overflow-hidden bg-muted">
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
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <Link to={`/player/${content.id}`} aria-label={`Play ${content.title}`}>
            <Button size="lg" className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full w-16 h-16" aria-label="Play content">
              <Play className="w-8 h-8 fill-current" />
            </Button>
          </Link>
          <div className="absolute bottom-4 left-4 right-4 text-white">
            <h1 className="text-2xl font-bold mb-2">{content.title}</h1>
            <div className="flex flex-wrap gap-2">
              {content.tags.map(t => <Badge key={t} variant="secondary" className="bg-white/20">{t}</Badge>)}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link to={`/player/${content.id}`} aria-label={`Play ${content.title}`}>
            <Button className="gap-2" aria-label="Play content">
              <Play className="w-4 h-4" />
              Play
            </Button>
          </Link>
          <Button variant="outline" className="gap-2" onClick={handleDownload} disabled={isLoading} aria-label="Download content">
            <Download className="w-4 h-4" />
            Download
          </Button>
          <Button variant="outline" size="icon" onClick={handleShare} aria-label="Share content">
            <Share2 className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={toggleFavorite} disabled={isLoading} aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}>
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Heart className={`w-4 h-4 ${isFavorited ? 'fill-red-500 text-red-500' : ''}`} />
            )}
          </Button>
          <Button variant="outline" size="icon" onClick={toggleBookmark} aria-label={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}>
            <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-blue-500 text-blue-500' : ''}`} />
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <Avatar className="w-12 h-12">
            <AvatarImage src={content.speaker.avatar} alt={content.speaker.name} />
            <AvatarFallback>{content.speaker.name[0]}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold">{content.speaker.name}</p>
            <p className="text-sm text-muted-foreground">{content.speaker.title}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            {content.duration}
          </span>
          <span className="flex items-center gap-1">
            <Eye className="w-4 h-4" />
            {content.views.toLocaleString()} views
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            {new Date(content.date).toLocaleDateString()}
          </span>
        </div>

        <div>
          <h2 className="font-semibold mb-2">Description</h2>
          <p className={`text-muted-foreground ${showFullDescription ? '' : 'line-clamp-3'}`}>
            {content.description}
          </p>
          {content.description.length > 200 && (
            <Button 
              variant="link" 
              className="p-0 h-auto text-sm text-primary" 
              onClick={toggleDescription}
              aria-label={showFullDescription ? 'Show less' : 'Show more'}
            >
              {showFullDescription ? 'Show less' : 'Show more'}
            </Button>
          )}
        </div>

        {/* Related Content Section */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Related Content</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {allContent
              .filter(c => c.id !== content.id && c.tags.some(tag => content.tags.includes(tag)))
              .slice(0, 3)
              .map(related => (
                <Link key={related.id} to={`/library/${related.id}`} className="block" aria-label={`View ${related.title}`}>
                  <div className="relative aspect-video rounded-lg overflow-hidden">
                    <img 
                      src={related.thumbnail} 
                      alt={related.title} 
                      className="w-full h-full object-cover" 
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <Button variant="secondary" size="sm" className="gap-2">
                        <Play className="w-4 h-4" />
                        Play
                      </Button>
                    </div>
                  </div>
                  <h3 className="font-medium mt-2 line-clamp-1">{related.title}</h3>
                  <p className="text-sm text-muted-foreground">{related.speaker.name}</p>
                </Link>
              ))}
          </div>
        </div>

        {/* Comments Section */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Comments</h2>
          <div className="space-y-4">
            <div className="flex gap-3">
              <Avatar className="w-8 h-8">
                <AvatarImage src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face" />
                <AvatarFallback>JD</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-sm">John Doe</p>
                    <p className="text-xs text-muted-foreground">2 hours ago</p>
                  </div>
                </div>
                <p className="text-sm mt-1">This teaching really blessed me! The insights on faith are life-changing.</p>
                <div className="flex gap-2 mt-2">
                  <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                    <Heart className="w-3 h-3 mr-1" /> Like
                  </Button>
                  <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                    <MessageSquare className="w-3 h-3 mr-1" /> Reply
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Avatar className="w-8 h-8">
                <AvatarImage src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face" />
                <AvatarFallback>SA</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-sm">Sarah Adams</p>
                    <p className="text-xs text-muted-foreground">5 hours ago</p>
                  </div>
                </div>
                <p className="text-sm mt-1">Great message! I've been applying these principles and seeing amazing results.</p>
                <div className="flex gap-2 mt-2">
                  <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                    <Heart className="w-3 h-3 mr-1" /> Like
                  </Button>
                  <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                    <MessageSquare className="w-3 h-3 mr-1" /> Reply
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Input placeholder="Add a comment..." className="flex-1" />
            <Button size="sm">Post</Button>
          </div>
        </div>
      </div>
    </ContentGuard>
  );
}
