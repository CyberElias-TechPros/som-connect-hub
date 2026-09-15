import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ChevronRight, BookOpen, Users, Play, Sparkles, ArrowRight, SkipForward } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import somLogo from '@/images/som-logo.png';

const slides = [
  {
    id: 'growth',
    icon: BookOpen,
    label: '01 / 03',
    kicker: 'Spiritual Growth',
    title: 'Depth, not just content.',
    description: 'Thousands of curated teachings, devotionals, and ministry resources — designed to transform, not just inform.',
    image: 'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?w=1200&h=800&fit=crop',
    accent: 'from-amber-200 to-yellow-600',
  },
  {
    id: 'community',
    icon: Users,
    label: '02 / 03',
    kicker: 'Global Community',
    title: 'You were never meant to walk alone.',
    description: 'Connect with believers worldwide. Join live Q&A, small groups, and ministry cohorts that feel like family.',
    image: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=1200&h=800&fit=crop',
    accent: 'from-blue-200 to-indigo-600',
  },
  {
    id: 'premium',
    icon: Play,
    label: '03 / 03',
    kicker: 'Premium Experience',
    title: 'Cinema-grade spiritual streaming.',
    description: 'Offline downloads, HD streaming, early access, and an experience crafted like a world-class product.',
    image: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1200&h=800&fit=crop',
    accent: 'from-emerald-200 to-teal-600',
  },
];

export default function Onboarding() {
  const [current, setCurrent] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      if (current < slides.length - 1) setCurrent(c => c + 1);
    }, 6000);
    return () => clearTimeout(timer);
  }, [current]);

  const handleComplete = () => {
    localStorage.setItem('som_seen_onboarding', '1');
    navigate('/register');
  };

  const handleSkip = () => {
    localStorage.setItem('som_seen_onboarding', '1');
    navigate('/login');
  };

  const slide = slides[current];

  return (
    <div className="min-h-screen bg-[#FAF8F5] dark:bg-[#070A12] flex flex-col lg:flex-row overflow-hidden">
      {/* Left — Visual */}
      <div className="relative lg:w-[58%] h-[52vh] lg:h-screen overflow-hidden bg-[#0A0E1A]">
        <AnimatePresence mode="wait">
          <motion.div
            key={slide.id}
            initial={{ scale: 1.1, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.98, opacity: 0 }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-0"
          >
            <img src={slide.image} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#070A12] via-[#070A12]/60 to-[#070A12]/10" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#070A12]/80 via-transparent to-transparent lg:from-[#070A12]/60" />
            {/* Grain */}
            <div className="absolute inset-0 opacity-[0.03] mix-blend-soft-light"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`
              }}
            />
          </motion.div>
        </AnimatePresence>

        {/* Top bar */}
        <div className="relative z-10 flex items-center justify-between p-6 lg:p-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-xl border border-white/10 flex items-center justify-center">
              <img src={somLogo} alt="SOM" className="w-6 h-6" />
            </div>
            <span className="font-display text-white text-[1.1rem] tracking-[-0.02em]">SOM CONNECT</span>
          </div>
          <button onClick={handleSkip} className="font-mono text-[11px] tracking-[0.15em] uppercase text-white/60 hover:text-white transition-colors flex items-center gap-2 group">
            Skip <SkipForward className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>

        {/* Slide content overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-6 lg:p-12 z-10">
          <motion.div
            key={`label-${current}`}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="flex items-center gap-3 mb-6"
          >
            <div className="w-12 h-px bg-white/20" />
            <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-white/50">{slide.label}</span>
            <span className="font-mono text-[10px] tracking-[0.15em] uppercase px-2.5 py-1 rounded-full bg-white/10 backdrop-blur text-white/70 border border-white/10">
              {slide.kicker}
            </span>
          </motion.div>

          <AnimatePresence mode="wait">
            <motion.div
              key={`content-${current}`}
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            >
              <h1 className="font-display text-[2.2rem] lg:text-[3.5rem] leading-[0.9] tracking-[-0.04em] text-white text-balance max-w-[20ch]">
                {slide.title}
              </h1>
              <p className="mt-4 text-[15px] leading-[1.6] text-white/60 max-w-[44ch] text-balance">
                {slide.description}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Progress bar */}
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/10 z-20">
          <motion.div
            key={current}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 6, ease: 'linear' }}
            className="h-full bg-white origin-left"
          />
        </div>
      </div>

      {/* Right — Controls */}
      <div className="flex-1 flex flex-col p-6 lg:p-12 bg-[#FAF8F5] dark:bg-[#0A0E1A] relative">
        {/* Ambient */}
        <div className="absolute inset-0 bg-mesh opacity-40 pointer-events-none" />

        <div className="relative z-10 flex-1 flex flex-col">
          <div className="hidden lg:flex items-center gap-2 mb-auto">
            <Sparkles className="w-4 h-4 text-accent" />
            <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground">A premium spiritual experience</span>
          </div>

          <div className="space-y-8 mt-8 lg:mt-0">
            <div className="space-y-6">
              <div className="flex gap-2">
                {slides.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrent(i)}
                    className="group relative h-1 flex-1 overflow-hidden rounded-full bg-border"
                    aria-label={`Go to slide ${i + 1}`}
                  >
                    <motion.div
                      initial={false}
                      animate={{ scaleX: i === current ? 1 : i < current ? 1 : 0 }}
                      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                      className={`absolute inset-0 origin-left rounded-full ${i <= current ? 'bg-foreground' : 'bg-foreground/0'}`}
                    />
                  </button>
                ))}
              </div>

              <div className="grid gap-3">
                {slides.map((s, i) => {
                  const active = i === current;
                  return (
                    <button
                      key={s.id}
                      onClick={() => setCurrent(i)}
                      className={`text-left group relative overflow-hidden rounded-[1.25rem] border p-5 transition-all duration-500 ${
                        active ? 'bg-foreground text-background border-foreground shadow-xl' : 'bg-card border-border hover:border-foreground/20 hover:shadow-md'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex gap-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${active ? 'bg-white/10' : 'bg-secondary'}`}>
                            <s.icon className={`w-5 h-5 ${active ? 'text-white' : 'text-foreground'}`} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className={`font-mono text-[10px] tracking-[0.15em] uppercase ${active ? 'text-white/50' : 'text-muted-foreground'}`}>{s.label}</span>
                              <span className={`font-mono text-[10px] tracking-[0.15em] uppercase ${active ? 'text-white/70' : 'text-muted-foreground/0 group-hover:text-muted-foreground/60 transition-colors'}`}>— {s.kicker}</span>
                            </div>
                            <h3 className={`mt-1 font-display text-[1.25rem] leading-[0.95] tracking-[-0.02em] ${active ? 'text-white' : 'text-foreground'}`}>{s.title}</h3>
                          </div>
                        </div>
                        <div className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all ${active ? 'bg-white text-black border-white rotate-45' : 'border-border group-hover:border-foreground/20 group-hover:rotate-45'}`}>
                          <ArrowRight className="w-4 h-4" />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              {current < slides.length - 1 ? (
                <>
                  <Button variant="outline" onClick={handleSkip} className="flex-1 h-14 rounded-full font-[600] tracking-[-0.01em]">Skip</Button>
                  <Button onClick={() => setCurrent(c => c + 1)} className="flex-[1.6] h-14 rounded-full bg-foreground text-background hover:bg-foreground/90 font-[600] tracking-[-0.01em] gap-2 group">
                    Continue <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </Button>
                </>
              ) : (
                <Button onClick={handleComplete} className="w-full h-14 rounded-full bg-foreground text-background hover:bg-foreground/90 font-[600] tracking-[-0.01em] gap-2 text-[15px] group shadow-[0_8px_32px_hsl(var(--foreground)/0.15)]">
                  Enter SOM CONNECT <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </Button>
              )}
            </div>

            <p className="text-center font-mono text-[10px] tracking-[0.12em] uppercase text-muted-foreground/60">
              No credit card • 2 min setup • Cancel anytime
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
