import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bell, CheckCheck, Trash2, Play, MessageCircle, Users, Sparkles } from 'lucide-react';
import { useNotificationContext } from '@/contexts/NotificationContext';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

export default function Notifications() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification, clearAll } = useNotificationContext();

  return (
    <div className="space-y-8 max-w-[800px] mx-auto">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="px-2.5 py-1 rounded-full bg-foreground text-background font-mono text-[10px] tracking-[0.15em] uppercase">Inbox • {unreadCount} unread</span>
            <span className="font-mono text-[10px] tracking-[0.1em] uppercase text-muted-foreground flex items-center gap-1"><Bell className="w-3 h-3" /> Real-time</span>
          </div>
          <h1 className="font-display text-[2.2rem] md:text-[3rem] leading-[0.9] tracking-[-0.03em]">Notifications</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="rounded-full h-10 px-4 font-[600] gap-1" onClick={markAllAsRead}><CheckCheck className="w-4 h-4" /> Mark all read</Button>
          <Button variant="outline" className="rounded-full h-10 px-4 font-[600] gap-1" onClick={clearAll}><Trash2 className="w-4 h-4" /> Clear</Button>
        </div>
      </div>

      {notifications.length===0 ? (
        <div className="py-20 text-center rounded-[1.75rem] border border-dashed border-border/60 bg-secondary/20 space-y-3">
          <div className="w-14 h-14 mx-auto rounded-full bg-card border border-border/50 flex items-center justify-center"><Bell className="w-6 h-6 text-muted-foreground" /></div>
          <h3 className="font-display text-[1.4rem]">All caught up</h3>
          <p className="text-[13px] text-muted-foreground">No notifications — enjoy the quiet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((n,i)=>(
            <motion.div key={n.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i*0.03 }}>
              <Card className={`rounded-[1.25rem] border-border/50 hover:border-foreground/10 transition-colors ${!n.isRead ? 'bg-card shadow-[0_4px_16px_hsl(var(--foreground)/0.04)] border-foreground/10' : 'bg-card/60'}`}>
                <CardContent className="p-5 flex gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${n.type==='content' ? 'bg-amber-500/15 text-amber-600' : n.type==='qa' ? 'bg-emerald-500/15 text-emerald-600' : n.type==='community' ? 'bg-blue-500/15 text-blue-600' : 'bg-secondary'}`}>
                    {n.type==='content' ? <Play className="w-5 h-5" /> : n.type==='qa' ? <MessageCircle className="w-5 h-5" /> : n.type==='community' ? <Users className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-[650] tracking-[-0.01em] text-[14px]">{n.title}</h3>
                      {!n.isRead && <span className="w-1.5 h-1.5 rounded-full bg-foreground" />}
                      <span className="ml-auto font-mono text-[10px] tracking-[0.05em] uppercase text-muted-foreground">{new Date(n.timestamp).toLocaleDateString()}</span>
                    </div>
                    <p className="text-[13px] leading-[1.5] text-muted-foreground mt-1">{n.message}</p>
                    <div className="mt-3 flex gap-2">
                      {n.actionUrl && <Link to={n.actionUrl}><Button size="sm" className="rounded-full h-8 px-4 bg-foreground text-background text-[12px] font-[600]">Open</Button></Link>}
                      <Button size="sm" variant="outline" className="rounded-full h-8 px-4 text-[12px] font-[600]" onClick={()=>markAsRead(n.id)}>Mark read</Button>
                      <Button size="sm" variant="ghost" className="rounded-full h-8 px-3 text-[12px]" onClick={()=>deleteNotification(n.id)}><Trash2 className="w-3 h-3" /></Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
