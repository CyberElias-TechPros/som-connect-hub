import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ChevronRight, BookOpen, Users, Play } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const slides = [
  { icon: BookOpen, title: 'Spiritual Growth', description: 'Access thousands of messages, teachings, and daily devotionals.' },
  { icon: Users, title: 'Community', description: 'Connect with believers worldwide through Q&A sessions and groups.' },
  { icon: Play, title: 'Premium Content', description: 'Stream exclusive content, download for offline, and more.' },
];

export default function Onboarding() {
  const [current, setCurrent] = useState(0);
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col p-6">
      <div className="flex-1 flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.div key={current} initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="text-center space-y-6 max-w-sm">
            <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              {React.createElement(slides[current].icon, { className: "w-12 h-12 text-primary" })}
            </div>
            <h2 className="text-2xl font-bold">{slides[current].title}</h2>
            <p className="text-muted-foreground">{slides[current].description}</p>
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="space-y-4">
        <div className="flex justify-center gap-2">
          {slides.map((_, i) => (
            <div key={i} className={`w-2 h-2 rounded-full transition-colors ${i === current ? 'bg-primary' : 'bg-muted'}`} />
          ))}
        </div>
        {current < slides.length - 1 ? (
          <div className="flex gap-4">
            <Button variant="ghost" onClick={() => navigate('/login')} className="flex-1">Skip</Button>
            <Button onClick={() => setCurrent(c => c + 1)} className="flex-1">Next <ChevronRight className="w-4 h-4 ml-1" /></Button>
          </div>
        ) : (
          <Button onClick={() => navigate('/register')} className="w-full">Get Started</Button>
        )}
      </div>
    </div>
  );
}
