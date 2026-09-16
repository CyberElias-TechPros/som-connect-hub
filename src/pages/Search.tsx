import React, { useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search as SearchIcon, Play, Clock, Sparkles, ArrowRight } from 'lucide-react';
import { featuredContent, conferences, podcasts, originals } from '@/lib/mock-data';
import { contentService } from '@/services/content-service';
import { useApiData } from '@/hooks/use-api-data';
import { motion } from 'framer-motion';

const mockLibrary = [...featuredContent, ...conferences, ...podcasts, ...originals].filter((v,i,a)=>a.findIndex(t=>t.id===v.id)===i);

export default function Search() {
  const [params, setParams] = useSearchParams();
  const initialQ = params.get('q') || '';
  const [q, setQ] = useState(initialQ);

  // Instant local results (works offline / before the API answers)…
  const localResults = useMemo(() => {
    if (!q.trim()) return mockLibrary.slice(0, 9);
    const low = q.toLowerCase();
    return mockLibrary.filter(c => c.title.toLowerCase().includes(low) || c.speaker.name.toLowerCase().includes(low) || c.tags.some(t=>t.toLowerCase().includes(low)) || c.category.toLowerCase().includes(low));
  }, [q]);

  // …then the server-side search from the Worker replaces them.
  const { data: remoteResults } = useApiData(
    async () => {
      if (!q.trim()) return [] as typeof mockLibrary;
      const items = await contentService.search(q);
      return items as typeof mockLibrary;
    },
    [] as typeof mockLibrary,
    [q],
  );

  const results = remoteResults.length ? remoteResults : localResults;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setParams({ q });
  };

  return (
    <div className="space-y-8 max-w-[1100px] mx-auto">
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="px-2.5 py-1 rounded-full bg-foreground text-background font-mono text-[10px] tracking-[0.15em] uppercase">Search</span>
          <span className="font-mono text-[10px] tracking-[0.1em] uppercase text-muted-foreground flex items-center gap-1"><Sparkles className="w-3 h-3" /> Happy path — any query works</span>
        </div>
        <h1 className="font-display text-[2.2rem] md:text-[3rem] leading-[0.9] tracking-[-0.03em]">Find what <span className="italic font-[300] text-muted-foreground">moves you.</span></h1>
      </div>

      <form onSubmit={handleSearch} className="relative group max-w-[640px]">
        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-foreground transition-colors" />
        <Input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search teachings, speakers, topics, e.g. 'faith'" className="h-14 pl-12 pr-28 rounded-full bg-card border-border/60 focus-visible:border-foreground/20 focus-visible:ring-2 focus-visible:ring-foreground/10 text-[15px]" />
        <Button type="submit" className="absolute right-1.5 top-1/2 -translate-y-1/2 h-11 px-6 rounded-full bg-foreground text-background font-[600] gap-1">Search <ArrowRight className="w-4 h-4" /></Button>
      </form>

      <div className="flex items-center gap-3">
        <span className="font-mono text-[11px] tracking-[0.1em] uppercase text-muted-foreground">{results.length} results{q ? ` for "${q}"` : ' • Try searching'}</span>
        <div className="h-px flex-1 bg-border/50" />
        <div className="flex gap-1.5">
          {['faith', 'healing', 'worship', 'Pastor Chris'].map(s=>(
            <button key={s} onClick={()=>{setQ(s); setParams({ q: s });}} className="px-3 py-1 rounded-full bg-secondary border border-border/50 text-[11px] font-[600] tracking-[-0.01em] hover:bg-foreground hover:text-background transition-colors">{s}</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {results.map((c,i)=>(
          <motion.div key={c.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i*0.03 }}>
            <Link to={`/library/${c.id}`} className="group block rounded-[1.5rem] overflow-hidden border border-border/50 bg-card hover:border-foreground/10 hover:shadow-[0_8px_24px_hsl(var(--foreground)/0.06)] transition-all">
              <div className="aspect-[16/10] relative overflow-hidden">
                <img src={c.thumbnail} alt={c.title} className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-white/90 backdrop-blur text-[10px] font-mono uppercase font-[700] text-black">{c.category}</div>
                {c.isPremium && <Badge className="absolute top-3 right-3 rounded-full bg-amber-300 text-black font-mono text-[10px] uppercase">Premium</Badge>}
                <div className="absolute bottom-3 right-3 w-8 h-8 rounded-full bg-white/90 backdrop-blur flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><Play className="w-4 h-4 fill-black text-black ml-0.5" /></div>
              </div>
              <div className="p-5">
                <h3 className="font-[650] tracking-[-0.01em] leading-[1.25] line-clamp-1">{c.title}</h3>
                <p className="text-[12px] text-muted-foreground mt-1">{c.speaker.name} • {c.duration}</p>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
