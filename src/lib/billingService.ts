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

    // Check if user already has an active subscription (not expired)
    const existingSubQuery = query(
      collection(db, 'subscriptions'),
      where('userId', '==', userId)
    );
    const existingSubs = await getDocs(existingSubQuery);

    let subscriptionId: string;
    const now = new Date();

    // Find the most recent subscription that hasn't expired
    let activeSubscription: HostSubscription | null = null;
    let latestEndDate = new Date(0);

    existingSubs.docs.forEach((doc) => {
      const sub = { id: doc.id, ...doc.data() } as HostSubscription;
      const endDate = sub.endDate ? new Date(sub.endDate) : null;
      
      // Check if subscription hasn't expired yet
      if (endDate && endDate > now) {
        if (endDate > latestEndDate) {
          latestEndDate = endDate;
          activeSubscription = sub;
        }
      }
    });

    if (activeSubscription && latestEndDate > now) {
      // User has an active subscription that hasn't expired
      // Don't charge immediately - schedule the new plan to start when current one ends
      subscriptionId = activeSubscription.id;
      
      // Calculate new dates starting from when current subscription ends
      const newStartDate = new Date(latestEndDate);
      const newEndDate = new Date(latestEndDate);
      
      if (plan.billingCycle === 'monthly') {
        newEndDate.setMonth(newEndDate.getMonth() + 1);
      } else {
        newEndDate.setFullYear(newEndDate.getFullYear() + 1);
      }

      // Store pending plan change - will be activated when current subscription expires
      // Payment is already processed, but plan change is scheduled
      await updateDoc(doc(db, 'subscriptions', subscriptionId), {
        // Keep current subscription active until it expires
        // Store the new plan info for when current period ends
        pendingPlanId: plan.id,
        pendingPlanName: plan.name,
        pendingAmount: plan.price,
        pendingBillingCycle: plan.billingCycle,
        pendingStartDate: newStartDate.toISOString(),
        pendingEndDate: newEndDate.toISOString(),
        pendingPaymentId: paymentId,
        pendingTransactionId: transactionId,
        // Keep current plan active until endDate
        updatedAt: new Date().toISOString()
      });

      // Note: Payment is processed, but the subscription change is scheduled
      // The actual plan change will happen when the current subscription expires
      // This prevents double-charging and ensures user gets full value of current plan
    } else {
      // No active subscription or current one has expired - create/update immediately
      if (activeSubscription) {
        // Update expired subscription
        subscriptionId = activeSubscription.id;
        
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
          // Clear any pending changes
          pendingPlanId: null,
          pendingPlanName: null,
          pendingAmount: null,
          pendingBillingCycle: null,
          pendingStartDate: null,
          pendingEndDate: null,
          pendingPaymentId: null,
          pendingTransactionId: null,
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
    }

    return subscriptionId;
  } catch (error: any) {
    console.error('Error creating subscription:', error);
    throw new Error(error.message || 'Failed to create subscription');
  }
};

/**
 * Get user's active subscription (including cancelled but not yet expired)
 */
export const getUserSubscription = async (userId: string): Promise<HostSubscription | null> => {
  try {
    // Get all subscriptions for user (active or cancelled)
    const subQuery = query(
      collection(db, 'subscriptions'),
      where('userId', '==', userId)
    );
    const snapshot = await getDocs(subQuery);

    if (snapshot.empty) {
      return null;
    }

    // Find the most recent subscription that hasn't expired
    const now = new Date();
    let activeSubscription: HostSubscription | null = null;
    let latestDate = new Date(0);

    snapshot.docs.forEach((doc) => {
      const sub = { id: doc.id, ...doc.data() } as HostSubscription;
      const endDate = sub.endDate ? new Date(sub.endDate) : null;
      
      // Consider subscription if it hasn't expired yet (regardless of status)
      if (endDate && endDate > now) {
        if (endDate > latestDate) {
          latestDate = endDate;
          activeSubscription = sub;
        }
      }
    });

    return activeSubscription;
  } catch (error) {
    console.error('Error getting subscription:', error);
    return null;
  }
};

/**
 * Check if user has active subscription (including cancelled but not yet expired)
 */
export const hasActiveSubscription = async (userId: string): Promise<boolean> => {
  const subscription = await getUserSubscription(userId);
  if (!subscription) return false;

  // Check if subscription is still valid (hasn't expired)
  if (subscription.endDate) {
    const endDate = new Date(subscription.endDate);
    return endDate > new Date();
  }

  // If no end date, check status
  return subscription.status === 'active';
};

/**
 * Process subscription payment
 * Creates transaction record and subscription
 * 
 * IMPORTANT: If user has an active subscription, payment is processed but
 * the new plan is scheduled to start when current subscription expires.
 * This ensures users get full value of their current subscription period.
 */
export const processSubscriptionPayment = async (
  userId: string,
  planId: string,
  paymentId: string,
  orderId: string
): Promise<{ subscriptionId: string; transactionId: string; isScheduled?: boolean }> => {
  try {
    const plan = getPlanById(planId);
    if (!plan) {
      throw new Error('Invalid plan selected');
    }

    // Check if user has an active subscription
    const existingSubscription = await getUserSubscription(userId);
    const now = new Date();
    const hasActiveSub = existingSubscription && 
                        existingSubscription.endDate && 
                        new Date(existingSubscription.endDate) > now &&
                        existingSubscription.status !== 'cancelled';

    // Create transaction record
    // Note: Payment is always processed, but subscription activation may be scheduled
    // Subscription payments go to admin's PayPal account
    const transactionId = await createTransaction({
      userId,
      type: 'payment',
      amount: plan.price,
      description: hasActiveSub 
        ? `Host subscription: ${plan.name} (${plan.billingCycle}) - Scheduled to start when current plan expires`
        : `Host subscription: ${plan.name} (${plan.billingCycle})`,
      status: 'completed',
      paymentMethod: 'paypal',
      paymentId: orderId,
      payoutStatus: 'pending' // Will be processed by Firebase Function for admin payout
    });

    // Create or update subscription
    // This function will handle scheduling if user has active subscription
    const subscriptionId = await createHostSubscription(userId, planId, paymentId, transactionId);

    return { 
      subscriptionId, 
      transactionId,
      isScheduled: hasActiveSub || false
    };
  } catch (error: any) {
    console.error('Error processing subscription payment:', error);
    throw new Error(error.message || 'Failed to process subscription payment');
  }
};

/**
 * Cancel subscription
 * Marks subscription as cancelled but keeps it active until end date
 * Also clears any pending plan changes (user won't be charged for new plan)
 */
export const cancelSubscription = async (subscriptionId: string): Promise<void> => {
  try {
    const subDoc = await getDoc(doc(db, 'subscriptions', subscriptionId));
    if (!subDoc.exists()) {
      throw new Error('Subscription not found');
    }

    const subscription = subDoc.data() as HostSubscription;
    
    // Check if subscription is already cancelled
    if (subscription.status === 'cancelled') {
      throw new Error('Subscription is already cancelled');
    }

    // Mark as cancelled but keep status as 'active' until end date
    // This allows users to continue using features until subscription expires
    // Clear any pending plan changes - user won't be charged for new plan
    await updateDoc(doc(db, 'subscriptions', subscriptionId), {
      status: 'cancelled',
      cancelledAt: new Date().toISOString(),
      // Clear pending plan changes - subscription won't renew or change plans
      pendingPlanId: null,
      pendingPlanName: null,
      pendingAmount: null,
      pendingBillingCycle: null,
      pendingStartDate: null,
      pendingEndDate: null,
      pendingPaymentId: null,
      pendingTransactionId: null,
      // Keep endDate unchanged - subscription remains active until then
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

