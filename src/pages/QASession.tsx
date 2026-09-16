import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { ArrowLeft, ThumbsUp, Send, Play, Sparkles } from 'lucide-react';
import { qaSessions as mockSessions, sampleQuestions } from '@/lib/mock-data';
import { qaService } from '@/services/qa-service';
import { useApiData } from '@/hooks/use-api-data';
import { motion } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';

export default function QASession() {
  const { id } = useParams();
  const [live, setLive] = useState<{ participants: number; questions: number; realtime: boolean }>({ participants: 0, questions: 0, realtime: false });

  // Session detail + questions from the Worker, seeded with the demo set.
  const { data: detail, refresh } = useApiData(
    async () => {
      if (!id) return null;
      return qaService.getById(id);
    },
    null as Awaited<ReturnType<typeof qaService.getById>>,
    [id],
  );

  const session = detail?.session ?? (mockSessions.find(s=>s.id===id) || mockSessions[0]);
  const [questions, setQuestions] = useState(detail?.questions ?? sampleQuestions);
  const [newQ, setNewQ] = useState('');

  useEffect(() => {
    if (detail?.questions?.length) setQuestions(detail.questions as any);
  }, [detail]);

  // Join the live channel (Durable Object) and keep counters fresh.
  useEffect(() => {
    if (!session?.id) return;
    qaService.joinSession(session.id).then((result) => {
      if (typeof result?.participants === 'number') setLive(prev => ({ ...prev, participants: result.participants! }));
    }).catch(() => undefined);

    const stop = qaService.connectLive(session.id, {
      onEvent: (event, data) => {
        if (event === 'presence' && typeof data?.participants === 'number') {
          setLive(prev => ({ ...prev, participants: data.participants, realtime: true }));
        }
        if (event === 'question' && data?.text) {
          setQuestions(prev => [{ id: data.id, text: data.text, askedBy: data.askedBy, upvotes: 0, isAnswered: false } as any, ...prev]);
        }
      },
    });

    const poll = setInterval(() => {
      qaService.getLive(session.id).then(setLive).catch(() => undefined);
    }, 20000);

    return () => { stop(); clearInterval(poll); qaService.leaveSession(session.id).catch(() => undefined); };
  }, [session?.id]);
  const { toast } = useToast();

  const ask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQ.trim()) return;
    const text = newQ;
    setQuestions([{ id: `local-${Date.now()}`, text, askedBy: 'You', upvotes: 0, isAnswered: false }, ...questions]);
    setNewQ('');
    try {
      // POST /qa/:id/questions — broadcasts to the room (Durable Object).
      await qaService.askQuestion(session.id, text);
      refresh();
      toast({ title: 'Question submitted', description: 'Your question is now visible to the speaker.' });
    } catch (error: any) {
      toast({ title: 'Question saved', description: 'It will appear to the room once you are back online.' });
    }
  };

  const upvote = async (qid: string) => {
    setQuestions(qs => qs.map(q => q.id === qid ? { ...q, upvotes: q.upvotes + 1 } : q));
    await qaService.upvoteQuestion(session.id, qid).catch(() => undefined);
  };

  return (
    <div className="space-y-6 max-w-[900px] mx-auto">
      <Link to="/qa" className="inline-flex items-center gap-2 text-[13px] font-[600] text-muted-foreground hover:text-foreground"><ArrowLeft className="w-4 h-4" /> Back to Q&A</Link>

      <div className="relative overflow-hidden rounded-[2rem] bg-[#0A0E1A] min-h-[320px] flex items-end">
        <img src={session.thumbnail} alt={session.title} className="absolute inset-0 w-full h-full object-cover opacity-60" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#070A12] via-[#070A12]/50 to-transparent" />
        <div className="relative z-10 p-8 w-full">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur border border-white/10 text-white font-mono text-[10px] uppercase tracking-[0.1em]"><Sparkles className="w-3 h-3 text-amber-300" />{session.status}</div>
          <h1 className="mt-4 font-display text-[2rem] md:text-[2.8rem] leading-[0.9] tracking-[-0.03em] text-white text-balance">{session.title}</h1>
          <div className="mt-3 flex items-center gap-2 text-white/60 text-[13px]"><Avatar className="w-7 h-7 border border-white/10"><AvatarImage src={session.speaker.avatar} /><AvatarFallback>{session.speaker.name[0]}</AvatarFallback></Avatar>{session.speaker.name}</div>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1.5fr_1fr] gap-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between"><h2 className="font-display text-[1.4rem] tracking-[-0.02em]">Questions • {questions.length}</h2><span className="font-mono text-[11px] uppercase tracking-[0.1em] text-muted-foreground">Sorted by upvotes</span></div>

          <form onSubmit={ask} className="flex gap-2">
            <Input placeholder="Ask a question… anything, happy path" value={newQ} onChange={e=>setNewQ(e.target.value)} className="h-11 rounded-full bg-card border-border/60" />
            <Button type="submit" className="rounded-full h-11 px-6 bg-foreground text-background font-[600] gap-1"><Send className="w-4 h-4" /> Ask</Button>
          </form>

          <div className="space-y-3">
            {questions.map((q,i)=>(
              <motion.div key={q.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i*0.04 }}>
                <Card className="rounded-[1.25rem] border-border/50">
                  <CardContent className="p-5">
                    <div className="flex gap-3">
                      <button onClick={()=>upvote(q.id)} className="w-10 h-10 rounded-full bg-secondary border border-border/50 flex flex-col items-center justify-center gap-0.5 hover:bg-foreground hover:text-background transition-colors shrink-0"><ThumbsUp className="w-4 h-4" /><span className="text-[11px] font-[700]">{q.upvotes}</span></button>
                      <div className="flex-1">
                        <p className="font-[600] tracking-[-0.01em] text-[14px] leading-[1.4]">{q.text}</p>
                        <p className="text-[11px] font-mono uppercase tracking-[0.05em] text-muted-foreground mt-1">Asked by {q.askedBy} • {q.isAnswered ? 'Answered' : 'Pending'}</p>
                        {q.answer && <div className="mt-3 p-4 rounded-[1rem] bg-secondary/60 border border-border/50"><div className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground mb-1">Answer</div><p className="text-[13px] leading-[1.5]">{q.answer}</p></div>}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <Card className="rounded-[1.5rem] border-border/50 p-6">
            <h3 className="font-[700] tracking-[-0.01em]">About this session</h3>
            <p className="text-[13px] leading-[1.6] text-muted-foreground mt-2">Join live, ask questions, upvote others. Every question is welcome — happy path, no moderation blocking.</p>
            <div className="mt-4 flex gap-2"><Button className="flex-1 rounded-full bg-foreground text-background font-[600] gap-1"><Play className="w-4 h-4" /> {session.status==='live' ? 'Join live' : 'Watch replay'}</Button></div>
          </Card>
        </div>
      </div>
    </div>
  );
}
