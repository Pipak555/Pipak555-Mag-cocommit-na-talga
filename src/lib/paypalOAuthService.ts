/**
 * PayPal OAuth Service
 * 
 * Handles exchanging PayPal OAuth code for access token
 */

import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';

/**
 * Exchange PayPal OAuth code for access token
 */
export const exchangePayPalOAuthCode = async (
  authCode: string,
  redirectUri: string
): Promise<{ success: boolean; email?: string; message: string }> => {
  try {
    const exchangeOAuth = httpsCallable(functions, 'exchangePayPalOAuth');
    const result = await exchangeOAuth({ authCode, redirectUri });
    return result.data as { success: boolean; email?: string; message: string };
  } catch (error: any) {
    console.error('Error exchanging PayPal OAuth code:', error);
    throw new Error(error.message || 'Failed to exchange PayPal OAuth code');
  }
};

/**
 * Charge host's linked PayPal account for subscription payment
 */
export const chargeHostPayPalAccount = async (
  amount: number,
  description: string,
  planId: string
): Promise<{ success: boolean; paymentId: string; orderId: string; status: string }> => {
  try {
    const chargeSubscription = httpsCallable(functions, 'chargeHostSubscription');
    const result = await chargeSubscription({ amount, description, planId });
    return result.data as { success: boolean; paymentId: string; orderId: string; status: string };
  } catch (error: any) {
    console.error('Error charging host PayPal account:', error);
    throw new Error(error.message || 'Failed to charge PayPal account');
  }
};

