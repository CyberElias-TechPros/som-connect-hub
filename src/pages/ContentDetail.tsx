import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Play, Download, Share2, Heart, Clock, Eye, Calendar, Bookmark, MessageSquare, ArrowLeft, Sparkles, ArrowUpRight } from 'lucide-react';
import { featuredContent, conferences, podcasts, originals } from '@/lib/mock-data';
import { contentService } from '@/services/content-service';
import { favoritesService } from '@/services/favorites-service';
import { useApiData } from '@/hooks/use-api-data';
import { useToast } from '@/components/ui/use-toast';
import { motion } from 'framer-motion';

const mockLibrary = [...featuredContent, ...conferences, ...podcasts, ...originals].filter((v,i,a)=>a.findIndex(t=>t.id===v.id)===i);

export default function ContentDetail() {
  const { id } = useParams();
  // Live detail (with related items + saved progress) from the Worker.
  const { data: detail } = useApiData(
    async () => (await contentService.getById(id ?? '')) as any,
    (mockLibrary.find(c => c.id === id) || mockLibrary[0]) as any,
    [id],
  );
  const content = detail ?? (mockLibrary.find(c => c.id === id) || mockLibrary[0]);
  const related = (detail?.related?.length ? detail.related : mockLibrary.filter(c => c.id !== content.id)) as typeof mockLibrary;
  const [isFav, setIsFav] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setIsFav(favoritesService.isFavorited(content.id));
  }, [content.id]);

  const toggleFav = () => {
    const next = !isFav;
    setIsFav(next);
    if (next) favoritesService.addToFavorites(content.id);
    else favoritesService.removeFromFavorites(content.id);
    favoritesService.sync().catch(() => undefined);
    toast({ title: next ? 'Added to favorites' : 'Removed from favorites', description: `"${content.title}" ${next ? 'added to' : 'removed from'} favorites.` });
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({ title: 'Link copied', description: 'Share link copied to clipboard.' });
  };

  const handleDownload = async () => {
    // Registers the download in D1 and (for R2 backed media) exposes the file URL.
    try {
      await contentService.download(content.id);
      toast({ title: 'Available offline', description: `"${content.title}" was added to your offline library.` });
    } catch {
      toast({ title: 'Download started', description: `"${content.title}" will be available offline.` });
    }
  };

  return (
    <div className="space-y-8 max-w-[1200px] mx-auto">
      <Link to="/library" className="inline-flex items-center gap-2 text-[13px] font-[600] tracking-[-0.01em] text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to library
      </Link>

      {/* Cinematic hero */}
      <div className="relative overflow-hidden rounded-[2rem] bg-[#0A0E1A] min-h-[56vh] flex items-end">
        <img src={content.thumbnail} alt={content.title} className="absolute inset-0 w-full h-full object-cover opacity-70" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#070A12] via-[#070A12]/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#070A12]/80 via-transparent to-transparent" />
        <div className="absolute inset-0 opacity-[0.03] mix-blend-soft-light" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")` }} />

        <div className="relative z-10 p-6 md:p-10 w-full flex flex-col md:flex-row gap-8 items-end">
          <div className="flex-1 space-y-4">
            <div className="flex flex-wrap gap-2">
              <span className="px-3 py-1 rounded-full bg-white/10 backdrop-blur border border-white/10 text-white font-mono text-[10px] tracking-[0.15em] uppercase">{content.category}</span>
              {content.isPremium && <span className="px-3 py-1 rounded-full bg-amber-300 text-black font-mono text-[10px] tracking-[0.15em] uppercase font-[700]">Premium • Included</span>}
              <span className="px-3 py-1 rounded-full bg-white/10 backdrop-blur border border-white/10 text-white/70 font-mono text-[10px] tracking-[0.1em] uppercase flex items-center gap-1"><Eye className="w-3 h-3" /> {content.views.toLocaleString()} views</span>
            </div>
            <h1 className="font-display text-[2rem] md:text-[3rem] leading-[0.9] tracking-[-0.03em] text-white text-balance max-w-[20ch]">{content.title}</h1>
            <div className="flex flex-wrap items-center gap-4 text-[13px] text-white/60">
              <span className="flex items-center gap-2"><Avatar className="w-7 h-7 border border-white/10"><AvatarImage src={content.speaker.avatar} /><AvatarFallback>{content.speaker.name[0]}</AvatarFallback></Avatar> {content.speaker.name}</span>
              <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {content.duration}</span>
              <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> {new Date(content.date).toLocaleDateString()}</span>
            </div>
          </div>

          <div className="flex gap-2">
            <Link to={`/player/${content.id}`}>
              <Button className="h-12 px-6 rounded-full bg-white text-black hover:bg-white/90 font-[650] gap-2 shadow-[0_8px_32px_hsl(0_0%_100%/_0.15)]"><Play className="w-4 h-4 fill-black" /> Watch now</Button>
            </Link>
            <Button variant="outline" size="icon" className="w-12 h-12 rounded-full bg-white/10 backdrop-blur border-white/10 text-white hover:bg-white/15" onClick={toggleFav}><Heart className={`w-5 h-5 ${isFav ? 'fill-white text-white' : ''}`} /></Button>
          </div>
        </div>

        <Link to={`/player/${content.id}`} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full bg-white/90 backdrop-blur flex items-center justify-center shadow-[0_0_60px_hsl(0_0%_100%/_0.2)] hover:scale-105 transition-transform group">
          <Play className="w-8 h-8 fill-black text-black ml-1 group-hover:scale-110 transition-transform" />
        </Link>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <Link to={`/player/${content.id}`}><Button className="rounded-full bg-foreground text-background font-[600] gap-2 h-10 px-5"><Play className="w-4 h-4" /> Play</Button></Link>
        <Button variant="outline" className="rounded-full gap-2 h-10 px-5 font-[600]" onClick={handleDownload}><Download className="w-4 h-4" /> Download</Button>
        <Button variant="outline" size="icon" className="rounded-full w-10 h-10" onClick={handleShare}><Share2 className="w-4 h-4" /></Button>
        <Button variant="outline" size="icon" className="rounded-full w-10 h-10" onClick={toggleFav}><Heart className={`w-4 h-4 ${isFav ? 'fill-red-500 text-red-500' : ''}`} /></Button>
        <Button variant="outline" size="icon" className="rounded-full w-10 h-10" onClick={()=>setIsBookmarked(!isBookmarked)}><Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-foreground' : ''}`} /></Button>
      </div>

      <div className="grid lg:grid-cols-[1.6fr_1fr] gap-8">
        <div className="space-y-8">
          <div className="rounded-[1.5rem] border border-border/50 bg-card p-6 md:p-8">
            <div className="flex items-center gap-2 mb-4"><Sparkles className="w-4 h-4 text-accent" /><span className="font-mono text-[11px] tracking-[0.15em] uppercase text-muted-foreground">About this teaching</span></div>
            <p className="text-[15px] leading-[1.7] text-muted-foreground">{content.description}</p>
            <div className="mt-6 flex flex-wrap gap-2">{content.tags.map(t=><span key={t} className="px-3 py-1 rounded-full bg-secondary text-[11px] font-mono tracking-[0.05em] uppercase">{t}</span>)}</div>
          </div>

          <div className="space-y-4">
            <h2 className="font-display text-[1.5rem] tracking-[-0.02em]">Related teachings</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {related.filter(c=>c.id!==content.id && (c.tags ?? []).some(tag=>content.tags?.includes(tag))).slice(0,4).map(rel=>(
                <Link key={rel.id} to={`/library/${rel.id}`} className="group rounded-[1.25rem] overflow-hidden border border-border/50 bg-card hover:border-foreground/10 hover:shadow-[0_8px_24px_hsl(var(--foreground)/0.06)] transition-all">
                  <div className="aspect-[16/9] relative overflow-hidden">
                    <img src={rel.thumbnail} alt={rel.title} className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute bottom-2 right-2 px-2 py-1 rounded-full bg-black/60 backdrop-blur text-white text-[10px] font-mono">{rel.duration}</div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-[600] text-[14px] leading-[1.3] line-clamp-1">{rel.title}</h3>
                    <p className="text-[12px] text-muted-foreground mt-1">{rel.speaker.name}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-[1.5rem] border border-border/50 bg-card p-6">
            <h3 className="font-[650] tracking-[-0.01em] mb-4">Speaker</h3>
            <div className="flex gap-4">
              <Avatar className="w-14 h-14"><AvatarImage src={content.speaker.avatar} /><AvatarFallback>{content.speaker.name[0]}</AvatarFallback></Avatar>
              <div>
                <div className="font-[650] tracking-[-0.01em]">{content.speaker.name}</div>
                <div className="text-[12px] text-muted-foreground leading-[1.4] mt-1">{content.speaker.title}</div>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="outline" className="rounded-full h-8 px-3 text-[12px] font-[600]">Follow</Button>
                  <Button size="sm" variant="ghost" className="rounded-full h-8 px-3 text-[12px]">View profile</Button>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[1.5rem] bg-foreground text-background p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-accent/20 to-transparent rounded-full blur-2xl" />
            <div className="relative">
              <h3 className="font-display text-[1.3rem] leading-[0.95] tracking-[-0.02em]">Go deeper with Premium</h3>
              <p className="mt-2 text-[13px] leading-[1.5] text-background/60">Offline downloads, HD streaming, exclusive teachings.</p>
              <Link to="/subscription" className="mt-4 inline-flex"><Button size="sm" className="rounded-full bg-white text-black hover:bg-white/90 font-[650] gap-1">Upgrade <ArrowUpRight className="w-3 h-3" /></Button></Link>
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-border/50 bg-card p-6">
            <h3 className="font-[650] tracking-[-0.01em] mb-4">Comments • 2</h3>
            <div className="space-y-4">
              {[
                { name: 'John Doe', time: '2h ago', text: 'This teaching blessed me! Insights on faith are life-changing.' },
                { name: 'Sarah Adams', time: '5h ago', text: 'Applying these principles and seeing amazing results.' },
              ].map((c,i)=>(
                <div key={i} className="flex gap-3">
                  <Avatar className="w-8 h-8"><AvatarFallback>{c.name[0]}</AvatarFallback></Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2"><span className="font-[600] text-[13px]">{c.name}</span><span className="text-[11px] text-muted-foreground">{c.time}</span></div>
                    <p className="text-[13px] leading-[1.5] text-muted-foreground mt-1">{c.text}</p>
                  </div>
                </div>
              ))}
              <div className="flex gap-2 pt-2">
                <Input placeholder="Add a comment…" className="rounded-full h-10 bg-secondary border-border/50" />
                <Button className="rounded-full h-10 px-5 bg-foreground text-background">Post</Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
