import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { ArrowLeft, Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Maximize, Heart, Bookmark, Share2, Settings, Sparkles } from 'lucide-react';
import { featuredContent, conferences, podcasts, originals } from '@/lib/mock-data';
import { useToast } from '@/components/ui/use-toast';
import { motion, AnimatePresence } from 'framer-motion';

const allContent = [...featuredContent, ...conferences, ...podcasts, ...originals].filter((v,i,a)=>a.findIndex(t=>t.id===v.id)===i);

export default function Player() {
  const { id } = useParams();
  const navigate = useNavigate();
  const content = allContent.find(c => c.id === id) || allContent[0];
  const [playing, setPlaying] = useState(true);
  const [progress, setProgress] = useState(12);
  const [volume, setVolume] = useState(80);
  const [muted, setMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isFav, setIsFav] = useState(false);
  const { toast } = useToast();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let interval: any;
    if (playing) {
      interval = setInterval(() => setProgress(p => (p >= 100 ? 0 : p + 0.15)), 100);
    }
    return () => clearInterval(interval);
  }, [playing]);

  useEffect(() => {
    let t: any;
    const reset = () => {
      setShowControls(true);
      clearTimeout(t);
      t = setTimeout(() => setShowControls(false), 3500);
    };
    window.addEventListener('mousemove', reset);
    reset();
    return () => { window.removeEventListener('mousemove', reset); clearTimeout(t); };
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) containerRef.current?.requestFullscreen();
    else document.exitFullscreen();
  };

  return (
    <div ref={containerRef} className="min-h-screen bg-[#05070E] flex flex-col relative overflow-hidden select-none">
      {/* Ambient */}
      <div className="absolute inset-0">
        <img src={content.thumbnail} alt="" className="w-full h-full object-cover opacity-30 blur-[40px] scale-110" />
        <div className="absolute inset-0 bg-[#05070E]/80" />
      </div>

      {/* Top */}
      <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: showControls ? 0 : -20, opacity: showControls ? 1 : 0 }} transition={{ duration: 0.4, ease: [0.16,1,0.3,1] }} className="relative z-20 flex items-center gap-4 p-4 md:p-6">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-white/10 backdrop-blur border border-white/10 text-white hover:bg-white/15"><ArrowLeft className="w-5 h-5" /></Button>
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur border border-white/10"><Sparkles className="w-3 h-3 text-amber-300" /><span className="font-mono text-[10px] tracking-[0.15em] uppercase text-white/60">Now playing</span></div>
          <span className="text-white font-[600] tracking-[-0.01em] text-[14px] line-clamp-1 max-w-[40ch]">{content.title}</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="ghost" size="icon" className="w-9 h-9 rounded-full bg-white/10 backdrop-blur border border-white/10 text-white" onClick={()=>{setIsFav(!isFav); toast({ title: isFav ? 'Removed from favorites' : 'Added to favorites' });}}><Heart className={`w-4 h-4 ${isFav ? 'fill-white text-white' : ''}`} /></Button>
          <Button variant="ghost" size="icon" className="w-9 h-9 rounded-full bg-white/10 backdrop-blur border border-white/10 text-white" onClick={()=>{navigator.clipboard.writeText(window.location.href); toast({ title: 'Link copied' });}}><Share2 className="w-4 h-4" /></Button>
        </div>
      </motion.div>

      {/* Video */}
      <div className="flex-1 relative flex items-center justify-center p-4 md:p-8">
        <div className="relative w-full max-w-[1280px] aspect-video rounded-[1.5rem] md:rounded-[2rem] overflow-hidden bg-black shadow-[0_24px_80px_hsl(0_0%_0%/_0.5)] border border-white/10 group">
          <img src={content.thumbnail} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

          <AnimatePresence>
            {showControls && (
              <motion.button initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} transition={{ duration: 0.3, ease: [0.16,1,0.3,1] }} onClick={()=>setPlaying(!playing)} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 md:w-24 md:h-24 rounded-full bg-white/90 backdrop-blur flex items-center justify-center shadow-[0_0_60px_hsl(0_0%_100%/_0.2)] hover:scale-105 transition-transform">
                {playing ? <Pause className="w-8 h-8 fill-black text-black" /> : <Play className="w-8 h-8 fill-black text-black ml-1" />}
              </motion.button>
            )}
          </AnimatePresence>

          {/* Progress */}
          <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6 space-y-4 bg-gradient-to-t from-black/80 to-transparent">
            <div className="space-y-2">
              <Slider value={[progress]} onValueChange={v=>setProgress(v[0])} max={100} className="[&_[role=slider]]:bg-white [&_[role=slider]]:border-white [&_.bg-primary]:bg-white h-1" />
              <div className="flex justify-between text-[11px] font-mono tracking-[0.05em] text-white/60">
                <span>{Math.floor((progress/100)*90)}:{String(Math.floor(((progress/100)*90*60)%60)).padStart(2,'0')}</span>
                <span>{content.duration}</span>
              </div>
            </div>

            <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: showControls ? 0 : 10, opacity: showControls ? 1 : 0 }} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="w-10 h-10 rounded-full bg-white/10 backdrop-blur border border-white/10 text-white" onClick={()=>setPlaying(!playing)}>{playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}</Button>
                <Button variant="ghost" size="icon" className="w-10 h-10 rounded-full bg-white/10 backdrop-blur border border-white/10 text-white" onClick={()=>setProgress(p=>Math.max(0,p-5))}><SkipBack className="w-5 h-5" /></Button>
                <Button variant="ghost" size="icon" className="w-10 h-10 rounded-full bg-white/10 backdrop-blur border border-white/10 text-white" onClick={()=>setProgress(p=>Math.min(100,p+5))}><SkipForward className="w-5 h-5" /></Button>
                <div className="hidden md:flex items-center gap-2 ml-2">
                  <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full bg-white/10 backdrop-blur text-white" onClick={()=>setMuted(!muted)}>{muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}</Button>
                  <Slider value={[volume]} onValueChange={v=>setVolume(v[0])} max={100} className="w-20 [&_[role=slider]]:bg-white" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="w-9 h-9 rounded-full bg-white/10 backdrop-blur border border-white/10 text-white hidden md:flex"><Settings className="w-4 h-4" /></Button>
                <Button variant="ghost" size="icon" className="w-9 h-9 rounded-full bg-white/10 backdrop-blur border border-white/10 text-white" onClick={toggleFullscreen}><Maximize className="w-4 h-4" /></Button>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Bottom info */}
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: showControls ? 0 : 20, opacity: showControls ? 1 : 0 }} className="relative z-20 p-4 md:p-6">
        <div className="max-w-[1280px] mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src={content.speaker.avatar} alt={content.speaker.name} className="w-10 h-10 rounded-full border border-white/10" />
            <div>
              <div className="text-white font-[600] text-[13px]">{content.speaker.name}</div>
              <div className="text-white/50 text-[11px] font-mono uppercase tracking-[0.05em]">{content.speaker.title}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[11px] font-mono tracking-[0.05em] uppercase text-white/40">
            <span>Press Space to play/pause • F for fullscreen • M for mute</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
