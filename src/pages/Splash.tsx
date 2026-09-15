import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import somLogo from '@/images/som-logo.png';

export default function Splash() {
  const navigate = useNavigate();

  useEffect(() => {
    const t = setTimeout(() => {
      const hasSeenOnboarding = localStorage.getItem('som_seen_onboarding');
      if (hasSeenOnboarding) {
        navigate('/login');
      } else {
        navigate('/onboarding');
      }
    }, 2200);
    return () => clearTimeout(t);
  }, [navigate]);

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#070A12] flex items-center justify-center">
      {/* Ambient */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0E1424] via-[#070A12] to-[#070A12]" />
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.5 }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full blur-[120px]"
          style={{
            background: 'radial-gradient(circle, hsl(42 87% 60% / 0.15) 0%, hsl(222 47% 11% / 0.1) 40%, transparent 70%)'
          }}
        />
        {/* Grain */}
        <div className="absolute inset-0 opacity-[0.04] mix-blend-soft-light"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`
          }}
        />
      </div>

      <div className="relative z-10 flex flex-col items-center">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className="relative"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
            className="absolute -inset-8 rounded-full border border-white/[0.06] border-dashed"
          />
          <div className="w-28 h-28 rounded-[1.75rem] bg-white/[0.06] backdrop-blur-2xl border border-white/[0.08] flex items-center justify-center shadow-[0_0_80px_hsl(42_87%_60%_/_0.15),inset_0_1px_0_hsl(0_0%_100%_/_0.1)]">
            <img src={somLogo} alt="SOM" className="w-14 h-14 object-contain" />
          </div>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.6, type: 'spring', stiffness: 300, damping: 20 }}
            className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-[#EAB308] shadow-[0_0_20px_hsl(42_87%_60%_/_0.8)]"
          />
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="mt-10 text-center space-y-3"
        >
          <h1 className="font-display text-[2.5rem] tracking-[-0.04em] leading-[0.9] text-white">
            SOM <span className="font-[300] italic text-white/60">CONNECT</span>
          </h1>
          <div className="flex items-center justify-center gap-3">
            <div className="h-px w-8 bg-gradient-to-r from-transparent to-white/20" />
            <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-white/40">
              School of Ministry • Est. 2024
            </p>
            <div className="h-px w-8 bg-gradient-to-l from-transparent to-white/20" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="mt-16 flex flex-col items-center gap-4"
        >
          <div className="w-32 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          <div className="flex gap-1">
            {[0, 1, 2].map(i => (
              <motion.div
                key={i}
                initial={{ scaleY: 0.3 }}
                animate={{ scaleY: [0.3, 1, 0.3] }}
                transition={{ duration: 1, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' }}
                className="w-0.5 h-4 bg-white/30 rounded-full origin-center"
              />
            ))}
          </div>
          <p className="font-mono text-[9px] tracking-[0.15em] uppercase text-white/20">Loading experience</p>
        </motion.div>
      </div>

      {/* Bottom editorial */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2"
      >
        <span className="font-mono text-[9px] tracking-[0.2em] uppercase text-white/20">Crafted for spiritual growth</span>
      </motion.div>
    </div>
  );
}
