/**
 * Guest Payout Service - Client-side Implementation
 * 
 * Handles guest withdrawals from e-wallet to PayPal
 * Creates withdrawal request that admin can process manually via PayPal Payouts API
 * 
 * NOTE: PayPal Payouts API requires server-side implementation with API secrets.
 * This creates a pending withdrawal request that admin processes manually.
 */

import { doc, getDoc, updateDoc, collection, addDoc, query, where, getDocs, orderBy, runTransaction } from 'firebase/firestore';
import { db } from './firebase';
import type { Transaction } from '@/types';
import { 
  phpToCentavos, 
  centavosToPHP, 
  subtractCentavos, 
  isLessThanCentavos,
  readWalletBalance,
  readWalletBalanceCentavos,
  calculatePayPalPayoutFee,
  calculateWithdrawalWithFees
} from './financialUtils';

/**
 * Get withdrawal fee configuration
 * Default: admin absorbs fees (guest receives full amount)
 */
const getFeeConfiguration = async (): Promise<{ adminAbsorbsFees: boolean }> => {
  try {
    const { getDoc, doc } = await import('firebase/firestore');
    const { db } = await import('./firebase');
    const adminSettingsDoc = await getDoc(doc(db, 'adminSettings', 'withdrawal'));
    if (adminSettingsDoc.exists()) {
      const settings = adminSettingsDoc.data();
      return {
        adminAbsorbsFees: settings?.adminAbsorbsFees !== false, // Default to true
      };
    }
  } catch (error) {
    console.warn('Could not load withdrawal fee configuration, using default (admin absorbs fees):', error);
  }
  // Default: admin absorbs fees
  return { adminAbsorbsFees: true };
};

/**
 * Request withdrawal from wallet to PayPal
 * 
 * Client-side implementation using atomic Firestore transactions:
 * 1. Validates withdrawal amount and user balance
 * 2. Validates PayPal email is provided
 * 3. Calculates PayPal payout fees
 * 4. Checks if balance is sufficient (amount + fees if guest pays fees)
 * 5. Creates withdrawal transaction with status 'pending' (atomic)
 * 6. Deducts from wallet balance immediately (atomic)
 * 7. Admin processes the actual PayPal payout manually
 * 
 * Fee handling:
 * - If adminAbsorbsFees = true: Guest receives full amount, admin pays fees
 * - If adminAbsorbsFees = false: Guest pays fees, receives amount after fees
 * 
 * All amounts are handled in integer centavos to prevent floating-point errors.
 * 
 * @param userId - User ID requesting withdrawal
 * @param amount - Amount guest wants to receive (in PHP) - admin will send this full amount
 * @param paypalEmail - PayPal email to send money to
 * @param guestPaysFees - Optional: Override fee configuration (if true, guest pays fees)
 * @returns Transaction ID and success status
 */
export const requestGuestWithdrawal = async (
  userId: string,
  amount: number,
  paypalEmail: string,
  guestPaysFees?: boolean
): Promise<{ success: boolean; transactionId: string; newBalance: number; message: string; fee: number; amountReceived: number }> => {
  try {
    if (amount <= 0) {
      throw new Error('Withdrawal amount must be greater than 0');
    }

    if (!paypalEmail || !paypalEmail.includes('@')) {
      throw new Error('Valid PayPal email is required');
    }

    // Get fee configuration
    const feeConfig = await getFeeConfiguration();
    const adminAbsorbsFees = guestPaysFees === undefined ? feeConfig.adminAbsorbsFees : !guestPaysFees;

    // Determine amounts based on who pays fees
    let walletDeductionAmount: number;
    let amountGuestReceives: number;
    let amountToSend: number; // Amount admin will send via PayPal
    let fee: number;
    
    if (adminAbsorbsFees) {
      // Admin absorbs fees: guest receives full amount, wallet deducted only the withdrawal amount
      // Amount to send = what guest wants to receive
      amountToSend = amount;
      fee = calculatePayPalPayoutFee(amountToSend);
      walletDeductionAmount = amount;
      amountGuestReceives = amount; // Guest receives full amount
    } else {
      // Guest pays fees: guest wants to receive 'amount' after fees
      // We need to calculate how much to send so guest receives 'amount' after fees
      // If we send X, fee = calculatePayPalPayoutFee(X), guest receives X - fee
      // We want: X - fee = amount, so X = amount + fee
      // But fee depends on X, so we need to iterate or approximate
      // For simplicity, calculate fee on the desired amount, then add it
      fee = calculatePayPalPayoutFee(amount);
      amountToSend = amount; // Send the amount guest wants (fees will be deducted by PayPal)
      walletDeductionAmount = amount + fee; // Deduct withdrawal + fees from wallet
      amountGuestReceives = amount - fee; // Guest receives amount minus fees
    }

    // Convert to centavos for storage
    const walletDeductionCentavos = phpToCentavos(walletDeductionAmount);
    const amountCentavos = phpToCentavos(amount);
    const feeCentavos = phpToCentavos(fee);

    // Use Firestore transaction for atomic operations
    const result = await runTransaction(db, async (transaction) => {
      // Get user's current balance within transaction
      const userRef = doc(db, 'users', userId);
      const userDoc = await transaction.get(userRef);
      
      if (!userDoc.exists()) {
        throw new Error('User not found');
      }

      const userData = userDoc.data();
      // Read balance in centavos (handles both old float and new int formats)
      const currentBalanceCentavos = readWalletBalanceCentavos(userData?.walletBalance);

      // Validate sufficient balance (check if balance covers withdrawal + fees if guest pays)
      if (isLessThanCentavos(currentBalanceCentavos, walletDeductionCentavos)) {
        const currentBalancePHP = centavosToPHP(currentBalanceCentavos);
        if (adminAbsorbsFees) {
          throw new Error(`Insufficient balance. Available: ₱${currentBalancePHP.toFixed(2)}, Required: ₱${walletDeductionAmount.toFixed(2)}`);
        } else {
          throw new Error(`Insufficient balance. Available: ₱${currentBalancePHP.toFixed(2)}, Required: ₱${walletDeductionAmount.toFixed(2)} (withdrawal: ₱${amount.toFixed(2)} + fees: ₱${fee.toFixed(2)})`);
        }
      }

      // Calculate new balance using integer subtraction (no rounding errors)
      const newBalanceCentavos = subtractCentavos(currentBalanceCentavos, walletDeductionCentavos);

      // Create withdrawal transaction record
      const transactionRef = doc(collection(db, 'transactions'));
      const transactionId = transactionRef.id;

      const transactionData: any = {
        userId,
        type: 'withdrawal',
        amount: phpToCentavos(amountToSend), // Amount admin will send (what guest receives if admin absorbs fees)
        walletDeduction: walletDeductionCentavos, // Amount deducted from wallet
        fee: feeCentavos, // PayPal payout fee
        adminAbsorbsFees, // Who pays the fees
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
      transaction.set(transactionRef, transactionData);

      // Update wallet balance atomically
      // Store as INTEGER CENTAVOS (no floats, no rounding errors)
      transaction.update(userRef, {
        walletBalance: newBalanceCentavos, // Store as integer centavos
      });

      return {
        transactionId,
        currentBalance: centavosToPHP(currentBalanceCentavos), // Return PHP for UI
        newBalance: centavosToPHP(newBalanceCentavos), // Return PHP for UI
        currentBalanceCentavos, // Also return centavos for logging
        newBalanceCentavos, // Also return centavos for logging
      };
    });

    console.log('✅ Guest withdrawal request created:', {
      userId,
      transactionId: result.transactionId,
      withdrawalAmount: amount,
      fee: fee,
      walletDeduction: walletDeductionAmount,
      amountGuestReceives: amountGuestReceives,
      adminAbsorbsFees,
      paypalEmail,
      oldBalancePHP: result.currentBalance,
      newBalancePHP: result.newBalance,
      status: 'pending',
      note: 'All amounts stored as INTEGER CENTAVOS in Firestore'
    });

    const message = adminAbsorbsFees
      ? `Withdrawal request of ₱${amount.toFixed(2)} submitted successfully! You will receive ₱${amountGuestReceives.toFixed(2)} (fees paid by admin). Funds will be sent to ${paypalEmail} once processed.`
      : `Withdrawal request submitted! You will receive ₱${amountGuestReceives.toFixed(2)} after ₱${fee.toFixed(2)} PayPal fees. Total deducted from wallet: ₱${walletDeductionAmount.toFixed(2)}. Funds will be sent to ${paypalEmail} once processed.`;

    return {
      success: true,
      transactionId: result.transactionId,
      newBalance: result.newBalance, // Return PHP for UI
      fee: fee,
      amountReceived: amountGuestReceives,
      message,
    };
  } catch (error: any) {
    console.error('❌ Error processing guest withdrawal:', error);
    
    if (error.code === 'permission-denied') {
      throw new Error('Permission denied. Please check your account permissions.');
    }
    
    throw new Error(error.message || 'Failed to process withdrawal. Please try again.');
  }
};

/**
 * Get withdrawal history for a guest
 */
export const getGuestWithdrawalHistory = async (userId: string): Promise<Transaction[]> => {
  try {
    const withdrawalsQuery = query(
      collection(db, 'transactions'),
      where('userId', '==', userId),
      where('type', '==', 'withdrawal'),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(withdrawalsQuery);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
  } catch (error) {
    console.error('Error getting guest withdrawal history:', error);
    return [];
  }
};

