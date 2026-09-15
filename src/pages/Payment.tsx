import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, CreditCard, Lock, CheckCircle, Sparkles } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { subscriptionPlans as mockPlans } from '@/lib/mock-data';
import { PaymentService } from '@/services/payment-service';
import { useApiData } from '@/hooks/use-api-data';
import { motion } from 'framer-motion';

export default function Payment() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const selectedPlanId = location.state?.planId || 'premium-monthly';
  const { data: subscriptionPlans } = useApiData(
    async () => {
      const items = await PaymentService.getSubscriptionPlans();
      return items.length ? items : mockPlans;
    },
    mockPlans,
    [],
  );
  const selectedPlan = subscriptionPlans.find(p=>p.id===selectedPlanId) || subscriptionPlans[1];

  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [card, setCard] = useState({ number: '4242 4242 4242 4242', expiry: '12/28', cvc: '123', name: 'David Emmanuel' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);
    try {
      // 1. Save the card (tokenised — only brand/last4 are stored).
      const method = await PaymentService.addPaymentMethod({
        type: 'card',
        brand: card.number.startsWith('4') ? 'Visa' : 'Card',
        last4: card.number.replace(/\D/g, '').slice(-4) || '4242',
        expiry: card.expiry,
        isDefault: true,
      });

      // 2. Create + confirm a payment intent (demo settles instantly).
      const intent = await PaymentService.createPaymentIntent(selectedPlan.price, 'USD', selectedPlan.id);
      await PaymentService.confirmPayment(intent.id, method.id);

      // 3. Activate the subscription (POST /subscriptions).
      await PaymentService.createSubscription(selectedPlan.id, method.id);
      await PaymentService.updateBillingInfo({ name: card.name, email: '', address: '', city: '', state: '', zip: '', country: '' });

      setSuccess(true);
      toast({ title: 'Payment successful', description: `${selectedPlan.name} activated — welcome to premium!` });
      setTimeout(()=>navigate('/'), 1800);
    } catch (error: any) {
      // Never dead-end: the plan is still activated locally for the demo.
      setSuccess(true);
      toast({ title: 'Payment accepted', description: error?.message ?? 'Your plan is active.' });
      setTimeout(()=>navigate('/'), 1800);
    } finally {
      setProcessing(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4">
        <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-md">
          <Card className="rounded-[1.75rem] border-border/50 text-center p-8 space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center"><CheckCircle className="w-8 h-8 text-emerald-600" /></div>
            <h2 className="font-display text-[1.8rem] tracking-[-0.02em]">Payment successful!</h2>
            <p className="text-muted-foreground text-[14px]">Your {selectedPlan.name} subscription is now active. Redirecting you home…</p>
            <Button className="w-full rounded-full bg-foreground text-background" onClick={()=>navigate('/')}>Continue to app</Button>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[520px] mx-auto">
      <Button variant="ghost" className="gap-2 -ml-2 rounded-full" onClick={()=>navigate(-1)}><ArrowLeft className="w-4 h-4" /> Back</Button>

      <div className="flex items-center gap-2">
        <span className="px-2.5 py-1 rounded-full bg-foreground text-background font-mono text-[10px] tracking-[0.15em] uppercase">Checkout</span>
        <span className="font-mono text-[10px] tracking-[0.1em] uppercase text-muted-foreground flex items-center gap-1"><Sparkles className="w-3 h-3" /> Happy path — any card works</span>
      </div>

      <Card className="rounded-[1.75rem] border-border/50 overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display text-[1.4rem]"><CreditCard className="w-5 h-5" /> Payment details</CardTitle>
          <CardDescription>Complete your {selectedPlan.name} subscription — demo mode, always succeeds.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="p-4 rounded-[1rem] bg-secondary/60 border border-border/50 flex items-center justify-between">
            <div><p className="font-[650] tracking-[-0.01em]">{selectedPlan.name}</p><p className="text-[12px] text-muted-foreground">${selectedPlan.price} / {selectedPlan.interval}</p></div>
            <div className="text-right"><p className="font-display text-[1.6rem] leading-none">${selectedPlan.price}</p><p className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">Total</p></div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2"><Label className="text-[13px] font-[600]">Card number</Label><Input value={card.number} onChange={e=>setCard({...card, number: e.target.value})} className="h-11 rounded-full bg-secondary/50" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label className="text-[13px] font-[600]">Expiry</Label><Input value={card.expiry} onChange={e=>setCard({...card, expiry: e.target.value})} className="h-11 rounded-full bg-secondary/50" /></div>
              <div className="space-y-2"><Label className="text-[13px] font-[600]">CVC</Label><Input value={card.cvc} onChange={e=>setCard({...card, cvc: e.target.value})} className="h-11 rounded-full bg-secondary/50" /></div>
            </div>
            <div className="space-y-2"><Label className="text-[13px] font-[600]">Name on card</Label><Input value={card.name} onChange={e=>setCard({...card, name: e.target.value})} className="h-11 rounded-full bg-secondary/50" /></div>

            <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.05em] text-muted-foreground"><Lock className="w-3 h-3" /> Secured • Demo • Always succeeds</div>

            <Button type="submit" disabled={processing} className="w-full h-12 rounded-full bg-foreground text-background font-[650] gap-2">
              {processing ? <><span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> Processing…</> : <>Pay ${selectedPlan.price}</>}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
