import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Trash2, HardDrive, Wifi, Sparkles, Play } from 'lucide-react';
import { motion } from 'framer-motion';
import { useEffect } from 'react';
import { contentService } from '@/services/content-service';
import { useApiData } from '@/hooks/use-api-data';

export default function Offline() {
  // GET /content/downloads — the offline library stored in D1/R2.
  const { data: downloads } = useApiData(() => contentService.downloads(), [] as any[], []);

  const [items, setItems] = useState<any[]>([
    { id: '1', title: 'The Power of Faith in Action', size: '1.2 GB', thumb: 'https://images.unsplash.com/photo-1507692049790-de58290a4334?w=600&h=340&fit=crop' },
    { id: '2', title: 'Daily Inspiration Podcast - Episode 145', size: '84 MB', thumb: 'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=600&h=340&fit=crop' },
  ]);

  useEffect(() => {
    if (!downloads?.length) return;
    setItems(
      downloads.map((d: any) => ({
        id: d.contentId ?? d.id,
        title: d.title ?? 'Downloaded teaching',
        size: d.size ?? '—',
        thumb: d.thumbnail ?? 'https://images.unsplash.com/photo-1507692049790-de58290a4334?w=600&h=340&fit=crop',
      })),
    );
  }, [downloads]);

  const clear = (id: string) => {
    setItems(items.filter(i=>i.id!==id));
    contentService.removeDownload(id).catch(() => undefined);
  };
  const clearAll = () => {
    const ids = items.map((i) => i.id);
    setItems([]);
    ids.forEach((id) => contentService.removeDownload(id).catch(() => undefined));
  };

  return (
    <div className="space-y-8 max-w-[800px] mx-auto">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-3"><span className="px-2.5 py-1 rounded-full bg-foreground text-background font-mono text-[10px] tracking-[0.15em] uppercase">Offline • {items.length} items</span><span className="font-mono text-[10px] tracking-[0.1em] uppercase text-muted-foreground flex items-center gap-1"><HardDrive className="w-3 h-3" /> Local storage</span></div>
          <h1 className="font-display text-[2.2rem] md:text-[3rem] leading-[0.9] tracking-[-0.03em]">Watch <span className="italic font-[300] text-muted-foreground">anywhere.</span></h1>
        </div>
        {items.length>0 && <Button variant="outline" className="rounded-full h-10 px-5 font-[600] gap-1" onClick={clearAll}><Trash2 className="w-4 h-4" /> Clear all</Button>}
      </div>

      <div className="grid md:grid-cols-3 gap-3">
        <Card className="rounded-[1.25rem] border-border/50 bg-card p-5 flex gap-3"><div className="w-10 h-10 rounded-full bg-secondary border border-border/50 flex items-center justify-center"><HardDrive className="w-5 h-5" /></div><div><div className="font-[650] text-[14px]">1.28 GB used</div><div className="text-[12px] text-muted-foreground">of 10 GB available</div></div></Card>
        <Card className="rounded-[1.25rem] border-border/50 bg-card p-5 flex gap-3"><div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center"><Wifi className="w-5 h-5 text-emerald-600" /></div><div><div className="font-[650] text-[14px]">Wi-Fi only</div><div className="text-[12px] text-muted-foreground">Downloads on Wi-Fi</div></div></Card>
        <Card className="rounded-[1.25rem] border-border/50 bg-foreground text-background p-5 flex gap-3"><div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center"><Sparkles className="w-5 h-5 text-amber-300" /></div><div><div className="font-[650] text-[14px]">Auto-download on</div><div className="text-[12px] text-background/60">Favorites saved offline</div></div></Card>
      </div>

      <div className="space-y-3">
        {items.map((it,i)=>(
          <motion.div key={it.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i*0.05 }}>
            <Card className="rounded-[1.25rem] border-border/50 overflow-hidden flex">
              <div className="w-28 aspect-video relative shrink-0"><img src={it.thumb} alt={it.title} className="w-full h-full object-cover" /><div className="absolute inset-0 bg-black/20" /><div className="absolute inset-0 flex items-center justify-center"><div className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center"><Play className="w-4 h-4 fill-black text-black ml-0.5" /></div></div></div>
              <CardContent className="flex-1 p-4 flex items-center justify-between">
                <div><div className="font-[600] text-[14px] leading-[1.2] line-clamp-1">{it.title}</div><div className="text-[12px] text-muted-foreground mt-1">{it.size} • Available offline</div></div>
                <Button variant="ghost" size="icon" className="rounded-full w-9 h-9" onClick={()=>clear(it.id)}><Trash2 className="w-4 h-4" /></Button>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {items.length===0 && (
        <div className="py-20 text-center rounded-[1.75rem] border border-dashed border-border/60 bg-secondary/20 space-y-3">
          <div className="w-14 h-14 mx-auto rounded-full bg-card border border-border/50 flex items-center justify-center"><Download className="w-6 h-6 text-muted-foreground" /></div>
          <h3 className="font-display text-[1.4rem]">No offline content</h3>
          <p className="text-[13px] text-muted-foreground max-w-[36ch] mx-auto">Download teachings from the library to watch without internet. Happy path — downloads always succeed in demo.</p>
        </div>
      )}
    </div>
  );
}
