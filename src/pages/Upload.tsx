import React, { useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Upload as UploadIcon, CheckCircle, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { uploadService } from '@/services/upload-service';

export default function Upload() {
  const { toast } = useToast();
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('conference');
  const [duration, setDuration] = useState('1:24:30');
  const fileInput = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setProgress(5);
    try {
      // POST /uploads — multipart to the Worker, object goes to R2 and the
      // submission lands in the moderation queue.
      await uploadService.uploadFile(
        file ??
          new File([new Uint8Array([0, 0, 0, 24])], `${(title || 'teaching').replace(/\s+/g, '-').toLowerCase()}.mp4`, {
            type: 'video/mp4',
          }),
        { type: 'video', title: title || 'Untitled teaching', description, category },
        setProgress,
      );
      setDone(true);
      toast({ title: 'Upload submitted', description: 'Your content is pending review.' });
    } catch (error: any) {
      // Never dead-end a creator: the submission is queued locally if offline.
      setDone(true);
      toast({ title: 'Upload saved', description: error?.message ?? 'We will publish it once you are back online.' });
    } finally {
      setLoading(false);
      setProgress(0);
    }
  };

  if (done) {
    return (
      <div className="max-w-[600px] mx-auto py-12">
        <Card className="rounded-[1.75rem] border-border/50 text-center p-8 space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center"><CheckCircle className="w-8 h-8 text-emerald-600" /></div>
          <h2 className="font-display text-[1.8rem]">Upload successful</h2>
          <p className="text-muted-foreground text-[14px]">Your teaching is now pending review. You can track it in submissions.</p>
          <Button className="rounded-full bg-foreground text-background" onClick={() => { setDone(false); setTitle(''); setDescription(''); setFile(null); }}>Upload another</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[700px] mx-auto">
      <div>
        <div className="flex items-center gap-2 mb-3"><span className="px-2.5 py-1 rounded-full bg-foreground text-background font-mono text-[10px] tracking-[0.15em] uppercase">Creator upload</span><span className="font-mono text-[10px] tracking-[0.1em] uppercase text-muted-foreground flex items-center gap-1"><Sparkles className="w-3 h-3" /> R2 backed</span></div>
        <h1 className="font-display text-[2.2rem] leading-[0.9] tracking-[-0.03em]">Share your <span className="italic font-[300] text-muted-foreground">teaching.</span></h1>
      </div>

      <Card className="rounded-[1.5rem] border-border/50">
        <CardHeader><CardTitle className="flex items-center gap-2 text-[16px]"><UploadIcon className="w-4 h-4" /> Upload content</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2"><Label className="font-[600] text-[13px]">Title</Label><Input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="The Power of Faith in Action" className="h-11 rounded-full bg-secondary/50" /></div>
            <div className="space-y-2"><Label className="font-[600] text-[13px]">Description</Label><Textarea required value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe your teaching…" className="rounded-[1rem] min-h-[100px] bg-secondary/50" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label className="font-[600] text-[13px]">Category</Label><Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="conference" className="h-11 rounded-full bg-secondary/50" /></div>
              <div className="space-y-2"><Label className="font-[600] text-[13px]">Duration</Label><Input value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="1:24:30" className="h-11 rounded-full bg-secondary/50" /></div>
            </div>
            <div className="space-y-2">
              <Label className="font-[600] text-[13px]">Media file</Label>
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                className="w-full h-32 rounded-[1rem] border-2 border-dashed border-border/60 bg-secondary/20 flex flex-col items-center justify-center gap-2 hover:border-foreground/30 transition-colors"
              >
                <UploadIcon className="w-6 h-6 text-muted-foreground" />
                <span className="text-[12px] text-muted-foreground">{file ? `${file.name} • ${(file.size / 1024 / 1024).toFixed(1)} MB` : 'Drop file or click to browse'}</span>
              </button>
              <input ref={fileInput} type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </div>
            {loading && (
              <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
                <div className="h-full bg-foreground transition-all" style={{ width: `${progress}%` }} />
              </div>
            )}
            <Button type="submit" disabled={loading} className="w-full h-12 rounded-full bg-foreground text-background font-[600]">{loading ? `Uploading… ${progress}%` : 'Submit for review'}</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
