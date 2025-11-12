/**
 * Host Payout Service - PayPal Sandbox Integration
 * 
 * Handles host payouts/withdrawals to PayPal
 * For sandbox mode, simulates PayPal payouts
 */

import { doc, getDoc, updateDoc, addDoc, collection } from 'firebase/firestore';
import { db } from './firebase';
import { createTransaction } from './firestore';
import type { Transaction } from '@/types';

/**
 * Request withdrawal from wallet to PayPal
 * 
 * For sandbox: Creates withdrawal transaction and deducts from wallet
 * In production: Would call PayPal Payouts API via Firebase Functions
 */
export const requestWithdrawal = async (
  userId: string,
  amount: number
): Promise<{ success: boolean; transactionId: string }> => {
  try {
    // Get user's current wallet balance
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) {
      throw new Error('User not found');
    }

    const userData = userDoc.data();
    const currentBalance = userData.walletBalance || 0;
    const paypalEmail = userData.paypalEmail;
    const paypalVerified = userData.paypalEmailVerified;

    // Validate withdrawal
    if (!paypalEmail || !paypalVerified) {
      throw new Error('Please link and verify your PayPal account in account settings before requesting withdrawal.');
    }

    if (amount <= 0) {
      throw new Error('Withdrawal amount must be greater than 0');
    }

    if (amount > currentBalance) {
      throw new Error(`Insufficient balance. Available: ₱${currentBalance.toFixed(2)}, Requested: ₱${amount.toFixed(2)}`);
    }

    // Calculate new balance
    const newBalance = currentBalance - amount;

    // Create withdrawal transaction
    const transactionId = await createTransaction({
      userId,
      type: 'withdrawal',
      amount,
      description: `Withdrawal to PayPal (${paypalEmail})`,
      status: 'completed', // In sandbox, we simulate immediate completion
      paymentMethod: 'paypal',
      paymentId: `WITHDRAWAL-${Date.now()}`, // Simulated payout ID
    });

    // Update wallet balance
    await updateDoc(doc(db, 'users', userId), {
      walletBalance: newBalance
    });

    return {
      success: true,
      transactionId
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

