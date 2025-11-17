/**
 * Host Points & Rewards Service
 * 
 * Handles host points earning and redemption
 */

import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import { createTransaction } from './firestore';
import type { Booking, Review } from '@/types';
import { 
  phpToCentavos, 
  centavosToPHP, 
  addCentavos, 
  readWalletBalanceCentavos,
  roundMoney 
} from './financialUtils';

/**
 * Award points to host for completed booking
 * @param hostId - Host user ID
 * @param bookingId - Booking ID
 * @param bookingAmount - Total booking amount
 * @returns Points awarded
 */
export const awardHostPointsForBooking = async (
  hostId: string,
  bookingId: string,
  bookingAmount: number
): Promise<number> => {
  try {
    const hostDoc = await getDoc(doc(db, 'users', hostId));
    if (!hostDoc.exists()) {
      throw new Error('Host not found');
    }

    const hostData = hostDoc.data();
    const currentPoints = hostData.hostPoints || 0;
    
    // Award 10 points for completing a booking
    const basePoints = 10;
    const newPoints = currentPoints + basePoints;

    await updateDoc(doc(db, 'users', hostId), {
      hostPoints: newPoints
    });

    // Create reward transaction
    await createTransaction({
      userId: hostId,
      type: 'reward',
      amount: basePoints,
      description: `Host points earned for completed booking #${bookingId.slice(0, 8)}`,
      status: 'completed',
      bookingId: bookingId
    });

    if (import.meta.env.DEV) {
      console.log('✅ Host points awarded:', {
        hostId,
        pointsAwarded: basePoints,
        newPoints,
        bookingAmount
      });
    }

    return basePoints;
  } catch (error: any) {
    console.error('Error awarding host points:', error);
    throw error;
  }
};

/**
 * Award bonus points to host for high rating
 * @param hostId - Host user ID
 * @param rating - Rating value (1-5)
 * @param bookingId - Booking ID
 * @returns Points awarded
 */
export const awardHostPointsForRating = async (
  hostId: string,
  rating: number,
  bookingId: string
): Promise<number> => {
  try {
    // Only award bonus points for 5-star ratings
    if (rating < 5) {
      return 0;
    }

    const hostDoc = await getDoc(doc(db, 'users', hostId));
    if (!hostDoc.exists()) {
      throw new Error('Host not found');
    }

    const hostData = hostDoc.data();
    const currentPoints = hostData.hostPoints || 0;
    
    // Award 5 bonus points for 5-star rating
    const bonusPoints = 5;
    const newPoints = currentPoints + bonusPoints;

    await updateDoc(doc(db, 'users', hostId), {
      hostPoints: newPoints
    });

    // Create reward transaction
    await createTransaction({
      userId: hostId,
      type: 'reward',
      amount: bonusPoints,
      description: `Host bonus points for 5-star rating (booking #${bookingId.slice(0, 8)})`,
      status: 'completed',
      bookingId: bookingId
    });

    if (import.meta.env.DEV) {
      console.log('✅ Host bonus points awarded:', {
        hostId,
        pointsAwarded: bonusPoints,
        newPoints,
        rating
      });
    }

    return bonusPoints;
  } catch (error: any) {
    console.error('Error awarding host bonus points:', error);
    throw error;
  }
};

/**
 * Award points to host for listing approval
 * @param hostId - Host user ID
 * @param listingId - Listing ID
 * @returns Points awarded
 */
export const awardHostPointsForListingApproval = async (
  hostId: string,
  listingId: string
): Promise<number> => {
  try {
    const hostDoc = await getDoc(doc(db, 'users', hostId));
    if (!hostDoc.exists()) {
      throw new Error('Host not found');
    }

    const hostData = hostDoc.data();
    const currentPoints = hostData.hostPoints || 0;
    
    // Award 5 points for listing approval
    const approvalPoints = 5;
    const newPoints = currentPoints + approvalPoints;

    await updateDoc(doc(db, 'users', hostId), {
      hostPoints: newPoints
    });

    // Create reward transaction
    await createTransaction({
      userId: hostId,
      type: 'reward',
      amount: approvalPoints,
      description: `Host points for listing approval (listing #${listingId.slice(0, 8)})`,
      status: 'completed'
    });

    if (import.meta.env.DEV) {
      console.log('✅ Host points awarded for listing approval:', {
        hostId,
        pointsAwarded: approvalPoints,
        newPoints,
        listingId
      });
    }

    return approvalPoints;
  } catch (error: any) {
    console.error('Error awarding host points for listing approval:', error);
    throw error;
  }
};

/**
 * Redeem host points for e-wallet money
 * @param hostId - Host user ID
 * @param pointsToRedeem - Points to redeem
 * @returns Amount added to e-wallet in PHP
 */
export const redeemHostPointsForEwallet = async (
  hostId: string,
  pointsToRedeem: number
): Promise<number> => {
  try {
    const hostDoc = await getDoc(doc(db, 'users', hostId));
    if (!hostDoc.exists()) {
      throw new Error('Host not found');
    }

    const hostData = hostDoc.data();
    const currentPoints = hostData.hostPoints || 0;
    // Read balance in centavos (handles both old float and new int formats)
    const currentWalletBalanceCentavos = readWalletBalanceCentavos(hostData.walletBalance);

    if (currentPoints < pointsToRedeem) {
      throw new Error('Insufficient points');
    }

    // Convert points to e-wallet money (10 points = ₱1)
    // Convert to centavos for storage
    const walletAmountPHP = pointsToRedeem / 10;
    const walletAmountCentavos = phpToCentavos(walletAmountPHP);
    const newPoints = currentPoints - pointsToRedeem;
    const newWalletBalanceCentavos = addCentavos(currentWalletBalanceCentavos, walletAmountCentavos);

    if (import.meta.env.DEV) {
      console.log('🔍 Before update:', {
        currentPoints,
        currentWalletBalanceCentavos,
        currentWalletBalancePHP: centavosToPHP(currentWalletBalanceCentavos),
        pointsToRedeem,
        walletAmountPHP,
        walletAmountCentavos,
        newPoints,
        newWalletBalanceCentavos,
        newWalletBalancePHP: centavosToPHP(newWalletBalanceCentavos)
      });
    }

    // Update both points and wallet balance
    try {
      await updateDoc(doc(db, 'users', hostId), {
        hostPoints: newPoints,
        walletBalance: newWalletBalanceCentavos // Store as integer centavos
      });
      
      // Verify the update was successful by reading the document
      const updatedDoc = await getDoc(doc(db, 'users', hostId));
      if (updatedDoc.exists()) {
        const updatedData = updatedDoc.data();
        const updatedWalletBalanceCentavos = readWalletBalanceCentavos(updatedData.walletBalance);
        const updatedHostPoints = updatedData.hostPoints || 0;
        
        if (import.meta.env.DEV) {
          console.log('🔍 After update verification:', {
            updatedHostPoints,
            updatedWalletBalanceCentavos,
            updatedWalletBalancePHP: centavosToPHP(updatedWalletBalanceCentavos),
            expectedHostPoints: newPoints,
            expectedWalletBalanceCentavos: newWalletBalanceCentavos,
            pointsMatch: updatedHostPoints === newPoints,
            walletMatch: updatedWalletBalanceCentavos === newWalletBalanceCentavos
          });
        }
        
        if (updatedHostPoints !== newPoints || updatedWalletBalanceCentavos !== newWalletBalanceCentavos) {
          console.error('❌ Update verification failed!', {
            expected: { hostPoints: newPoints, walletBalance: newWalletBalanceCentavos },
            actual: { hostPoints: updatedHostPoints, walletBalance: updatedWalletBalanceCentavos }
          });
          throw new Error('Wallet balance update verification failed');
        }
      }
    } catch (updateError: any) {
      console.error('❌ Error updating wallet balance:', updateError);
      throw new Error(`Failed to update wallet balance: ${updateError.message}`);
    }

    // Create transaction for points redemption (negative amount for points deduction)
    await createTransaction({
      userId: hostId,
      type: 'reward',
      amount: -pointsToRedeem,
      description: `Host points redeemed for e-wallet (${pointsToRedeem} points = ₱${walletAmountPHP.toFixed(2)})`,
      status: 'completed'
    });

    // Create transaction for wallet deposit
    await createTransaction({
      userId: hostId,
      type: 'deposit',
      amount: walletAmountCentavos, // Store as integer centavos
      description: `E-wallet deposit from points redemption (${pointsToRedeem} points)`,
      status: 'completed'
    });

    if (import.meta.env.DEV) {
      console.log('✅ Host points redeemed for e-wallet:', {
        hostId,
        pointsRedeemed: pointsToRedeem,
        walletAmountPHP,
        walletAmountCentavos,
        newPoints,
        newWalletBalancePHP: centavosToPHP(newWalletBalanceCentavos),
        newWalletBalanceCentavos
      });
    }

    return walletAmountPHP;
  } catch (error: any) {
    console.error('Error redeeming host points for e-wallet:', error);
    throw error;
  }
};

/**
 * @deprecated Use redeemHostPointsForEwallet instead
 * Redeem host points for subscription discount (legacy function)
 */
export const redeemHostPointsForSubscriptionDiscount = async (
  hostId: string,
  pointsToRedeem: number
): Promise<number> => {
  // Redirect to new e-wallet redemption function
  return redeemHostPointsForEwallet(hostId, pointsToRedeem);
};

/**
 * Get host points balance
 * @param hostId - Host user ID
 * @returns Current points balance
 */
export const getHostPoints = async (hostId: string): Promise<number> => {
  try {
    const hostDoc = await getDoc(doc(db, 'users', hostId));
    if (!hostDoc.exists()) {
      return 0;
    }

    const hostData = hostDoc.data();
    return hostData.hostPoints || 0;
  } catch (error) {
    console.error('Error getting host points:', error);
    return 0;
  }
};


