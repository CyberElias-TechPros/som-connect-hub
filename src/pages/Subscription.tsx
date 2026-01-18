import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check } from 'lucide-react';
import { subscriptionPlans } from '@/lib/mock-data';

export default function Subscription() {
  const navigate = useNavigate();
  
  const handleSelectPlan = (planId: string) => {
    navigate('/payment', { state: { planId } });
  };
  
  return (
    <div className="space-y-6 p-4 md:p-0">
      <h1 className="text-2xl font-bold">Subscription Plans</h1>
      <p className="text-muted-foreground">
        Choose the perfect plan for your spiritual journey. All plans include access to our core features.
      </p>
      
      <div className="grid gap-4 md:grid-cols-3">
        {subscriptionPlans.map(plan => (
          <Card
            key={plan.id}
            className={
              plan.isCurrent
                ? 'border-2 border-primary'
                : plan.isPopular
                ? 'border-2 border-accent'
                : ''
            }
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{plan.name}</CardTitle>
                <div className="flex gap-2">
                  {plan.isPopular && <Badge className="bg-accent">Popular</Badge>}
                  {plan.isCurrent && <Badge variant="secondary">Current</Badge>}
                </div>
              </div>
              <div className="mt-2">
                <span className="text-3xl font-bold">${plan.price}</span>
                <span className="text-muted-foreground">/{plan.interval === 'monthly' ? 'mo' : 'yr'}</span>
              </div>
              {plan.interval === 'annually' && (
                <p className="text-xs text-success mt-2">Save 17% compared to monthly</p>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2">
                {plan.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <Check className="w-4 h-4 text-success shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
              {plan.isCurrent ? (
                <Button
                  className="w-full"
                  variant="secondary"
                  onClick={() => navigate('/profile')}
                >
                  Current Plan
                </Button>
              ) : (
                <Button
                  className="w-full"
                  onClick={() => handleSelectPlan(plan.id)}
                >
                  Select Plan
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Frequently Asked Questions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div>
            <h4 className="font-medium mb-1">What payment methods do you accept?</h4>
            <p className="text-muted-foreground">
              We accept all major credit cards (Visa, Mastercard, American Express) and PayPal.
            </p>
          </div>
          <div>
            <h4 className="font-medium mb-1">Is my payment information secure?</h4>
            <p className="text-muted-foreground">
              Yes, all payments are processed through our PCI-compliant payment gateway with SSL encryption.
            </p>
          </div>
          <div>
            <h4 className="font-medium mb-1">Can I cancel anytime?</h4>
            <p className="text-muted-foreground">
              Yes, you can cancel your subscription at any time from your account settings.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
