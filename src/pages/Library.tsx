import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Heart, Play, Search, Clock, Eye, Sparkles, Filter, ArrowUpRight } from 'lucide-react';
import { conferences, podcasts, originals, featuredContent, ContentItem } from '@/lib/mock-data';
import { contentService } from '@/services/content-service';
import { useApiData } from '@/hooks/use-api-data';
import { motion, AnimatePresence } from 'framer-motion';

const mockLibrary = [...featuredContent, ...conferences, ...podcasts, ...originals].filter((v,i,a)=>a.findIndex(t=>t.id===v.id)===i);

export default function Library() {
  const [activeTab, setActiveTab] = useState('all');
  const [sort, setSort] = useState<'date' | 'views' | 'title'>('date');
  // Live library from the Worker (falls back to the bundled demo set instantly).
  const { data: allContent, loading, offline } = useApiData(
    async () => {
      const { items } = await contentService.list({ limit: 100, sort });
      return items.length ? items : mockLibrary;
    },
    mockLibrary as ContentItem[],
    [sort],
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('som_favs')||'[]'); } catch { return []; }
  });

  const filtered = useMemo(() => {
    let base: ContentItem[] = allContent.length ? allContent : mockLibrary;
    if (activeTab === 'conferences') base = conferences;
    else if (activeTab === 'podcasts') base = podcasts;
    else if (activeTab === 'originals') base = originals;
    else if (activeTab === 'favorites') base = allContent.filter(c=>favorites.includes(c.id));
    if (!searchQuery.trim()) return base;
    const q = searchQuery.toLowerCase();
    return base.filter(c=> c.title.toLowerCase().includes(q) || c.speaker.name.toLowerCase().includes(q) || c.tags.some(t=>t.toLowerCase().includes(q)));
  }, [activeTab, searchQuery, favorites, allContent]);

  const toggleFav = (id: string, e?: React.MouseEvent) => {
    e?.preventDefault(); e?.stopPropagation();
    setFavorites(prev => {
      const next = prev.includes(id) ? prev.filter(f=>f!==id) : [...prev, id];
      localStorage.setItem('som_favs', JSON.stringify(next));
      return next;
    });
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="px-2.5 py-1 rounded-full bg-foreground text-background font-mono text-[10px] tracking-[0.15em] uppercase">Library • {allContent.length} teachings</span>
              <span className="hidden md:flex items-center gap-1.5 font-mono text-[10px] tracking-[0.1em] uppercase text-muted-foreground"><Sparkles className="w-3 h-3" /> Curated for growth</span>
            </div>
            <h1 className="font-display text-[2.2rem] md:text-[3rem] leading-[0.9] tracking-[-0.03em] text-balance">Explore the <span className="italic font-[300] text-muted-foreground">Word, deeply.</span></h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary border border-border/50 font-mono text-[10px] tracking-[0.1em] uppercase"><Filter className="w-3 h-3" /> Filters active</div>
          </div>
        </div>

        {/* Search */}
        <div className="relative group max-w-[560px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-foreground transition-colors" />
          <Input placeholder="Search teachings, speakers, topics, scriptures…" value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} className="h-12 pl-11 pr-4 rounded-full bg-card border-border/60 focus-visible:border-foreground/20 focus-visible:ring-2 focus-visible:ring-foreground/10 text-[14px]" />
          {searchQuery && <button onClick={()=>setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground">×</button>}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="h-auto p-1.5 rounded-full bg-secondary/70 border border-border/50 flex-wrap justify-start gap-1">
            {[
              { id: 'all', label: 'All' },
              { id: 'conferences', label: 'Conferences' },
              { id: 'podcasts', label: 'Podcasts' },
              { id: 'originals', label: 'Originals' },
              { id: 'favorites', label: `Favorites ${favorites.length ? `• ${favorites.length}` : ''}` },
            ].map(t=>(
              <TabsTrigger key={t.id} value={t.id} className="rounded-full px-4 py-2 text-[13px] font-[600] tracking-[-0.01em] data-[state=active]:bg-foreground data-[state=active]:text-background data-[state=active]:shadow-md transition-all">{t.label}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* Grid */}
      <AnimatePresence mode="wait">
        <motion.div key={activeTab+searchQuery} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.4, ease: [0.16,1,0.3,1] }} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((content, i)=>(
            <motion.div key={content.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i*0.04, duration: 0.5, ease: [0.16,1,0.3,1] }} className="group relative rounded-[1.5rem] overflow-hidden bg-card border border-border/50 hover:border-foreground/10 hover:shadow-[0_12px_32px_hsl(var(--foreground)/0.08)] transition-all duration-500">
              <Link to={`/library/${content.id}`} className="block">
                <div className="aspect-[16/10] relative overflow-hidden bg-muted">
                  <img src={content.thumbnail} alt={content.title} className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-[1.2s] ease-[cubic-bezier(0.16,1,0.3,1)]" loading="lazy" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />
                  <div className="absolute top-3 left-3 flex gap-1.5">
                    <span className="px-2.5 py-1 rounded-full bg-white/90 backdrop-blur text-[10px] font-mono tracking-[0.08em] uppercase font-[700] text-black">{content.category}</span>
                    {content.isPremium && <span className="px-2.5 py-1 rounded-full bg-amber-300 text-[10px] font-mono tracking-[0.08em] uppercase font-[700] text-black">Premium</span>}
                  </div>
                  <button onClick={e=>toggleFav(content.id, e)} className={`absolute top-3 right-3 w-8 h-8 rounded-full backdrop-blur flex items-center justify-center transition-all ${favorites.includes(content.id) ? 'bg-white text-red-500' : 'bg-black/30 text-white hover:bg-white hover:text-red-500'}`}>
                    <Heart className={`w-4 h-4 ${favorites.includes(content.id) ? 'fill-current' : ''}`} />
                  </button>
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                    <span className="px-2 py-1 rounded-full bg-black/50 backdrop-blur text-white text-[11px] font-mono flex items-center gap-1"><Clock className="w-3 h-3" />{content.duration}</span>
                    <div className="w-9 h-9 rounded-full bg-white/90 backdrop-blur flex items-center justify-center opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-500 shadow-lg">
                      <Play className="w-4 h-4 fill-black text-black ml-0.5" />
                    </div>
                  </div>
                </div>
                <div className="p-5">
                  <h3 className="font-[650] tracking-[-0.01em] leading-[1.25] line-clamp-2 text-[15px] group-hover:tracking-[-0.015em] transition-all">{content.title}</h3>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
                      <img src={content.speaker.avatar} alt={content.speaker.name} className="w-6 h-6 rounded-full object-cover" />
                      <span className="truncate max-w-[14ch]">{content.speaker.name}</span>
                    </div>
                    <span className="flex items-center gap-1 text-[11px] font-mono text-muted-foreground"><Eye className="w-3 h-3" />{content.views.toLocaleString()}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {content.tags.slice(0,2).map(tag=><span key={tag} className="px-2 py-1 rounded-full bg-secondary text-[10px] font-mono tracking-[0.05em] uppercase">{tag}</span>)}
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </AnimatePresence>

      {filtered.length===0 && (
        <div className="py-24 text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-secondary flex items-center justify-center"><Search className="w-6 h-6 text-muted-foreground" /></div>
          <h3 className="font-display text-[1.5rem]">No results found</h3>
          <p className="text-muted-foreground text-[14px] max-w-[36ch] mx-auto">Try different keywords, or browse all content. Every search is a happy path — try "faith" or "Pastor Chris".</p>
          <Button onClick={()=>{setSearchQuery(''); setActiveTab('all');}} className="rounded-full">Clear search</Button>
        </div>
      )}
    </div>
  );
}
