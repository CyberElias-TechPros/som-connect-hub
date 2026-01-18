import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Check, CreditCard, Calendar, X, AlertCircle, CheckCircle, Clock, RefreshCw } from 'lucide-react';
import { subscriptionPlans } from '@/lib/mock-data';
import { PaymentService, Subscription, BillingInfo } from '@/services/payment-service';
import { useToast } from '@/hooks/use-toast';

export default function ManageSubscription() {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [currentPlan] = useState(subscriptionPlans.find(plan => plan.isCurrent) || subscriptionPlans[1]);
  const [otherPlans] = useState(subscriptionPlans.filter(plan => !plan.isCurrent));
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [billingInfo, setBillingInfo] = useState<BillingInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [upgradeLoading, setUpgradeLoading] = useState<string | null>(null);
  
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
  
  useEffect(() => {
    const fetchSubscriptionData = async () => {
      try {
        setLoading(true);
        
        // Fetch subscription and billing info
        const [sub, billing] = await Promise.all([
          PaymentService.getCurrentSubscription(),
          PaymentService.getBillingInfo(),
        ]);
        
        setSubscription(sub);
        setBillingInfo(billing);
      } catch (error) {
        console.error('Failed to fetch subscription data:', error);
        toast({
          title: 'Error',
          description: 'Failed to load subscription data.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchSubscriptionData();
  }, [toast]);
  
  const handleCancelSubscription = async () => {
    if (!subscription) return;
    
    try {
      setCancelLoading(true);
      await PaymentService.cancelSubscription(subscription.id);
      
      toast({
        title: 'Subscription Cancelled',
        description: 'Your subscription will remain active until the end of the current billing period.',
      });
      
      // Update local state
      setSubscription({ ...subscription, status: 'cancelled' as Subscription['status'] });
    } catch (error) {
      console.error('Failed to cancel subscription:', error);
      toast({
        title: 'Error',
        description: 'Failed to cancel subscription. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setCancelLoading(false);
    }
  };
  
  const handleUpgradePlan = async (planId: string) => {
    if (!subscription) return;
    
    try {
      setUpgradeLoading(planId);
      
      // In a real app, this would redirect to payment page with the new plan
      // For demo purposes, we'll simulate an immediate upgrade
      const updatedSubscription = await PaymentService.updateSubscription(subscription.id, planId);
      
      toast({
        title: 'Plan Updated',
        description: 'Your subscription plan has been successfully updated!',
      });
      
      // Update local state
      setSubscription(updatedSubscription);
      
      // Refresh the page to show updated plan
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error('Failed to upgrade plan:', error);
      toast({
        title: 'Error',
        description: 'Failed to update plan. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setUpgradeLoading(null);
    }
  };
  
  const handleReactivateSubscription = async () => {
    if (!subscription) return;
    
    try {
      setCancelLoading(true);
      
      // In a real app, this would redirect to payment page
      // For demo purposes, we'll simulate reactivation
      const updatedSubscription = { ...subscription, status: 'active' as const };
      
      toast({
        title: 'Subscription Reactivated',
        description: 'Your subscription has been successfully reactivated!',
      });
      
      setSubscription(updatedSubscription);
    } catch (error) {
      console.error('Failed to reactivate subscription:', error);
      toast({
        title: 'Error',
        description: 'Failed to reactivate subscription. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setCancelLoading(false);
    }
  };
  
  const getNextBillingDate = () => {
    if (!subscription) return 'N/A';
    
    try {
      const date = new Date(subscription.currentPeriodEnd);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return 'N/A';
    }
  };
  
  if (loading) {
    return (
      <div className="space-y-6 p-4 md:p-0">
        <h1 className="text-2xl font-bold">Manage Subscription</h1>
        <Card>
          <CardContent className="p-6 text-center">
            <div className="animate-spin mx-auto w-6 h-6 mb-3">🔄</div>
            <p>Loading subscription data...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

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
            <Badge variant={subscription?.status === 'active' ? 'secondary' : 'destructive'}>
              {subscription?.status === 'active' ? 'Active' : 'Cancelled'}
            </Badge>
          </div>
          {subscription?.status === 'cancelled' && (
            <CardDescription className="text-destructive">
              Your subscription will remain active until {getNextBillingDate()}
            </CardDescription>
          )}
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
              <p>Next billing: {getNextBillingDate()}</p>
              <p>Auto-renewal: {subscription?.autoRenew ? 'On' : 'Off'}</p>
              {subscription?.status === 'cancelled' && (
                <p className="text-destructive">Cancelled</p>
              )}
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
          
          {subscription?.status === 'cancelled' && (
            <div className="pt-4">
              <Button
                className="w-full"
                onClick={handleReactivateSubscription}
                disabled={cancelLoading}
              >
                {cancelLoading ? (
                  <>
                    <span className="animate-spin mr-2">🔄</span>
                    Reactivating...
                  </>
                ) : (
                  'Reactivate Subscription'
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upgrade/Downgrade Options */}
      <Card>
        <CardHeader>
          <CardTitle>Change Plan</CardTitle>
          <CardDescription>
            Upgrade or downgrade your subscription plan. Changes take effect immediately.
          </CardDescription>
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
                  onClick={() => handleUpgradePlan(plan.id)}
                  disabled={upgradeLoading === plan.id || !subscription}
                >
                  {upgradeLoading === plan.id ? (
                    <>
                      <span className="animate-spin mr-2">🔄</span>
                      Processing...
                    </>
                  ) : plan.price > currentPlan.price ? (
                    'Upgrade to ' + plan.name
                  ) : (
                    'Downgrade to ' + plan.name
                  )}
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
      {subscription?.status === 'active' && (
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
              ({getNextBillingDate()}). You can reactivate at any time.
            </p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={cancelLoading}>
                  {cancelLoading ? (
                    <>
                      <span className="animate-spin mr-2">🔄</span>
                      Processing...
                    </>
                  ) : (
                    'Cancel Subscription'
                  )}
                </Button>
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
                  <AlertDialogAction
                    onClick={handleCancelSubscription}
                    className="bg-destructive"
                    disabled={cancelLoading}
                  >
                    {cancelLoading ? (
                      <>
                        <span className="animate-spin mr-2">🔄</span>
                        Processing...
                      </>
                    ) : (
                      'Cancel Subscription'
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      )}
    </div>
  );
}