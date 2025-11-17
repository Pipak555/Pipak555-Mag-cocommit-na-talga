/**
 * Cancellation Policy Utility
 * 
 * Implements the platform's cancellation policy:
 * - 48+ hours before check-in: Full refund (100%)
 * - 24-48 hours before check-in: 50% refund
 * - Less than 24 hours before check-in: No refund (0%)
 */

import type { Booking } from '@/types';

export type RefundEligibility = {
  eligible: boolean;
  percentage: number; // 0, 0.5, or 1.0
  amount: number; // Calculated refund amount in PHP
  reason: string;
  hoursUntilCheckIn: number;
};

/**
 * Calculate refund eligibility based on cancellation policy
 * 
 * @param booking - The booking to check
 * @param cancelledAt - When the cancellation occurred (defaults to now)
 * @returns Refund eligibility information
 */
export const calculateRefundEligibility = (
  booking: Booking,
  cancelledAt: Date = new Date()
): RefundEligibility => {
  const checkInDate = new Date(booking.checkIn);
  const now = cancelledAt;
  
  // Calculate hours until check-in
  const hoursUntilCheckIn = (checkInDate.getTime() - now.getTime()) / (1000 * 60 * 60);
  
  // If check-in has already passed, no refund
  if (hoursUntilCheckIn < 0) {
    return {
      eligible: false,
      percentage: 0,
      amount: 0,
      reason: 'Check-in date has already passed',
      hoursUntilCheckIn: 0
    };
  }
  
  // 48+ hours before check-in: Full refund (100%)
  if (hoursUntilCheckIn >= 48) {
    return {
      eligible: true,
      percentage: 1.0,
      amount: booking.totalPrice,
      reason: 'Flexible cancellation (48+ hours before check-in) - Full refund',
      hoursUntilCheckIn
    };
  }
  
  // 24-48 hours before check-in: 50% refund
  if (hoursUntilCheckIn >= 24) {
    return {
      eligible: true,
      percentage: 0.5,
      amount: booking.totalPrice * 0.5,
      reason: 'Moderate cancellation (24-48 hours before check-in) - 50% refund',
      hoursUntilCheckIn
    };
  }
  
  // Less than 24 hours before check-in: No refund (0%)
  return {
    eligible: false,
    percentage: 0,
    amount: 0,
    reason: 'Strict cancellation (less than 24 hours before check-in) - No refund',
    hoursUntilCheckIn
  };
};

/**
 * Get refund status based on eligibility
 */
export const getRefundStatus = (eligibility: RefundEligibility): 'not_eligible' | 'eligible' | 'processing' | 'refunded' | 'failed' => {
  if (!eligibility.eligible) {
    return 'not_eligible';
  }
  // Status will be set to 'processing' when refund starts, 'refunded' when complete, 'failed' on error
  return 'eligible';
};

