import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Camera, Sparkles } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { updateProfile } from '@/services/auth-service';

export default function EditProfile() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [form, setForm] = useState({ name: user?.name || '', bio: user?.bio || '', affiliation: user?.affiliation || '' });
  const [saving, setSaving] = useState(false);

  if (!user) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const updated = await updateProfile(form);
    updateUser(form);
    toast({ title: 'Profile updated', description: 'Your changes have been saved — happy path.' });
    setSaving(false);
    navigate('/profile');
  };

  return (
    <div className="space-y-6 max-w-[600px] mx-auto">
      <Button variant="ghost" className="gap-2 -ml-2 rounded-full" onClick={()=>navigate(-1)}><ArrowLeft className="w-4 h-4" /> Back</Button>
      <div>
        <div className="flex items-center gap-2 mb-3"><span className="px-2.5 py-1 rounded-full bg-foreground text-background font-mono text-[10px] tracking-[0.15em] uppercase">Edit profile</span><span className="font-mono text-[10px] tracking-[0.1em] uppercase text-muted-foreground flex items-center gap-1"><Sparkles className="w-3 h-3" /> Happy path</span></div>
        <h1 className="font-display text-[2rem] leading-[0.9] tracking-[-0.02em]">Update your profile</h1>
      </div>

      <Card className="rounded-[1.5rem] border-border/50">
        <CardContent className="p-7 space-y-6">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <Avatar className="w-24 h-24 border-4 border-border/50"><AvatarImage src={user.avatar} /><AvatarFallback>{user.name[0]}</AvatarFallback></Avatar>
              <button className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-foreground text-background flex items-center justify-center shadow"><Camera className="w-4 h-4" /></button>
            </div>
            <p className="font-mono text-[11px] tracking-[0.05em] uppercase text-muted-foreground">Tap to change photo • Demo</p>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2"><Label className="font-[600] text-[13px]">Full name</Label><Input value={form.name} onChange={e=>setForm({...form, name: e.target.value})} className="h-11 rounded-full bg-secondary/50" /></div>
            <div className="space-y-2"><Label className="font-[600] text-[13px]">Affiliation</Label><Input value={form.affiliation} onChange={e=>setForm({...form, affiliation: e.target.value})} className="h-11 rounded-full bg-secondary/50" placeholder="Christ Embassy Lagos" /></div>
            <div className="space-y-2"><Label className="font-[600] text-[13px]">Bio</Label><Textarea value={form.bio} onChange={e=>setForm({...form, bio: e.target.value})} className="rounded-[1rem] min-h-[100px] bg-secondary/50" placeholder="Tell us about your journey…" /></div>
            <Button type="submit" disabled={saving} className="w-full h-12 rounded-full bg-foreground text-background font-[600]">{saving ? 'Saving…' : 'Save changes'}</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
