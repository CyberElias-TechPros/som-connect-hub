import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Upload as UploadIcon, CheckCircle, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function Upload() {
  const { toast } = useToast();
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await new Promise(r=>setTimeout(r, 1000));
    setDone(true);
    setLoading(false);
    toast({ title: 'Upload submitted', description: 'Your content is pending review — happy path, always succeeds.' });
  };

  if (done) {
    return (
      <div className="max-w-[600px] mx-auto py-12">
        <Card className="rounded-[1.75rem] border-border/50 text-center p-8 space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center"><CheckCircle className="w-8 h-8 text-emerald-600" /></div>
          <h2 className="font-display text-[1.8rem]">Upload successful</h2>
          <p className="text-muted-foreground text-[14px]">Your teaching is now pending review. You can track it in submissions.</p>
          <Button className="rounded-full bg-foreground text-background" onClick={()=>setDone(false)}>Upload another</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[700px] mx-auto">
      <div>
        <div className="flex items-center gap-2 mb-3"><span className="px-2.5 py-1 rounded-full bg-foreground text-background font-mono text-[10px] tracking-[0.15em] uppercase">Creator upload</span><span className="font-mono text-[10px] tracking-[0.1em] uppercase text-muted-foreground flex items-center gap-1"><Sparkles className="w-3 h-3" /> Happy path</span></div>
        <h1 className="font-display text-[2.2rem] leading-[0.9] tracking-[-0.03em]">Share your <span className="italic font-[300] text-muted-foreground">teaching.</span></h1>
      </div>

      <Card className="rounded-[1.5rem] border-border/50">
        <CardHeader><CardTitle className="flex items-center gap-2 text-[16px]"><UploadIcon className="w-4 h-4" /> Upload content</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2"><Label className="font-[600] text-[13px]">Title</Label><Input required placeholder="The Power of Faith in Action" className="h-11 rounded-full bg-secondary/50" /></div>
            <div className="space-y-2"><Label className="font-[600] text-[13px]">Description</Label><Textarea required placeholder="Describe your teaching…" className="rounded-[1rem] min-h-[100px] bg-secondary/50" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label className="font-[600] text-[13px]">Category</Label><Input placeholder="conference" className="h-11 rounded-full bg-secondary/50" /></div>
              <div className="space-y-2"><Label className="font-[600] text-[13px]">Duration</Label><Input placeholder="1:24:30" className="h-11 rounded-full bg-secondary/50" /></div>
            </div>
            <div className="space-y-2"><Label className="font-[600] text-[13px]">Video file</Label><div className="h-32 rounded-[1rem] border-2 border-dashed border-border/60 bg-secondary/20 flex flex-col items-center justify-center gap-2"><UploadIcon className="w-6 h-6 text-muted-foreground" /><span className="text-[12px] text-muted-foreground">Drop file or click to browse • Demo</span></div></div>
            <Button type="submit" disabled={loading} className="w-full h-12 rounded-full bg-foreground text-background font-[600]">{loading ? 'Uploading…' : 'Submit for review'}</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
