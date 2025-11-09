/**
 * Billing Service for Host Subscriptions
 * 
 * Handles host plan subscriptions, payments, and billing management
 * Uses PayPal Sandbox for payment processing
 */

import { doc, getDoc, updateDoc, collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { db } from './firebase';
import { createTransaction } from './firestore';
import type { HostPlan, HostSubscription, Transaction } from '@/types';

/**
 * Available host plans
 */
export const HOST_PLANS: HostPlan[] = [
  {
    id: 'active-host-monthly',
    name: 'Active Host',
    description: 'Full access to host properties and manage listings',
    price: 699,
    billingCycle: 'monthly',
    features: [
      'Unlimited listings',
      'Priority support',
      'Advanced analytics',
      'Marketing tools',
      'Booking management'
    ],
    isActive: true
  },
  {
    id: 'active-host-yearly',
    name: 'Active Host',
    description: 'Full access to host properties and manage listings (Yearly)',
    price: 6990, // 10 months price (2 months free)
    billingCycle: 'yearly',
    features: [
      'Unlimited listings',
      'Priority support',
      'Advanced analytics',
      'Marketing tools',
      'Booking management',
      'Save 2 months (17% discount)'
    ],
    isActive: true
  }
];

/**
 * Get available host plans
 */
export const getAvailablePlans = (): HostPlan[] => {
  return HOST_PLANS.filter(plan => plan.isActive);
};

/**
 * Get plan by ID
 */
export const getPlanById = (planId: string): HostPlan | null => {
  return HOST_PLANS.find(plan => plan.id === planId) || null;
};

/**
 * Create or update host subscription
 */
export const createHostSubscription = async (
  userId: string,
  planId: string,
  paymentId: string,
  transactionId: string
): Promise<string> => {
  try {
    const plan = getPlanById(planId);
    if (!plan) {
      throw new Error('Invalid plan selected');
    }

    // Calculate subscription dates
    const startDate = new Date();
    const endDate = new Date();
    
    if (plan.billingCycle === 'monthly') {
      endDate.setMonth(endDate.getMonth() + 1);
    } else {
      endDate.setFullYear(endDate.getFullYear() + 1);
    }

    const nextBillingDate = new Date(endDate);

    // Check if user already has a subscription
    const existingSubQuery = query(
      collection(db, 'subscriptions'),
      where('userId', '==', userId),
      where('status', '==', 'active')
    );
    const existingSubs = await getDocs(existingSubQuery);

    let subscriptionId: string;

    if (!existingSubs.empty) {
      // Update existing subscription
      const existingSub = existingSubs.docs[0];
      subscriptionId = existingSub.id;
      
      await updateDoc(doc(db, 'subscriptions', subscriptionId), {
        planId: plan.id,
        planName: plan.name,
        amount: plan.price,
        billingCycle: plan.billingCycle,
        status: 'active',
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        nextBillingDate: nextBillingDate.toISOString(),
        paymentMethod: 'paypal',
        paymentId,
        transactionId,
        updatedAt: new Date().toISOString()
      });
    } else {
      // Create new subscription
      const subscriptionData: Omit<HostSubscription, 'id'> = {
        userId,
        planId: plan.id,
        planName: plan.name,
        amount: plan.price,
        billingCycle: plan.billingCycle,
        status: 'active',
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        nextBillingDate: nextBillingDate.toISOString(),
        paymentMethod: 'paypal',
        paymentId,
        transactionId,
        createdAt: startDate.toISOString(),
        updatedAt: startDate.toISOString()
      };

      const docRef = await addDoc(collection(db, 'subscriptions'), subscriptionData);
      subscriptionId = docRef.id;
    }

    return subscriptionId;
  } catch (error: any) {
    console.error('Error creating subscription:', error);
    throw new Error(error.message || 'Failed to create subscription');
  }
};

/**
 * Get user's active subscription
 */
export const getUserSubscription = async (userId: string): Promise<HostSubscription | null> => {
  try {
    const subQuery = query(
      collection(db, 'subscriptions'),
      where('userId', '==', userId),
      where('status', '==', 'active')
    );
    const snapshot = await getDocs(subQuery);

    if (snapshot.empty) {
      return null;
    }

    const subDoc = snapshot.docs[0];
    return { id: subDoc.id, ...subDoc.data() } as HostSubscription;
  } catch (error) {
    console.error('Error getting subscription:', error);
    return null;
  }
};

/**
 * Check if user has active subscription
 */
export const hasActiveSubscription = async (userId: string): Promise<boolean> => {
  const subscription = await getUserSubscription(userId);
  if (!subscription) return false;

  // Check if subscription is still valid
  if (subscription.endDate) {
    const endDate = new Date(subscription.endDate);
    return endDate > new Date();
  }

  return subscription.status === 'active';
};

/**
 * Process subscription payment
 * Creates transaction record and subscription
 */
export const processSubscriptionPayment = async (
  userId: string,
  planId: string,
  paymentId: string,
  orderId: string
): Promise<{ subscriptionId: string; transactionId: string }> => {
  try {
    const plan = getPlanById(planId);
    if (!plan) {
      throw new Error('Invalid plan selected');
    }

    // Create transaction record
    const transactionId = await createTransaction({
      userId,
      type: 'payment',
      amount: plan.price,
      description: `Host subscription: ${plan.name} (${plan.billingCycle})`,
      status: 'completed',
      paymentMethod: 'paypal',
      paymentId: orderId
    });

    // Create subscription
    const subscriptionId = await createHostSubscription(userId, planId, paymentId, transactionId);

    return { subscriptionId, transactionId };
  } catch (error: any) {
    console.error('Error processing subscription payment:', error);
    throw new Error(error.message || 'Failed to process subscription payment');
  }
};

/**
 * Cancel subscription
 */
export const cancelSubscription = async (subscriptionId: string): Promise<void> => {
  try {
    await updateDoc(doc(db, 'subscriptions', subscriptionId), {
      status: 'cancelled',
      updatedAt: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error cancelling subscription:', error);
    throw new Error(error.message || 'Failed to cancel subscription');
  }
};

/**
 * Renew subscription (for recurring billing)
 */
export const renewSubscription = async (subscriptionId: string): Promise<void> => {
  try {
    const subDoc = await getDoc(doc(db, 'subscriptions', subscriptionId));
    if (!subDoc.exists()) {
      throw new Error('Subscription not found');
    }

    const subscription = subDoc.data() as HostSubscription;
    const currentEndDate = subscription.endDate ? new Date(subscription.endDate) : new Date();
    const newEndDate = new Date(currentEndDate);

    if (subscription.billingCycle === 'monthly') {
      newEndDate.setMonth(newEndDate.getMonth() + 1);
    } else {
      newEndDate.setFullYear(newEndDate.getFullYear() + 1);
    }

    await updateDoc(doc(db, 'subscriptions', subscriptionId), {
      status: 'active',
      endDate: newEndDate.toISOString(),
      nextBillingDate: newEndDate.toISOString(),
      updatedAt: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error renewing subscription:', error);
    throw new Error(error.message || 'Failed to renew subscription');
  }
};

