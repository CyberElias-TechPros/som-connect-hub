import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, Library, BookOpen, Users, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

const navItems = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/library', icon: Library, label: 'Library' },
  { to: '/tools', icon: BookOpen, label: 'Tools' },
  { to: '/community', icon: Users, label: 'Community' },
  { to: '/qa', icon: Users, label: 'Q&A' },
  { to: '/profile', icon: User, label: 'Profile' },
];

export function BottomNav() {
  const location = useLocation();

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg border-t border-border safe-bottom"
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.to || 
            (item.to !== '/' && location.pathname.startsWith(item.to));

          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full relative",
                "transition-colors duration-200",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
              aria-current={isActive ? 'page' : undefined}
            >
              <div className="relative">
                <item.icon 
                  className={cn(
                    "w-5 h-5 transition-transform duration-200",
                    isActive && "scale-110"
                  )} 
                />
                {isActive && (
                  <motion.div
                    layoutId="bottomNavIndicator"
                    className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-accent"
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
              </div>
              <span className={cn(
                "text-xs mt-1 font-medium transition-all duration-200",
                isActive ? "opacity-100" : "opacity-70"
              )}>
                {item.label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
