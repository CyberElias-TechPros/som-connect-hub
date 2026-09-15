import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Bell, BookOpen, Users, Megaphone, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function NotificationsSettings() {
  const { toast } = useToast();
  const [settings, setSettings] = useState({ push: true, content: true, daily: true, community: false });

  const update = (k: string, v: boolean) => {
    setSettings({ ...settings, [k]: v });
    toast({ title: 'Preference updated', description: 'Notification settings saved — happy path.' });
  };

  return (
    <div className="space-y-8 max-w-[700px] mx-auto">
      <div>
        <div className="flex items-center gap-2 mb-3"><span className="px-2.5 py-1 rounded-full bg-foreground text-background font-mono text-[10px] tracking-[0.15em] uppercase">Notifications</span><span className="font-mono text-[10px] tracking-[0.1em] uppercase text-muted-foreground flex items-center gap-1"><Bell className="w-3 h-3" /> Preferences</span></div>
        <h1 className="font-display text-[2.2rem] leading-[0.9] tracking-[-0.03em]">Stay <span className="italic font-[300] text-muted-foreground">in the loop.</span></h1>
      </div>

      <Card className="rounded-[1.5rem] border-border/50">
        <CardContent className="p-2 divide-y divide-border/50">
          {[
            { k: 'push', icon: Bell, label: 'Push notifications', desc: 'Enable all notifications' },
            { k: 'content', icon: Megaphone, label: 'New content', desc: 'When new teachings are available' },
            { k: 'daily', icon: BookOpen, label: 'Daily reminders', desc: 'Confession & ROR reminders' },
            { k: 'community', icon: Users, label: 'Community', desc: 'Replies and mentions' },
          ].map(item=>(
            <div key={item.k} className="p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-secondary border border-border/50 flex items-center justify-center"><item.icon className="w-5 h-5 text-muted-foreground" /></div>
                <div><Label className="font-[600] text-[14px]">{item.label}</Label><p className="text-[12px] text-muted-foreground">{item.desc}</p></div>
              </div>
              <Switch checked={(settings as any)[item.k]} onCheckedChange={v=>update(item.k, v)} />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="rounded-[1.25rem] bg-amber-500/10 border border-amber-500/20 p-5 flex gap-3">
        <div className="w-10 h-10 rounded-full bg-amber-500/15 flex items-center justify-center shrink-0"><Sparkles className="w-5 h-5 text-amber-600" /></div>
        <div><div className="font-[650] text-[14px]">Happy path active</div><div className="text-[12px] leading-[1.5] text-muted-foreground mt-1">All toggles work instantly. No backend required — preferences saved locally.</div></div>
      </Card>
    </div>
  );
}
