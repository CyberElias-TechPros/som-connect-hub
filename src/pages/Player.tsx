import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { ArrowLeft, Play, Pause, SkipBack, SkipForward, Volume2, Maximize, Settings, Subtitles } from 'lucide-react';
import { featuredContent } from '@/lib/mock-data';
import somLogo from '@/images/som-logo.png';

export default function Player() {
  const { id } = useParams();
  const navigate = useNavigate();
  const content = featuredContent.find(c => c.id === id) || featuredContent[0];
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(30);

  return (
    <div className="min-h-screen bg-player flex flex-col">
      <div className="flex items-center p-4 gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="text-player-foreground">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="w-10 h-10 flex items-center justify-center">
          <img src={somLogo} alt="SOM Connect Logo" className="w-8 h-8 object-contain" />
        </div>
        <span className="text-player-foreground font-medium truncate">{content.title}</span>
      </div>
      <div className="flex-1 flex items-center justify-center bg-black/50">
        <img src={content.thumbnail} alt="" className="max-h-full max-w-full object-contain" />
      </div>
      <div className="p-4 space-y-4">
        <div className="space-y-2">
          <Slider value={[progress]} onValueChange={(v) => setProgress(v[0])} max={100} className="[&_[role=slider]]:bg-player-progress" />
          <div className="flex justify-between text-xs text-player-foreground/70">
            <span>12:30</span>
            <span>{content.duration}</span>
          </div>
        </div>
        <div className="flex items-center justify-center gap-4">
          <Button variant="ghost" size="icon" className="text-player-foreground">
            <SkipBack className="w-5 h-5" />
          </Button>
          <Button size="icon" className="w-14 h-14 rounded-full bg-player-foreground text-player" onClick={() => setPlaying(!playing)}>
            {playing ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
          </Button>
          <Button variant="ghost" size="icon" className="text-player-foreground">
            <SkipForward className="w-5 h-5" />
          </Button>
        </div>
        <div className="flex justify-between">
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" className="text-player-foreground">
              <Volume2 className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" className="text-player-foreground">
              <Subtitles className="w-5 h-5" />
            </Button>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" className="text-player-foreground">
              <Settings className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" className="text-player-foreground">
              <Maximize className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
