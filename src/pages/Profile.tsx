import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Settings, CreditCard, Upload, ChevronRight, Flame, Calendar, Bell, Shield, BookOpen, LogOut, Sparkles, ArrowUpRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';

export default function Profile() {
  const { user, logout, hasRole } = useAuth();
  if (!user) return null;

  const roleColors: Record<string, string> = {
    guest: 'bg-muted text-muted-foreground',
    member: 'bg-foreground text-background',
    pastor: 'bg-amber-300 text-black',
    admin: 'bg-destructive text-destructive-foreground'
  };

  const items = [
    { to: '/subscription', icon: CreditCard, label: 'Subscription', desc: 'Plans & billing', badge: user.role },
    { to: '/manage-subscription', icon: CreditCard, label: 'Manage subscription', desc: 'Upgrade, cancel' },
    { to: '/settings', icon: Settings, label: 'Settings', desc: 'Preferences & privacy' },
    { to: '/notifications', icon: Bell, label: 'Notifications', desc: 'Stay updated' },
    { to: '/help', icon: BookOpen, label: 'Help & Support', desc: 'FAQs & contact' },
  ];

  if (hasRole(['pastor','admin'])) items.unshift({ to: '/upload', icon: Upload, label: 'Upload content', desc: 'Share teachings', badge: undefined } as any);
  if (hasRole(['admin'])) items.push({ to: '/admin', icon: Shield, label: 'Admin dashboard', desc: 'Manage platform' } as any);

  return (
    <div className="space-y-8 max-w-[900px] mx-auto">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-[2rem] bg-foreground text-background p-8 md:p-10">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-amber-400/20 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-white/5 to-transparent rounded-full blur-2xl" />
        <div className="relative flex flex-col md:flex-row gap-8 items-start">
          <div className="relative">
            <Avatar className="w-28 h-28 border-4 border-white/10 shadow-xl"><AvatarImage src={user.avatar} /><AvatarFallback className="text-2xl bg-white text-black">{user.name.split(' ').map(n=>n[0]).join('')}</AvatarFallback></Avatar>
            <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-amber-300 border-4 border-[#0A0E1A] flex items-center justify-center"><Flame className="w-4 h-4 text-black" /></div>
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-display text-[2rem] leading-[0.9] tracking-[-0.02em]">{user.name}</h1>
              <Badge className={`rounded-full font-mono text-[10px] tracking-[0.1em] uppercase px-2.5 py-1 ${roleColors[user.role]}`}>{user.role}</Badge>
              <span className="px-2.5 py-1 rounded-full bg-white/10 backdrop-blur border border-white/10 font-mono text-[10px] tracking-[0.1em] uppercase">Pro member</span>
            </div>
            <p className="mt-2 text-background/60 text-[14px]">{user.email} • {user.affiliation || 'SOM Community'}</p>
            {user.bio && <p className="mt-3 text-background/70 text-[14px] leading-[1.5] max-w-[50ch]">{user.bio}</p>}
            <div className="mt-6 flex flex-wrap gap-6">
              <div className="flex items-center gap-2.5"><div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur flex items-center justify-center"><Flame className="w-5 h-5 text-amber-300" /></div><div><div className="font-display text-[1.4rem] leading-none">{user.streak}</div><div className="font-mono text-[10px] uppercase tracking-[0.1em] opacity-60">Day streak</div></div></div>
              <div className="flex items-center gap-2.5"><div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur flex items-center justify-center"><Calendar className="w-5 h-5" /></div><div><div className="font-display text-[1.4rem] leading-none">{new Date(user.joinedDate).getFullYear()}</div><div className="font-mono text-[10px] uppercase tracking-[0.1em] opacity-60">Joined</div></div></div>
            </div>
          </div>
          <div className="flex gap-2">
            <Link to="/profile/edit"><Button className="rounded-full bg-white text-black hover:bg-white/90 font-[600] h-10 px-5">Edit profile</Button></Link>
          </div>
        </div>
      </motion.div>

      <div className="grid md:grid-cols-2 gap-3">
        {items.map((item,i)=>(
          <motion.div key={item.to} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i*0.04 }}>
            <Link to={item.to} className="group flex items-center gap-4 p-5 rounded-[1.25rem] border border-border/50 bg-card hover:border-foreground/10 hover:shadow-[0_8px_24px_hsl(var(--foreground)/0.06)] transition-all">
              <div className="w-11 h-11 rounded-[0.9rem] bg-secondary group-hover:bg-foreground group-hover:text-background border border-border/50 flex items-center justify-center transition-colors"><item.icon className="w-5 h-5" /></div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2"><span className="font-[600] tracking-[-0.01em] text-[14px]">{item.label}</span>{(item as any).badge && <span className="px-1.5 py-0.5 rounded-full bg-secondary text-[10px] font-mono uppercase">{(item as any).badge}</span>}</div>
                <div className="text-[12px] text-muted-foreground">{item.desc}</div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </motion.div>
        ))}
      </div>

      <div className="rounded-[1.5rem] bg-amber-500/10 border border-amber-500/20 p-5 flex gap-4">
        <div className="w-10 h-10 rounded-full bg-amber-500/15 flex items-center justify-center shrink-0"><Sparkles className="w-5 h-5 text-amber-600" /></div>
        <div className="flex-1">
          <h3 className="font-[650] tracking-[-0.01em] text-[14px]">Premium features unlocked</h3>
          <p className="text-[13px] leading-[1.5] text-muted-foreground mt-1">Offline downloads, HD streaming, early access, and exclusive teachings. You're experiencing the full product — happy path enabled for all flows.</p>
          <Link to="/subscription" className="mt-3 inline-flex items-center gap-1 text-[13px] font-[600] hover:gap-1.5 transition-all">Manage subscription <ArrowUpRight className="w-3.5 h-3.5" /></Link>
        </div>
      </div>

      <Button variant="outline" className="w-full rounded-full h-12 font-[600] gap-2 border-destructive/20 text-destructive hover:bg-destructive hover:text-destructive-foreground" onClick={logout}><LogOut className="w-4 h-4" /> Sign out</Button>
    </div>
  );
}
