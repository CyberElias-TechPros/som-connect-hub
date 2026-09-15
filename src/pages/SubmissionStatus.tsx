import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, Clock, XCircle, Edit, Sparkles } from 'lucide-react';
import { pastorUploads } from '@/lib/mock-data';

const statusConfig = {
  pending: { icon: Clock, color: 'bg-amber-500/10 text-amber-700 border-amber-500/20', label: 'Pending' },
  approved: { icon: CheckCircle, color: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20', label: 'Approved' },
  rejected: { icon: XCircle, color: 'bg-destructive/10 text-destructive border-destructive/20', label: 'Rejected' }
};

export default function SubmissionStatus() {
  return (
    <div className="space-y-6 max-w-[800px] mx-auto">
      <div>
        <div className="flex items-center gap-2 mb-3"><span className="px-2.5 py-1 rounded-full bg-foreground text-background font-mono text-[10px] tracking-[0.15em] uppercase">Submissions</span><span className="font-mono text-[10px] tracking-[0.1em] uppercase text-muted-foreground flex items-center gap-1"><Sparkles className="w-3 h-3" /> Track uploads</span></div>
        <h1 className="font-display text-[2.2rem] leading-[0.9] tracking-[-0.03em]">Submission status</h1>
      </div>

      <div className="space-y-3">
        {pastorUploads.map(upload => {
          const status = statusConfig[upload.status];
          const Icon = status.icon;
          return (
            <Card key={upload.id} className="rounded-[1.25rem] border-border/50">
              <CardContent className="p-5 flex gap-4">
                {upload.thumbnail && <img src={upload.thumbnail} alt="" className="w-24 h-16 object-cover rounded-[0.75rem]" />}
                <div className="flex-1 min-w-0">
                  <h3 className="font-[600] tracking-[-0.01em] text-[14px] truncate">{upload.title}</h3>
                  <p className="text-[12px] text-muted-foreground mt-1">{new Date(upload.submittedDate).toLocaleDateString()}</p>
                  {upload.feedback && <p className="text-[12px] text-destructive mt-2 p-2 rounded-[0.5rem] bg-destructive/10 border border-destructive/20">{upload.feedback}</p>}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge className={`rounded-full border font-mono text-[10px] uppercase tracking-[0.05em] ${status.color}`}><Icon className="w-3 h-3 mr-1" />{status.label}</Badge>
                  {upload.status==='pending' && <Button size="sm" variant="ghost" className="rounded-full h-8"><Edit className="w-4 h-4" /></Button>}
                  {upload.status==='rejected' && <Button size="sm" variant="outline" className="rounded-full h-8">Appeal</Button>}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
