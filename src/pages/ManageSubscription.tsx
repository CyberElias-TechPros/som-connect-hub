import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Sparkles, ArrowRight, AlertTriangle, RefreshCw, Receipt, Loader2 } from 'lucide-react';
import { subscriptionPlans as mockPlans } from '@/lib/mock-data';
import { PaymentService, type BillingSubscription, type Invoice } from '@/services/payment-service';
import { useApiData } from '@/hooks/use-api-data';
import { Link } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

const money = (amount: number, currency = 'USD') =>
  `${currency === 'USD' ? '$' : `${currency} `}${Number(amount ?? 0).toFixed(2)}`;

const day = (value?: string | null) =>
  value ? new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

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
  const { data: billing, setData: setBilling, offline, refresh } = useApiData(
    async () => PaymentService.getSubscription(),
    { subscription: null as BillingSubscription | null, isPremium: false, status: 'free' },
    [],
  );
  const { data: invoices, setData: setInvoices } = useApiData<Invoice[]>(
    async () => PaymentService.getInvoices(),
    [],
    [],
  );

  const [busy, setBusy] = useState<string | null>(null);
  const subscription = billing.subscription;
  const plan = subscriptionPlans.find((p) => p.id === subscription?.planId);
  const pendingPlan = subscriptionPlans.find((p) => p.id === subscription?.pendingPlanId);
  const status = subscription?.status ?? 'free';

  useEffect(() => {
    // Keep the invoice list fresh after any action.
    if (subscription) setInvoices((current) => current);
  }, [subscription, setInvoices]);

  const runAction = async (label: string, action: () => Promise<{ message?: string } | void>) => {
    setBusy(label);
    try {
      const result = await action();
      await refresh();
      setInvoices(await PaymentService.getInvoices());
      const message = (result as any)?.message;
      toast({ title: label, description: message ?? 'Done.' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: `${label} failed`, description: error?.message ?? 'Please try again.' });
    } finally {
      setBusy(null);
    }
  };

  const statusBadge = () => {
    if (status === 'past_due') return <Badge className="rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-700">Payment needed</Badge>;
    if (status === 'cancelled' || status === 'expired') return <Badge variant="secondary" className="rounded-full">Ended</Badge>;
    if (subscription?.cancelAtPeriodEnd) return <Badge className="rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-700">Ends {day(subscription.currentPeriodEnd)}</Badge>;
    return <Badge className="rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-700">Active</Badge>;
  };

  if (!subscription) {
    return (
      <div className="space-y-8 max-w-[800px] mx-auto">
        <div>
          <div className="flex items-center gap-2 mb-3"><span className="px-2.5 py-1 rounded-full bg-foreground text-background font-mono text-[10px] tracking-[0.15em] uppercase">Subscription</span></div>
          <h1 className="font-display text-[2.2rem] leading-[0.9] tracking-[-0.03em]">Manage <span className="italic font-[300] text-muted-foreground">subscription.</span></h1>
        </div>
        <Card className="rounded-[1.75rem] border-border/50 p-8 text-center space-y-4">
          <Sparkles className="w-8 h-8 mx-auto text-muted-foreground" />
          <p className="font-display text-[1.4rem]">You are on the free plan</p>
          <p className="text-[13px] text-muted-foreground">Choose a plan to unlock HD streaming, offline downloads and premium teachings.</p>
          <Link to="/subscription"><Button className="rounded-full bg-foreground text-background font-[600] gap-1">See plans <ArrowRight className="w-4 h-4" /></Button></Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-[800px] mx-auto">
      <div>
        <div className="flex items-center gap-2 mb-3"><span className="px-2.5 py-1 rounded-full bg-foreground text-background font-mono text-[10px] tracking-[0.15em] uppercase">Subscription</span><span className="font-mono text-[10px] tracking-[0.1em] uppercase text-muted-foreground flex items-center gap-1"><Sparkles className="w-3 h-3" /> {offline ? 'Saved copy' : 'Live billing'}</span></div>
        <h1 className="font-display text-[2.2rem] leading-[0.9] tracking-[-0.03em]">Manage <span className="italic font-[300] text-muted-foreground">subscription.</span></h1>
      </div>

      {status === 'past_due' && (
        <div role="alert" className="flex flex-wrap items-center gap-3 p-4 rounded-[1.25rem] bg-amber-500/10 border border-amber-500/20">
          <AlertTriangle className="w-5 h-5 text-amber-600" />
          <div className="flex-1 min-w-[220px] text-[13px]">
            <p className="font-[600]">We could not process your last payment.</p>
            <p className="text-muted-foreground">
              {subscription.lastPaymentError ?? 'Your card was declined.'}
              {subscription.nextRetryAt ? ` We will try again on ${day(subscription.nextRetryAt)}.` : ''} Your premium access continues while we retry.
            </p>
          </div>
          <Button
            className="rounded-full bg-foreground text-background font-[600] gap-2"
            disabled={busy === 'Payment retried'}
            onClick={() => runAction('Payment retried', async () => ({ message: (await PaymentService.renewSubscription()) ? 'Your payment went through — you are all set.' : 'Payment retried.' }))}
          >
            {busy === 'Payment retried' ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Retry payment
          </Button>
          <Link to="/payment"><Button variant="outline" className="rounded-full font-[600]">Use another card</Button></Link>
        </div>
      )}

      <Card className="rounded-[1.75rem] border-border/50 overflow-hidden">
        <div className="h-2 bg-foreground" />
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="font-display text-[1.4rem]">{subscription.planName}{plan ? ` • ${plan.name}` : ''}</CardTitle>
            {statusBadge()}
          </div>
          <div className="text-[13px] text-muted-foreground">
            {subscription.cancelAtPeriodEnd
              ? `Access ends ${day(subscription.currentPeriodEnd)}`
              : subscription.autoRenew
                ? `Renews ${day(subscription.currentPeriodEnd)}`
                : `Period ends ${day(subscription.currentPeriodEnd)}`}
            {' • '}{money(subscription.price, subscription.currency)}/{subscription.interval === 'annually' ? 'yr' : 'mo'}
          </div>
          {pendingPlan && (
            <div className="mt-2 text-[12px] p-3 rounded-[1rem] bg-secondary/60 border border-border/40">
              Switching to <span className="font-[650]">{pendingPlan.name}</span> when the current period ends ({day(subscription.currentPeriodEnd)}). You keep {plan?.name ?? 'your plan'} until then.
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="space-y-2">
            {(plan?.features ?? subscriptionPlanFeatures(subscription)).map((f, i) => (
              <li key={i} className="flex gap-2 text-[13px]"><Check className="w-4 h-4 text-emerald-600 mt-0.5" />{f}</li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2">
            <Link to="/subscription" className="flex-1 min-w-[180px]"><Button className="w-full rounded-full bg-foreground text-background font-[600] gap-1">Change plan <ArrowRight className="w-4 h-4" /></Button></Link>
            {subscription.cancelAtPeriodEnd ? (
              <Button
                className="rounded-full font-[600]"
                disabled={busy === 'Subscription resumed'}
                onClick={() => runAction('Subscription resumed', async () => {
                  await PaymentService.resumeSubscription();
                  return { message: 'Your subscription will continue as normal.' };
                })}
              >
                {busy === 'Subscription resumed' ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Resume
              </Button>
            ) : (
              <Button
                variant="outline"
                className="rounded-full font-[600]"
                disabled={busy === 'Subscription cancelled' || status === 'expired'}
                onClick={() => runAction('Subscription cancelled', async () => {
                  await PaymentService.cancelSubscription();
                  return { message: `You keep access until ${day(subscription.currentPeriodEnd)}.` };
                })}
              >
                {busy === 'Subscription cancelled' ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Cancel
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-[1.5rem] border-border/50 p-6">
        <div className="flex items-center justify-between">
          <h3 className="font-[700] flex items-center gap-2"><Receipt className="w-4 h-4" /> Billing history</h3>
          <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">{invoices.length} receipt{invoices.length === 1 ? '' : 's'}</span>
        </div>
        <div className="mt-4 space-y-3">
          {invoices.length === 0 && <p className="text-[13px] text-muted-foreground">No payments yet — your receipts will appear here.</p>}
          {invoices.map((invoice) => (
            <div key={invoice.id} className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-[1rem] bg-secondary/50 border border-border/30">
              <div>
                <p className="text-[13px] font-[600]">{invoice.number ?? 'Invoice'}</p>
                <p className="text-[11px] text-muted-foreground">{day(invoice.paidAt ?? invoice.issuedAt)} • {invoice.description}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[13px] font-[600]">{money(invoice.amount, invoice.currency)}</span>
                <Badge variant="secondary" className="rounded-full text-[10px] uppercase">{invoice.status}</Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-full text-[12px]"
                  onClick={async () => {
                    const receipt = await PaymentService.getInvoice(invoice.id);
                    toast({
                      title: receipt?.number ?? 'Receipt',
                      description: receipt
                        ? `${money(receipt.amount, receipt.currency)} • ${receipt.billedTo?.email ?? ''} • ${day(receipt.paidAt ?? receipt.issuedAt)}`
                        : 'Receipt unavailable right now.',
                    });
                  }}
                >
                  View
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/** Falls back to the plan the subscription itself describes. */
function subscriptionPlanFeatures(subscription: BillingSubscription): string[] {
  return [
    'Access to all public content',
    subscription.interval === 'annually' ? 'Annual billing — best value' : 'Monthly billing',
    'Premium teachings, offline downloads and HD streaming',
  ];
}
