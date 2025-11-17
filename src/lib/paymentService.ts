import { doc, getDoc, updateDoc, collection, query, where, getDocs, runTransaction, or } from 'firebase/firestore';
import { db } from './firebase';
import { createTransaction } from './firestore';
import type { Transaction, Booking, PayPalRole } from '@/types';
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
  notifyBookingCancelled,
  notifyWithdrawalConfirmed,
  notifyWithdrawalFailed
} from './notifications';
import { calculateRefundEligibility, getRefundStatus } from './cancellationPolicy';
import { createRefundLog, hasBookingBeenRefunded } from './refundLogs';
import { logPayPalEvent } from './paypalLogger';
import { getPayPalLink, buildClientLinkedInfo, getPayPalLinkPath } from './paypalLinks';

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

    // For PayPal payments, verify payment exists BEFORE transaction (can't use getDocs inside transaction)
    if (paymentMethod === 'paypal') {
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

    // Use atomic transaction for all wallet updates
    // IMPORTANT: All reads must be executed before all writes in Firestore transactions
    const paymentResult = await runTransaction(db, async (transaction) => {
      // ========== ALL READS FIRST ==========
      // Read guest document
      const guestRef = doc(db, 'users', guestId);
      const guestDocTx = await transaction.get(guestRef);
      if (!guestDocTx.exists()) {
        throw new Error('Guest user not found');
      }
      const guestDataTx = guestDocTx.data();
      const currentBalanceCentavosTx = readWalletBalanceCentavos(guestDataTx.walletBalance);

      // Read host document
      const hostRef = doc(db, 'users', booking.hostId);
      const hostDocTx = await transaction.get(hostRef);
      if (!hostDocTx.exists()) {
        throw new Error('Host user not found');
      }
      const hostDataTx = hostDocTx.data();
      const hostCurrentBalanceCentavos = readWalletBalanceCentavos(hostDataTx.walletBalance);
      const earningsPayoutMethod = hostDataTx.earningsPayoutMethod || 'wallet';

      // ========== VALIDATION ==========
      // If payment method is wallet, check if guest has sufficient balance
      if (paymentMethod === 'wallet') {
        if (isLessThanCentavos(currentBalanceCentavosTx, finalTotalPriceCentavos)) {
          const currentBalancePHP = centavosToPHP(currentBalanceCentavosTx);
          throw new Error(`Insufficient wallet balance. Required: ₱${finalTotalPrice.toFixed(2)}, Available: ₱${currentBalancePHP.toFixed(2)}. Please use PayPal to complete the payment.`);
        }
      }

      // ========== ALL WRITES AFTER ALL READS ==========
      let guestNewBalanceCentavos = currentBalanceCentavosTx;
      let hostNewBalanceCentavos = hostCurrentBalanceCentavos;

      // Update guest wallet (if wallet payment)
      if (paymentMethod === 'wallet') {
        guestNewBalanceCentavos = subtractCentavos(currentBalanceCentavosTx, finalTotalPriceCentavos);
        transaction.update(guestRef, {
          walletBalance: guestNewBalanceCentavos, // Store as integer centavos
        });
      }

      // Update host wallet (if not PayPal payout)
      // Use host-specific PayPal fields (separate from guest PayPal)
      const hostPayPalLink = getPayPalLink(hostDataTx as any, 'host');
      if (earningsPayoutMethod !== 'paypal' || !hostPayPalLink?.email) {
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
        guestOldBalanceCentavos: currentBalanceCentavos, // From initial read (line 61)
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
      guestNewBalance,
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
 * This function handles the complete refund flow with cancellation policy:
 * 1. Validates booking data and prevents duplicate refunds
 * 2. Checks if booking is already cancelled
 * 3. Calculates refund eligibility based on cancellation policy (48h/24h cutoff)
 * 4. Checks if payment was already made (for pending bookings, no refund needed)
 * 5. Refunds eligible amount to guest's wallet (0%, 50%, or 100% based on policy)
 * 6. Deducts eligible amount from host's wallet (if they received payment)
 * 7. Updates booking with refund status
 * 8. Creates transaction records and refund logs for audit trail
 * 9. Sends notifications to guest and admin
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
  // Extract variables at function scope so they're available in catch block
  const { getAuth } = await import('firebase/auth');
  const auth = getAuth();
  const { guestId, hostId, totalPrice, id: bookingId, status } = booking;
  
  try {
    // Debug: Log auth state and booking info
    if (import.meta.env.DEV) {
      console.log('🔍 processBookingRefund debug:', {
        currentUser: auth.currentUser?.uid,
        bookingId: booking.id,
        bookingGuestId: booking.guestId,
        bookingHostId: booking.hostId,
        cancelledBy,
        isAuthenticated: !!auth.currentUser,
        isGuestOwner: auth.currentUser?.uid === booking.guestId,
        isHostOwner: auth.currentUser?.uid === booking.hostId
      });
    }

    // ========== VALIDATION ==========
    if (!guestId || !hostId || !totalPrice || totalPrice <= 0) {
      throw new Error('Invalid booking data for refund processing');
    }

    // Check if booking is already cancelled (prevent duplicate processing)
    if (status === 'cancelled') {
      // Check if refund was already processed
      const alreadyRefunded = await hasBookingBeenRefunded(bookingId, guestId);
      if (alreadyRefunded) {
        throw new Error('This booking has already been refunded');
      }
      // If cancelled but not refunded yet, continue with refund processing
    }

    // Check if booking is completed (cannot refund completed bookings)
    if (status === 'completed') {
      throw new Error('Cannot refund a completed booking');
    }

    // Check if refund was already processed (duplicate prevention)
    console.log('🔍 Checking if booking has already been refunded...');
    let alreadyRefunded = false;
    try {
      alreadyRefunded = await hasBookingBeenRefunded(bookingId, guestId);
      console.log('✅ Refund check completed:', { alreadyRefunded, bookingId, guestId });
    } catch (refundCheckError: any) {
      console.error('⚠️ Error checking refund status (non-critical, proceeding anyway):', refundCheckError);
      console.error('   Error code:', refundCheckError.code);
      console.error('   Error message:', refundCheckError.message);
      // Don't block refund if we can't check - allow refund to proceed
      // This handles cases where rules aren't deployed yet or there's a temporary permission issue
      alreadyRefunded = false;
    }
    
    if (alreadyRefunded) {
      throw new Error('Refund has already been processed for this booking');
    }

    // Check if payment was already made by looking for payment transaction
    // CRITICAL: Must filter by userId to match Firestore security rules (allow list requires userId match)
    const paymentTransactionsQuery = query(
      collection(db, 'transactions'),
      where('bookingId', '==', bookingId),
      where('userId', '==', guestId), // Add userId filter to match security rules
      where('type', '==', 'payment'),
      where('status', '==', 'completed')
    );
    console.log('🔍 Querying payment transactions...', { bookingId, guestId });
    const paymentTx = await getDocs(paymentTransactionsQuery);
    console.log('✅ Payment transaction query completed:', { count: paymentTx.size, empty: paymentTx.empty });
    
    // Get original payment method if available (FOR LOGGING/AUDIT ONLY - NOT USED FOR REFUND PROCESSING)
    // CRITICAL: Refunds ALWAYS use wallet balance ONLY, regardless of original payment method
    // We do NOT use PayPal, PayPal Sandbox, or any external payment gateway for refunds
    // All refunds are processed through internal wallet balance system only
    const originalPaymentMethod = paymentTx.empty 
      ? undefined 
      : (paymentTx.docs[0].data().paymentMethod as 'wallet' | 'paypal' | 'gcash' | undefined);

    // If no payment transaction exists, this is a pending booking - no refund needed
    if (paymentTx.empty && status === 'pending') {
      if (import.meta.env.DEV) {
        console.log('ℹ️ Pending booking cancelled - no payment was made, no refund needed');
      }
      
      // Update booking with refund status
      await updateDoc(doc(db, 'bookings', bookingId), {
        refundStatus: 'not_eligible',
        refundAmount: 0
      });

      // Create refund log for audit
      await createRefundLog({
        bookingId,
        guestId,
        hostId,
        listingId: booking.listingId,
        originalAmount: totalPrice,
        refundAmount: 0,
        refundPercentage: 0,
        refundStatus: 'not_eligible',
        cancelledBy,
        cancellationReason: reason,
        refundReason: 'No payment was made for this pending booking',
        hoursUntilCheckIn: 0,
        // paymentGateway is stored for audit/logging only - actual refund uses wallet balance only
        // Refunds NEVER use PayPal or external payment gateways - always wallet balance
        paymentGateway: originalPaymentMethod
      });

      return {
        success: true,
        refundAmount: 0,
        message: 'No payment was made for this pending booking'
      };
    }

    // ========== CALCULATE REFUND ELIGIBILITY ==========
    console.log('🔍 Calculating refund eligibility...');
    const eligibility = calculateRefundEligibility(booking);
    const refundAmount = roundMoney(eligibility.amount);
    const refundStatus = getRefundStatus(eligibility);
    console.log('✅ Refund eligibility calculated:', {
      eligible: eligibility.eligible,
      percentage: eligibility.percentage,
      amount: refundAmount,
      reason: eligibility.reason,
      hoursUntilCheckIn: eligibility.hoursUntilCheckIn
    });

    // If not eligible for refund, update booking and return
    if (!eligibility.eligible || refundAmount === 0) {
      console.log('⚠️ Refund not eligible - returning early');
      await updateDoc(doc(db, 'bookings', bookingId), {
        refundStatus: 'not_eligible',
        refundAmount: 0
      });

      // Create refund log for audit
      await createRefundLog({
        bookingId,
        guestId,
        hostId,
        listingId: booking.listingId,
        originalAmount: totalPrice,
        refundAmount: 0,
        refundPercentage: 0,
        refundStatus: 'not_eligible',
        cancelledBy,
        cancellationReason: reason,
        refundReason: eligibility.reason,
        hoursUntilCheckIn: eligibility.hoursUntilCheckIn,
        paymentGateway: originalPaymentMethod
      });

      return {
        success: true,
        refundAmount: 0,
        message: eligibility.reason
      };
    }

    // ========== PROCESS REFUND ==========
    // CRITICAL: Refunds use WALLET BALANCE ONLY - no PayPal, no external payment gateways
    // Refund process:
    // 1. Credits eligible amount to guest's walletBalance
    // 2. Deducts eligible amount from host's walletBalance
    // 3. Does NOT interact with PayPal, PayPal Sandbox, or any external APIs
    // 4. All refunds are processed through internal wallet balance system only
    // Use Firestore transaction to ensure atomicity
    // All updates (including refundStatus) happen atomically in the transaction
    console.log('🔄 Starting Firestore transaction for refund processing (WALLET BALANCE ONLY - no PayPal)...');
    console.log('🔍 Transaction context:', {
      bookingId,
      guestId,
      hostId,
      currentUser: auth.currentUser?.uid,
      isGuest: auth.currentUser?.uid === guestId,
      bookingStatus: booking.status,
      bookingGuestId: booking.guestId,
      bookingHostId: booking.hostId,
      refundAmount,
      isAuthenticated: !!auth.currentUser
    });
    
    console.log('⏳ About to call runTransaction...');
    let refundResult;
    try {
      refundResult = await runTransaction(db, async (transactionRef) => {
      console.log('📖 Transaction step 1: Reading booking document...');
      // Read booking within transaction to prevent race conditions
      let bookingDoc;
      try {
        bookingDoc = await transactionRef.get(doc(db, 'bookings', bookingId));
        console.log('✅ Transaction step 1: Booking document read successfully');
      } catch (readError: any) {
        console.error('❌ Transaction step 1 FAILED: Error reading booking:', readError);
        console.error('   Error code:', readError.code);
        console.error('   Error message:', readError.message);
        throw new Error(`Failed to read booking: ${readError.message}`);
      }
      
      if (!bookingDoc.exists()) {
        throw new Error('Booking not found');
      }
      const currentBooking = bookingDoc.data() as Booking;
      console.log('📋 Booking data in transaction:', {
        id: bookingId,
        guestId: currentBooking.guestId,
        hostId: currentBooking.hostId,
        status: currentBooking.status,
        refundStatus: currentBooking.refundStatus
      });
      
      // Double-check refund status within transaction (prevent duplicate refunds)
      if (currentBooking.refundStatus === 'refunded') {
        throw new Error('Refund has already been processed for this booking');
      }

      // Get current balances within transaction
      console.log('📖 Transaction step 2: Reading user documents...');
      let guestDoc, hostDoc;
      try {
        guestDoc = await transactionRef.get(doc(db, 'users', guestId));
        console.log('✅ Transaction step 2a: Guest document read successfully');
        hostDoc = await transactionRef.get(doc(db, 'users', hostId));
        console.log('✅ Transaction step 2b: Host document read successfully');
      } catch (readError: any) {
        console.error('❌ Transaction step 2 FAILED: Error reading user documents:', readError);
        console.error('   Error code:', readError.code);
        console.error('   Error message:', readError.message);
        throw new Error(`Failed to read user documents: ${readError.message}`);
      }

      if (!guestDoc.exists() || !hostDoc.exists()) {
        throw new Error('User not found for refund processing');
      }

      const guestData = guestDoc.data();
      const hostData = hostDoc.data();
      // Read balances in centavos (handles both old float and new int formats)
      const guestCurrentBalanceCentavos = readWalletBalanceCentavos(guestData.walletBalance);
      const hostCurrentBalanceCentavos = readWalletBalanceCentavos(hostData.walletBalance);

      // Convert refund amount to centavos
      const refundAmountCentavos = phpToCentavos(refundAmount);
      
      // Refund eligible amount to guest's WALLET BALANCE ONLY (no PayPal, no external gateways)
      // This is the ONLY place where refunds are processed - internal wallet system only
      const guestNewBalanceCentavos = addCentavos(guestCurrentBalanceCentavos, refundAmountCentavos);
      
      // Prepare guest update: combine walletBalance and coupon restoration if needed
      // This ensures security rules evaluate both fields together (rule matches walletBalance + coupons)
      const guestUpdateData: any = {
        walletBalance: guestNewBalanceCentavos // Store as integer centavos
      };
      
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
        
        guestUpdateData.coupons = updatedCoupons;

        if (import.meta.env.DEV) {
          console.log('✅ Coupon restored after refund:', {
            couponCode: booking.couponCode,
            bookingId
          });
        }
      }
      
      // Update guest document with both fields in one operation
      console.log('📝 Transaction step 3: Updating guest document...');
      try {
        transactionRef.update(doc(db, 'users', guestId), guestUpdateData);
        console.log('✅ Transaction step 3: Guest document update prepared', {
          fieldsUpdated: Object.keys(guestUpdateData),
          walletBalance: guestUpdateData.walletBalance
        });
      } catch (updateError: any) {
        console.error('❌ Transaction step 3 FAILED: Error preparing guest document update:', updateError);
        console.error('   Error code:', updateError.code);
        console.error('   Error message:', updateError.message);
        throw new Error(`Failed to update guest document: ${updateError.message}`);
      }

      // Deduct eligible amount from host's WALLET BALANCE (internal system only - no PayPal)
      // Only deduct if host balance is sufficient, otherwise just record the debt
      console.log('📝 Transaction step 4: Updating host document (WALLET BALANCE ONLY)...');
      let hostNewBalanceCentavos = hostCurrentBalanceCentavos;
      if (!isLessThanCentavos(hostCurrentBalanceCentavos, refundAmountCentavos)) {
        hostNewBalanceCentavos = subtractCentavos(hostCurrentBalanceCentavos, refundAmountCentavos);
        try {
          transactionRef.update(doc(db, 'users', hostId), {
            walletBalance: hostNewBalanceCentavos // Store as integer centavos
          });
          console.log('✅ Transaction step 4: Host document update prepared (sufficient balance)', {
            walletBalance: hostNewBalanceCentavos
          });
        } catch (updateError: any) {
          console.error('❌ Transaction step 4 FAILED: Error preparing host document update:', updateError);
          console.error('   Error code:', updateError.code);
          console.error('   Error message:', updateError.message);
          throw new Error(`Failed to update host document: ${updateError.message}`);
        }
      } else {
        // Record negative balance or debt
        console.warn('⚠️ Host balance insufficient for refund, recording debt');
        // Still update host balance to negative (debt tracking)
        hostNewBalanceCentavos = subtractCentavos(hostCurrentBalanceCentavos, refundAmountCentavos);
        try {
          transactionRef.update(doc(db, 'users', hostId), {
            walletBalance: hostNewBalanceCentavos // Store as integer centavos
          });
          console.log('✅ Transaction step 4: Host document update prepared (debt tracking)', {
            walletBalance: hostNewBalanceCentavos
          });
        } catch (updateError: any) {
          console.error('❌ Transaction step 4 FAILED: Error preparing host document update:', updateError);
          console.error('   Error code:', updateError.code);
          console.error('   Error message:', updateError.message);
          throw new Error(`Failed to update host document: ${updateError.message}`);
        }
      }

      // Update booking refund status within transaction
      // This single update sets all refund-related fields atomically
      console.log('📝 Transaction step 5: Updating booking document...');
      try {
        transactionRef.update(doc(db, 'bookings', bookingId), {
          refundStatus: 'refunded',
          refundAmount: refundAmount,
          refundedAt: new Date().toISOString()
        });
        console.log('✅ Transaction step 5: Booking document update prepared', {
          refundStatus: 'refunded',
          refundAmount: refundAmount
        });
      } catch (updateError: any) {
        console.error('❌ Transaction step 5 FAILED: Error preparing booking document update:', updateError);
        console.error('   Error code:', updateError.code);
        console.error('   Error message:', updateError.message);
        throw new Error(`Failed to update booking document: ${updateError.message}`);
      }

      console.log('✅ All transaction operations prepared successfully. Committing transaction...');
      console.log('📋 Final transaction state:', {
        guestUpdate: {
          userId: guestId,
          fields: Object.keys(guestUpdateData),
          walletBalance: guestUpdateData.walletBalance
        },
        hostUpdate: {
          userId: hostId,
          walletBalance: hostNewBalanceCentavos
        },
        bookingUpdate: {
          bookingId,
          refundStatus: 'refunded',
          refundAmount,
          currentUser: auth.currentUser?.uid,
          isGuestOwner: auth.currentUser?.uid === guestId
        }
      });
      return {
        guestNewBalance: centavosToPHP(guestNewBalanceCentavos), // Return PHP for UI
        hostNewBalance: centavosToPHP(hostNewBalanceCentavos), // Return PHP for UI
        guestNewBalanceCentavos, // Also return centavos for logging
        hostNewBalanceCentavos, // Also return centavos for logging
        refundAmount: refundAmount
      };
      });
      console.log('✅ Transaction committed successfully! Processing post-transaction operations...');
    } catch (transactionError: any) {
      console.error('❌ TRANSACTION ERROR (caught immediately):', transactionError);
      console.error('   Error code:', transactionError.code);
      console.error('   Error message:', transactionError.message);
      console.error('   Error stack:', transactionError.stack);
      throw transactionError;
    }
    
    const { guestNewBalance, hostNewBalance, refundAmount: finalRefundAmount, guestNewBalanceCentavos, hostNewBalanceCentavos } = refundResult;

    // ========== CREATE TRANSACTION RECORDS ==========
    console.log('📝 Post-transaction step 1: Creating transaction records...');
    let refundTransactionId: string | null = null;
    let hostDeductionTransactionId: string | null = null;
    try {
      // Create refund transaction for guest
      refundTransactionId = await createTransaction({
        userId: guestId,
        type: 'refund',
        amount: finalRefundAmount,
        description: `Refund for cancelled booking #${bookingId.slice(0, 8)} (${eligibility.reason}) (cancelled by ${cancelledBy})${reason ? `: ${reason}` : ''}`,
        status: 'completed',
        bookingId: bookingId,
        cancelledBy: cancelledBy,
        refundReason: eligibility.reason
      });

      // Create deduction transaction for host
      hostDeductionTransactionId = await createTransaction({
        userId: hostId,
        type: 'withdrawal',
        amount: finalRefundAmount,
        description: `Refund deduction for cancelled booking #${bookingId.slice(0, 8)} (${eligibility.reason})`,
        status: 'completed',
        bookingId: bookingId,
        cancelledBy: cancelledBy
      });

      // Update booking with refund transaction ID
      await updateDoc(doc(db, 'bookings', bookingId), {
        refundTransactionId: refundTransactionId
      });
      console.log('✅ Post-transaction step 1: Transaction records created successfully');
    } catch (transactionError: any) {
      console.error('⚠️ Post-transaction step 1 FAILED: Error creating refund transaction records:', transactionError);
      console.error('   Error code:', transactionError.code);
      console.error('   Error message:', transactionError.message);
      // Don't fail refund if transaction record creation fails - refund is already processed
    }

    // ========== CREATE REFUND LOG ==========
    console.log('📝 Post-transaction step 2: Creating refund log...');
    try {
      await createRefundLog({
        bookingId,
        guestId,
        hostId,
        listingId: booking.listingId,
        originalAmount: totalPrice,
        refundAmount: finalRefundAmount,
        refundPercentage: eligibility.percentage,
        refundStatus: 'refunded',
        cancelledBy,
        cancellationReason: reason,
        refundReason: eligibility.reason,
        hoursUntilCheckIn: eligibility.hoursUntilCheckIn,
        refundTransactionId: refundTransactionId || undefined,
        hostDeductionTransactionId: hostDeductionTransactionId || undefined,
        // paymentGateway is stored for audit/logging only - actual refund uses wallet balance only
        // Refunds NEVER use PayPal or external payment gateways - always wallet balance
        paymentGateway: originalPaymentMethod
      });
      console.log('✅ Post-transaction step 2: Refund log created successfully');
    } catch (logError: any) {
      console.error('⚠️ Post-transaction step 2 FAILED: Error creating refund log:', logError);
      console.error('   Error code:', logError.code);
      console.error('   Error message:', logError.message);
      // Don't fail refund if log creation fails
    }

    // Only log in development
    if (import.meta.env.DEV) {
      console.log('✅ Refund processed successfully:', {
        bookingId,
        guestId,
        hostId,
        totalPrice,
        refundAmount: finalRefundAmount,
        refundPercentage: eligibility.percentage,
        refundAmountCentavos: phpToCentavos(finalRefundAmount),
        guestNewBalance,
        guestNewBalanceCentavos,
        hostNewBalance,
        hostNewBalanceCentavos,
        cancelledBy,
        eligibility: eligibility.reason,
        note: 'All amounts stored as INTEGER CENTAVOS in Firestore'
      });
    }

    // ========== SEND NOTIFICATIONS ==========
    console.log('📝 Post-transaction step 3: Sending notifications...');
    try {
      // Get listing and user details for notifications
      console.log('   - Fetching listing and user data...');
      const listingDoc = await getDoc(doc(db, 'listing', booking.listingId));
      const listingTitle = listingDoc.exists() ? listingDoc.data().title : 'Your booking';
      const listingLocation = listingDoc.exists() ? listingDoc.data().location : 'Location not specified';
      
      // Get guest and host user profiles for email notifications
      const guestDoc = await getDoc(doc(db, 'users', guestId));
      const hostDoc = await getDoc(doc(db, 'users', hostId));
      const guestName = guestDoc.exists() ? guestDoc.data().fullName : 'Guest';
      const hostName = hostDoc.exists() ? hostDoc.data().fullName : 'Host';
      const hostEmail = hostDoc.exists() ? hostDoc.data().email : null;
      const guestEmail = guestDoc.exists() ? guestDoc.data().email : null;
      console.log('   - Data fetched successfully');
      
      // Notify guest about cancellation (in-app notification)
      console.log('   - Creating guest notification...');
      await notifyBookingCancelled(guestId, bookingId, listingTitle, cancelledBy, 'guest');
      console.log('   ✅ Guest notification created');
      
      // Notify host about cancellation (in-app notification)
      console.log('   - Creating host notification...');
      await notifyBookingCancelled(hostId, bookingId, listingTitle, cancelledBy, 'host');
      console.log('   ✅ Host notification created');
      
      // Send email to host when guest cancels
      if (cancelledBy === 'guest' && hostEmail) {
        try {
          console.log('   - Sending cancellation email to host...');
          const { sendBookingCancellationEmailToHost } = await import('./emailjs');
          const emailSent = await sendBookingCancellationEmailToHost(
            hostEmail,
            hostName,
            guestName,
            listingTitle,
            listingLocation,
            booking.checkIn,
            booking.checkOut,
            booking.guests,
            booking.totalPrice,
            bookingId,
            finalRefundAmount,
            reason
          );
          if (emailSent) {
            console.log('   ✅ Cancellation email sent to host');
          } else {
            console.warn('   ⚠️ Cancellation email was not sent (check EmailJS configuration)');
          }
        } catch (emailError: any) {
          console.error('⚠️   Email send FAILED (non-critical):', emailError);
          console.error('      Error code:', emailError.code);
          console.error('      Error message:', emailError.message);
          // Don't fail if email fails - in-app notification was sent
        }
      }
      
      // Notify guest about refund - use refund transaction ID if available, fallback to booking ID
      console.log('   - Creating refund payment notification...');
      await notifyPayment(
        guestId, 
        refundTransactionId || bookingId, 
        finalRefundAmount, 
        'refunded'
      );
      console.log('   ✅ Refund payment notification created');
      console.log('✅ Post-transaction step 3: All notifications sent successfully');
    } catch (notificationError: any) {
      console.error('⚠️ Post-transaction step 3 FAILED: Error sending notifications:', notificationError);
      console.error('   Error code:', notificationError.code);
      console.error('   Error message:', notificationError.message);
      console.error('   Stack trace:', notificationError.stack);
      // Don't fail refund if notification fails - refund is already processed
    }

    console.log('✅ Refund processing completed successfully!');
    return {
      success: true,
      guestNewBalance,
      hostNewBalance,
      refundAmount: finalRefundAmount,
      refundPercentage: eligibility.percentage,
      refundReason: eligibility.reason
    };
  } catch (error: any) {
    console.error('❌ CRITICAL ERROR: Error processing booking refund:', error);
    console.error('   Error code:', error.code);
    console.error('   Error message:', error.message);
    console.error('   Error stack:', error.stack);
    console.error('   🔍 Error context:', {
      bookingId,
      guestId,
      hostId,
      currentUser: auth.currentUser?.uid,
      isAuthenticated: !!auth.currentUser,
      isGuestOwner: auth.currentUser?.uid === guestId,
      bookingGuestId: booking.guestId,
      bookingHostId: booking.hostId,
      bookingStatus: booking.status
    });
    
    // Check if this is a transaction error or post-transaction error
    if (error.code === 'permission-denied' || error.message?.includes('permission') || error.message?.includes('Permission')) {
      console.error('   ⚠️ This is a PERMISSION DENIED error - likely Firestore security rules issue');
      console.error('   💡 Possible causes:');
      console.error('      1. Booking update rule - guest may not match booking.guestId');
      console.error('      2. User update rule - walletBalance update may not match rules');
      console.error('      3. Transaction commit - all rules evaluated together may fail');
    } else if (error.message?.includes('Transaction') || error.message?.includes('transaction')) {
      console.error('   ⚠️ This appears to be a TRANSACTION error (Firestore security rules issue)');
    } else if (error.message?.includes('notification') || error.message?.includes('email')) {
      console.error('   ⚠️ This appears to be a NOTIFICATION/EMAIL error (non-critical)');
    } else {
      console.error('   ⚠️ This appears to be an UNKNOWN error');
    }
    
    // Update booking with failed status if it was set to processing
    try {
      const bookingDoc = await getDoc(doc(db, 'bookings', booking.id));
      if (bookingDoc.exists()) {
        const currentBooking = bookingDoc.data() as Booking;
        if (currentBooking.refundStatus === 'processing') {
          await updateDoc(doc(db, 'bookings', booking.id), {
            refundStatus: 'failed'
          });

          // Create refund log for failed refund
          await createRefundLog({
            bookingId: booking.id,
            guestId: booking.guestId,
            hostId: booking.hostId,
            listingId: booking.listingId,
            originalAmount: booking.totalPrice,
            refundAmount: 0,
            refundPercentage: 0,
            refundStatus: 'failed',
            cancelledBy,
            cancellationReason: reason,
            refundReason: 'Refund processing failed',
            hoursUntilCheckIn: 0,
            errorMessage: error.message || 'Unknown error'
          });
        }
      }
    } catch (updateError) {
      console.error('⚠️ Error updating booking refund status to failed:', updateError);
    }
    
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
    } else if (transaction.type === 'withdrawal') {
      // For withdrawal transactions - ATOMIC OPERATION:
      // 1. Verify guest has linked PayPal account (CRITICAL)
      // 2. Verify admin has linked PayPal account (CRITICAL)
      // 3. Deduct from user's wallet (amount they requested)
      // 4. Deduct from admin's wallet (exact amount to send to user)
      // 5. Update transaction status
      // 6. Admin must manually send money from their PayPal to user's PayPal
      //    (No Cloud Functions - cost-free implementation)
      
      console.log(`🔄 ========== WITHDRAWAL CONFIRMATION START ==========`);
      console.log(`🔄 Processing withdrawal confirmation:`, {
        transactionId,
        userId: transaction.userId,
        amount: transaction.amount,
        walletDeduction: transaction.walletDeduction,
        paypalEmail: transaction.paypalEmail,
        adminPayPalEmail: transaction.adminPayPalEmail
      });
      
      // Note: We don't require PayPal email in transaction anymore
      // We'll get it from the CURRENT user profile to ensure we use the most up-to-date linked PayPal
      
      // Get amount to send (what admin needs to send to user's PayPal) - stored in centavos
      const amountToSendCentavos = typeof transaction.amount === 'number' && transaction.amount >= 100 
        ? transaction.amount 
        : phpToCentavos(typeof transaction.amount === 'number' ? transaction.amount : 0);
      const amountToSendPHP = centavosToPHP(amountToSendCentavos);
      
      // Use walletDeduction field if available (stored in centavos), otherwise fall back to amount
      const deductionCentavos = transaction.walletDeduction 
        ? (typeof transaction.walletDeduction === 'number' ? transaction.walletDeduction : phpToCentavos(transaction.walletDeduction))
        : amountToSendCentavos; // Fallback to amount to send if walletDeduction not set
      
      // Note: We'll get the actual PayPal emails from user profiles at confirmation time
      // This ensures we always use the CURRENT linked PayPal accounts
      const transactionPayPalEmail = transaction.paypalEmail || 'WILL BE RETRIEVED FROM PROFILE';
      
      console.log(`📊 Withdrawal amounts calculated:`, {
        amountToSendCentavos,
        amountToSendPHP: amountToSendPHP.toFixed(2),
        deductionCentavos,
        deductionPHP: centavosToPHP(deductionCentavos).toFixed(2),
        note: 'PayPal emails will be retrieved from CURRENT user profiles at confirmation time'
      });
      
      // Find admin user first (before transaction) and verify PayPal is linked
      const adminUsersQuery = query(
        collection(db, 'users'),
        or(
          where('role', '==', 'admin'),
          where('roles', 'array-contains', 'admin')
        )
      );
      const adminUsersSnapshot = await getDocs(adminUsersQuery);
      
      if (adminUsersSnapshot.empty) {
        const errorMessage = 'CRITICAL ERROR: Admin user not found. Cannot process withdrawal.';
        console.error(`❌ ${errorMessage}`);
        throw new Error(errorMessage);
      }
      
      const adminUserId = adminUsersSnapshot.docs[0].id;
      const adminDataBeforeTx = adminUsersSnapshot.docs[0].data();
      const adminPayPalEmailBeforeTx = adminDataBeforeTx.adminPayPalEmail;
      const isAdminPayPalLinked = adminPayPalEmailBeforeTx && 
        (adminDataBeforeTx.adminPayPalEmailVerified || adminDataBeforeTx.adminPayPalOAuthVerified);
      
      console.log(`👤 Admin user found: ${adminUserId}`);
      console.log(`🔍 Admin PayPal verification at confirmation:`, {
        adminUserId,
        adminPayPalEmail: adminPayPalEmailBeforeTx || 'NOT SET',
        adminPayPalEmailVerified: adminDataBeforeTx.adminPayPalEmailVerified || false,
        adminPayPalOAuthVerified: adminDataBeforeTx.adminPayPalOAuthVerified || false,
        isLinked: isAdminPayPalLinked
      });
      
      // CRITICAL VALIDATION: Admin must have linked PayPal account
      if (!isAdminPayPalLinked || !adminPayPalEmailBeforeTx) {
        const errorMessage = 'CRITICAL ERROR: Admin PayPal account is not linked or verified. Cannot process withdrawal. Please link admin PayPal account first.';
        console.error(`❌ ${errorMessage}`);
        throw new Error(errorMessage);
      }
      
      console.log(`✅ Admin PayPal verified: ${adminPayPalEmailBeforeTx}`);
      
      // Variable to store guest PayPal email from transaction (will be set inside transaction)
      let finalGuestPayPalEmailFromTx: string | null = null;
      // Variable to track if we need to auto-link PayPal email after transaction
      let needsAutoLink = false;
      let autoLinkEmail: string | null = null;
      let autoLinkRole: PayPalRole | null = null;
      let autoLinkUserId: string | null = null;
      
      // Use Firestore transaction for ATOMIC operations
      await runTransaction(db, async (tx) => {
        console.log(`🔄 Starting Firestore transaction for atomic wallet updates...`);
        
        // Read user document
        const userRef = doc(db, 'users', transaction.userId);
        const userDoc = await tx.get(userRef);
        
        if (!userDoc.exists()) {
          throw new Error('User not found');
        }
        
        const userData = userDoc.data();
        const userRole = userData.role || 'guest';
        
        const roleForLink: PayPalRole =
          userRole === 'host' ? 'host' : userRole === 'admin' ? 'admin' : 'guest';
        const payPalLink = getPayPalLink(userData as any, roleForLink);
        const userPayPalEmail = payPalLink?.email || null;
        const isUserPayPalLinked = !!userPayPalEmail;
        
        const transactionPayPalEmail = transaction.paypalEmail;
        
        console.log(`🔍 User PayPal verification at confirmation (AUTOMATIC - role-based):`, {
          userId: transaction.userId,
          userRole,
          userPayPalEmail: userPayPalEmail || 'NOT SET',
          isLinked: isUserPayPalLinked,
          transactionPayPalEmail: transactionPayPalEmail || 'NOT SET IN TRANSACTION',
          source: `Automatically retrieved from CURRENT user profile (${roleForLink} PayPal link)`,
          payPalLink,
          willUseTransactionEmail: !isUserPayPalLinked && !!transactionPayPalEmail
        });
        
        // Determine which PayPal email to use
        let currentUserPayPalEmail: string | null = null;
        
        if (isUserPayPalLinked && userPayPalEmail) {
          // Preferred: Use linked PayPal from user profile
          currentUserPayPalEmail = userPayPalEmail.toLowerCase().trim();
          console.log(`✅ Using linked PayPal from user profile: ${currentUserPayPalEmail}`);
        } else if (transactionPayPalEmail) {
          // Fallback: Use PayPal email from transaction (for backwards compatibility)
          // This handles cases where withdrawal was created before proper linking
          currentUserPayPalEmail = transactionPayPalEmail.toLowerCase().trim();
          console.warn(`⚠️ User profile has no linked PayPal, but transaction has PayPal email. Using transaction email: ${currentUserPayPalEmail}`);
          console.warn(`💡 Recommendation: User should link their PayPal account for future withdrawals.`);
          
          // Mark for auto-linking after transaction completes (can't update inside transaction after reads)
          needsAutoLink = true;
          autoLinkEmail = currentUserPayPalEmail;
          autoLinkRole = roleForLink;
          autoLinkUserId = transaction.userId;
        } else {
          // No PayPal email available anywhere
          const roleLabel = userRole === 'host' ? 'Host' : userRole === 'admin' ? 'Admin' : 'Guest';
          const errorMessage = `CRITICAL ERROR: ${roleLabel} PayPal account is not linked or verified. Withdrawal cannot proceed. Please link your PayPal account first.`;
          console.error(`❌ ${errorMessage}`);
          throw new Error(errorMessage);
        }
        
        // Use the determined PayPal email
        finalGuestPayPalEmailFromTx = currentUserPayPalEmail;
        
        const emailSource = isUserPayPalLinked ? 'from user profile' : 'from transaction (auto-linked)';
        console.log(`✅ ${userRole.charAt(0).toUpperCase() + userRole.slice(1)} PayPal verified: Using PayPal ${finalGuestPayPalEmailFromTx} ${emailSource}`);
        
        const userBalanceCentavos = readWalletBalanceCentavos(userData.walletBalance);
        
        console.log(`👤 User balance check:`, {
          userId: transaction.userId,
          currentBalanceCentavos: userBalanceCentavos,
          currentBalancePHP: centavosToPHP(userBalanceCentavos).toFixed(2),
          requiredDeductionCentavos: deductionCentavos,
          requiredDeductionPHP: centavosToPHP(deductionCentavos).toFixed(2),
          willHaveBalanceAfter: centavosToPHP(subtractCentavos(userBalanceCentavos, deductionCentavos)).toFixed(2)
        });
        
        // Validate user has sufficient balance
        if (isLessThanCentavos(userBalanceCentavos, deductionCentavos)) {
          const errorMessage = `User has insufficient balance. Available: ₱${centavosToPHP(userBalanceCentavos).toFixed(2)}, Required: ₱${centavosToPHP(deductionCentavos).toFixed(2)}`;
          console.error(`❌ ${errorMessage}`);
          
          // Notify user about withdrawal failure
          try {
            const userRole = userData.role || 'guest';
            await notifyWithdrawalFailed(transaction.userId, transactionId, amountToSendPHP, errorMessage, userRole as 'host' | 'guest' | 'admin');
          } catch (notifError) {
            console.error('Error sending withdrawal failed notification:', notifError);
          }
          
          throw new Error(errorMessage);
        }
        
        // Read admin document
        const adminRef = doc(db, 'users', adminUserId);
        const adminDoc = await tx.get(adminRef);
        
        if (!adminDoc.exists()) {
          throw new Error('Admin user document not found');
        }
        
        const adminData = adminDoc.data();
        const adminBalanceCentavos = readWalletBalanceCentavos(adminData.walletBalance);
        
        // AUTOMATIC: Get admin's linked PayPal account from admin profile
        // System automatically uses the linked PayPal - no manual input
        const adminLinkForTx = getPayPalLink(adminData as any, 'admin');
        
        // CRITICAL VALIDATION: Re-verify admin PayPal is still linked within transaction
        if (!adminLinkForTx?.email) {
          const errorMessage = 'CRITICAL ERROR: Admin PayPal account is not linked or verified. Cannot process withdrawal.';
          console.error(`❌ ${errorMessage}`);
          throw new Error(errorMessage);
        }
        
        const adminPayPalEmailInTx = adminLinkForTx.email;
        if (adminPayPalEmailInTx.toLowerCase().trim() !== adminPayPalEmailBeforeTx.toLowerCase().trim()) {
          console.warn(`⚠️ Admin PayPal email changed: was ${adminPayPalEmailBeforeTx}, now ${adminPayPalEmailInTx}. Using current email.`);
        }
        
        // AUTOMATIC: Use admin's linked PayPal email (no manual input)
        const adminPayPalEmail = adminPayPalEmailInTx.toLowerCase().trim();
        
        console.log(`✅ Admin PayPal automatically retrieved from profile: ${adminPayPalEmail}`);
        
        console.log(`👤 Admin balance check:`, {
          adminUserId,
          adminPayPalEmail,
          currentBalanceCentavos: adminBalanceCentavos,
          currentBalancePHP: centavosToPHP(adminBalanceCentavos).toFixed(2),
          requiredDeductionCentavos: amountToSendCentavos,
          requiredDeductionPHP: amountToSendPHP.toFixed(2),
          willHaveBalanceAfter: centavosToPHP(subtractCentavos(adminBalanceCentavos, amountToSendCentavos)).toFixed(2),
          note: 'Admin wallet balance is for tracking only. Actual payment comes from PayPal account.'
        });
        
        // NOTE: Admin wallet balance check is informational only
        // The actual payment comes from the admin's PayPal account, not the Firestore wallet
        // The wallet balance is just for internal tracking purposes
        const adminWalletInsufficient = isLessThanCentavos(adminBalanceCentavos, amountToSendCentavos);
        if (adminWalletInsufficient) {
          console.warn(`⚠️ Admin wallet balance is insufficient for tracking: Available: ₱${centavosToPHP(adminBalanceCentavos).toFixed(2)}, Required: ₱${amountToSendPHP.toFixed(2)}`);
          console.warn(`⚠️ Proceeding anyway - actual payment will come from admin's PayPal account (${adminPayPalEmail})`);
          console.warn(`💡 Admin should ensure their PayPal account has sufficient balance. Wallet balance is for tracking only.`);
        }
        
        // Calculate new balances
        // If admin wallet would go negative, set it to 0 instead (for tracking purposes)
        const userNewBalanceCentavos = subtractCentavos(userBalanceCentavos, deductionCentavos);
        const adminNewBalanceCentavos = adminWalletInsufficient 
          ? 0 // Set to 0 if insufficient (can't go negative for tracking)
          : subtractCentavos(adminBalanceCentavos, amountToSendCentavos);
        
        console.log(`💰 Balance calculations:`, {
          user: {
            oldBalanceCentavos: userBalanceCentavos,
            oldBalancePHP: centavosToPHP(userBalanceCentavos).toFixed(2),
            deductionCentavos,
            deductionPHP: centavosToPHP(deductionCentavos).toFixed(2),
            newBalanceCentavos: userNewBalanceCentavos,
            newBalancePHP: centavosToPHP(userNewBalanceCentavos).toFixed(2)
          },
          admin: {
            oldBalanceCentavos: adminBalanceCentavos,
            oldBalancePHP: centavosToPHP(adminBalanceCentavos).toFixed(2),
            deductionCentavos: amountToSendCentavos,
            deductionPHP: amountToSendPHP.toFixed(2),
            newBalanceCentavos: adminNewBalanceCentavos,
            newBalancePHP: centavosToPHP(adminNewBalanceCentavos).toFixed(2)
          }
        });
        
        // Update both wallets atomically
        console.log(`💾 Queuing wallet balance updates in transaction...`);
        tx.update(userRef, {
          walletBalance: userNewBalanceCentavos
        });
        console.log(`  ✓ User wallet update queued: ${centavosToPHP(userBalanceCentavos).toFixed(2)} → ${centavosToPHP(userNewBalanceCentavos).toFixed(2)}`);
        
        tx.update(adminRef, {
          walletBalance: adminNewBalanceCentavos
        });
        console.log(`  ✓ Admin wallet update queued: ${centavosToPHP(adminBalanceCentavos).toFixed(2)} → ${centavosToPHP(adminNewBalanceCentavos).toFixed(2)}`);
        
        console.log(`✅ Atomic wallet updates queued in transaction - will commit together`);
      });
      
      console.log(`✅ Firestore transaction committed successfully - both wallets updated atomically`);
      
      // Auto-link PayPal email if needed (after transaction completes)
      if (needsAutoLink && autoLinkEmail && autoLinkRole && autoLinkUserId) {
        try {
          console.log(`🔄 Auto-linking PayPal email to user profile: ${autoLinkEmail} (role: ${autoLinkRole})`);
          const linkInfo = buildClientLinkedInfo(autoLinkEmail, autoLinkRole);
          const updateData: Record<string, unknown> = {
            [getPayPalLinkPath(autoLinkRole)]: linkInfo
          };
          
          // Also update legacy fields for compatibility
          if (autoLinkRole === 'guest') {
            updateData.paypalEmail = autoLinkEmail;
            updateData.paypalEmailVerified = true;
            updateData.paypalOAuthVerified = true;
          } else if (autoLinkRole === 'host') {
            updateData.hostPayPalEmail = autoLinkEmail;
            updateData.hostPayPalEmailVerified = true;
            updateData.hostPayPalOAuthVerified = true;
          } else if (autoLinkRole === 'admin') {
            updateData.adminPayPalEmail = autoLinkEmail;
            updateData.adminPayPalEmailVerified = true;
            updateData.adminPayPalOAuthVerified = true;
          }
          
          await updateDoc(doc(db, 'users', autoLinkUserId), updateData);
          console.log(`✅ Auto-linked PayPal email from transaction to user profile for future use`);
        } catch (linkError) {
          console.warn(`⚠️ Could not auto-link PayPal email to user profile:`, linkError);
          // Continue anyway - withdrawal was successful, just couldn't save the link
        }
      }
      
      // After successful transaction, verify wallet updates and get admin PayPal email
      const adminDocAfterTx = await getDoc(doc(db, 'users', adminUserId));
      const userDocAfterTx = await getDoc(doc(db, 'users', transaction.userId));
      
      const adminDataAfterTx = adminDocAfterTx.exists() ? adminDocAfterTx.data() : null;
      const userDataAfterTx = userDocAfterTx.exists() ? userDocAfterTx.data() : null;
      
      const adminPayPalEmail = adminDataAfterTx?.adminPayPalEmail || adminPayPalEmailBeforeTx || 'N/A';
      const adminBalanceAfterTx = adminDataAfterTx ? readWalletBalanceCentavos(adminDataAfterTx.walletBalance) : 0;
      const userBalanceAfterTx = userDataAfterTx ? readWalletBalanceCentavos(userDataAfterTx.walletBalance) : 0;
      
      console.log(`✅ Wallet balances after transaction:`, {
        user: {
          balanceCentavos: userBalanceAfterTx,
          balancePHP: centavosToPHP(userBalanceAfterTx).toFixed(2),
          expectedBalancePHP: centavosToPHP(subtractCentavos(readWalletBalanceCentavos(userDataAfterTx?.walletBalance || 0), deductionCentavos)).toFixed(2)
        },
        admin: {
          balanceCentavos: adminBalanceAfterTx,
          balancePHP: centavosToPHP(adminBalanceAfterTx).toFixed(2),
          expectedBalancePHP: centavosToPHP(subtractCentavos(readWalletBalanceCentavos(adminDataAfterTx?.walletBalance || 0), amountToSendCentavos)).toFixed(2)
        }
      });
      
      console.log(`✅ Withdrawal wallets deducted successfully - both balances updated`);
      
      // Get the final user PayPal email (from transaction or current profile)
      // Use the email from the transaction if available, otherwise get from current profile based on role
      const userDocFinal = await getDoc(doc(db, 'users', transaction.userId));
      const userDataFinal = userDocFinal.exists() ? userDocFinal.data() : null;
      const userRoleFinal = userDataFinal?.role || 'guest';
      
      // Get PayPal email based on user role
      const userPayPalEmailFromProfile =
        getPayPalLink(userDataFinal as any, userRoleFinal === 'host' ? 'host' : userRoleFinal === 'admin' ? 'admin' : 'guest')?.email || null;
      
      const finalUserPayPalEmail = finalGuestPayPalEmailFromTx || userPayPalEmailFromProfile || transaction.paypalEmail || 'NOT SET';
      
      // Get current admin PayPal email (from current profile, not transaction)
      const adminDocFinal = await getDoc(doc(db, 'users', adminUserId));
      const adminDataFinal = adminDocFinal.exists() ? adminDocFinal.data() : null;
      const finalAdminPayPalEmail =
        getPayPalLink(adminDataFinal as any, 'admin')?.email || adminPayPalEmailBeforeTx || 'NOT SET';
      
      // AUTOMATIC PAYPAL PAYOUT: Send PayPal payout automatically (client-side)
      console.log(`🔄 Initiating automatic PayPal payout (client-side)...`);
      let payoutResult: any = null;
      let payoutError: string | null = null;
      
      try {
        const { sendPayPalPayoutClient } = await import('./paypalPayoutsClient');
        const description = `Withdrawal from wallet - Transaction ${transactionId.slice(0, 8)}`;
        
        payoutResult = await sendPayPalPayoutClient(
          finalUserPayPalEmail,
          amountToSendPHP,
          'PHP',
          description,
          transactionId
        );
        
        console.log(`✅ Automatic PayPal payout sent successfully:`, payoutResult);
      } catch (payoutErr: any) {
        payoutError = payoutErr.message || 'Unknown error';
        console.error(`❌ Automatic PayPal payout failed:`, payoutError);
        // Don't throw - we'll update transaction with error status but wallets are already deducted
        // Admin can manually send the funds if automatic payout fails
      }
      
      // Update transaction status with payout result
      const updateData: any = {
        status: 'completed',
        confirmedAt: new Date().toISOString(),
        paypalEmail: finalUserPayPalEmail, // Store current user PayPal email (role-based)
        adminPayPalEmail: finalAdminPayPalEmail // Store current admin PayPal email
      };
      
      if (payoutResult) {
        // Payout was successfully initiated
        updateData.payoutId = payoutResult.payoutId;
        updateData.payoutBatchId = payoutResult.batchId;
        updateData.payoutStatus = payoutResult.status || 'processing';
        updateData.payoutNote = `Automatic PayPal payout sent to ${finalUserPayPalEmail}`;
        updateData.payoutProcessedAt = new Date().toISOString();
      } else if (payoutError) {
        // Payout failed but wallets are already deducted
        updateData.payoutStatus = 'failed';
        updateData.payoutError = payoutError;
        updateData.payoutNote = `Automatic payout failed: ${payoutError}. Manual transfer may be required.`;
        updateData.payoutProcessedAt = new Date().toISOString();
      } else {
        // Fallback (shouldn't happen)
        updateData.payoutStatus = 'pending';
        updateData.payoutNote = `Payout status unknown. Please check transaction.`;
      }
      
      await updateDoc(doc(db, 'transactions', transactionId), updateData);

      await logPayPalEvent({
        action: 'withdrawal-confirmed',
        payerRole: 'admin',
        payerEmail: finalAdminPayPalEmail,
        receiverRole: userRoleFinal as 'guest' | 'host' | 'admin',
        receiverEmail: finalUserPayPalEmail,
        amountPHP: amountToSendPHP,
        transactionId,
        status: payoutResult ? 'processing' : 'failed',
        notes: {
          deductionCentavos,
          payoutId: payoutResult?.payoutId,
          payoutStatus: payoutResult?.status || payoutError,
          payoutNote: payoutResult 
            ? `Automatic PayPal payout sent to ${finalUserPayPalEmail}` 
            : `Payout failed: ${payoutError || 'Unknown error'}`
        }
      });
      
      console.log(`✅ Transaction status updated to completed`);
      
      // Send notification to user about withdrawal confirmation
      try {
        await notifyWithdrawalConfirmed(transaction.userId, transactionId, amountToSendPHP, finalUserPayPalEmail, userRoleFinal as 'host' | 'guest' | 'admin');
        console.log(`✅ Withdrawal confirmation notification sent to user`);
      } catch (notifError) {
        console.error('Error sending withdrawal confirmed notification:', notifError);
        // Don't fail the confirmation if notification fails
      }
      
      console.log(`✅ ========== WITHDRAWAL CONFIRMATION COMPLETED SUCCESSFULLY ==========`);
      console.log(`✅ Final Summary (using CURRENT linked PayPal accounts):`, {
        transactionId,
        userId: transaction.userId,
        amountToSendPHP: amountToSendPHP.toFixed(2),
        userDeductionPHP: centavosToPHP(deductionCentavos).toFixed(2),
        adminDeductionPHP: amountToSendPHP.toFixed(2),
        userPayPalEmail: finalUserPayPalEmail,
        userRole: userRoleFinal,
        adminPayPalEmail: finalAdminPayPalEmail,
        userBalanceAfter: centavosToPHP(userBalanceAfterTx).toFixed(2),
        adminBalanceAfter: centavosToPHP(adminBalanceAfterTx).toFixed(2),
        payoutNote: payoutResult 
          ? `Automatic PayPal payout sent to ${finalUserPayPalEmail}` 
          : `Payout ${payoutError ? 'failed' : 'pending'}: ${payoutError || 'Please check transaction'}`,
        status: 'completed',
        payoutStatus: payoutResult?.status || (payoutError ? 'failed' : 'pending'),
        payoutId: payoutResult?.payoutId,
        note: 'Using CURRENT linked PayPal accounts from user profiles (not transaction data)'
      });
      console.log(`✅ ========== END WITHDRAWAL CONFIRMATION ==========`);
      
      return; // Early return - transaction status already updated above
    } else {
      // For other transaction types (deposit, reward, etc.), update user wallet
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

/**
 * Decline a withdrawal transaction
 * This marks the withdrawal as failed without deducting any wallet balances
 * (since wallet is only deducted when admin confirms, not when requesting)
 */
export const declineWithdrawal = async (
  transactionId: string,
  declineReason?: string
): Promise<void> => {
  try {
    const transactionDoc = await getDoc(doc(db, 'transactions', transactionId));
    if (!transactionDoc.exists()) {
      throw new Error('Transaction not found');
    }

    const transaction = transactionDoc.data() as Transaction;

    if (transaction.type !== 'withdrawal') {
      throw new Error('Can only decline withdrawal transactions');
    }

    if (transaction.status !== 'pending') {
      throw new Error(`Cannot decline transaction with status: ${transaction.status}`);
    }

    const amountPHP = centavosToPHP(
      typeof transaction.amount === 'number' ? transaction.amount : 0
    );

    // Update transaction status to failed
    const updateData: any = {
      status: 'failed',
      payoutStatus: 'failed',
      payoutError: declineReason || 'Withdrawal declined by admin',
      confirmedAt: new Date().toISOString()
    };

    await updateDoc(doc(db, 'transactions', transactionId), updateData);

    console.log(`✅ Withdrawal declined:`, {
      transactionId,
      userId: transaction.userId,
      amount: amountPHP.toFixed(2),
      reason: declineReason || 'No reason provided'
    });

    // Get user data for notification
    const userDoc = await getDoc(doc(db, 'users', transaction.userId));
    const userData = userDoc.exists() ? userDoc.data() : null;

    // Send notification to user about withdrawal decline
    try {
      const userRole = userData?.role || 'guest';
      await notifyWithdrawalFailed(
        transaction.userId,
        transactionId,
        amountPHP,
        declineReason || 'Withdrawal declined by admin',
        userRole as 'host' | 'guest' | 'admin'
      );
      console.log(`✅ Withdrawal decline notification sent to user`);
    } catch (notifError) {
      console.error('Error sending withdrawal decline notification:', notifError);
      // Don't fail the decline if notification fails
    }
  } catch (error: any) {
    console.error('❌ Error declining withdrawal:', error);
    throw error;
  }
};

