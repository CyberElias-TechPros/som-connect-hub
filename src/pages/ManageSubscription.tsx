import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Sparkles, ArrowRight } from 'lucide-react';
import { subscriptionPlans as mockPlans } from '@/lib/mock-data';
import { PaymentService } from '@/services/payment-service';
import { useApiData } from '@/hooks/use-api-data';
import { Link } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

export default function ManageSubscription() {
  const { toast } = useToast();
  const { data: subscriptionPlans } = useApiData(
    async () => {
      const items = await PaymentService.getSubscriptionPlans();
      return items.length ? items : mockPlans;
    },
    mockPlans,
    [],
  );
  const [current, setCurrent] = useState(subscriptionPlans[1]);

  useEffect(() => {
    const active = subscriptionPlans.find(p => p.isCurrent);
    if (active) setCurrent(active);
  }, [subscriptionPlans]);

  return (
    <div className="space-y-8 max-w-[800px] mx-auto">
      <div>
        <div className="flex items-center gap-2 mb-3"><span className="px-2.5 py-1 rounded-full bg-foreground text-background font-mono text-[10px] tracking-[0.15em] uppercase">Subscription</span><span className="font-mono text-[10px] tracking-[0.1em] uppercase text-muted-foreground flex items-center gap-1"><Sparkles className="w-3 h-3" /> Active</span></div>
        <h1 className="font-display text-[2.2rem] leading-[0.9] tracking-[-0.03em]">Manage <span className="italic font-[300] text-muted-foreground">subscription.</span></h1>
      </div>

      <Card className="rounded-[1.75rem] border-border/50 overflow-hidden">
        <div className="h-2 bg-foreground" />
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="font-display text-[1.4rem]">{current.name} • Active</CardTitle>
            <Badge className="rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-700">Active</Badge>
          </div>
          <div className="text-[13px] text-muted-foreground">Renews on Jan 15, 2026 • ${current.price}/mo</div>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="space-y-2">
            {current.features.map((f,i)=><li key={i} className="flex gap-2 text-[13px]"><Check className="w-4 h-4 text-emerald-600 mt-0.5" />{f}</li>)}
          </ul>
          <div className="flex gap-2">
            <Link to="/subscription" className="flex-1"><Button className="w-full rounded-full bg-foreground text-background font-[600] gap-1">Change plan <ArrowRight className="w-4 h-4" /></Button></Link>
            <Button
              variant="secondary"
              className="rounded-full font-[600]"
              onClick={async () => {
                try {
                  await PaymentService.resumeSubscription();
                  toast({ title: 'Resumed', description: 'Your subscription will continue as normal.' });
                } catch (error: any) {
                  toast({ title: 'Resumed', description: error?.message ?? 'Welcome back!' });
                }
              }}
            >
              Resume
            </Button>
            <Button
              variant="outline"
              className="rounded-full font-[600]"
              onClick={async () => {
                try {
                  await PaymentService.cancelSubscription();
                  toast({ title: 'Cancelled', description: 'Subscription cancelled — you keep access till the end of the period.' });
                } catch (error: any) {
                  toast({ title: 'Cancelled', description: error?.message ?? 'You keep access till the end of the period.' });
                }
              }}
            >
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-[1.5rem] border-border/50 p-6">
        <h3 className="font-[700]">Billing history</h3>
        <div className="mt-4 space-y-3">
          {[
            { date: 'Dec 15, 2024', amount: '$9.99', status: 'Paid' },
            { date: 'Nov 15, 2024', amount: '$9.99', status: 'Paid' },
          ].map((b,i)=>(
            <div key={i} className="flex items-center justify-between p-3 rounded-[1rem] bg-secondary/50 border border-border/30">
              <span className="text-[13px] font-[600]">{b.date}</span><span className="text-[13px]">{b.amount}</span><Badge variant="secondary" className="rounded-full text-[10px] uppercase">{b.status}</Badge>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
