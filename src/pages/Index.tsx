import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Search, Play, Clock, TrendingUp, BookOpen, Users, MessageCircle, Library, Calendar, ChevronRight, ArrowUpRight, Sparkles, Flame, Eye, ArrowRight } from 'lucide-react';
import { featuredContent, conferences, podcasts, originals, dailyConfessions, rorReadings, currentUser } from '@/lib/mock-data';
import { motion, useScroll, useTransform } from 'framer-motion';
import { contentService } from '@/services/content-service';
import { toolsService } from '@/services/tools-service';
import { useApiData } from '@/hooks/use-api-data';
import { useAuth } from '@/contexts/AuthContext';

export default function Index() {
  const [searchQuery, setSearchQuery] = useState('');
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "20%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.05]);

  // Live data from the Cloudflare Worker, with the mock library as the instant
  // placeholder so the page never renders empty.
  const { user: authUser } = useAuth();
  const { data: featured } = useApiData(
    () => contentService.featured(),
    {
      trending: [...conferences, ...podcasts, ...originals].sort((a, b) => b.views - a.views).slice(0, 6),
      latest: featuredContent.slice(0, 8),
      premium: featuredContent.filter(c => c.isPremium),
      continueWatching: featuredContent.filter(c => c.progress).slice(0, 3),
      rails: [
        { id: 'conference', title: 'Conferences', items: conferences },
        { id: 'podcast', title: 'Podcasts', items: podcasts },
        { id: 'original', title: 'Originals', items: originals },
      ],
    },
    [],
  );
  const { data: daily } = useApiData(
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

  const confession = daily.confession ?? dailyConfessions[0];
  const ror = daily.ror ?? rorReadings[0];
  const viewer = authUser ?? currentUser;
  const continueWatching = featured.continueWatching.length ? featured.continueWatching : featuredContent.filter(c => c.progress).slice(0, 3);
  const trendingContent = featured.trending.length ? featured.trending : [...conferences, ...podcasts, ...originals].sort((a, b) => b.views - a.views).slice(0, 6);
  const recommendations = (featured.rails.find(r => r.id === 'podcast')?.items ?? podcasts).slice(0, 3);

  return (
    <div className="space-y-12 md:space-y-16 pb-8">
      {/* HERO — Cinematic editorial */}
      <section ref={heroRef} className="relative overflow-hidden rounded-[2rem] md:rounded-[2.5rem] bg-[#0A0E1A] min-h-[88vh] md:min-h-[84vh] flex flex-col">
        <motion.div style={{ y, scale }} className="absolute inset-0">
          <img src="https://images.unsplash.com/photo-1507692049790-de58290a4334?w=1600&h=1200&fit=crop" alt="" className="w-full h-full object-cover opacity-60" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#070A12] via-[#070A12]/70 to-[#070A12]/20" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#070A12]/90 via-[#070A12]/40 to-transparent" />
          <div className="absolute inset-0 opacity-[0.04] mix-blend-soft-light" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")` }} />
          {/* Gold glow */}
          <div className="absolute top-1/2 left-1/3 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[120px] bg-[radial-gradient(circle,hsl(42_87%_60%/_0.15)_0%,transparent_70%)]" />
        </motion.div>

        <motion.div style={{ opacity }} className="relative z-10 flex flex-col flex-1 p-6 md:p-10 lg:p-14">
          {/* Top meta */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur border border-white/10">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-mono text-[10px] tracking-[0.15em] uppercase text-white/70">Live • {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
              </div>
              <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 backdrop-blur border border-white/5">
                <Flame className="w-3 h-3 text-amber-300" />
                <span className="font-mono text-[10px] tracking-[0.1em] uppercase text-white/50">{daily.streak || viewer.streak} day streak</span>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-2 font-mono text-[10px] tracking-[0.15em] uppercase text-white/30">
              <span>EST 2024</span>
              <span className="w-8 h-px bg-white/10" />
              <span>SOM CONNECT</span>
            </div>
          </div>

          {/* Main hero content */}
          <div className="flex-1 flex flex-col justify-end mt-16 md:mt-0">
            <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }} className="space-y-6 max-w-[80ch]">
              <div className="inline-flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span className="font-mono text-[11px] tracking-[0.2em] uppercase text-white/50">School of Ministry • Premium Streaming</span>
              </div>

              <h1 className="font-display text-[2.8rem] md:text-[4.5rem] lg:text-[5.5rem] leading-[0.85] tracking-[-0.04em] text-white text-balance">
                Grow in
                <br />
                <span className="italic font-[300] text-white/60">the Word.</span>
                <br />
                Live the
                <br />
                <span className="relative inline-block">
                  <span className="relative z-10">Word.</span>
                  <motion.span initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 1, duration: 0.8, ease: [0.16, 1, 0.3, 1] }} className="absolute bottom-[0.15em] left-0 right-0 h-[0.15em] bg-amber-300 origin-left" />
                </span>
              </h1>

              <p className="text-[16px] md:text-[18px] leading-[1.5] text-white/60 max-w-[48ch] text-balance">
                Cinematic teachings, daily confessions, Rhapsody of Realities, and a global community — crafted for depth, not just content.
              </p>

              <div className="flex flex-wrap gap-3 pt-2">
                <Link to="/library">
                  <Button className="h-12 px-7 rounded-full bg-white text-black hover:bg-white/90 font-[650] tracking-[-0.01em] gap-2 group shadow-[0_8px_32px_hsl(0_0%_100%/_0.15)]">
                    <Play className="w-4 h-4 fill-black" /> Start watching <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </Button>
                </Link>
                <Link to="/tools">
                  <Button variant="outline" className="h-12 px-7 rounded-full bg-white/10 backdrop-blur border-white/15 text-white hover:bg-white/15 hover:text-white font-[600] tracking-[-0.01em] gap-2">
                    Daily tools <ChevronRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </motion.div>

            {/* Bottom bar */}
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.6, duration: 0.6 }} className="mt-12 grid grid-cols-3 md:flex md:items-center gap-6 md:gap-12 pt-8 border-t border-white/10">
              {[
                { k: '12K+', label: 'Teachings', sub: 'Curated library' },
                { k: '4.9', label: 'Rating', sub: 'From 2k reviews' },
                { k: '120+', label: 'Countries', sub: 'Global family' },
              ].map(item => (
                <div key={item.k} className="space-y-1">
                  <div className="font-display text-[1.6rem] md:text-[2rem] leading-none text-white">{item.k}</div>
                  <div className="font-[600] text-[12px] tracking-[-0.01em] text-white/80">{item.label}</div>
                  <div className="font-mono text-[10px] tracking-[0.05em] uppercase text-white/40">{item.sub}</div>
                </div>
              ))}
              <div className="hidden md:flex ml-auto items-center gap-3">
                <div className="flex -space-x-2">
                  {[1, 2, 3].map(i => (
                    <img key={i} src={`https://i.pravatar.cc/100?img=${10 + i}`} alt="" className="w-8 h-8 rounded-full border-2 border-[#070A12]" />
                  ))}
                </div>
                <div className="text-[12px] leading-[1.2] text-white/60">
                  <div className="font-[600] text-white">2,400+ online now</div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.05em]">Join the stream</div>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* Search floating */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.8, duration: 0.6 }} className="absolute bottom-6 right-6 md:bottom-8 md:right-8 hidden lg:flex">
          <div className="flex items-center gap-3 px-5 h-12 rounded-full bg-white/10 backdrop-blur-2xl border border-white/10 shadow-[0_8px_32px_hsl(0_0%_0%/_0.3)]">
            <Search className="w-4 h-4 text-white/50" />
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search teachings, speakers..." className="bg-transparent outline-none text-[13px] text-white placeholder:text-white/40 w-[220px]" />
            <div className="w-px h-4 bg-white/10" />
            <Link to={`/search?q=${encodeURIComponent(searchQuery)}`} className="w-7 h-7 rounded-full bg-white flex items-center justify-center hover:scale-105 transition-transform">
              <ArrowRight className="w-3.5 h-3.5 text-black" />
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Continue Watching — premium progress cards */}
      {continueWatching.length > 0 && (
        <section className="space-y-5">
          <div className="flex items-end justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-1 h-4 bg-foreground rounded-full" />
                <span className="font-mono text-[11px] tracking-[0.15em] uppercase text-muted-foreground">Pick up where you left</span>
              </div>
              <h2 className="font-display text-[1.8rem] md:text-[2.2rem] leading-[0.9] tracking-[-0.02em]">Continue watching</h2>
            </div>
            <Link to="/library" className="hidden md:flex items-center gap-1.5 font-[600] text-[13px] tracking-[-0.01em] hover:gap-2 transition-all">View all <ChevronRight className="w-4 h-4" /></Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {continueWatching.map((content, i) => (
              <motion.div key={content.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }} className="group relative overflow-hidden rounded-[1.5rem] bg-card border border-border/50">
                <Link to={`/player/${content.id}`} className="block">
                  <div className="aspect-[16/10] relative overflow-hidden">
                    <img src={content.thumbnail} alt={content.title} className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-[1.2s] ease-[cubic-bezier(0.16,1,0.3,1)]" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
                    <div className="absolute top-3 left-3 flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-full bg-white/90 backdrop-blur text-[10px] font-mono tracking-[0.1em] uppercase font-[700] text-black">Continue</span>
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                      <div className="w-14 h-14 rounded-full bg-white/90 backdrop-blur flex items-center justify-center shadow-xl">
                        <Play className="w-6 h-6 fill-black text-black ml-0.5" />
                      </div>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 p-1">
                      <Progress value={content.progress} className="h-1 bg-white/20 [&>div]:bg-white" />
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-[650] tracking-[-0.01em] leading-[1.2] line-clamp-1">{content.title}</h3>
                    <div className="mt-1.5 flex items-center gap-2 text-[12px] text-muted-foreground">
                      <Avatar className="w-5 h-5"><AvatarImage src={content.speaker.avatar} /><AvatarFallback>{content.speaker.name[0]}</AvatarFallback></Avatar>
                      <span>{content.speaker.name}</span>
                      <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
                      <span>{content.progress}% watched</span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* Daily Tools — editorial split */}
      <section className="grid md:grid-cols-2 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="group relative overflow-hidden rounded-[1.75rem] bg-[#0A0E1A] p-7 md:p-8 min-h-[320px] flex flex-col">
          <div className="absolute inset-0">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-transparent to-transparent" />
            <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full blur-[60px] bg-amber-500/15" />
          </div>
          <div className="relative z-10 flex-1 flex flex-col">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur border border-white/10 flex items-center justify-center"><BookOpen className="w-5 h-5 text-white" /></div>
                <div>
                  <div className="font-mono text-[10px] tracking-[0.15em] uppercase text-white/40">Today • {confession.date}</div>
                  <div className="font-[650] text-[13px] tracking-[-0.01em] text-white">Daily Confession</div>
                </div>
              </div>
              <Badge className="rounded-full bg-white/10 backdrop-blur border-white/10 text-white hover:bg-white/15 font-mono text-[10px] tracking-[0.1em] uppercase">Audio • 3 min</Badge>
            </div>
            <div className="mt-8 flex-1">
              <h3 className="font-display text-[1.8rem] leading-[0.95] tracking-[-0.02em] text-white text-balance">{confession.title}</h3>
              <p className="mt-3 text-[14px] leading-[1.6] text-white/60 line-clamp-3">{confession.content}</p>
              <blockquote className="mt-4 border-l-2 border-amber-300/30 pl-4 italic text-[13px] text-white/50">"{confession.scripture}" — {confession.scriptureRef}</blockquote>
            </div>
            <Link to="/tools" className="mt-6 inline-flex">
              <Button className="rounded-full bg-white text-black hover:bg-white/90 font-[650] gap-2 h-10 px-5">Read & listen <ArrowRight className="w-4 h-4" /></Button>
            </Link>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.1 }} className="group relative overflow-hidden rounded-[1.75rem] bg-card border border-border/50 p-7 md:p-8 min-h-[320px] flex flex-col">
          <div className="absolute inset-0 bg-mesh opacity-40" />
          <div className="relative z-10 flex-1 flex flex-col">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-full bg-secondary border border-border/50 flex items-center justify-center"><Calendar className="w-5 h-5" /></div>
                <div>
                  <div className="font-mono text-[10px] tracking-[0.15em] uppercase text-muted-foreground">Today • {ror.date}</div>
                  <div className="font-[650] text-[13px] tracking-[-0.01em]">Rhapsody of Realities</div>
                </div>
              </div>
              <Badge variant="secondary" className="rounded-full font-mono text-[10px] tracking-[0.1em] uppercase">{ror.theme}</Badge>
            </div>
            <div className="mt-8 flex-1">
              <h3 className="font-display text-[1.8rem] leading-[0.95] tracking-[-0.02em] text-balance">{ror.title}</h3>
              <p className="mt-2 font-mono text-[11px] tracking-[0.05em] uppercase text-muted-foreground">{ror.scriptureRef}</p>
              <p className="mt-3 text-[14px] leading-[1.6] text-muted-foreground line-clamp-3">{ror.content}</p>
            </div>
            <div className="mt-6 flex gap-2">
              <Link to="/tools"><Button className="rounded-full bg-foreground text-background hover:bg-foreground/90 font-[650] gap-2 h-10 px-5">Open study <ArrowRight className="w-4 h-4" /></Button></Link>
              <Link to="/tools/ror-plan"><Button variant="outline" className="rounded-full h-10 px-5 font-[600]">Reading plan</Button></Link>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Trending — bento */}
      <section className="space-y-5">
        <div className="flex items-end justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4" />
              <span className="font-mono text-[11px] tracking-[0.15em] uppercase text-muted-foreground">Most watched this week</span>
            </div>
            <h2 className="font-display text-[1.8rem] md:text-[2.2rem] leading-[0.9] tracking-[-0.02em]">Trending now</h2>
          </div>
          <Link to="/library" className="hidden md:flex items-center gap-1.5 font-[600] text-[13px] tracking-[-0.01em] hover:gap-2 transition-all">Explore library <ArrowRight className="w-4 h-4" /></Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 auto-rows-[280px]">
          {trendingContent.slice(0, 5).map((content, i) => {
            const span = i === 0 ? 'md:col-span-7' : i === 1 ? 'md:col-span-5' : 'md:col-span-4';
            return (
              <motion.div key={content.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.07, duration: 0.6 }} className={`${span} group relative overflow-hidden rounded-[1.5rem] bg-card border border-border/50`}>
                <Link to={`/library/${content.id}`} className="block w-full h-full">
                  <div className="absolute inset-0">
                    <img src={content.thumbnail} alt={content.title} className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-[1.2s] ease-[cubic-bezier(0.16,1,0.3,1)]" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  </div>
                  <div className="absolute top-4 left-4 flex gap-2">
                    <span className="px-2.5 py-1 rounded-full bg-white/90 backdrop-blur text-[10px] font-mono tracking-[0.1em] uppercase font-[700] text-black">{content.category}</span>
                    {content.isPremium && <span className="px-2.5 py-1 rounded-full bg-amber-300 text-[10px] font-mono tracking-[0.1em] uppercase font-[700] text-black">Premium</span>}
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-5">
                    <h3 className="font-display text-[1.3rem] leading-[0.95] tracking-[-0.02em] text-white line-clamp-2 text-balance">{content.title}</h3>
                    <div className="mt-2 flex items-center gap-2 text-[12px] text-white/60">
                      <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {content.views.toLocaleString()}</span>
                      <span className="w-1 h-1 rounded-full bg-white/30" />
                      <span>{content.speaker.name}</span>
                    </div>
                  </div>
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/90 backdrop-blur flex items-center justify-center opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100 transition-all duration-500 shadow-xl">
                    <Play className="w-5 h-5 fill-black text-black ml-0.5" />
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Recommendations — personalized */}
      <section className="space-y-5">
        <div className="flex items-end justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-full bg-foreground text-background flex items-center justify-center text-[10px] font-[800]">{viewer.name[0]}</div>
              <span className="font-mono text-[11px] tracking-[0.15em] uppercase text-muted-foreground">For you • {viewer.name.split(' ')[0]}</span>
            </div>
            <h2 className="font-display text-[1.8rem] md:text-[2.2rem] leading-[0.9] tracking-[-0.02em]">Recommended</h2>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {recommendations.map((content, i) => (
            <motion.div key={content.id} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }} className="group rounded-[1.5rem] border border-border/50 bg-card overflow-hidden hover:shadow-[0_8px_32px_hsl(var(--foreground)/0.08)] transition-shadow duration-500">
              <Link to={`/library/${content.id}`} className="block">
                <div className="aspect-[16/10] overflow-hidden relative">
                  <img src={content.thumbnail} alt={content.title} className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700" />
                  <div className="absolute top-3 right-3 px-2 py-1 rounded-full bg-black/60 backdrop-blur text-white text-[11px] font-mono flex items-center gap-1"><Clock className="w-3 h-3" />{content.duration}</div>
                </div>
                <div className="p-5">
                  <h3 className="font-[650] tracking-[-0.01em] leading-[1.25] line-clamp-2">{content.title}</h3>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
                      <Avatar className="w-6 h-6"><AvatarImage src={content.speaker.avatar} /><AvatarFallback>{content.speaker.name[0]}</AvatarFallback></Avatar>
                      <span>{content.speaker.name}</span>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-secondary group-hover:bg-foreground group-hover:text-background flex items-center justify-center transition-colors">
                      <ArrowUpRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Quick Access — editorial */}
      <section className="rounded-[2rem] bg-secondary/40 border border-border/50 p-6 md:p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-[1.5rem] leading-[0.9] tracking-[-0.02em]">Quick access</h2>
          <span className="font-mono text-[10px] tracking-[0.15em] uppercase text-muted-foreground">Navigate faster</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { title: 'Library', desc: 'All teachings', icon: Library, href: '/library', count: '12K+' },
            { title: 'Q&A', desc: 'Live sessions', icon: MessageCircle, href: '/qa', count: 'Live' },
            { title: 'Community', desc: 'Global family', icon: Users, href: '/community', count: '3.1K' },
            { title: 'Publications', desc: 'Magazines', icon: BookOpen, href: '/publications', count: 'New' },
          ].map((card, i) => (
            <motion.div key={card.title} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}>
              <Link to={card.href} className="group block rounded-[1.25rem] bg-card border border-border/50 p-5 hover:border-foreground/15 hover:shadow-[0_8px_24px_hsl(var(--foreground)/0.06)] transition-all duration-300">
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-[0.8rem] bg-secondary group-hover:bg-foreground group-hover:text-background flex items-center justify-center transition-colors">
                    <card.icon className="w-5 h-5" />
                  </div>
                  <span className="px-2 py-1 rounded-full bg-secondary text-[10px] font-mono tracking-[0.05em] uppercase">{card.count}</span>
                </div>
                <div className="mt-4">
                  <div className="font-[650] tracking-[-0.01em]">{card.title}</div>
                  <div className="text-[12px] text-muted-foreground">{card.desc}</div>
                </div>
                <div className="mt-3 flex items-center gap-1 text-[12px] font-[600] tracking-[-0.01em] opacity-60 group-hover:opacity-100 group-hover:gap-1.5 transition-all">Open <ArrowRight className="w-3 h-3" /></div>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}
