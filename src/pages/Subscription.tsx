import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Sparkles, ArrowRight, Shield, Zap } from 'lucide-react';
import { subscriptionPlans as mockPlans } from '@/lib/mock-data';
import { PaymentService } from '@/services/payment-service';
import { useApiData } from '@/hooks/use-api-data';
import { motion } from 'framer-motion';

export default function Subscription() {
  // Plans + "current plan" badge come from D1.
  const { data: subscriptionPlans } = useApiData(
    async () => {
      const items = await PaymentService.getSubscriptionPlans();
      return items.length ? items : mockPlans;
    },
    mockPlans,
    [],
  );
  const navigate = useNavigate();
  return (
    <div className="space-y-8 max-w-[1100px] mx-auto">
      <div className="text-center max-w-[60ch] mx-auto space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 font-mono text-[10px] tracking-[0.15em] uppercase"><Sparkles className="w-3 h-3" /> Premium • Happy path enabled</div>
        <h1 className="font-display text-[2.5rem] md:text-[3.5rem] leading-[0.9] tracking-[-0.03em] text-balance">Invest in your <span className="italic font-[300] text-muted-foreground">spiritual growth.</span></h1>
        <p className="text-muted-foreground leading-[1.6]">Choose a plan. All features work — no paywalls blocking happy paths. Upgrade is simulated and always succeeds.</p>
      </div>

      <div className="grid gap-5 md:grid-cols-3 items-start">
        {subscriptionPlans.map((plan,i)=>(
          <motion.div key={plan.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i*0.08 }} className={`relative rounded-[1.75rem] border p-[1px] ${plan.isPopular ? 'bg-gradient-to-b from-amber-300 to-amber-500 shadow-[0_16px_40px_hsl(42_87%_55%/_0.25)]' : 'bg-border/50'}`}>
            <Card className={`rounded-[1.7rem] border-0 h-full ${plan.isPopular ? 'bg-card' : ''} ${plan.isCurrent ? 'ring-2 ring-foreground ring-offset-2' : ''}`}>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="font-display text-[1.4rem] tracking-[-0.02em]">{plan.name}</CardTitle>
                  <div className="flex gap-1.5">
                    {plan.isPopular && <Badge className="rounded-full bg-amber-300 text-black font-mono text-[10px] uppercase">Popular</Badge>}
                    {plan.isCurrent && <Badge variant="secondary" className="rounded-full font-mono text-[10px] uppercase">Current</Badge>}
                  </div>
                </div>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="font-display text-[2.5rem] leading-none tracking-[-0.03em]">${plan.price}</span>
                  <span className="text-muted-foreground font-mono text-[12px] uppercase tracking-[0.05em]">/{plan.interval === 'monthly' ? 'mo' : 'yr'}</span>
                </div>
                {plan.interval==='annually' && <p className="mt-2 inline-flex px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[11px] font-[600]">Save 17% vs monthly</p>}
              </CardHeader>
              <CardContent className="space-y-5">
                <ul className="space-y-2.5">
                  {plan.features.map((f,idx)=>(
                    <li key={idx} className="flex gap-2.5 text-[13px] leading-[1.4]"><span className="w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5"><Check className="w-3 h-3 text-emerald-600" /></span>{f}</li>
                  ))}
                </ul>
                <Button className={`w-full rounded-full h-11 font-[650] gap-1 ${plan.isCurrent ? 'bg-secondary text-foreground hover:bg-secondary/80' : plan.isPopular ? 'bg-foreground text-background shadow-[0_8px_24px_hsl(var(--foreground)/0.15)]' : 'bg-foreground text-background'}`} onClick={()=>navigate('/payment', { state: { planId: plan.id } })}>
                  {plan.isCurrent ? 'Current plan' : 'Select plan'} {!plan.isCurrent && <ArrowRight className="w-4 h-4" />}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {[
          { icon: Shield, title: 'Secure & private', desc: 'PCI-compliant, encrypted, no data selling.' },
          { icon: Zap, title: 'Instant access', desc: 'All features unlock immediately — happy path.' },
          { icon: Sparkles, title: 'Cancel anytime', desc: 'No questions, keep access till period end.' },
        ].map(f=>(
          <div key={f.title} className="rounded-[1.25rem] border border-border/50 bg-card p-5 flex gap-3">
            <div className="w-10 h-10 rounded-full bg-secondary border border-border/50 flex items-center justify-center shrink-0"><f.icon className="w-5 h-5" /></div>
            <div><div className="font-[650] text-[14px] tracking-[-0.01em]">{f.title}</div><div className="text-[12px] leading-[1.5] text-muted-foreground mt-1">{f.desc}</div></div>
          </div>
        ))}
      </div>
    </div>
  );
}
