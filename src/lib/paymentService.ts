import { doc, getDoc, updateDoc, collection, query, where, getDocs, runTransaction } from 'firebase/firestore';
import { db } from './firebase';
import { createTransaction } from './firestore';
import type { Transaction, Booking } from '@/types';
import { 
  notifyBookingConfirmed, 
  notifyPayment, 
  notifyBookingCancelled 
} from './notifications';

/**
 * Process payment when booking is confirmed
 * 
 * This function handles the complete payment flow:
 * 1. Validates booking data
 * 2. Checks guest's wallet balance
 * 3. If wallet has sufficient balance, deducts payment from guest's wallet
 * 4. If wallet is insufficient, checks for PayPal payment transaction
 * 5. Credits host's wallet with full booking amount (100%)
 * 6. Creates transaction records for audit trail
 * 7. Sends notifications to guest
 * 
 * @param booking - The booking object to process payment for
 * @param paymentMethod - The payment method used ('wallet' or 'paypal')
 * @returns Object containing success status and new balances
 * @throws Error if booking data is invalid or guest has insufficient balance
 */
export const processBookingPayment = async (booking: Booking, paymentMethod: 'wallet' | 'paypal' = 'wallet') => {
  try {
    const { guestId, totalPrice, id: bookingId } = booking;
    
    if (!guestId || !totalPrice || totalPrice <= 0) {
      throw new Error('Invalid booking data for payment processing');
    }

    // Get guest's current wallet balance
    const guestDoc = await getDoc(doc(db, 'users', guestId));
    if (!guestDoc.exists()) {
      throw new Error('Guest user not found');
    }

    const guestData = guestDoc.data();
    const currentBalance = guestData.walletBalance || 0;

    let newBalance = currentBalance;
    
    // If payment method is PayPal, check for PayPal payment transaction
    if (paymentMethod === 'paypal') {
      // No need to check for linked PayPal account - user enters it when paying
      // Check if PayPal payment was already made
      const paypalTransactionsQuery = query(
        collection(db, 'transactions'),
        where('bookingId', '==', bookingId),
        where('type', '==', 'payment'),
        where('paymentMethod', '==', 'paypal'),
        where('status', '==', 'completed')
      );
      const paypalTx = await getDocs(paypalTransactionsQuery);
      
      if (paypalTx.empty) {
        throw new Error('PayPal payment not found. Please complete the PayPal payment first.');
      }
      
      // PayPal payment was successful, proceed with processing
      // No wallet deduction needed for PayPal payments
    } else {
      // Check if guest has sufficient balance for wallet payment
      if (currentBalance < totalPrice) {
        throw new Error(`Insufficient wallet balance. Required: ₱${totalPrice.toFixed(2)}, Available: ₱${currentBalance.toFixed(2)}. Please use PayPal to complete the payment.`);
      }

      // Deduct from guest wallet
      newBalance = currentBalance - totalPrice;
      await updateDoc(doc(db, 'users', guestId), {
        walletBalance: newBalance
      });
    }

    // Create payment transaction for guest (if not already created by PayPal)
    if (paymentMethod === 'wallet') {
      await createTransaction({
        userId: guestId,
        type: 'payment',
        amount: totalPrice,
        description: `Booking payment for booking #${bookingId.slice(0, 8)}`,
        status: 'completed',
        paymentMethod: 'wallet',
        bookingId: bookingId,
      });
    }

    // Get host's current wallet balance and payment preference
    const hostDoc = await getDoc(doc(db, 'users', booking.hostId));
    if (!hostDoc.exists()) {
      throw new Error('Host user not found');
    }

    const hostData = hostDoc.data();
    const earningsPayoutMethod = hostData.earningsPayoutMethod || 'wallet'; // Default to wallet if not set
    const hostCurrentBalance = hostData.walletBalance || 0;
    let hostNewBalance = hostCurrentBalance;

    // Check host's payment preference
    if (earningsPayoutMethod === 'paypal') {
      // Host wants earnings sent directly to PayPal
      // Check if PayPal account is linked and verified
      if (!hostData.paypalEmail || !hostData.paypalEmailVerified) {
        // Fallback to wallet if PayPal not verified
        console.warn('Host PayPal not verified, falling back to wallet');
        hostNewBalance = hostCurrentBalance + totalPrice;
        await updateDoc(doc(db, 'users', booking.hostId), {
          walletBalance: hostNewBalance
        });
      } else {
        // Create transaction with payoutStatus: 'pending' - Firebase Function will process PayPal payout
        // Don't add to wallet, let the Firebase Function handle PayPal payout
        await createTransaction({
          userId: booking.hostId,
          type: 'deposit',
          amount: totalPrice,
          description: `Earnings from booking #${bookingId.slice(0, 8)}`,
          status: 'completed',
          bookingId: bookingId,
          payoutStatus: 'pending', // Will be processed by Firebase Function
          payoutMethod: 'paypal' // Indicate this should go to PayPal
        });
        // Keep hostNewBalance as currentBalance since we're not adding to wallet
        hostNewBalance = hostCurrentBalance;
      }
    } else {
      // Host wants earnings in wallet (default behavior)
      hostNewBalance = hostCurrentBalance + totalPrice;
    await updateDoc(doc(db, 'users', booking.hostId), {
      walletBalance: hostNewBalance
    });

    // Create earnings transaction for host
    await createTransaction({
      userId: booking.hostId,
      type: 'deposit',
      amount: totalPrice,
      description: `Earnings from booking #${bookingId.slice(0, 8)}`,
      status: 'completed',
      bookingId: bookingId,
        payoutStatus: 'completed', // No payout needed, already in wallet
        payoutMethod: 'wallet'
    });
    }

    // Award host points for completed booking
    try {
      const { awardHostPointsForBooking } = await import('./hostPointsService');
      await awardHostPointsForBooking(booking.hostId, bookingId, totalPrice);
    } catch (pointsError) {
      console.error('Error awarding host points:', pointsError);
      // Don't fail payment if points award fails
    }

    // Only log in development
    if (import.meta.env.DEV) {
      console.log('✅ Payment processed successfully:', {
        bookingId,
        guestId,
        hostId: booking.hostId,
        totalPrice,
        guestNewBalance: newBalance,
        hostNewBalance
      });
    }

    // Mark coupon as used if one was applied to this booking
    if (booking.couponCode && guestData.coupons) {
      try {
        const updatedCoupons = guestData.coupons.map((coupon: any) => 
          coupon.code === booking.couponCode && !coupon.used
            ? { 
                ...coupon, 
                used: true, 
                usedAt: new Date().toISOString(), 
                usedForBookingId: bookingId 
              }
            : coupon
        );
        
        await updateDoc(doc(db, 'users', guestId), {
          coupons: updatedCoupons
        });

        if (import.meta.env.DEV) {
          console.log('✅ Coupon marked as used:', {
            couponCode: booking.couponCode,
            bookingId
          });
        }
      } catch (couponError) {
        console.error('Error marking coupon as used:', couponError);
        // Don't fail payment if coupon update fails
      }
    }

    // Award points to guest for completed booking (50 points per booking)
    try {
      const guestCurrentPoints = guestData.points || 0;
      const pointsToAward = 50; // Points for completing a booking
      const newPoints = guestCurrentPoints + pointsToAward;
      
      await updateDoc(doc(db, 'users', guestId), {
        points: newPoints
      });

      // Create reward transaction
      await createTransaction({
        userId: guestId,
        type: 'reward',
        amount: pointsToAward,
        description: `Points earned for booking #${bookingId.slice(0, 8)}`,
        status: 'completed',
        bookingId: bookingId
      });

      if (import.meta.env.DEV) {
        console.log('✅ Points awarded to guest:', {
          guestId,
          pointsAwarded: pointsToAward,
          newPoints
        });
      }
    } catch (pointsError) {
      console.error('Error awarding points:', pointsError);
      // Don't fail payment if points award fails
    }

    // Send notifications
    try {
      // Get listing title for notification
      const listingDoc = await getDoc(doc(db, 'listing', booking.listingId));
      const listingTitle = listingDoc.exists() ? listingDoc.data().title : 'Your booking';
      
      // Notify guest about booking confirmation
      await notifyBookingConfirmed(guestId, bookingId, listingTitle);
      
      // Notify guest about payment
      await notifyPayment(guestId, bookingId, totalPrice, 'completed');
    } catch (notificationError) {
      console.error('Error sending notifications:', notificationError);
      // Don't fail payment if notification fails
    }

    return {
      success: true,
      guestNewBalance: newBalance,
      hostNewBalance
    };
  } catch (error: any) {
    console.error('❌ Error processing booking payment:', error);
    throw error;
  }
};

/**
 * Process refund when booking is cancelled
 * 
 * This function handles the complete refund flow:
 * 1. Validates booking data
 * 2. Checks if payment was already made (for pending bookings, no refund needed)
 * 3. Refunds full amount to guest's wallet
 * 4. Deducts full amount from host's wallet (if they received payment)
 * 5. Creates transaction records for audit trail
 * 6. Sends notifications to guest
 * 
 * @param booking - The booking object to process refund for
 * @param cancelledBy - Who initiated the cancellation ('guest', 'host', or 'admin')
 * @param reason - Optional reason for cancellation
 * @returns Object containing success status, refund amount, and new balances
 * @throws Error if booking data is invalid or refund processing fails
 */
export const processBookingRefund = async (
  booking: Booking,
  cancelledBy: 'guest' | 'host' | 'admin',
  reason?: string
) => {
  try {
    const { guestId, hostId, totalPrice, id: bookingId, status } = booking;

    if (!guestId || !hostId || !totalPrice || totalPrice <= 0) {
      throw new Error('Invalid booking data for refund processing');
    }

    // Check if payment was already made by looking for payment transaction
    const paymentTransactionsQuery = query(
      collection(db, 'transactions'),
      where('bookingId', '==', bookingId),
      where('type', '==', 'payment'),
      where('status', '==', 'completed')
    );
    const paymentTx = await getDocs(paymentTransactionsQuery);
    
        // If no payment transaction exists, this is a pending booking - no refund needed
        if (paymentTx.empty && status === 'pending') {
          if (import.meta.env.DEV) {
            console.log('ℹ️ Pending booking cancelled - no payment was made, no refund needed');
          }
          return {
            success: true,
            refundAmount: 0,
            message: 'No payment was made for this pending booking'
          };
        }

    // Use Firestore transaction to ensure atomicity
    const refundResult = await runTransaction(db, async (transactionRef) => {
      // Get current balances within transaction
      const guestDoc = await transactionRef.get(doc(db, 'users', guestId));
      const hostDoc = await transactionRef.get(doc(db, 'users', hostId));

      if (!guestDoc.exists() || !hostDoc.exists()) {
        throw new Error('User not found for refund processing');
      }

      const guestData = guestDoc.data();
      const hostData = hostDoc.data();
      const guestCurrentBalance = guestData.walletBalance || 0;
      const hostCurrentBalance = hostData.walletBalance || 0;

      // Restore coupon if one was used for this booking
      if (booking.couponCode && guestData.coupons) {
        const updatedCoupons = guestData.coupons.map((coupon: any) => 
          coupon.code === booking.couponCode && coupon.used && coupon.usedForBookingId === bookingId
            ? { 
                ...coupon, 
                used: false, 
                usedAt: undefined, 
                usedForBookingId: undefined 
              }
            : coupon
        );
        
        transactionRef.update(doc(db, 'users', guestId), {
          coupons: updatedCoupons
        });

        if (import.meta.env.DEV) {
          console.log('✅ Coupon restored after refund:', {
            couponCode: booking.couponCode,
            bookingId
          });
        }
      }

      // Refund full amount to guest
      const guestNewBalance = guestCurrentBalance + totalPrice;
      transactionRef.update(doc(db, 'users', guestId), {
        walletBalance: guestNewBalance
      });

      // Deduct full amount from host (if they already received it)
      // Only deduct if host balance is sufficient, otherwise just record the debt
      let hostNewBalance = hostCurrentBalance;
      if (hostCurrentBalance >= totalPrice) {
        hostNewBalance = hostCurrentBalance - totalPrice;
        transactionRef.update(doc(db, 'users', hostId), {
          walletBalance: hostNewBalance
        });
      } else {
        // Record negative balance or debt
        if (import.meta.env.DEV) {
          console.warn('⚠️ Host balance insufficient for refund, recording debt');
        }
        // Still update host balance to negative (debt tracking)
        hostNewBalance = hostCurrentBalance - totalPrice;
        transactionRef.update(doc(db, 'users', hostId), {
          walletBalance: hostNewBalance
        });
      }

      return {
        guestNewBalance,
        hostNewBalance,
        refundAmount: totalPrice
      };
    });

    const { guestNewBalance, hostNewBalance, refundAmount } = refundResult;

    // Only log in development
    if (import.meta.env.DEV) {
      console.log('✅ Refund processed successfully:', {
        bookingId,
        guestId,
        hostId,
        totalPrice,
        guestNewBalance,
        hostNewBalance,
        cancelledBy
      });
    }

    // Create transaction records (outside transaction to avoid size limits)
    let refundTransactionId: string | null = null;
    try {
      // Create refund transaction for guest
      refundTransactionId = await createTransaction({
        userId: guestId,
        type: 'refund',
        amount: totalPrice,
        description: `Refund for cancelled booking #${bookingId.slice(0, 8)} (cancelled by ${cancelledBy})${reason ? `: ${reason}` : ''}`,
        status: 'completed',
        bookingId: bookingId,
        cancelledBy: cancelledBy
      });

      // Create deduction transaction for host
      await createTransaction({
        userId: hostId,
        type: 'withdrawal',
        amount: totalPrice,
        description: `Refund deduction for cancelled booking #${bookingId.slice(0, 8)}`,
        status: 'completed',
        bookingId: bookingId,
        cancelledBy: cancelledBy
      });
    } catch (transactionError) {
      console.error('⚠️ Error creating refund transaction records:', transactionError);
      // Don't fail refund if transaction record creation fails - refund is already processed
    }

    // Send notifications
    try {
      // Get listing title for notification
      const listingDoc = await getDoc(doc(db, 'listing', booking.listingId));
      const listingTitle = listingDoc.exists() ? listingDoc.data().title : 'Your booking';
      
      // Notify guest about cancellation
      await notifyBookingCancelled(guestId, bookingId, listingTitle, cancelledBy);
      
      // Notify guest about refund - use refund transaction ID if available, fallback to booking ID
      await notifyPayment(
        guestId, 
        refundTransactionId || bookingId, 
        totalPrice, 
        'refunded'
      );
    } catch (notificationError) {
      console.error('⚠️ Error sending notifications:', notificationError);
      // Don't fail refund if notification fails - refund is already processed
    }

    return {
      success: true,
      guestNewBalance,
      hostNewBalance,
      refundAmount
    };
  } catch (error: any) {
    console.error('❌ Error processing booking refund:', error);
    throw error;
  }
};

/**
 * Process refund for a transaction (admin action)
 * Refunds transaction and updates wallet balances
 * Uses Firestore transactions to ensure atomicity
 */
export const processTransactionRefund = async (
  transactionId: string,
  transaction: Transaction,
  reason?: string
) => {
  try {
    // Validate transaction status before starting
    if (transaction.status === 'refunded') {
      throw new Error('Transaction has already been refunded');
    }

    if (transaction.status !== 'completed') {
      throw new Error('Only completed transactions can be refunded');
    }

    const { userId, amount, type, bookingId } = transaction;

    // For payment transactions with booking, use the full booking refund function
    if (type === 'payment' && bookingId) {
      // Get booking to process full refund
      const bookingDoc = await getDoc(doc(db, 'bookings', bookingId));
      if (bookingDoc.exists()) {
        const booking = { id: bookingDoc.id, ...bookingDoc.data() } as Booking;
        // Use the full refund function which handles host deduction
        return await processBookingRefund(booking, 'admin', reason);
      }
    }

    // For other transaction types, use atomic transaction
    return await runTransaction(db, async (transactionRef) => {
      // Re-read transaction to check status (prevents race conditions)
      const transactionDoc = await transactionRef.get(doc(db, 'transactions', transactionId));
      if (!transactionDoc.exists()) {
        throw new Error('Transaction not found');
      }

      const currentTransaction = transactionDoc.data() as Transaction;
      
      // Double-check status within transaction (prevents double refunds)
      if (currentTransaction.status === 'refunded') {
        throw new Error('Transaction has already been refunded');
      }

      if (currentTransaction.status !== 'completed') {
        throw new Error('Only completed transactions can be refunded');
      }

      // Get user's current balance within transaction
      const userDoc = await transactionRef.get(doc(db, 'users', userId));
      if (!userDoc.exists()) {
        throw new Error('User not found');
      }

      const userData = userDoc.data();
      const currentBalance = userData.walletBalance || 0;
      const newBalance = currentBalance + amount;

      // Update wallet balance atomically
      transactionRef.update(doc(db, 'users', userId), {
        walletBalance: newBalance
      });

      // Update transaction status atomically
      transactionRef.update(doc(db, 'transactions', transactionId), {
        status: 'refunded',
        refundedAt: new Date().toISOString(),
        refundReason: reason
      });

      // Return success - transaction will commit all changes atomically
      return {
        success: true,
        newBalance,
        refundAmount: amount
      };
    }).then(async (result) => {
      // After transaction commits successfully, create refund transaction record
      // This is done outside the transaction to avoid transaction size limits
      let refundTransactionId: string | null = null;
      try {
        const refundTxId = await createTransaction({
          userId,
          type: 'refund',
          amount,
          description: `Refund for transaction #${transactionId.slice(0, 8)}${reason ? `: ${reason}` : ''} (admin refund)`,
          status: 'completed',
          originalTransactionId: transactionId
        });
        refundTransactionId = refundTxId;
      } catch (createError) {
        // Log error but don't fail - the refund has already been processed
        console.error('⚠️ Error creating refund transaction record:', createError);
      }

      // Send notification to user about refund
      try {
        await notifyPayment(
          userId, 
          refundTransactionId || transactionId, // Use refund transaction ID if available, fallback to original
          amount, 
          'refunded'
        );
      } catch (notificationError) {
        console.error('⚠️ Error sending refund notification:', notificationError);
        // Don't fail refund if notification fails - refund is already processed
      }

      console.log('✅ Transaction refund processed:', {
        transactionId,
        userId,
        amount,
        newBalance: result.newBalance,
        refundTransactionId
      });

      return result;
    });
  } catch (error: any) {
    console.error('❌ Error processing transaction refund:', error);
    throw error;
  }
};

/**
 * Confirm a pending transaction (admin action)
 */
export const confirmTransaction = async (transactionId: string) => {
  try {
    const transactionDoc = await getDoc(doc(db, 'transactions', transactionId));
    if (!transactionDoc.exists()) {
      throw new Error('Transaction not found');
    }

    const transaction = transactionDoc.data() as Transaction;
    
    if (transaction.status !== 'pending') {
      throw new Error('Only pending transactions can be confirmed');
    }

    // If it's a payment transaction with booking, process the booking payment
    if (transaction.type === 'payment' && transaction.bookingId) {
      const bookingDoc = await getDoc(doc(db, 'bookings', transaction.bookingId));
      if (bookingDoc.exists()) {
        const booking = { id: bookingDoc.id, ...bookingDoc.data() } as Booking;
        // Process the full booking payment
        await processBookingPayment(booking);
      }
    } else {
      // For other transaction types, update user wallet
      const userDoc = await getDoc(doc(db, 'users', transaction.userId));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const currentBalance = userData.walletBalance || 0;
        const newBalance = currentBalance + (transaction.type === 'deposit' || transaction.type === 'reward' ? transaction.amount : -transaction.amount);
        
        await updateDoc(doc(db, 'users', transaction.userId), {
          walletBalance: newBalance
        });
      }
    }

    // Update transaction status
    await updateDoc(doc(db, 'transactions', transactionId), {
      status: 'completed',
      confirmedAt: new Date().toISOString()
    });

    console.log('✅ Transaction confirmed:', transactionId);
    return { success: true };
  } catch (error: any) {
    console.error('❌ Error confirming transaction:', error);
    throw error;
  }
};

