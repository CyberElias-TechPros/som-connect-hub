import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { ArrowLeft, Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Maximize, Settings, Subtitles, Loader2, Heart, Bookmark, Share2 } from 'lucide-react';
import { featuredContent } from '@/lib/mock-data';
import somLogo from '@/images/som-logo.png';
import { useToast } from '@/components/ui/use-toast';

export default function Player() {
  const { id } = useParams();
  const navigate = useNavigate();
  const content = featuredContent.find(c => c.id === id) || featuredContent[0];
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(80);
  const [muted, setMuted] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [buffering, setBuffering] = useState(false);
  const [currentTime, setCurrentTime] = useState('0:00');
  const [isFavorited, setIsFavorited] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsTimeout = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  // Simulate video playback
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (playing) {
      interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            setPlaying(false);
            return 100;
          }
          return prev + 0.5;
        });
        
        // Update current time display
        const totalSeconds = Math.floor((progress / 100) * getDurationInSeconds(content.duration));
        setCurrentTime(formatTime(totalSeconds));
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [playing, progress, content.duration]);

  // Auto-hide controls
  useEffect(() => {
    if (!showControls) return;
    
    const handleMouseMove = () => {
      setShowControls(true);
      if (controlsTimeout.current) {
        clearTimeout(controlsTimeout.current);
      }
      
      controlsTimeout.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (controlsTimeout.current) {
        clearTimeout(controlsTimeout.current);
      }
    };
  }, [showControls]);

  // Toggle play/pause
  const togglePlay = () => {
    setPlaying(!playing);
    if (!playing) {
      setBuffering(true);
      setTimeout(() => setBuffering(false), 500);
    }
  };

  // Skip backward
  const skipBackward = () => {
    setProgress(prev => Math.max(0, prev - 5));
  };

  // Skip forward
  const skipForward = () => {
    setProgress(prev => Math.min(100, prev + 5));
  };

  // Toggle mute
  const toggleMute = () => {
    setMuted(!muted);
  };

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error('Error attempting to enable fullscreen:', err);
      });
      setFullscreen(true);
    } else {
      document.exitFullscreen();
      setFullscreen(false);
    }
  };

  // Format time (seconds to MM:SS)
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Convert duration string to seconds
  const getDurationInSeconds = (durationStr: string) => {
    const parts = durationStr.split(':');
    if (parts.length === 2) {
      return parseInt(parts[0]) * 60 + parseInt(parts[1]);
    } else if (parts.length === 3) {
      return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2]);
    }
    return 0;
  };

  // Toggle favorite
  const toggleFavorite = () => {
    setIsFavorited(!isFavorited);
    toast({
      title: isFavorited ? 'Removed from favorites' : 'Added to favorites',
      description: `"${content.title}" has been ${isFavorited ? 'removed from' : 'added to'} your favorites.`,
    });
  };

  // Toggle bookmark
  const toggleBookmark = () => {
    setIsBookmarked(!isBookmarked);
    toast({
      title: isBookmarked ? 'Bookmark removed' : 'Bookmark added',
      description: `"${content.title}" has been ${isBookmarked ? 'removed from' : 'added to'} your bookmarks.`,
    });
  };

  // Handle share
  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: content.title,
        text: `I'm watching "${content.title}" by ${content.speaker.name} on SOM Connect`,
        url: window.location.href,
      }).catch(err => {
        console.error('Error sharing:', err);
      });
    } else {
      toast({
        title: 'Share this content',
        description: 'Copy the URL from your browser to share this content.',
      });
    }
  };

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case ' ':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          skipBackward();
          break;
        case 'ArrowRight':
          e.preventDefault();
          skipForward();
          break;
        case 'f':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'm':
          e.preventDefault();
          toggleMute();
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [togglePlay, skipBackward, skipForward, toggleFullscreen, toggleMute]);

  return (
    <div 
      className="min-h-screen bg-player flex flex-col relative"
      onClick={() => setShowControls(prev => !prev)}
      onDoubleClick={toggleFullscreen}
      tabIndex={0}
      aria-label="Video player"
    >
      {/* Top navigation */}
      <div className="flex items-center p-4 gap-4 bg-black/20 backdrop-blur-sm">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="text-player-foreground" aria-label="Go back">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="w-10 h-10 flex items-center justify-center">
          <img src={somLogo} alt="SOM Connect Logo" className="w-8 h-8 object-contain" />
        </div>
        <span className="text-player-foreground font-medium truncate">{content.title}</span>
      </div>

      {/* Video area */}
      <div className="flex-1 flex items-center justify-center bg-black/50 relative">
        {buffering && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70">
            <Loader2 className="h-12 w-12 animate-spin text-white" />
          </div>
        )}
        <img src={content.thumbnail} alt="" className="max-h-full max-w-full object-contain" />
        
        {/* Player controls overlay */}
        {showControls && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Button
              size="icon"
              className="w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white border-2 border-white/50"
              onClick={togglePlay}
              aria-label={playing ? 'Pause' : 'Play'}
            >
              {playing ? <Pause className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10" /> : <Play className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 ml-1" />}
            </Button>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className={`p-4 space-y-4 bg-black/20 backdrop-blur-sm transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
        {/* Progress bar */}
        <div className="space-y-2">
          <Slider 
            value={[progress]} 
            onValueChange={(v) => setProgress(v[0])}
            max={100} 
            className="[&_[role=slider]]:bg-player-progress"
            aria-label="Video progress"
          />
          <div className="flex justify-between text-xs text-player-foreground/70">
            <span>{currentTime}</span>
            <span>{content.duration}</span>
          </div>
        </div>

        {/* Main controls */}
        <div className="flex items-center justify-center gap-4">
          <Button variant="ghost" size="icon" className="text-player-foreground" onClick={skipBackward} aria-label="Skip backward 5 seconds">
            <SkipBack className="w-5 h-5" />
          </Button>
          <Button 
            size="icon" 
            className="w-14 h-14 rounded-full bg-player-foreground text-player"
            onClick={togglePlay}
            aria-label={playing ? 'Pause' : 'Play'}
          >
            {playing ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
          </Button>
          <Button variant="ghost" size="icon" className="text-player-foreground" onClick={skipForward} aria-label="Skip forward 5 seconds">
            <SkipForward className="w-5 h-5" />
          </Button>
        </div>

        {/* Additional controls */}
        <div className="flex justify-between items-center">
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" className="text-player-foreground" onClick={togglePlay} aria-label={playing ? 'Pause' : 'Play'}>
              {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </Button>
            <Button variant="ghost" size="icon" className="text-player-foreground" onClick={skipBackward} aria-label="Skip backward">
              <SkipBack className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" className="text-player-foreground" onClick={skipForward} aria-label="Skip forward">
              <SkipForward className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" className="text-player-foreground" onClick={toggleMute} aria-label={muted ? 'Unmute' : 'Mute'}>
              {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </Button>
            <Slider 
              value={[volume]} 
              onValueChange={(v) => setVolume(v[0])}
              max={100} 
              className="w-20 [&_[role=slider]]:bg-player-progress"
              aria-label="Volume control"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" className="text-player-foreground" onClick={toggleFavorite} aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}>
              <Heart className={`w-5 h-5 ${isFavorited ? 'fill-red-500 text-red-500' : ''}`} />
            </Button>
            <Button variant="ghost" size="icon" className="text-player-foreground" onClick={toggleBookmark} aria-label={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}>
              <Bookmark className={`w-5 h-5 ${isBookmarked ? 'fill-blue-500 text-blue-500' : ''}`} />
            </Button>
            <Button variant="ghost" size="icon" className="text-player-foreground" onClick={handleShare} aria-label="Share">
              <Share2 className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" className="text-player-foreground" aria-label="Subtitles">
              <Subtitles className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" className="text-player-foreground" aria-label="Settings">
              <Settings className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" className="text-player-foreground" onClick={toggleFullscreen} aria-label={fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}>
              <Maximize className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Keyboard shortcuts hint */}
      <div className="fixed bottom-4 left-4 bg-black/50 backdrop-blur-sm text-white text-xs px-3 py-2 rounded-lg opacity-75">
        <span className="font-medium">Keyboard Shortcuts:</span> Space (Play/Pause), ←/→ (Seek), F (Fullscreen), M (Mute)
      </div>
    </div>
  );
}
