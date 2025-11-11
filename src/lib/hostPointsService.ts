/**
 * Host Points & Rewards Service
 * 
 * Handles host points earning and redemption
 */

import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import { createTransaction } from './firestore';
import type { Booking, Review } from '@/types';

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
    
    // Award points based on booking amount (1 point per ₱100, minimum 50 points)
    const basePoints = Math.max(50, Math.floor(bookingAmount / 100));
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
    
    // Award 25 bonus points for 5-star rating
    const bonusPoints = 25;
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
    
    // Award 100 points for listing approval
    const approvalPoints = 100;
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
 * Redeem host points for subscription discount
 * @param hostId - Host user ID
 * @param pointsToRedeem - Points to redeem
 * @returns Discount amount in PHP
 */
export const redeemHostPointsForSubscriptionDiscount = async (
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

    if (currentPoints < pointsToRedeem) {
      throw new Error('Insufficient points');
    }

    // Convert points to discount (100 points = ₱50 discount)
    const discountAmount = Math.floor((pointsToRedeem / 100) * 50);
    const newPoints = currentPoints - pointsToRedeem;

    await updateDoc(doc(db, 'users', hostId), {
      hostPoints: newPoints
    });

    // Create transaction for redemption
    await createTransaction({
      userId: hostId,
      type: 'reward',
      amount: -pointsToRedeem,
      description: `Host points redeemed for subscription discount (₱${discountAmount.toFixed(2)})`,
      status: 'completed'
    });

    if (import.meta.env.DEV) {
      console.log('✅ Host points redeemed:', {
        hostId,
        pointsRedeemed: pointsToRedeem,
        discountAmount,
        newPoints
      });
    }

    return discountAmount;
  } catch (error: any) {
    console.error('Error redeeming host points:', error);
    throw error;
  }
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


