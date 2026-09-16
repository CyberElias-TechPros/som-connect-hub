import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Heart, Search, Trash2, Play, Sparkles, ArrowRight } from 'lucide-react';
import { conferences, podcasts, originals, featuredContent, ContentItem } from '@/lib/mock-data';
import { favoritesService } from '@/services/favorites-service';
import { contentService } from '@/services/content-service';
import { useApiData } from '@/hooks/use-api-data';
import { motion } from 'framer-motion';

const mockLibrary = [...featuredContent, ...conferences, ...podcasts, ...originals].filter((v,i,a)=>a.findIndex(t=>t.id===v.id)===i);
const allContent = mockLibrary;

export default function Favorites() {
  const [q, setQ] = useState('');

  // Favorites live in D1 (GET /favorites) with a local mirror for offline use.
  const { data: favs, refresh: refreshFavs } = useApiData(
    async () => (await favoritesService.sync()).map((f) => f.contentId),
    favoritesService.getAllFavorites().map((f) => f.contentId),
    [],
  );

  // The full library — used to render favorited items that are not in the
  // bundled demo set.
  const { data: library } = useApiData(
    async () => {
      const { items } = await contentService.list({ limit: 100 });
      return items.length ? items : (allContent as ContentItem[]);
    },
    allContent as ContentItem[],
    [],
  );

  const items = useMemo(() => {
    const base = library.filter(c=>favs.includes(c.id));
    if (!q.trim()) return base;
    const low = q.toLowerCase();
    return base.filter(c=>c.title.toLowerCase().includes(low) || c.speaker.name.toLowerCase().includes(low));
  }, [favs, library, q]);

  const remove = (id: string) => {
    favoritesService.removeFromFavorites(id);
    refreshFavs();
  };

  const clearAll = () => {
    favoritesService.clearAllFavorites();
    refreshFavs();
  };

  return (
    <div className="space-y-8 max-w-[1100px] mx-auto">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="px-2.5 py-1 rounded-full bg-foreground text-background font-mono text-[10px] tracking-[0.15em] uppercase">Favorites • {favs.length}</span>
            <span className="font-mono text-[10px] tracking-[0.1em] uppercase text-muted-foreground flex items-center gap-1"><Heart className="w-3 h-3 fill-red-500 text-red-500" /> Saved for later</span>
          </div>
          <h1 className="font-display text-[2.2rem] md:text-[3rem] leading-[0.9] tracking-[-0.03em]">Your <span className="italic font-[300] text-muted-foreground">collection.</span></h1>
        </div>
        {favs.length>0 && <Button variant="outline" className="rounded-full h-10 px-5 font-[600] gap-1" onClick={clearAll}><Trash2 className="w-4 h-4" /> Clear all</Button>}
      </div>

      <div className="relative max-w-[480px]">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search favorites…" value={q} onChange={e=>setQ(e.target.value)} className="h-11 pl-11 rounded-full bg-card border-border/60" />
      </div>

      {items.length===0 ? (
        <div className="py-24 text-center rounded-[1.75rem] border border-dashed border-border/60 bg-secondary/20 space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-card border border-border/50 flex items-center justify-center"><Heart className="w-7 h-7 text-muted-foreground" /></div>
          <h3 className="font-display text-[1.6rem]">No favorites yet</h3>
          <p className="text-[14px] text-muted-foreground max-w-[40ch] mx-auto">Tap the heart on any teaching to save it. Happy path — your favorites are stored locally and work offline.</p>
          <Link to="/library"><Button className="rounded-full bg-foreground text-background font-[600] gap-1">Browse library <ArrowRight className="w-4 h-4" /></Button></Link>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map((c,i)=>(
            <motion.div key={c.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i*0.04 }}>
              <Card className="rounded-[1.5rem] border-border/50 overflow-hidden group hover:border-foreground/10 hover:shadow-[0_8px_24px_hsl(var(--foreground)/0.06)] transition-all">
                <div className="aspect-[16/10] relative overflow-hidden">
                  <img src={c.thumbnail} alt={c.title} className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <button onClick={()=>remove(c.id)} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white text-red-500 flex items-center justify-center shadow"><Heart className="w-4 h-4 fill-current" /></button>
                  <Link to={`/player/${c.id}`} className="absolute bottom-3 right-3 w-9 h-9 rounded-full bg-white/90 backdrop-blur flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><Play className="w-4 h-4 fill-black text-black ml-0.5" /></Link>
                </div>
                <CardContent className="p-5">
                  <Link to={`/library/${c.id}`}><h3 className="font-[650] tracking-[-0.01em] leading-[1.25] line-clamp-1 hover:underline underline-offset-4">{c.title}</h3></Link>
                  <p className="text-[12px] text-muted-foreground mt-1">{c.speaker.name} • {c.duration}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
