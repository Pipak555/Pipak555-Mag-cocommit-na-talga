/**
 * Payout Service - DEPRECATED
 * 
 * These functions are not used in the current implementation.
 * Automatic payouts require Cloud Functions with PayPal Payouts API access.
 * 
 * For host withdrawals, use hostPayoutService.requestWithdrawal() instead,
 * which creates a withdrawal request that admin can process manually.
 */

/**
 * Process host payout for booking earnings
 * 
 * @deprecated This function is not implemented client-side.
 * Host earnings are automatically credited to their wallet when booking is confirmed.
 * Hosts can then request withdrawals using hostPayoutService.requestWithdrawal().
 */
export const processHostPayout = async (
  hostId: string,
  transactionId: string,
  amount: number,
  bookingId: string
): Promise<{ success: boolean; message: string }> => {
  throw new Error('Automatic payouts require Cloud Functions. Host earnings are automatically credited to wallet. Use hostPayoutService.requestWithdrawal() for withdrawals.');
};

/**
 * Process admin payout for service fees or subscription payments
 * 
 * @deprecated This function is not implemented client-side.
 * Admin payouts require Cloud Functions with PayPal Payouts API access.
 */
export const processAdminPayout = async (
  transactionId: string,
  amount: number,
  description: string
): Promise<{ success: boolean; message: string }> => {
  throw new Error('Admin payouts require Cloud Functions with PayPal Payouts API access. This feature is not available in client-side implementation.');
};

