import { SubscriptionPlan } from '@/lib/mock-data';
import { apiClient } from '@/lib/api-client';

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

const mockPaymentMethods: PaymentMethod[] = [
  { id: 'pm_123', type: 'card', last4: '4242', brand: 'Visa', isDefault: true, expiry: '12/28' },
];

const mockSubscription: Subscription = {
  id: 'sub_123',
  planId: 'premium-monthly',
  status: 'active',
  currentPeriodEnd: '2025-02-15T00:00:00Z',
  createdAt: '2024-12-15T00:00:00Z',
  paymentMethodId: 'pm_123',
  autoRenew: true,
};

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
  async getPaymentMethods(): Promise<PaymentMethod[]> {
    return new Promise((resolve) => { setTimeout(() => resolve(mockPaymentMethods), 300); });
  },

  async addPaymentMethod(paymentMethod: Omit<PaymentMethod, 'id'>): Promise<PaymentMethod> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const newMethod = { ...paymentMethod, id: `pm_${Date.now()}` };
        mockPaymentMethods.push(newMethod);
        resolve(newMethod);
      }, 300);
    });
  },

  async getCurrentSubscription(): Promise<Subscription | null> {
    return apiClient.tryApi(async () => {
      const data = await apiClient.get<{ subscription: any }>('/subscriptions/me');
      if (!data.subscription) return null;
      const s = data.subscription;
      return {
        id: s.id,
        planId: s.planId || s.plan_id,
        status: s.status,
        currentPeriodEnd: s.currentPeriodEnd || s.current_period_end,
        createdAt: s.currentPeriodStart || new Date().toISOString(),
        paymentMethodId: 'pm_123',
        autoRenew: s.status === 'active',
      };
    }, async () => {
      return new Promise((resolve) => { setTimeout(() => resolve(mockSubscription), 300); });
    });
  },

  async createSubscription(planId: string, paymentMethodId: string): Promise<Subscription> {
    return apiClient.tryApi(async () => {
      const data = await apiClient.post<any>('/subscriptions', { planId, paymentMethodId });
      return {
        id: data.id,
        planId: data.planId || planId,
        status: 'active' as const,
        currentPeriodEnd: new Date(Date.now() + 30*24*60*60*1000).toISOString(),
        createdAt: new Date().toISOString(),
        paymentMethodId,
        autoRenew: true,
      };
    }, async () => {
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
    });
  },

  async updateSubscription(subscriptionId: string, newPlanId: string): Promise<Subscription> {
    // For happy path, create new subscription
    return this.createSubscription(newPlanId, 'pm_123');
  },

  async cancelSubscription(subscriptionId: string): Promise<Subscription> {
    return apiClient.tryApi(async () => {
      await apiClient.post('/subscriptions/cancel', {});
      return { ...mockSubscription, status: 'cancelled' as const };
    }, async () => {
      return new Promise((resolve) => {
        setTimeout(() => { resolve({ ...mockSubscription, status: 'cancelled' }); }, 300);
      });
    });
  },

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
      }, 300);
    });
  },

  async confirmPayment(paymentIntentId: string, paymentMethodId: string): Promise<PaymentIntent> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          id: paymentIntentId,
          amount: 999,
          currency: 'USD',
          status: 'succeeded',
          clientSecret: `pi_${paymentIntentId}_secret_confirmed`,
          created: Date.now(),
        });
      }, 600);
    });
  },

  async getBillingInfo(): Promise<BillingInfo> {
    return new Promise((resolve) => { setTimeout(() => resolve(mockBillingInfo), 300); });
  },

  async updateBillingInfo(billingInfo: BillingInfo): Promise<BillingInfo> {
    return new Promise((resolve) => {
      setTimeout(() => {
        Object.assign(mockBillingInfo, billingInfo);
        resolve(mockBillingInfo);
      }, 300);
    });
  },

  async validatePaymentMethod(cardNumber: string, expiry: string, cvc: string): Promise<boolean> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const isValid = cardNumber.length >= 13 && expiry.length === 5 && cvc.length >= 3;
        resolve(isValid);
      }, 300);
    });
  },

  async getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    return apiClient.tryApi(async () => {
      const data = await apiClient.get<{ items: any[] }>('/subscriptions/plans');
      return data.items.map((p: any) => ({
        id: p.id,
        name: p.name,
        price: p.price,
        interval: p.interval,
        features: p.features || [],
        isPopular: !!p.isPopular || !!p.is_popular,
        isCurrent: false,
      }));
    }, async () => {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve([
            { id: 'basic-monthly', name: 'Basic', price: 4.99, interval: 'monthly', features: ['Access to all public content', 'Daily confessions & ROR', 'Community access', 'Standard quality streaming'] },
            { id: 'premium-monthly', name: 'Premium', price: 9.99, interval: 'monthly', features: ['Everything in Basic', 'Exclusive premium content', 'HD quality streaming', 'Offline downloads', 'Ad-free experience', 'Early access to new content'], isPopular: true },
            { id: 'premium-annually', name: 'Premium Annual', price: 99.99, interval: 'annually', features: ['Everything in Premium Monthly', 'Save 17% with annual billing', 'Priority support', 'Exclusive annual member events'] },
          ]);
        }, 300);
      });
    });
  },
};
