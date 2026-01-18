import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ChevronRight, BookOpen, Users, Play, SkipForward } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import somLogo from '@/images/som-logo.png';

const slides = [
  { icon: BookOpen, title: 'Spiritual Growth', description: 'Access thousands of messages, teachings, and daily devotionals.' },
  { icon: Users, title: 'Community', description: 'Connect with believers worldwide through Q&A sessions and groups.' },
  { icon: Play, title: 'Premium Content', description: 'Stream exclusive content, download for offline, and more.' },
];

export default function Onboarding() {
  const [current, setCurrent] = useState(0);
  const [autoAdvance, setAutoAdvance] = useState(true);
  const navigate = useNavigate();

  // Auto-advance slides every 5 seconds
  useEffect(() => {
    if (autoAdvance && current < slides.length - 1) {
      const timer = setTimeout(() => {
        setCurrent(c => c + 1);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [current, autoAdvance]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight' && current < slides.length - 1) {
      setCurrent(c => c + 1);
    } else if (e.key === 'ArrowLeft' && current > 0) {
      setCurrent(c => c - 1);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col p-6" onKeyDown={handleKeyDown} tabIndex={0} role="region" aria-label="Onboarding slides">
      <div className="flex-1 flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
            className="text-center space-y-6 max-w-sm"
            role="article"
            aria-labelledby={`slide-${current}-title`}
          >
            <div className="w-28 h-28 rounded-full flex items-center justify-center mx-auto">
              {current === 0 ? (
                <img src={somLogo} alt="SOM Connect Logo" className="w-16 h-16 object-contain" />
              ) : (
                React.createElement(slides[current].icon, { className: "w-12 h-12 text-primary", role: "img", "aria-label": slides[current].title })
              )}
            </div>
            <h2 id={`slide-${current}-title`} className="text-2xl font-bold">{slides[current].title}</h2>
            <p className="text-muted-foreground text-lg">{slides[current].description}</p>
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="space-y-4">
        <div className="flex justify-center gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`w-2 h-2 rounded-full transition-colors ${i === current ? 'bg-primary' : 'bg-muted'}`}
              aria-label={`Go to slide ${i + 1}`}
              aria-current={i === current}
            />
          ))}
        </div>
        {current < slides.length - 1 ? (
          <div className="flex gap-4">
            <Button
              variant="ghost"
              onClick={() => navigate('/login')}
              className="flex-1"
              aria-label="Skip onboarding and go to login"
            >
              <SkipForward className="w-4 h-4 mr-1" /> Skip
            </Button>
            <Button
              onClick={() => setCurrent(c => c + 1)}
              className="flex-1"
              aria-label={`Go to next slide (${current + 2} of ${slides.length})`}
            >
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        ) : (
          <Button
            onClick={() => navigate('/register')}
            className="w-full"
            aria-label="Complete onboarding and create your account"
          >
            Get Started
          </Button>
        )}
      </div>
    </div>
  );
}
