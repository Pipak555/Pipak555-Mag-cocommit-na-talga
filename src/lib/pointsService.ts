/**
 * Guest Points Service
 * 
 * Handles guest points redemption for discount coupons
 */

import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import { createTransaction } from './firestore';
import type { Coupon } from '@/types';

/**
 * Redeem guest points for discount coupon
 * @param guestId - Guest user ID
 * @param pointsToRedeem - Points to redeem
 * @returns Coupon code and discount amount
 */
export const redeemPointsForCoupon = async (
  guestId: string,
  pointsToRedeem: number
): Promise<{ couponCode: string; discountAmount: number }> => {
  try {
    const guestDoc = await getDoc(doc(db, 'users', guestId));
    if (!guestDoc.exists()) {
      throw new Error('Guest not found');
    }

    const guestData = guestDoc.data();
    const currentPoints = guestData.points || 0;

    if (currentPoints < pointsToRedeem) {
      throw new Error('Insufficient points');
    }

    // Convert points to discount based on reward tiers
    // Reward tiers: 100pts=₱10, 250pts=₱30, 500pts=₱75, 1000pts=₱200
    // This gives a better rate for larger redemptions
    let discountAmount: number;
    if (pointsToRedeem >= 1000) {
      discountAmount = Math.floor((pointsToRedeem / 1000) * 200);
    } else if (pointsToRedeem >= 500) {
      discountAmount = Math.floor((pointsToRedeem / 500) * 75);
    } else if (pointsToRedeem >= 250) {
      discountAmount = Math.floor((pointsToRedeem / 250) * 30);
    } else {
      discountAmount = Math.floor((pointsToRedeem / 100) * 10);
    }
    const newPoints = currentPoints - pointsToRedeem;

    // Generate unique coupon code
    const couponCode = `POINTS${Date.now().toString(36).toUpperCase()}`;

    // Create coupon (valid for 30 days)
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 30);

    const newCoupon: Coupon = {
      id: `${couponCode}-${guestId}`,
      code: couponCode,
      discount: discountAmount,
      validUntil: validUntil.toISOString(),
      used: false,
      minSpend: 0 // No minimum spend required for point redemption coupons
    };

    // Update user document: deduct points and add coupon
    const existingCoupons = guestData.coupons || [];
    await updateDoc(doc(db, 'users', guestId), {
      points: newPoints,
      coupons: [...existingCoupons, newCoupon]
    });

    // Create transaction for redemption
    await createTransaction({
      userId: guestId,
      type: 'reward',
      amount: -pointsToRedeem,
      description: `Points redeemed for discount coupon (${couponCode} - ${discountAmount}₱ discount)`,
      status: 'completed'
    });

    if (import.meta.env.DEV) {
      console.log('✅ Points redeemed for coupon:', {
        guestId,
        pointsRedeemed: pointsToRedeem,
        discountAmount,
        couponCode,
        newPoints
      });
    }

    return { couponCode, discountAmount };
  } catch (error: any) {
    console.error('Error redeeming points for coupon:', error);
    throw error;
  }
};

