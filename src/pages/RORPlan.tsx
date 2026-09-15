import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, Calendar, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toolsService } from '@/services/tools-service';
import { useApiData } from '@/hooks/use-api-data';

const plan = Array.from({ length: 30 }).map((_,i)=>({ day: i+1, title: `Day ${i+1}: Living in the Spirit`, done: i < 5, date: new Date(Date.now() + i*86400000).toLocaleDateString() }));

export default function RORPlan() {
  return (
    <div className="space-y-8 max-w-[800px] mx-auto">
      <div>
        <div className="flex items-center gap-2 mb-3"><span className="px-2.5 py-1 rounded-full bg-foreground text-background font-mono text-[10px] tracking-[0.15em] uppercase">ROR Plan</span><span className="font-mono text-[10px] tracking-[0.1em] uppercase text-muted-foreground flex items-center gap-1"><Calendar className="w-3 h-3" /> 30-day journey</span></div>
        <h1 className="font-display text-[2.2rem] md:text-[3rem] leading-[0.9] tracking-[-0.03em]">Rhapsody <span className="italic font-[300] text-muted-foreground">reading plan.</span></h1>
      </div>

      <div className="rounded-[1.5rem] bg-foreground text-background p-6 flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center"><Sparkles className="w-6 h-6 text-amber-300" /></div>
        <div><div className="font-display text-[1.4rem] leading-none">5 / 30 completed</div><div className="font-mono text-[11px] uppercase tracking-[0.05em] opacity-60 mt-1">Keep going — you’re building a habit</div></div>
        <div className="ml-auto hidden md:block w-32 h-2 rounded-full bg-white/10 overflow-hidden"><div className="h-full bg-white" style={{ width: '16%' }} /></div>
      </div>

      <div className="grid gap-2">
        {plan.map(d=>(
          <Card key={d.day} className={`rounded-[1rem] border-border/50 ${d.done ? 'bg-secondary/40' : 'bg-card'}`}>
            <CardContent className="p-4 flex items-center gap-4">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-[700] ${d.done ? 'bg-foreground text-background' : 'bg-secondary border border-border/50'}`}>{d.done ? <Check className="w-4 h-4" /> : d.day}</div>
              <div className="flex-1"><div className="font-[600] text-[14px] tracking-[-0.01em]">{d.title}</div><div className="text-[11px] font-mono uppercase tracking-[0.05em] text-muted-foreground">{d.date}</div></div>
              <Button variant="outline" size="sm" className="rounded-full h-8 px-4 font-[600]">{d.done ? 'Completed' : 'Start'}</Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
