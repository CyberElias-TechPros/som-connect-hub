import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Check, CreditCard, Calendar, X } from 'lucide-react';
import { subscriptionPlans } from '@/lib/mock-data';

export default function ManageSubscription() {
  const currentPlan = subscriptionPlans.find(plan => plan.isCurrent) || subscriptionPlans[1]; // Premium monthly
  const otherPlans = subscriptionPlans.filter(plan => !plan.isCurrent);

  // Mock billing history
  const billingHistory = [
    {
      id: '1',
      date: '2025-01-01',
      amount: 9.99,
      status: 'paid',
      plan: 'Premium Monthly',
    },
    {
      id: '2',
      date: '2024-12-01',
      amount: 9.99,
      status: 'paid',
      plan: 'Premium Monthly',
    },
    {
      id: '3',
      date: '2024-11-01',
      amount: 9.99,
      status: 'paid',
      plan: 'Premium Monthly',
    },
  ];

  const handleCancelSubscription = () => {
    // In real app, call API to cancel
    console.log('Subscription cancelled');
  };

  return (
    <div className="space-y-6 p-4 md:p-0">
      <h1 className="text-2xl font-bold">Manage Subscription</h1>

      {/* Current Plan */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Current Plan
            </CardTitle>
            <Badge variant="secondary">Active</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">{currentPlan.name}</h3>
              <p className="text-2xl font-bold">
                ${currentPlan.price}
                <span className="text-sm font-normal text-muted-foreground">
                  /{currentPlan.interval === 'monthly' ? 'month' : 'year'}
                </span>
              </p>
            </div>
            <div className="text-right text-sm text-muted-foreground">
              <p>Next billing: Jan 15, 2025</p>
              <p>Auto-renewal: On</p>
            </div>
          </div>

          <Separator />

          <div>
            <h4 className="font-medium mb-2">Plan Features</h4>
            <ul className="space-y-1">
              {currentPlan.features.map((feature, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <Check className="w-4 h-4 text-success shrink-0 mt-0.5" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Upgrade/Downgrade Options */}
      <Card>
        <CardHeader>
          <CardTitle>Change Plan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {otherPlans.map(plan => (
              <div key={plan.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{plan.name}</h3>
                  {plan.isPopular && <Badge className="bg-accent">Popular</Badge>}
                </div>
                <div className="text-2xl font-bold">
                  ${plan.price}
                  <span className="text-sm font-normal text-muted-foreground">
                    /{plan.interval === 'monthly' ? 'mo' : 'yr'}
                  </span>
                </div>
                <ul className="space-y-1 text-sm">
                  {plan.features.slice(0, 3).map((feature, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <Check className="w-3 h-3 text-success shrink-0 mt-0.5" />
                      {feature}
                    </li>
                  ))}
                  {plan.features.length > 3 && (
                    <li className="text-muted-foreground">+{plan.features.length - 3} more features</li>
                  )}
                </ul>
                <Button
                  className="w-full"
                  variant={plan.price > currentPlan.price ? 'default' : 'outline'}
                >
                  {plan.price > currentPlan.price ? 'Upgrade' : 'Downgrade'}
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Billing History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Billing History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {billingHistory.map((bill, index) => (
              <div key={bill.id}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{bill.plan}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(bill.date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">${bill.amount}</p>
                    <Badge variant={bill.status === 'paid' ? 'secondary' : 'destructive'}>
                      {bill.status}
                    </Badge>
                  </div>
                </div>
                {index < billingHistory.length - 1 && <Separator className="mt-4" />}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Cancel Subscription */}
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive flex items-center gap-2">
            <X className="w-5 h-5" />
            Cancel Subscription
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Your subscription will remain active until the end of your current billing period
            (January 15, 2025). You can reactivate at any time.
          </p>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">Cancel Subscription</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure you want to cancel?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. Your subscription will be cancelled at the end of
                  the current billing period, and you will lose access to premium features.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
                <AlertDialogAction onClick={handleCancelSubscription} className="bg-destructive">
                  Cancel Subscription
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}