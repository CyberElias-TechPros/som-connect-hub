import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, BookOpen, Sparkles, ArrowUpRight } from 'lucide-react';
import { publications as mockPublications } from '@/lib/mock-data';
import { toolsService } from '@/services/tools-service';
import { useApiData } from '@/hooks/use-api-data';
import { motion } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';

export default function Publications() {
  const { toast } = useToast();
  // GET /tools/publications (issue list from D1)
  const { data: publications } = useApiData(
    async () => {
      const items = await toolsService.getPublications();
      return items.length ? items : mockPublications;
    },
    mockPublications,
    [],
  );
  return (
    <div className="space-y-8 max-w-[1000px] mx-auto">
      <div>
        <div className="flex items-center gap-2 mb-3"><span className="px-2.5 py-1 rounded-full bg-foreground text-background font-mono text-[10px] tracking-[0.15em] uppercase">Publications</span><span className="font-mono text-[10px] tracking-[0.1em] uppercase text-muted-foreground flex items-center gap-1"><BookOpen className="w-3 h-3" /> PK Magazine & more</span></div>
        <h1 className="font-display text-[2.2rem] md:text-[3rem] leading-[0.9] tracking-[-0.03em]">Read, <span className="italic font-[300] text-muted-foreground">grow, share.</span></h1>
      </div>

      <div className="grid md:grid-cols-3 gap-5">
        {publications.map((pub,i)=>(
          <motion.div key={pub.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i*0.06 }}>
            <Card className="rounded-[1.5rem] border-border/50 overflow-hidden group hover:border-foreground/10 hover:shadow-[0_8px_24px_hsl(var(--foreground)/0.06)] transition-all">
              <div className="aspect-[3/4] relative overflow-hidden bg-muted">
                <img src={pub.cover} alt={pub.title} className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-white/90 backdrop-blur text-[10px] font-mono uppercase font-[700] text-black">{pub.type}</div>
              </div>
              <CardContent className="p-5 space-y-3">
                <h3 className="font-[700] tracking-[-0.01em] leading-[1.2]">{pub.title}</h3>
                <p className="text-[12px] leading-[1.5] text-muted-foreground line-clamp-2">{pub.description}</p>
                <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-[0.05em] text-muted-foreground"><span>{pub.issueDate}</span><span>{pub.pages} pages</span></div>
                <Button className="w-full rounded-full bg-foreground text-background font-[600] gap-1 h-10" onClick={()=>toast({ title: 'Download started', description: `${pub.title} is being downloaded.` })}><Download className="w-4 h-4" /> Download</Button>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
