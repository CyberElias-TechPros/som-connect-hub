import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Play, Calendar, Clock, Users, Sparkles, ArrowRight, Video, Bell } from 'lucide-react';
import { qaSessions as mockSessions } from '@/lib/mock-data';
import { qaService } from '@/services/qa-service';
import { useApiData } from '@/hooks/use-api-data';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useToast } from '@/components/ui/use-toast';

export default function QASessions() {
  // Live session list (statuses: live → upcoming → archived).
  const { data: qaSessions } = useApiData(
    async () => {
      const items = await qaService.list();
      return items.length ? items : mockSessions;
    },
    mockSessions,
    [],
    { pollMs: 45000 },
  );
  const { toast } = useToast();
  const [reminders, setReminders] = useState<string[]>([]);

  const toggleReminder = (id: string) => {
    setReminders(prev => prev.includes(id) ? prev.filter(r=>r!==id) : [...prev, id]);
    toast({ title: reminders.includes(id) ? 'Reminder removed' : 'Reminder set', description: reminders.includes(id) ? 'We won’t notify you' : 'We’ll notify you 30 min before' });
  };

  return (
    <div className="space-y-8 max-w-[1100px] mx-auto">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="px-2.5 py-1 rounded-full bg-foreground text-background font-mono text-[10px] tracking-[0.15em] uppercase">Q&A • Live & archived</span>
            <span className="font-mono text-[10px] tracking-[0.1em] uppercase text-muted-foreground flex items-center gap-1"><Video className="w-3 h-3" /> Interactive sessions</span>
          </div>
          <h1 className="font-display text-[2.2rem] md:text-[3rem] leading-[0.9] tracking-[-0.03em]">Ask, <span className="italic font-[300] text-muted-foreground">learn, grow.</span></h1>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-mono text-[10px] tracking-[0.1em] uppercase"><div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> 1 live now</div>
      </div>

      <Tabs defaultValue="upcoming" className="w-full">
        <TabsList className="h-auto p-1.5 rounded-full bg-secondary/70 border border-border/50">
          {[
            { id: 'upcoming', label: 'Upcoming' },
            { id: 'live', label: 'Live • 1' },
            { id: 'archived', label: 'Archived' },
          ].map(t=>(
            <TabsTrigger key={t.id} value={t.id} className="rounded-full px-5 py-2 text-[13px] font-[600] data-[state=active]:bg-foreground data-[state=active]:text-background">{t.label}</TabsTrigger>
          ))}
        </TabsList>

        {['upcoming','live','archived'].map(status=>(
          <TabsContent key={status} value={status} className="mt-6">
            <div className="grid md:grid-cols-2 gap-5">
              {qaSessions.filter(s=>s.status===status).map((session,i)=>(
                <motion.div key={session.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i*0.06 }}>
                  <Card className="rounded-[1.5rem] border-border/50 overflow-hidden group hover:border-foreground/10 hover:shadow-[0_8px_24px_hsl(var(--foreground)/0.06)] transition-all">
                    <div className="aspect-[16/10] relative overflow-hidden">
                      <img src={session.thumbnail} alt={session.title} className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                      {session.status==='live' && <Badge className="absolute top-3 left-3 rounded-full bg-red-500 text-white font-mono text-[10px] tracking-[0.1em] uppercase animate-pulse">LIVE • {session.questionsCount || 12} questions</Badge>}
                      {session.status==='upcoming' && <Badge className="absolute top-3 left-3 rounded-full bg-white/90 backdrop-blur text-black font-mono text-[10px] uppercase">Upcoming</Badge>}
                      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white">
                        <span className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-[0.05em]"><Calendar className="w-3 h-3" /> {new Date(session.date).toLocaleDateString()}</span>
                        {session.duration && <span className="px-2 py-1 rounded-full bg-black/50 backdrop-blur text-[11px] font-mono flex items-center gap-1"><Clock className="w-3 h-3" /> {session.duration}</span>}
                      </div>
                      <Link to={`/qa/${session.id}`} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/90 backdrop-blur flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-xl"><Play className="w-5 h-5 fill-black text-black ml-0.5" /></Link>
                    </div>
                    <CardContent className="p-5 space-y-3">
                      <h3 className="font-[700] tracking-[-0.01em] leading-[1.25] line-clamp-1">{session.title}</h3>
                      <div className="flex items-center gap-2 text-[12px] text-muted-foreground"><Avatar className="w-6 h-6"><AvatarImage src={session.speaker.avatar} /><AvatarFallback>{session.speaker.name[0]}</AvatarFallback></Avatar>{session.speaker.name}</div>
                      <div className="flex gap-2 pt-1">
                        {session.status==='live' && <Link to={`/qa/${session.id}`} className="flex-1"><Button className="w-full rounded-full bg-red-500 hover:bg-red-600 text-white font-[600] h-10">Join live now</Button></Link>}
                        {session.status==='upcoming' && <Button variant="outline" className={`flex-1 rounded-full h-10 font-[600] gap-1 ${reminders.includes(session.id) ? 'bg-foreground text-background' : ''}`} onClick={()=>toggleReminder(session.id)}><Bell className="w-4 h-4" /> {reminders.includes(session.id) ? 'Reminder set' : 'Set reminder'}</Button>}
                        {session.status==='archived' && <Link to={`/qa/${session.id}`} className="flex-1"><Button className="w-full rounded-full bg-foreground text-background font-[600] h-10 gap-1"><Play className="w-4 h-4" /> Watch replay</Button></Link>}
                        <Link to={`/qa/${session.id}`}><Button variant="outline" size="icon" className="rounded-full w-10 h-10"><ArrowRight className="w-4 h-4" /></Button></Link>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
            {qaSessions.filter(s=>s.status===status).length===0 && (
              <div className="py-20 text-center rounded-[1.5rem] border border-dashed border-border/60 bg-secondary/20">
                <div className="w-12 h-12 mx-auto rounded-full bg-secondary flex items-center justify-center mb-3"><Calendar className="w-6 h-6 text-muted-foreground" /></div>
                <p className="font-[600]">No {status} sessions</p>
                <p className="text-[13px] text-muted-foreground mt-1">Check other tabs — happy path always has content.</p>
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
