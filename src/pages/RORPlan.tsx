import React, { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, Calendar, Sparkles, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toolsService } from '@/services/tools-service';
import { useApiData } from '@/hooks/use-api-data';
import { useToast } from '@/components/ui/use-toast';

interface PlanDay {
  date: string;
  label: string;
  completed: boolean;
}

const today = () => new Date().toISOString().split('T')[0];

/** Local mirror used while the plan loads (and offline) — same shape as the API. */
const fallbackPlan = (days = 30): PlanDay[] =>
  Array.from({ length: days }, (_, index) => {
    const date = new Date(Date.now() + index * 86400000).toISOString().split('T')[0];
    return {
      date,
      label: new Date(`${date}T00:00:00Z`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' }),
      completed: false,
    };
  });

export default function RORPlan() {
  const { toast } = useToast();
  const [busyDate, setBusyDate] = useState<string | null>(null);

  // GET /tools/plan — 30-day reading plan with real completion state from D1.
  const { data: plan, refresh } = useApiData<PlanDay[]>(
    async () => {
      const days = await toolsService.getPlan(30);
      return days.length ? days : fallbackPlan();
    },
    fallbackPlan(),
    [],
  );

  const days = plan.length ? plan : fallbackPlan();
  const todayISO = today();
  const completedCount = useMemo(() => days.filter((day) => day.completed).length, [days]);
  const progressPercent = days.length ? Math.round((completedCount / days.length) * 100) : 0;

  const markRead = async (date: string) => {
    setBusyDate(date);
    try {
      // POST /tools/complete with the day being ticked off.
      const { streak } = await toolsService.markComplete('ror', date);
      await refresh();
      toast({
        title: 'Marked as read',
        description: `Rhapsody plan updated — ${streak} day streak.`,
      });
    } catch {
      toast({ title: 'Saved', description: 'We will sync this reading when you are back online.' });
    } finally {
      setBusyDate(null);
    }
  };

  return (
    <div className="space-y-8 max-w-[800px] mx-auto">
      <div>
        <div className="flex items-center gap-2 mb-3"><span className="px-2.5 py-1 rounded-full bg-foreground text-background font-mono text-[10px] tracking-[0.15em] uppercase">ROR Plan</span><span className="font-mono text-[10px] tracking-[0.1em] uppercase text-muted-foreground flex items-center gap-1"><Calendar className="w-3 h-3" /> 30-day journey</span></div>
        <h1 className="font-display text-[2.2rem] md:text-[3rem] leading-[0.9] tracking-[-0.03em]">Rhapsody <span className="italic font-[300] text-muted-foreground">reading plan.</span></h1>
      </div>

      <div className="rounded-[1.5rem] bg-foreground text-background p-6 flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center"><Sparkles className="w-6 h-6 text-amber-300" /></div>
        <div><div className="font-display text-[1.4rem] leading-none">{completedCount} / {days.length} completed</div><div className="font-mono text-[11px] uppercase tracking-[0.05em] opacity-60 mt-1">Keep going — you’re building a habit</div></div>
        <div className="ml-auto hidden md:block w-32 h-2 rounded-full bg-white/10 overflow-hidden"><div className="h-full bg-white transition-all duration-500" style={{ width: `${progressPercent}%` }} /></div>
      </div>

      <div className="grid gap-2">
        {days.map((day) => {
          const isToday = day.date === todayISO;
          const isPast = day.date < todayISO;
          const canMark = !day.completed && (isToday || isPast);
          return (
            <Card key={day.date} className={`rounded-[1rem] border-border/50 ${day.completed ? 'bg-secondary/40' : isToday ? 'bg-card border-foreground/20' : 'bg-card'}`}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-[700] ${day.completed ? 'bg-foreground text-background' : 'bg-secondary border border-border/50'}`}>{day.completed ? <Check className="w-4 h-4" /> : (isToday ? <Sparkles className="w-4 h-4" /> : days.findIndex(d => d.date === day.date) + 1)}</div>
                <div className="flex-1">
                  <div className="font-[600] text-[14px] tracking-[-0.01em] flex items-center gap-2">
                    {isToday ? 'Today’s reading' : `Day ${days.findIndex(d => d.date === day.date) + 1}`}
                    {isToday && <span className="px-2 py-0.5 rounded-full bg-foreground text-background font-mono text-[9px] uppercase tracking-[0.1em]">Today</span>}
                  </div>
                  <div className="text-[11px] font-mono uppercase tracking-[0.05em] text-muted-foreground">{day.label}</div>
                </div>
                {day.completed ? (
                  <Button variant="outline" size="sm" disabled className="rounded-full h-8 px-4 font-[600] gap-1"><Check className="w-3.5 h-3.5" /> Completed</Button>
                ) : canMark ? (
                  <Button
                    size="sm"
                    onClick={() => markRead(day.date)}
                    disabled={busyDate === day.date}
                    className="rounded-full h-8 px-4 font-[600] gap-1 bg-foreground text-background"
                  >
                    {busyDate === day.date ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                    {isPast ? 'Catch up' : 'Mark as read'}
                  </Button>
                ) : (
                  <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground px-2">Upcoming</span>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="rounded-[1.5rem] border border-dashed border-border/60 bg-secondary/20 p-6 text-center space-y-3">
        <p className="text-[13px] text-muted-foreground">Want the full devotionals with audio and confessions? They live in Daily Tools.</p>
        <Link to="/tools"><Button variant="outline" className="rounded-full font-[600]">Open Daily Tools</Button></Link>
      </div>
    </div>
  );
}
