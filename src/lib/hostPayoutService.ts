/**
 * Host Payout Service - PayPal Sandbox Integration
 * 
 * Handles host payouts/withdrawals to PayPal
 * Calls Cloud Function to send payout via PayPal Payouts API
 */

import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';
import type { Transaction } from '@/types';

/**
 * Request withdrawal from wallet to PayPal
 * 
 * Calls Cloud Function to:
 * 1. Send payout via PayPal Payouts API to sandbox account
 * 2. Deduct from wallet balance
 * 3. Create transaction record
 */
export const requestWithdrawal = async (
  userId: string,
  amount: number
): Promise<{ success: boolean; transactionId: string; payoutId?: string }> => {
  try {
    if (amount <= 0) {
      throw new Error('Withdrawal amount must be greater than 0');
    }

    // Call Cloud Function to process withdrawal
    const requestHostWithdrawal = httpsCallable(functions, 'requestHostWithdrawal');
    const result = await requestHostWithdrawal({ amount });
    
    const data = result.data as { success: boolean; transactionId: string; payoutId?: string; message?: string };
    
    return {
      success: data.success,
      transactionId: data.transactionId,
      payoutId: data.payoutId,
    };
  } catch (error: any) {
    console.error('Error processing withdrawal:', error);
    throw new Error(error.message || 'Failed to process withdrawal');
  }
};

/**
 * Get withdrawal history for a user
 */
export const getWithdrawalHistory = async (userId: string): Promise<Transaction[]> => {
  try {
    const { query, where, getDocs, collection, orderBy } = await import('firebase/firestore');
    const withdrawalsQuery = query(
      collection(db, 'transactions'),
      where('userId', '==', userId),
      where('type', '==', 'withdrawal'),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(withdrawalsQuery);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
  } catch (error) {
    console.error('Error getting withdrawal history:', error);
    return [];
  }
};

