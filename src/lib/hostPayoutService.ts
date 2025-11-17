/**
 * Host Payout Service - Client-side Implementation
 * 
 * Handles host payouts/withdrawals to PayPal
 * Creates withdrawal request that admin can process manually
 */

import { doc, getDoc, updateDoc, collection, addDoc, query, where, getDocs, orderBy, runTransaction } from 'firebase/firestore';
import { db } from './firebase';
import type { Transaction } from '@/types';
import { 
  phpToCentavos, 
  centavosToPHP, 
  subtractCentavos, 
  isLessThanCentavos,
  readWalletBalanceCentavos
} from './financialUtils';
import { notifyWithdrawalRequest, notifyAdminWithdrawalRequest } from './notifications';
import { logPayPalEvent } from './paypalLogger';
import { getPayPalLink } from './paypalLinks';

/**
 * Request withdrawal from wallet to PayPal
 * 
 * Client-side implementation:
 * 1. Validates withdrawal amount and user balance
 * 2. Creates withdrawal transaction with status 'pending'
 * 3. Admin can process the actual PayPal payout manually
 * 
 * NO FEES - exact amount transfer
 */
export const requestWithdrawal = async (
  userId: string,
  amount: number
): Promise<{ success: boolean; transactionId: string; payoutId?: string; fee: number; amountReceived: number; newBalance: number; message: string }> => {
  try {
    if (amount <= 0) {
      throw new Error('Withdrawal amount must be greater than 0');
    }

    // Get user's current balance and PayPal email
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) {
      throw new Error('User not found');
    }

    const userData = userDoc.data();
    
    const link = getPayPalLink(userData as any, 'host');
    const paypalEmail = link?.email || null;
    const isPayPalLinked = !!paypalEmail;

    console.log(`🔍 Host PayPal verification (AUTOMATIC):`, {
      hostPayPalEmail: paypalEmail || 'NOT SET',
      hostPayPalEmailVerified: !!link?.email,
      hostPayPalOAuthVerified: !!link?.email,
      isLinked: isPayPalLinked,
      source: 'STRICT hostPayPalEmail field (manual linking only)'
    });

    if (!isPayPalLinked) {
      throw new Error(
        'Please link and verify your PayPal account first in Host Payments. ' +
        'All host withdrawals require a linked PayPal account.'
      );
    }
    
    console.log(`✅ Host PayPal verified for withdrawal (STRICT):`, {
      userId,
      hostPayPalEmail: paypalEmail,
      linkMeta: link
    });

    // NO FEES - Simple withdrawal: host receives exactly what they request
    // Amount to send = what host wants to receive = what gets deducted from both wallets
    const amountToSend = amount;
    const walletDeductionAmount = amount;
    const amountHostReceives = amount;
    const fee = 0; // No fees

    // Convert to centavos for storage
    const walletDeductionCentavos = phpToCentavos(walletDeductionAmount);
    const amountCentavos = phpToCentavos(amount);
    const feeCentavos = 0; // No fees

    // Check if user already has a pending withdrawal request
    const pendingWithdrawalsQuery = query(
      collection(db, 'transactions'),
      where('userId', '==', userId),
      where('type', '==', 'withdrawal'),
      where('status', '==', 'pending')
    );
    const pendingWithdrawalsSnapshot = await getDocs(pendingWithdrawalsQuery);
    
    if (!pendingWithdrawalsSnapshot.empty) {
      throw new Error('You already have a pending withdrawal request. Please wait for it to be approved before requesting another withdrawal.');
    }

    // Use Firestore transaction for atomic operations
    const result = await runTransaction(db, async (transaction) => {
      // Re-read balance within transaction
      const userRef = doc(db, 'users', userId);
      const userDocTx = await transaction.get(userRef);
      if (!userDocTx.exists()) {
        throw new Error('User not found');
      }
      const userDataTx = userDocTx.data();
      const currentBalanceCentavos = readWalletBalanceCentavos(userDataTx.walletBalance);

      // Validate sufficient balance
      // NOTE: Balance is NOT deducted here - it will be deducted when admin confirms the withdrawal
      if (isLessThanCentavos(currentBalanceCentavos, walletDeductionCentavos)) {
        const currentBalancePHP = centavosToPHP(currentBalanceCentavos);
        throw new Error(`Insufficient balance. Available: ₱${currentBalancePHP.toFixed(2)}, Required: ₱${walletDeductionAmount.toFixed(2)}`);
      }

      // Create withdrawal transaction record
      // Balance will be deducted when admin confirms the withdrawal
      const transactionRef = doc(collection(db, 'transactions'));
      const transactionId = transactionRef.id;

      const transactionData: any = {
        userId,
        type: 'withdrawal',
        amount: phpToCentavos(amountToSend), // Amount admin will send (exact amount, no fees)
        walletDeduction: walletDeductionCentavos, // Amount to deduct from wallet when confirmed
        fee: 0, // No fees
        adminAbsorbsFees: true, // Not used anymore but kept for compatibility
        description: `Withdrawal request to ${paypalEmail}`,
        status: 'pending', // Admin will process and update to 'completed' or 'failed'
        paymentMethod: 'paypal',
      paypalEmail: paypalEmail.toLowerCase().trim(), // Store normalized email
        createdAt: new Date().toISOString(),
        // Payout tracking fields
        payoutStatus: 'pending', // Will be updated by admin when processing
        payoutMethod: 'paypal',
      };

      // Add transaction record atomically
      // NOTE: Wallet balance is NOT updated here - it will be deducted when admin confirms
      transaction.set(transactionRef, transactionData);

      return {
        transactionId,
        currentBalance: centavosToPHP(currentBalanceCentavos), // Return PHP for UI
        newBalance: centavosToPHP(currentBalanceCentavos), // Balance unchanged until confirmed
        currentBalanceCentavos, // Also return centavos for logging
        newBalanceCentavos: currentBalanceCentavos, // Balance unchanged until confirmed
      };
    });

    console.log(`✅ Host withdrawal request created:`, {
      userId,
      withdrawalAmount: amount,
      walletDeduction: walletDeductionAmount,
      amountHostReceives: amountHostReceives,
      transactionId: result.transactionId,
      oldBalancePHP: result.currentBalance,
      newBalancePHP: result.newBalance,
      paypalEmail,
      note: 'No fees - exact amount transfer. All amounts stored as INTEGER CENTAVOS in Firestore'
    });

    await logPayPalEvent({
      action: 'host-withdrawal-request',
      payerRole: 'admin',
      receiverRole: 'host',
      receiverEmail: paypalEmail,
      amountPHP: amount,
      transactionId: result.transactionId,
      notes: {
        walletBalanceBefore: result.currentBalance,
        walletBalanceAfter: result.newBalance
      },
      status: 'pending'
    });

    // Send notifications
    try {
      // Notify host about withdrawal request
      await notifyWithdrawalRequest(userId, result.transactionId, amount, paypalEmail, 'host');
      
      // Notify all admins about withdrawal request
      try {
        const { getDocs, collection, query, where, or } = await import('firebase/firestore');
        const { db } = await import('./firebase');
        
        // Query users with admin role
        const usersQuery = query(
          collection(db, 'users'),
          or(
            where('role', '==', 'admin'),
            where('roles', 'array-contains', 'admin')
          )
        );
        const usersSnapshot = await getDocs(usersQuery);
        const admins = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Notify all admins
        await Promise.all(
          admins.map(admin =>
            notifyAdminWithdrawalRequest(admin.id, result.transactionId, amount, userId, paypalEmail, 'host')
          )
        );
      } catch (adminNotifError) {
        console.error('Error sending admin withdrawal request notification:', adminNotifError);
        // Don't fail the withdrawal if notification fails
      }
    } catch (notificationError) {
      console.error('Error sending withdrawal request notifications:', notificationError);
      // Don't fail the withdrawal if notification fails
    }

    const message = `Withdrawal request of ₱${amount.toFixed(2)} submitted successfully! You will receive ₱${amountHostReceives.toFixed(2)} (no fees). Your wallet balance will be deducted once the admin confirms the withdrawal. Funds will be sent to ${paypalEmail} once processed.`;

    return {
      success: true,
      transactionId: result.transactionId,
      fee: 0, // No fees
      amountReceived: amountHostReceives,
      newBalance: result.newBalance,
      message,
      // No payoutId yet - will be added by admin when processing
    };
  } catch (error: any) {
    console.error('Error processing withdrawal:', error);
    
    if (error.code === 'permission-denied') {
      throw new Error('Permission denied. Please check your account permissions.');
    }
    
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

