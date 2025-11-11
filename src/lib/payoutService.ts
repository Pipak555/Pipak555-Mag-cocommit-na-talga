/**
 * Payout Service - Client-side interface for PayPal Payouts
 * 
 * This service calls Firebase Cloud Functions to process PayPal payouts
 */

import { getFunctions, httpsCallable } from 'firebase/functions';
import { functions } from './firebase';

/**
 * Process host payout for booking earnings
 * 
 * @param hostId - The host user ID
 * @param transactionId - The transaction ID for the earnings
 * @param amount - The amount to payout (in PHP)
 * @param bookingId - The booking ID
 * @returns Promise with payout result
 */
export const processHostPayout = async (
  hostId: string,
  transactionId: string,
  amount: number,
  bookingId: string
): Promise<{ success: boolean; message: string }> => {
  try {
    const processHostPayoutFunction = httpsCallable(functions, 'processHostPayoutFunction');
    
    const result = await processHostPayoutFunction({
      hostId,
      transactionId,
      amount,
      bookingId,
    });

    return result.data as { success: boolean; message: string };
  } catch (error: any) {
    console.error('Error processing host payout:', error);
    throw new Error(error.message || 'Failed to process host payout');
  }
};

/**
 * Process admin payout for service fees or subscription payments
 * 
 * @param transactionId - The transaction ID
 * @param amount - The amount to payout (in PHP)
 * @param description - Description of the payout
 * @returns Promise with payout result
 */
export const processAdminPayout = async (
  transactionId: string,
  amount: number,
  description: string
): Promise<{ success: boolean; message: string }> => {
  try {
    const processAdminPayoutFunction = httpsCallable(functions, 'processAdminPayoutFunction');
    
    const result = await processAdminPayoutFunction({
      transactionId,
      amount,
      description,
    });

    return result.data as { success: boolean; message: string };
  } catch (error: any) {
    console.error('Error processing admin payout:', error);
    throw new Error(error.message || 'Failed to process admin payout');
  }
};

