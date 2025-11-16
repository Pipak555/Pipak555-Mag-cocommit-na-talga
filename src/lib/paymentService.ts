import { doc, getDoc, updateDoc, collection, query, where, getDocs, runTransaction } from 'firebase/firestore';
import { db } from './firebase';
import { createTransaction } from './firestore';
import type { Transaction, Booking } from '@/types';
import { 
  phpToCentavos, 
  centavosToPHP, 
  addCentavos, 
  subtractCentavos, 
  isLessThanCentavos,
  readWalletBalanceCentavos,
  // Legacy functions for UI calculations
  addMoney, 
  subtractMoney, 
  roundMoney, 
  isLessThan 
} from './financialUtils';
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
    // Read balance in centavos (handles both old float and new int formats)
    const currentBalanceCentavos = readWalletBalanceCentavos(guestData.walletBalance);

    // Re-validate promo code if one was applied (ensure it's still valid when host confirms)
    // Keep price calculations in PHP for promo code validation, then convert to centavos
    let validatedTotalPrice = roundMoney(totalPrice);
    if (booking.promoCode && booking.listingId) {
      try {
        const { validatePromoCode } = await import('./promoCodeService');
        const validation = await validatePromoCode(booking.promoCode, booking.listingId);
        
        if (!validation.valid) {
          // Promo code is no longer valid - recalculate price without promo code
          console.warn('⚠️ Promo code no longer valid, recalculating price:', {
            promoCode: booking.promoCode,
            error: validation.error,
            bookingId
          });
          
          // Recalculate total price without promo code discount
          const originalPrice = roundMoney(booking.originalPrice || booking.totalPrice);
          const listingDiscountAmount = roundMoney(booking.listingDiscountAmount || 0);
          const priceAfterListingDiscount = subtractMoney(originalPrice, listingDiscountAmount);
          
          // Update booking with corrected price
          const correctedTotalPrice = priceAfterListingDiscount;
          const priceDifference = subtractMoney(roundMoney(booking.totalPrice), correctedTotalPrice);
          
          // Update booking
          await updateDoc(doc(db, 'bookings', bookingId), {
            totalPrice: correctedTotalPrice,
            promoCode: null,
            promoCodeDiscount: null,
            promoCodeDiscountAmount: null,
            discountAmount: listingDiscountAmount
          });
          
          // Use corrected price for payment
          validatedTotalPrice = correctedTotalPrice;
          
          console.log('✅ Booking price corrected:', {
            originalTotal: booking.totalPrice,
            correctedTotal: correctedTotalPrice,
            priceDifference
          });
        }
      } catch (promoError) {
        console.error('Error validating promo code during payment:', promoError);
        // Continue with original price if validation fails (don't block payment)
      }
    }

    // Convert final price to centavos for storage
    const finalTotalPriceCentavos = phpToCentavos(roundMoney(validatedTotalPrice));
    const finalTotalPrice = centavosToPHP(finalTotalPriceCentavos); // Keep PHP version for display

    // Use atomic transaction for all wallet updates
    const paymentResult = await runTransaction(db, async (transaction) => {
      // Re-read guest balance within transaction
      const guestRef = doc(db, 'users', guestId);
      const guestDocTx = await transaction.get(guestRef);
      if (!guestDocTx.exists()) {
        throw new Error('Guest user not found');
      }
      const guestDataTx = guestDocTx.data();
      const currentBalanceCentavosTx = readWalletBalanceCentavos(guestDataTx.walletBalance);

      let guestNewBalanceCentavos = currentBalanceCentavosTx;

      // If payment method is wallet, deduct from guest balance
      if (paymentMethod === 'wallet') {
        // Check if guest has sufficient balance for wallet payment
        if (isLessThanCentavos(currentBalanceCentavosTx, finalTotalPriceCentavos)) {
          const currentBalancePHP = centavosToPHP(currentBalanceCentavosTx);
          throw new Error(`Insufficient wallet balance. Required: ₱${finalTotalPrice.toFixed(2)}, Available: ₱${currentBalancePHP.toFixed(2)}. Please use PayPal to complete the payment.`);
        }

        // Deduct from guest wallet using integer subtraction
        guestNewBalanceCentavos = subtractCentavos(currentBalanceCentavosTx, finalTotalPriceCentavos);
        transaction.update(guestRef, {
          walletBalance: guestNewBalanceCentavos, // Store as integer centavos
        });
      } else {
        // PayPal payment - verify payment exists
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
      }

      // Get host's current wallet balance
      const hostRef = doc(db, 'users', booking.hostId);
      const hostDocTx = await transaction.get(hostRef);
      if (!hostDocTx.exists()) {
        throw new Error('Host user not found');
      }
      const hostDataTx = hostDocTx.data();
      const hostCurrentBalanceCentavos = readWalletBalanceCentavos(hostDataTx.walletBalance);
      const earningsPayoutMethod = hostDataTx.earningsPayoutMethod || 'wallet';
      
      let hostNewBalanceCentavos = hostCurrentBalanceCentavos;

      // Check host's payment preference
      if (earningsPayoutMethod === 'paypal' && hostDataTx.paypalEmail && hostDataTx.paypalEmailVerified) {
        // Host wants PayPal payout - don't add to wallet (will be processed separately)
        hostNewBalanceCentavos = hostCurrentBalanceCentavos;
      } else {
        // Host wants earnings in wallet (default behavior)
        hostNewBalanceCentavos = addCentavos(hostCurrentBalanceCentavos, finalTotalPriceCentavos);
        transaction.update(hostRef, {
          walletBalance: hostNewBalanceCentavos, // Store as integer centavos
        });
      }

      return {
        guestNewBalanceCentavos,
        hostNewBalanceCentavos,
        earningsPayoutMethod,
      };
    });

    // Create transaction records (outside of Firestore transaction for simplicity)
    if (paymentMethod === 'wallet') {
      await createTransaction({
        userId: guestId,
        type: 'payment',
        amount: finalTotalPriceCentavos, // Store as integer centavos
        description: `Booking payment for booking #${bookingId.slice(0, 8)}`,
        status: 'completed',
        paymentMethod: 'wallet',
        bookingId: bookingId,
      });
    }

    // Create earnings transaction for host
    await createTransaction({
      userId: booking.hostId,
      type: 'deposit',
      amount: finalTotalPriceCentavos, // Store as integer centavos
      description: `Earnings from booking #${bookingId.slice(0, 8)}`,
      status: 'completed',
      bookingId: bookingId,
      payoutStatus: paymentResult.earningsPayoutMethod === 'paypal' ? 'pending' : 'completed',
      payoutMethod: paymentResult.earningsPayoutMethod === 'paypal' ? 'paypal' : 'wallet',
    });

    const guestNewBalance = centavosToPHP(paymentResult.guestNewBalanceCentavos);
    const hostNewBalance = centavosToPHP(paymentResult.hostNewBalanceCentavos);

    // Award host points for completed booking
    try {
      const { awardHostPointsForBooking } = await import('./hostPointsService');
      await awardHostPointsForBooking(booking.hostId, bookingId, finalTotalPrice);
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
        finalTotalPricePHP: finalTotalPrice,
        finalTotalPriceCentavos,
        guestOldBalanceCentavos: currentBalanceCentavos,
        guestNewBalanceCentavos: paymentResult.guestNewBalanceCentavos,
        hostNewBalanceCentavos: paymentResult.hostNewBalanceCentavos,
        totalPrice: finalTotalPrice,
        guestNewBalance,
        hostNewBalance,
        note: 'All amounts stored as INTEGER CENTAVOS in Firestore'
      });
    }

    // Mark coupon as used if one was applied to this booking (for backward compatibility)
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
      await notifyPayment(guestId, bookingId, finalTotalPrice, 'completed');
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
      // Read balances in centavos (handles both old float and new int formats)
      const guestCurrentBalanceCentavos = readWalletBalanceCentavos(guestData.walletBalance);
      const hostCurrentBalanceCentavos = readWalletBalanceCentavos(hostData.walletBalance);

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

      // Convert total price to centavos for refund
      const totalPriceCentavos = phpToCentavos(roundMoney(totalPrice));
      
      // Refund full amount to guest using integer addition
      const guestNewBalanceCentavos = addCentavos(guestCurrentBalanceCentavos, totalPriceCentavos);
      transactionRef.update(doc(db, 'users', guestId), {
        walletBalance: guestNewBalanceCentavos // Store as integer centavos
      });

      // Deduct full amount from host (if they already received it)
      // Only deduct if host balance is sufficient, otherwise just record the debt
      let hostNewBalanceCentavos = hostCurrentBalanceCentavos;
      if (!isLessThanCentavos(hostCurrentBalanceCentavos, totalPriceCentavos)) {
        hostNewBalanceCentavos = subtractCentavos(hostCurrentBalanceCentavos, totalPriceCentavos);
        transactionRef.update(doc(db, 'users', hostId), {
          walletBalance: hostNewBalanceCentavos // Store as integer centavos
        });
      } else {
        // Record negative balance or debt
        if (import.meta.env.DEV) {
          console.warn('⚠️ Host balance insufficient for refund, recording debt');
        }
        // Still update host balance to negative (debt tracking)
        hostNewBalanceCentavos = subtractCentavos(hostCurrentBalanceCentavos, totalPriceCentavos);
        transactionRef.update(doc(db, 'users', hostId), {
          walletBalance: hostNewBalanceCentavos // Store as integer centavos
        });
      }

      return {
        guestNewBalance: centavosToPHP(guestNewBalanceCentavos), // Return PHP for UI
        hostNewBalance: centavosToPHP(hostNewBalanceCentavos), // Return PHP for UI
        guestNewBalanceCentavos, // Also return centavos for logging
        hostNewBalanceCentavos, // Also return centavos for logging
        refundAmount: totalPrice
      };
    });

    const { guestNewBalance, hostNewBalance, refundAmount, guestNewBalanceCentavos, hostNewBalanceCentavos } = refundResult;

    // Only log in development
    if (import.meta.env.DEV) {
      console.log('✅ Refund processed successfully:', {
        bookingId,
        guestId,
        hostId,
        totalPrice,
        refundAmountCentavos: phpToCentavos(roundMoney(totalPrice)),
        guestNewBalance,
        guestNewBalanceCentavos,
        hostNewBalance,
        hostNewBalanceCentavos,
        cancelledBy,
        note: 'All amounts stored as INTEGER CENTAVOS in Firestore'
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
      const currentBalance = roundMoney(userData.walletBalance || 0);
      const amountRounded = roundMoney(amount);
      const newBalance = addMoney(currentBalance, amountRounded);

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
        const currentBalance = roundMoney(userData.walletBalance || 0);
        const transactionAmount = roundMoney(transaction.amount);
        const newBalance = (transaction.type === 'deposit' || transaction.type === 'reward') 
          ? addMoney(currentBalance, transactionAmount)
          : subtractMoney(currentBalance, transactionAmount);
        
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

