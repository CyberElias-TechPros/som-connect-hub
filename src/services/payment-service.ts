import { SubscriptionPlan } from '@/lib/mock-data';

export interface PaymentMethod {
  id: string;
  type: 'card' | 'paypal' | 'bank';
  last4: string;
  brand: string;
  isDefault: boolean;
  expiry: string;
}

export interface BillingInfo {
  name: string;
  email: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

export interface Subscription {
  id: string;
  planId: string;
  status: 'active' | 'cancelled' | 'paused' | 'past_due';
  currentPeriodEnd: string;
  createdAt: string;
  paymentMethodId: string;
  autoRenew: boolean;
}

export interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: 'requires_payment_method' | 'requires_confirmation' | 'processing' | 'succeeded' | 'failed';
  clientSecret: string;
  created: number;
}

// Mock payment methods
const mockPaymentMethods: PaymentMethod[] = [
  {
    id: 'pm_123',
    type: 'card',
    last4: '4242',
    brand: 'Visa',
    isDefault: true,
    expiry: '12/28',
  },
];

// Mock subscription
const mockSubscription: Subscription = {
  id: 'sub_123',
  planId: 'premium-monthly',
  status: 'active',
  currentPeriodEnd: '2025-02-15T00:00:00Z',
  createdAt: '2024-12-15T00:00:00Z',
  paymentMethodId: 'pm_123',
  autoRenew: true,
};

// Mock billing info
const mockBillingInfo: BillingInfo = {
  name: 'David Emmanuel',
  email: 'david.emmanuel@example.com',
  address: '123 Faith Avenue',
  city: 'Lagos',
  state: 'Lagos',
  zip: '100001',
  country: 'Nigeria',
};

export const PaymentService = {
  // Get all payment methods for current user
  async getPaymentMethods(): Promise<PaymentMethod[]> {
    // In a real app, this would be an API call
    return new Promise((resolve) => {
      setTimeout(() => resolve(mockPaymentMethods), 500);
    });
  },

  // Add a new payment method
  async addPaymentMethod(paymentMethod: Omit<PaymentMethod, 'id'>): Promise<PaymentMethod> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const newMethod = {
          ...paymentMethod,
          id: `pm_${Date.now()}`,
        };
        mockPaymentMethods.push(newMethod);
        resolve(newMethod);
      }, 500);
    });
  },

  // Get current subscription
  async getCurrentSubscription(): Promise<Subscription | null> {
    return new Promise((resolve) => {
      setTimeout(() => resolve(mockSubscription), 500);
    });
  },

  // Create a new subscription
  async createSubscription(planId: string, paymentMethodId: string): Promise<Subscription> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const newSubscription: Subscription = {
          id: `sub_${Date.now()}`,
          planId,
          status: 'active',
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          createdAt: new Date().toISOString(),
          paymentMethodId,
          autoRenew: true,
        };
        resolve(newSubscription);
      }, 500);
    });
  },

  // Update subscription plan
  async updateSubscription(subscriptionId: string, newPlanId: string): Promise<Subscription> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          ...mockSubscription,
          planId: newPlanId,
        });
      }, 500);
    });
  },

  // Cancel subscription
  async cancelSubscription(subscriptionId: string): Promise<Subscription> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          ...mockSubscription,
          status: 'cancelled',
        });
      }, 500);
    });
  },

  // Create payment intent for secure payment processing
  async createPaymentIntent(amount: number, currency: string = 'USD'): Promise<PaymentIntent> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          id: `pi_${Date.now()}`,
          amount,
          currency,
          status: 'requires_payment_method',
          clientSecret: `pi_${Date.now()}_secret_${Math.random().toString(36).substring(2, 10)}`,
          created: Date.now(),
        });
      }, 500);
    });
  },

  // Confirm payment with payment method
  async confirmPayment(paymentIntentId: string, paymentMethodId: string): Promise<PaymentIntent> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          id: paymentIntentId,
          amount: 999, // $9.99 in cents
          currency: 'USD',
          status: 'succeeded',
          clientSecret: `pi_${paymentIntentId}_secret_confirmed`,
          created: Date.now(),
        });
      }, 1000);
    });
  },

  // Get billing information
  async getBillingInfo(): Promise<BillingInfo> {
    return new Promise((resolve) => {
      setTimeout(() => resolve(mockBillingInfo), 500);
    });
  },

  // Update billing information
  async updateBillingInfo(billingInfo: BillingInfo): Promise<BillingInfo> {
    return new Promise((resolve) => {
      setTimeout(() => {
        Object.assign(mockBillingInfo, billingInfo);
        resolve(mockBillingInfo);
      }, 500);
    });
  },

  // Validate payment method (mock validation)
  async validatePaymentMethod(cardNumber: string, expiry: string, cvc: string): Promise<boolean> {
    return new Promise((resolve) => {
      setTimeout(() => {
        // Simple validation for demo purposes
        const isValid = cardNumber.length === 16 && expiry.length === 5 && cvc.length === 3;
        resolve(isValid);
      }, 500);
    });
  },

  // Get available subscription plans
  async getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve([
          {
            id: 'basic-monthly',
            name: 'Basic',
            price: 4.99,
            interval: 'monthly',
            features: [
              'Access to all public content',
              'Daily confessions & ROR',
              'Community access',
              'Standard quality streaming',
            ],
          },
          {
            id: 'premium-monthly',
            name: 'Premium',
            price: 9.99,
            interval: 'monthly',
            features: [
              'Everything in Basic',
              'Exclusive premium content',
              'HD quality streaming',
              'Offline downloads',
              'Ad-free experience',
              'Early access to new content',
            ],
            isPopular: true,
          },
          {
            id: 'premium-annually',
            name: 'Premium Annual',
            price: 99.99,
            interval: 'annually',
            features: [
              'Everything in Premium Monthly',
              'Save 17% with annual billing',
              'Priority support',
              'Exclusive annual member events',
            ],
          },
        ]);
      }, 500);
    });
  },
};