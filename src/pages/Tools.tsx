import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Flame, BookOpen, ChevronRight, Volume2, Share2, Play, Pause, SkipBack, SkipForward, Sparkles, Check } from 'lucide-react';
import { dailyConfessions, rorReadings, currentUser } from '@/lib/mock-data';
import { toolsService } from '@/services/tools-service';
import { useApiData } from '@/hooks/use-api-data';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';

export default function Tools() {
  const { user } = useAuth();
  // Today's devotionals + streak come from D1 (generated daily if missing).
  const { data: bundle, refresh } = useApiData(
    () => toolsService.getBundle(),
    {
      date: dailyConfessions[0].date,
      confession: dailyConfessions[0],
      ror: rorReadings[0],
      streak: currentUser.streak,
      completed: [] as string[],
    },
    [],
  );
  const confession = bundle.confession ?? dailyConfessions[0];
  const ror = bundle.ror ?? rorReadings[0];
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(12);
  const [duration] = useState(180);
  const [streak, setStreak] = useState(bundle.streak || currentUser.streak);
  const [completed, setCompleted] = useState<string[]>(bundle.completed ?? []);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (bundle.streak) setStreak(bundle.streak);
    if (bundle.completed?.length) setCompleted(bundle.completed);
  }, [bundle.streak, bundle.completed]);

  const togglePlay = () => setIsPlaying(!isPlaying);
  const formatTime = (t: number) => `${Math.floor(t/60)}:${String(Math.floor(t%60)).padStart(2,'0')}`;

  const markCompleted = async (id: string) => {
    if (completed.includes(id)) return;
    setCompleted([...completed, id]);
    setStreak(s => s + 1);
    // POST /tools/complete — persists the streak server-side.
    const result = await toolsService.markComplete(id === 'confession' ? 'confession' : 'ror');
    if (typeof result?.streak === 'number' && result.streak > 0) setStreak(result.streak);
    refresh().catch(() => undefined);
  };

  return (
    <div className="space-y-8 max-w-[1100px] mx-auto">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="px-2.5 py-1 rounded-full bg-foreground text-background font-mono text-[10px] tracking-[0.15em] uppercase">Daily Tools</span>
            <span className="font-mono text-[10px] tracking-[0.1em] uppercase text-muted-foreground flex items-center gap-1"><Sparkles className="w-3 h-3" /> Spiritual disciplines</span>
          </div>
          <h1 className="font-display text-[2.2rem] md:text-[3rem] leading-[0.9] tracking-[-0.03em]">Daily <span className="italic font-[300] text-muted-foreground">rhythms.</span></h1>
        </div>
      </div>

      {/* Streak */}
      <motion.div initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="rounded-[1.75rem] bg-foreground text-background p-6 md:p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-amber-400/20 to-transparent rounded-full blur-3xl" />
        <div className="relative flex items-center gap-5">
          <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur border border-white/10 flex items-center justify-center"><Flame className="w-8 h-8 text-amber-300" /></div>
          <div>
            <div className="font-display text-[2.5rem] leading-none">{streak} days</div>
            <div className="font-mono text-[11px] tracking-[0.1em] uppercase opacity-60 mt-1">Keep your streak • {completed.length} completed today</div>
          </div>
          <div className="ml-auto hidden md:flex gap-1.5">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className={`w-9 h-9 rounded-full border flex items-center justify-center text-[11px] font-[700] ${i < 5 ? 'bg-white text-black border-white' : 'bg-white/10 border-white/10 text-white/40'}`}>{i < 5 ? <Check className="w-4 h-4" /> : i+1}</div>
            ))}
          </div>
        </div>
      </motion.div>

      <div className="grid md:grid-cols-2 gap-5">
        {/* Confession */}
        <motion.div initial={{ y: 16, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} className="rounded-[1.75rem] border border-border/50 bg-card p-7 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center"><Volume2 className="w-5 h-5 text-amber-600" /></div>
              <div>
                <div className="font-mono text-[10px] tracking-[0.15em] uppercase text-muted-foreground">{confession.date}</div>
                <div className="font-[650] text-[13px]">Daily Confession</div>
              </div>
            </div>
            <Badge className="rounded-full bg-secondary font-mono text-[10px] uppercase">{confession.scriptureRef}</Badge>
          </div>

          <div>
            <h3 className="font-display text-[1.6rem] leading-[0.95] tracking-[-0.02em]">{confession.title}</h3>
            <p className="mt-3 text-[14px] leading-[1.6] text-muted-foreground">{confession.content}</p>
            <blockquote className="mt-4 border-l-2 border-amber-300/40 pl-4 italic text-[13px] text-muted-foreground">"{confession.scripture}"</blockquote>
          </div>

          <div className="rounded-[1.25rem] bg-secondary/60 border border-border/50 p-4 space-y-3">
            <div className="flex items-center gap-2 text-[12px] font-mono"><span>{formatTime(currentTime)}</span><div className="flex-1 h-1 rounded-full bg-border overflow-hidden"><div className="h-full bg-foreground" style={{ width: `${(currentTime/duration)*100}%` }} /></div><span>{formatTime(duration)}</span></div>
            <div className="flex items-center justify-center gap-3">
              <Button variant="ghost" size="icon" className="rounded-full w-9 h-9"><SkipBack className="w-4 h-4" /></Button>
              <Button onClick={togglePlay} className="rounded-full w-12 h-12 bg-foreground text-background">{isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}</Button>
              <Button variant="ghost" size="icon" className="rounded-full w-9 h-9"><SkipForward className="w-4 h-4" /></Button>
            </div>
          </div>

          <Button className={`w-full rounded-full h-11 font-[600] gap-2 ${completed.includes('confession') ? 'bg-emerald-600 hover:bg-emerald-600' : 'bg-foreground text-background'}`} onClick={()=>markCompleted('confession')}>
            {completed.includes('confession') ? <><Check className="w-4 h-4" /> Completed</> : 'Mark as completed'}
          </Button>
        </motion.div>

        {/* ROR */}
        <motion.div initial={{ y: 16, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.1 }} className="rounded-[1.75rem] border border-border/50 bg-card p-7 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-secondary border border-border/50 flex items-center justify-center"><BookOpen className="w-5 h-5" /></div>
              <div>
                <div className="font-mono text-[10px] tracking-[0.15em] uppercase text-muted-foreground">{ror.date}</div>
                <div className="font-[650] text-[13px]">Rhapsody of Realities</div>
              </div>
            </div>
            <Badge variant="secondary" className="rounded-full font-mono text-[10px] uppercase">{ror.theme}</Badge>
          </div>

          <div>
            <h3 className="font-display text-[1.6rem] leading-[0.95] tracking-[-0.02em]">{ror.title}</h3>
            <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.05em] text-muted-foreground">{ror.scriptureRef}</p>
            <p className="mt-3 text-[14px] leading-[1.6] text-muted-foreground line-clamp-4">{ror.content}</p>
            <div className="mt-4 p-4 rounded-[1rem] bg-secondary/50 border border-border/50">
              <div className="font-mono text-[10px] tracking-[0.1em] uppercase text-muted-foreground mb-2">Prayer</div>
              <p className="text-[13px] leading-[1.5] italic">{ror.prayer}</p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button className={`flex-1 rounded-full h-11 font-[600] gap-2 ${completed.includes('ror') ? 'bg-emerald-600' : 'bg-foreground text-background'}`} onClick={()=>markCompleted('ror')}>
              {completed.includes('ror') ? <><Check className="w-4 h-4" /> Completed</> : 'Mark completed'}
            </Button>
            <Link to="/tools/ror-plan"><Button variant="outline" className="rounded-full h-11 px-5 font-[600]">Plan <ChevronRight className="w-4 h-4 ml-1" /></Button></Link>
          </div>
        </motion.div>
      </div>

      <Link to="/publications" className="block rounded-[1.5rem] border border-border/50 bg-card p-5 flex items-center gap-4 hover:border-foreground/15 hover:shadow-[0_8px_24px_hsl(var(--foreground)/0.06)] transition-all group">
        <div className="w-12 h-12 rounded-[0.9rem] bg-secondary border border-border/50 flex items-center justify-center group-hover:bg-foreground group-hover:text-background transition-colors"><BookOpen className="w-6 h-6" /></div>
        <div className="flex-1"><h3 className="font-[650] tracking-[-0.01em]">Publications</h3><p className="text-[13px] text-muted-foreground">PK Magazines & Newsletters</p></div>
        <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
      </Link>

      <audio ref={audioRef} src="/audio/daily-confession.mp3" />
    </div>
  );
}
