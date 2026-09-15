import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Settings as SettingsIcon, Moon, Bell, Download, Shield, Sparkles, LogOut } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export default function Settings() {
  const { theme, setTheme } = useTheme();
  const { logout } = useAuth();
  const { toast } = useToast();
  const [notifs, setNotifs] = useState({ push: true, content: true, daily: true, community: false });
  const [offline, setOffline] = useState({ autoDownload: true, wifiOnly: true });

  const save = () => toast({ title: 'Settings saved', description: 'Your preferences have been updated — happy path.' });

  return (
    <div className="space-y-8 max-w-[800px] mx-auto">
      <div>
        <div className="flex items-center gap-2 mb-3"><span className="px-2.5 py-1 rounded-full bg-foreground text-background font-mono text-[10px] tracking-[0.15em] uppercase">Settings</span><span className="font-mono text-[10px] tracking-[0.1em] uppercase text-muted-foreground flex items-center gap-1"><SettingsIcon className="w-3 h-3" /> Preferences</span></div>
        <h1 className="font-display text-[2.2rem] md:text-[3rem] leading-[0.9] tracking-[-0.03em]">Make it <span className="italic font-[300] text-muted-foreground">yours.</span></h1>
      </div>

      <div className="grid gap-5">
        <Card className="rounded-[1.5rem] border-border/50">
          <CardHeader><CardTitle className="flex items-center gap-2 text-[16px] font-[700]"><Moon className="w-4 h-4" /> Appearance</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-[1rem] bg-secondary/60 border border-border/50">
              <div><div className="font-[600] text-[14px]">Theme</div><div className="text-[12px] text-muted-foreground">Light, dark, or system</div></div>
              <div className="flex gap-1 p-1 rounded-full bg-card border border-border/50">
                {['light','dark','system'].map(t=>(
                  <button key={t} onClick={()=>setTheme(t as any)} className={`px-3 py-1 rounded-full text-[12px] font-[600] capitalize transition-colors ${theme===t ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'}`}>{t}</button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[1.5rem] border-border/50">
          <CardHeader><CardTitle className="flex items-center gap-2 text-[16px] font-[700]"><Bell className="w-4 h-4" /> Notifications</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {[
              { k: 'push', label: 'Push notifications', desc: 'Get notified on this device' },
              { k: 'content', label: 'New content', desc: 'New teachings from speakers you follow' },
              { k: 'daily', label: 'Daily reminders', desc: 'Daily confession & ROR reminders' },
              { k: 'community', label: 'Community activity', desc: 'Replies, likes, group updates' },
            ].map(item=>(
              <div key={item.k} className="flex items-center justify-between p-4 rounded-[1rem] bg-secondary/40 border border-border/30">
                <div><div className="font-[600] text-[14px]">{item.label}</div><div className="text-[12px] text-muted-foreground">{item.desc}</div></div>
                <Switch checked={(notifs as any)[item.k]} onCheckedChange={v=>setNotifs({ ...notifs, [item.k]: v })} />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-[1.5rem] border-border/50">
          <CardHeader><CardTitle className="flex items-center gap-2 text-[16px] font-[700]"><Download className="w-4 h-4" /> Offline & storage</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-4 rounded-[1rem] bg-secondary/40 border border-border/30">
              <div><div className="font-[600] text-[14px]">Auto-download</div><div className="text-[12px] text-muted-foreground">Download favorites for offline</div></div>
              <Switch checked={offline.autoDownload} onCheckedChange={v=>setOffline({ ...offline, autoDownload: v })} />
            </div>
            <div className="flex items-center justify-between p-4 rounded-[1rem] bg-secondary/40 border border-border/30">
              <div><div className="font-[600] text-[14px]">Wi-Fi only</div><div className="text-[12px] text-muted-foreground">Only download on Wi-Fi</div></div>
              <Switch checked={offline.wifiOnly} onCheckedChange={v=>setOffline({ ...offline, wifiOnly: v })} />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[1.5rem] border-border/50 bg-foreground text-background p-6 flex gap-4">
          <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center shrink-0"><Shield className="w-5 h-5" /></div>
          <div className="flex-1"><div className="font-[700] tracking-[-0.01em]">Privacy & data</div><div className="text-[13px] leading-[1.5] text-background/60 mt-1">We never sell your data. All settings are stored locally in this demo. Happy path — nothing breaks.</div></div>
        </Card>

        <div className="flex gap-3">
          <Button className="flex-1 rounded-full h-11 bg-foreground text-background font-[600]" onClick={save}><Sparkles className="w-4 h-4 mr-1" /> Save settings</Button>
          <Button variant="outline" className="rounded-full h-11 px-6 font-[600] gap-1 border-destructive/20 text-destructive hover:bg-destructive hover:text-destructive-foreground" onClick={logout}><LogOut className="w-4 h-4" /> Sign out</Button>
        </div>
      </div>
    </div>
  );
}
