import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, CreditCard, Lock, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { PaymentService, PaymentIntent } from '@/services/payment-service';
import { subscriptionPlans } from '@/lib/mock-data';

export default function Payment() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  
  // Get selected plan from location state or default to premium monthly
  const selectedPlanId = location.state?.planId || 'premium-monthly';
  const selectedPlan = subscriptionPlans.find(plan => plan.id === selectedPlanId) || subscriptionPlans[1];
  
  const [processing, setProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('new');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [nameOnCard, setNameOnCard] = useState('');
  const [paymentIntent, setPaymentIntent] = useState<PaymentIntent | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    // Create payment intent when component mounts
    const createPaymentIntent = async () => {
      try {
        const intent = await PaymentService.createPaymentIntent(selectedPlan.price * 100); // Convert to cents
        setPaymentIntent(intent);
      } catch (err) {
        console.error('Failed to create payment intent:', err);
        setError('Failed to initialize payment. Please try again.');
      }
    };
    
    createPaymentIntent();
  }, [selectedPlanId]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);
    setError(null);
    
    try {
      // Validate card information
      const isValid = await PaymentService.validatePaymentMethod(
        cardNumber.replace(/\s+/g, ''),
        expiry,
        cvc
      );
      
      if (!isValid) {
        setError('Invalid card information. Please check your details.');
        setProcessing(false);
        return;
      }
      
      // In a real app, you would use Stripe.js or similar to securely handle the payment
      // For this demo, we'll simulate the payment process
      
      if (!paymentIntent) {
        throw new Error('Payment intent not created');
      }
      
      // Simulate payment processing
      const confirmedPayment = await PaymentService.confirmPayment(
        paymentIntent.id,
        `pm_${Date.now()}` // Mock payment method ID
      );
      
      if (confirmedPayment.status === 'succeeded') {
        // Create subscription
        await PaymentService.createSubscription(selectedPlanId, `pm_${Date.now()}`);
        
        setPaymentSuccess(true);
        
        // Show success toast
        toast({
          title: 'Payment Successful',
          description: `Your ${selectedPlan.name} subscription has been activated!`,
        });
        
        // Redirect to profile after 2 seconds
        setTimeout(() => {
          navigate('/profile');
        }, 2000);
      } else {
        setError('Payment failed. Please try again.');
      }
    } catch (err) {
      console.error('Payment error:', err);
      setError('Payment failed. Please try again.');
      toast({
        title: 'Payment Failed',
        description: 'There was an error processing your payment.',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };
  
  const formatCardNumber = (value: string) => {
    // Add spaces every 4 digits
    return value.replace(/\W/gi, '').replace(/(.{4})/g, '$1 ').trim();
  };
  
  const formatExpiry = (value: string) => {
    // Add slash after 2 digits
    const v = value.replace(/\W/gi, '');
    if (v.length > 2) {
      return `${v.substring(0, 2)}/${v.substring(2, 4)}`;
    }
    return v;
  };
  
  if (paymentSuccess) {
    return (
      <div className="space-y-6 p-4 md:p-0 max-w-md mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-success">
              <CheckCircle className="w-5 h-5" />
              Payment Successful!
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <div className="space-y-2">
              <p className="text-lg font-semibold">Thank you for your payment!</p>
              <p className="text-muted-foreground">
                Your {selectedPlan.name} subscription has been activated.
              </p>
              <p className="text-sm text-muted-foreground">
                You now have access to all premium features.
              </p>
            </div>
            <Button
              className="w-full"
              onClick={() => navigate('/profile')}
            >
              Go to Profile
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="space-y-6 p-4 md:p-0 max-w-md mx-auto">
      <Button
        variant="ghost"
        className="gap-2 -ml-2"
        onClick={() => navigate(-1)}
        disabled={processing}
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </Button>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Payment Details
          </CardTitle>
          <CardDescription>
            Complete your payment for {selectedPlan.name} subscription
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 p-3 bg-muted rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">{selectedPlan.name}</p>
                <p className="text-sm text-muted-foreground">
                  ${selectedPlan.price} / {selectedPlan.interval}
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">${selectedPlan.price}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </div>
          </div>
          
          {error && (
            <div className="mb-4 p-3 bg-destructive/10 text-destructive rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">{error}</span>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Card Number</Label>
              <Input
                placeholder="4242 4242 4242 4242"
                value={formatCardNumber(cardNumber)}
                onChange={(e) => setCardNumber(e.target.value)}
                maxLength={19}
                required
                disabled={processing}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Expiry</Label>
                <Input
                  placeholder="MM/YY"
                  value={formatExpiry(expiry)}
                  onChange={(e) => setExpiry(e.target.value)}
                  maxLength={5}
                  required
                  disabled={processing}
                />
              </div>
              <div>
                <Label>CVC</Label>
                <Input
                  placeholder="123"
                  value={cvc}
                  onChange={(e) => setCvc(e.target.value)}
                  maxLength={3}
                  required
                  disabled={processing}
                />
              </div>
            </div>
            <div>
              <Label>Name on Card</Label>
              <Input
                placeholder="John Doe"
                value={nameOnCard}
                onChange={(e) => setNameOnCard(e.target.value)}
                required
                disabled={processing}
              />
            </div>
            
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Lock className="w-3 h-3" />
              Secured by Espees Payment Gateway - PCI Compliant
            </div>
            
            <Button
              type="submit"
              className="w-full"
              disabled={processing}
            >
              {processing ? (
                <>
                  <span className="animate-spin mr-2">🔄</span>
                  Processing Payment...
                </>
              ) : (
                <>
                  Pay ${selectedPlan.price}
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Payment Information</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>✓ Secure SSL encryption</p>
          <p>✓ PCI DSS compliant</p>
          <p>✓ No sensitive data stored on our servers</p>
          <p>✓ 3D Secure authentication supported</p>
        </CardContent>
      </Card>
    </div>
  );
}
