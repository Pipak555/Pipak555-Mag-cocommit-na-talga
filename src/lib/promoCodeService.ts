/**
 * Promo Code Service
 * 
 * Handles validation and application of listing promo codes
 */

import { getDoc, doc, query, where, getDocs, collection } from 'firebase/firestore';
import { db } from './firebase';
import type { Listing, Booking } from '@/types';

export interface PromoCodeValidationResult {
  valid: boolean;
  error?: string;
  discount?: number;
  promoCode?: string;
  promoDescription?: string;
}

/**
 * Validate a promo code for a specific listing
 * @param promoCode - The promo code to validate
 * @param listingId - The listing ID
 * @returns Validation result with discount information
 */
export const validatePromoCode = async (
  promoCode: string,
  listingId: string
): Promise<PromoCodeValidationResult> => {
  try {
    if (!promoCode || !promoCode.trim()) {
      return { valid: false, error: 'Promo code is required' };
    }

    // Get the listing
    const listingDoc = await getDoc(doc(db, 'listing', listingId));
    if (!listingDoc.exists()) {
      return { valid: false, error: 'Listing not found' };
    }

    const listing = { id: listingDoc.id, ...listingDoc.data() } as Listing;

    // Check if listing has a promo code
    if (!listing.promoCode || listing.promoCode.trim() === '') {
      return { valid: false, error: 'This listing does not have a promo code' };
    }

    // Check if promo code matches (case-insensitive)
    if (listing.promoCode.toUpperCase().trim() !== promoCode.toUpperCase().trim()) {
      return { valid: false, error: 'Invalid promo code' };
    }

    // Check if promo code belongs to this listing's host
    // (This is already validated by checking the listing's promoCode field)

    // Check max uses if specified
    if (listing.promoMaxUses && listing.promoMaxUses > 0) {
      // Count how many bookings have used this promo code for this listing
      const bookingsQuery = query(
        collection(db, 'bookings'),
        where('listingId', '==', listingId),
        where('promoCode', '==', listing.promoCode.toUpperCase().trim())
      );
      const bookingsSnapshot = await getDocs(bookingsQuery);
      
      // Count confirmed/completed bookings (only these count as "used")
      const usedCount = bookingsSnapshot.docs.filter(doc => {
        const booking = doc.data() as Booking;
        return booking.status === 'confirmed' || booking.status === 'completed';
      }).length;

      if (usedCount >= listing.promoMaxUses) {
        return { valid: false, error: 'This promo code has reached its maximum usage limit' };
      }
    }

    // Promo code is valid
    return {
      valid: true,
      discount: listing.promoDiscount || 0,
      promoCode: listing.promoCode,
      promoDescription: listing.promoDescription || listing.promo || undefined
    };
  } catch (error: any) {
    console.error('Error validating promo code:', error);
    return { valid: false, error: 'Failed to validate promo code. Please try again.' };
  }
};

/**
 * Calculate discount amount from promo code
 * @param basePrice - The base price before discount
 * @param promoDiscount - The promo discount percentage
 * @returns The discount amount
 */
export const calculatePromoDiscountAmount = (basePrice: number, promoDiscount: number): number => {
  if (!promoDiscount || promoDiscount <= 0) return 0;
  return (basePrice * promoDiscount) / 100;
};

