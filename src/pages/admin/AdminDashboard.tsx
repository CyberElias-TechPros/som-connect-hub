import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, FileVideo, Eye, TrendingUp, Shield, UserCog, ChevronRight, BarChart2, Calendar, Activity } from 'lucide-react';
import { adminStats as mockAdminStats } from '@/lib/mock-data';
import { motion } from 'framer-motion';
import { adminService } from '@/services/admin-service';
import { useApiData } from '@/hooks/use-api-data';

export default function AdminDashboard() {
  // GET /admin/stats — real counters from D1 (mock numbers render instantly).
  const { data: adminStats } = useApiData(
    () => adminService.getStats(),
    mockAdminStats,
    [],
    { pollMs: 60000 },
  );

  return (
    <div className="space-y-8 max-w-[1200px] mx-auto">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-3"><span className="px-2.5 py-1 rounded-full bg-foreground text-background font-mono text-[10px] tracking-[0.15em] uppercase">Admin • Overview</span><span className="font-mono text-[10px] tracking-[0.1em] uppercase text-muted-foreground">System healthy</span></div>
          <h1 className="font-display text-[2.2rem] md:text-[3rem] leading-[0.9] tracking-[-0.03em]">Admin <span className="italic font-[300] text-muted-foreground">dashboard.</span></h1>
        </div>
        <div className="flex gap-2"><Button variant="outline" size="sm" className="rounded-full h-9"><Calendar className="w-4 h-4 mr-1" /> This month</Button><Button variant="outline" size="sm" className="rounded-full h-9"><BarChart2 className="w-4 h-4 mr-1" /> Export</Button></div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Users, label: 'Total users', value: adminStats.totalUsers.toLocaleString(), change: '↑ 12%' },
          { icon: TrendingUp, label: 'Active subs', value: adminStats.activeSubscribers.toLocaleString(), change: '↑ 8%' },
          { icon: FileVideo, label: 'Content', value: adminStats.totalContent.toLocaleString(), change: '↑ 15%' },
          { icon: Eye, label: 'Monthly views', value: `${(adminStats.monthlyViews/1e6).toFixed(1)}M`, change: '↑ 20%' },
        ].map((stat,i)=>(
          <motion.div key={stat.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i*0.06 }}>
            <Card className="rounded-[1.25rem] border-border/50 p-5 text-center hover:border-foreground/10 transition-colors">
              <stat.icon className="w-6 h-6 mx-auto mb-3" />
              <div className="font-display text-[1.6rem] leading-none">{stat.value}</div>
              <div className="text-[11px] font-mono uppercase tracking-[0.05em] text-muted-foreground mt-1">{stat.label}</div>
              <div className="mt-2 inline-flex px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 text-[10px] font-mono">{stat.change}</div>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card className="rounded-[1.5rem] border-border/50">
          <CardHeader><CardTitle className="flex items-center gap-2 text-[16px]"><Activity className="w-4 h-4" /> Moderation queue</CardTitle></CardHeader>
          <CardContent className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center"><Shield className="w-6 h-6 text-amber-600" /></div>
            <div className="flex-1"><div className="font-[650]">{adminStats.pendingReviews} pending reviews</div><div className="text-[12px] text-muted-foreground">Requires attention</div></div>
            <Link to="/admin/moderation"><Button variant="outline" size="icon" className="rounded-full w-9 h-9"><ChevronRight className="w-4 h-4" /></Button></Link>
          </CardContent>
        </Card>
        <Card className="rounded-[1.5rem] border-border/50">
          <CardHeader><CardTitle className="flex items-center gap-2 text-[16px]"><UserCog className="w-4 h-4" /> User management</CardTitle></CardHeader>
          <CardContent className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-secondary border border-border/50 flex items-center justify-center"><Users className="w-6 h-6" /></div>
            <div className="flex-1"><div className="font-[650]">Manage roles & permissions</div><div className="text-[12px] text-muted-foreground">12k users, 3 roles</div></div>
            <Link to="/admin/users"><Button variant="outline" size="icon" className="rounded-full w-9 h-9"><ChevronRight className="w-4 h-4" /></Button></Link>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-[1.5rem] border-border/50 bg-foreground text-background p-6">
        <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center"><Shield className="w-5 h-5" /></div><div><div className="font-[700]">Happy path admin</div><div className="text-[13px] text-background/60">All admin actions succeed in demo. No destructive operations.</div></div></div>
      </Card>
    </div>
  );
}
