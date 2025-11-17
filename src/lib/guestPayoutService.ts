/**
 * Guest Payout Service - Client-side Implementation
 * 
 * Handles guest withdrawals from e-wallet to PayPal
 * Creates withdrawal request that admin can process manually via PayPal Payouts API
 * 
 * NOTE: PayPal Payouts API requires server-side implementation with API secrets.
 * This creates a pending withdrawal request that admin processes manually.
 */

import { doc, getDoc, updateDoc, collection, addDoc, query, where, getDocs, orderBy, runTransaction, or } from 'firebase/firestore';
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
import { notifyWithdrawalRequest, notifyAdminWithdrawalRequest } from './notifications';
import { logPayPalEvent } from './paypalLogger';
import { getPayPalLink } from './paypalLinks';

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
 * @param guestPaysFees - Optional: Override fee configuration (if true, guest pays fees)
 * @returns Transaction ID and success status
 * 
 * CRITICAL REQUIREMENTS:
 * - Guest MUST have a linked PayPal account (paypalEmail and paypalEmailVerified or paypalOAuthVerified)
 * - Admin MUST have a linked PayPal account (adminPayPalEmail and adminPayPalEmailVerified or adminPayPalOAuthVerified)
 * - Uses guest's linked PayPal email (not manual input)
 * - Uses admin's linked PayPal email as source of funds
 */
export const requestGuestWithdrawal = async (
  userId: string,
  amount: number
): Promise<{ success: boolean; transactionId: string; newBalance: number; message: string; fee: number; amountReceived: number }> => {
  try {
    console.log(`🔄 Guest withdrawal request initiated:`, {
      userId,
      amount,
      note: 'No fees - exact amount transfer'
    });

    if (amount <= 0) {
      throw new Error('Withdrawal amount must be greater than 0');
    }

    // Get user document to verify linked PayPal account
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) {
      throw new Error('User not found');
    }

    const userData = userDoc.data();
    const guestLink = getPayPalLink(userData as any, 'guest');
    const paypalEmail = guestLink?.email?.toLowerCase().trim();
    const isGuestPayPalLinked = !!paypalEmail;
    
    console.log(`🔍 Guest PayPal verification (AUTOMATIC):`, {
      guestPayPalEmail: paypalEmail || 'NOT SET',
      payerId: guestLink?.payerId,
      isLinked: isGuestPayPalLinked,
      source: 'Automatically retrieved from user profile'
    });

    if (!isGuestPayPalLinked || !paypalEmail) {
      throw new Error('You must link your PayPal account before requesting a withdrawal. Please link your PayPal account in your account settings.');
    }

    console.log(`✅ Guest PayPal automatically retrieved and verified: ${paypalEmail}`);

    // NO FEES - Simple withdrawal: guest receives exactly what they request
    // Amount to send = what guest wants to receive = what gets deducted from both wallets
    const amountToSend = amount;
    const walletDeductionAmount = amount;
    const amountGuestReceives = amount;
    const fee = 0; // No fees

    // Convert to centavos for storage
    const walletDeductionCentavos = phpToCentavos(walletDeductionAmount);
    const amountCentavos = phpToCentavos(amount);
    const feeCentavos = 0; // No fees

    // AUTOMATIC: Get admin's linked PayPal account (source of funds)
    // No manual input required - system automatically uses the admin's linked PayPal
    const adminUsersQuery = query(
      collection(db, 'users'),
      or(
        where('role', '==', 'admin'),
        where('roles', 'array-contains', 'admin')
      )
    );
    const adminUsersSnapshot = await getDocs(adminUsersQuery);
    
    if (adminUsersSnapshot.empty) {
      throw new Error('Admin account not found. Cannot process withdrawal.');
    }
    
    const adminUserDoc = adminUsersSnapshot.docs[0];
    const adminData = adminUserDoc.data();
    const adminLink = getPayPalLink(adminData as any, 'admin');
    const adminPayPalEmail = adminLink?.email || null;
    const isAdminPayPalLinked = !!adminPayPalEmail;
    
    console.log(`🔍 Admin PayPal verification (AUTOMATIC):`, {
      adminUserId: adminUserDoc.id,
      adminPayPalEmail: adminPayPalEmail || 'NOT SET',
      payerId: adminLink?.payerId,
      isLinked: isAdminPayPalLinked,
      source: 'Automatically retrieved from admin profile'
    });

    if (!isAdminPayPalLinked || !adminPayPalEmail) {
      throw new Error('Admin PayPal account is not linked. Please contact support.');
    }

    console.log(`✅ Admin PayPal automatically retrieved and verified: ${adminPayPalEmail}`);

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

    console.log(`✅ No pending withdrawals found - proceeding with new request`);

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
        paypalEmail: paypalEmail, // Guest's linked PayPal email (destination)
        adminPayPalEmail: adminPayPalEmail, // Admin's linked PayPal email (source)
        createdAt: new Date().toISOString(),
        // Payout tracking fields
        payoutStatus: 'pending', // Will be updated by admin when processing
        payoutMethod: 'paypal',
      };

      console.log(`📝 Transaction data prepared:`, {
        transactionId: transactionRef.id,
        amountToSendCentavos: phpToCentavos(amountToSend),
        amountToSendPHP: amountToSend.toFixed(2),
        walletDeductionCentavos,
        walletDeductionPHP: walletDeductionAmount.toFixed(2),
        fee: 0,
        guestPayPalEmail: paypalEmail,
        adminPayPalEmail: adminPayPalEmail,
        note: 'No fees - exact amount transfer'
      });

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

    console.log('✅ Guest withdrawal request created:', {
      userId,
      transactionId: result.transactionId,
      withdrawalAmount: amount,
      walletDeduction: walletDeductionAmount,
      amountGuestReceives: amountGuestReceives,
      guestPayPalEmail: paypalEmail,
      adminPayPalEmail: adminPayPalEmail,
      oldBalancePHP: result.currentBalance,
      newBalancePHP: result.newBalance,
      status: 'pending',
      note: 'No fees - exact amount transfer. All amounts stored as INTEGER CENTAVOS in Firestore. Admin wallet will be deducted when withdrawal is approved.'
    });

    await logPayPalEvent({
      action: 'guest-withdrawal-request',
      payerRole: 'admin',
      payerEmail: adminPayPalEmail,
      receiverRole: 'guest',
      receiverEmail: paypalEmail,
      amountPHP: amount,
      transactionId: result.transactionId,
      status: 'pending',
      notes: {
        walletBalanceBefore: result.currentBalance,
        walletBalanceAfter: result.newBalance
      }
    });

    // Send notifications
    try {
      // Notify guest about withdrawal request
      await notifyWithdrawalRequest(userId, result.transactionId, amount, paypalEmail, 'guest');
      
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
            notifyAdminWithdrawalRequest(admin.id, result.transactionId, amount, userId, paypalEmail, 'guest')
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

    const message = `Withdrawal request of ₱${amount.toFixed(2)} submitted successfully! You will receive ₱${amountGuestReceives.toFixed(2)} (no fees). Your wallet balance will be deducted once the admin confirms the withdrawal. Funds will be sent to ${paypalEmail} once processed.`;

    return {
      success: true,
      transactionId: result.transactionId,
      newBalance: result.newBalance, // Return PHP for UI
      fee: 0, // No fees
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

