import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, Library, BookOpen, Users, User, Search, Heart, List } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

const navItems = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/library', icon: Library, label: 'Library' },
  { to: '/tools', icon: BookOpen, label: 'Tools' },
  { to: '/community', icon: Users, label: 'Community' },
  { to: '/favorites', icon: Heart, label: 'Saved' },
  { to: '/profile', icon: User, label: 'You' },
];

export function BottomNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 safe-bottom">
      <div className="mx-auto max-w-[640px] p-3">
        <div className="flex items-center justify-around h-[64px] px-2 rounded-[1.5rem] bg-card/90 backdrop-blur-[24px] border border-border/50 shadow-[0_8px_32px_hsl(var(--foreground)/0.12),0_0_0_1px_hsl(var(--foreground)/0.04)]">
          {navItems.map(item => {
            const isActive = location.pathname === item.to || (item.to !== '/' && location.pathname.startsWith(item.to));
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={cn(
                  "relative flex flex-col items-center justify-center flex-1 h-full gap-1 rounded-[1rem] transition-colors",
                  isActive ? "text-foreground" : "text-muted-foreground"
                )}
                aria-current={isActive ? 'page' : undefined}
              >
                {isActive && (
                  <motion.div layoutId="bottomNavBg" className="absolute inset-1 rounded-[0.9rem] bg-secondary" transition={{ type: "spring", stiffness: 400, damping: 30 }} />
                )}
                <motion.div className="relative z-10" whileTap={{ scale: 0.9 }} transition={{ type: "spring", stiffness: 400, damping: 20 }}>
                  <item.icon className={cn("w-[20px] h-[20px] transition-transform", isActive && "scale-[1.05]")} />
                </motion.div>
                <span className={cn("relative z-10 text-[10px] font-[650] tracking-[-0.01em] leading-none", isActive ? "opacity-100" : "opacity-70")}>{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
export default BottomNav;
