/**
 * Firebase Cloud Functions
 * 
 * Setup:
 * 1. Install Firebase CLI: npm i -g firebase-tools
 * 2. Login: firebase login
 * 3. Initialize: firebase init functions
 * 4. Deploy: firebase deploy --only functions
 * 
 * Environment Variables Required:
 * - PAYPAL_CLIENT_ID: PayPal REST API Client ID
 * - PAYPAL_CLIENT_SECRET: PayPal REST API Client Secret
 * - PAYPAL_ENV: 'sandbox' or 'production'
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { processHostPayout, processAdminPayout } from './paypalPayouts';

admin.initializeApp();

/**
 * Generate email verification link for EmailJS
 */
export const generateVerificationLink = functions.https.onRequest(async (req, res) => {
  // Enable CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  try {
    const { email, continueUrl } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const actionCodeSettings = {
      url: continueUrl || `https://${process.env.GCLOUD_PROJECT}.web.app/verify-email?mode=verifyEmail`,
      handleCodeInApp: true,
    };

    const verificationLink = await admin.auth().generateEmailVerificationLink(
      email,
      actionCodeSettings
    );

    return res.status(200).json({ 
      verificationLink,
      success: true
    });
  } catch (error: any) {
    console.error('Error generating verification link:', error);
    return res.status(500).json({ 
      error: error.message || 'Failed to generate verification link'
    });
  }
});

/**
 * Process Host Payout
 * 
 * Called when a booking payment is confirmed and host earnings need to be paid out
 */
export const processHostPayoutFunction = functions.https.onCall(async (data, context) => {
  // Verify authentication
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  // Verify user is admin or the host themselves
  const userDoc = await admin.firestore().collection('users').doc(context.auth.uid).get();
  if (!userDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'User not found');
  }

  const userData = userDoc.data();
  const isAdmin = userData?.role === 'admin' || userData?.roles?.includes('admin');
  const isHost = data.hostId === context.auth.uid;

  if (!isAdmin && !isHost) {
    throw new functions.https.HttpsError('permission-denied', 'Only admin or the host can process payouts');
  }

  try {
    const { hostId, transactionId, amount, bookingId } = data;

    if (!hostId || !transactionId || !amount || !bookingId) {
      throw new functions.https.HttpsError('invalid-argument', 'Missing required fields');
    }

    await processHostPayout(hostId, transactionId, amount, bookingId);

    return { success: true, message: 'Payout processed successfully' };
  } catch (error: any) {
    console.error('Error in processHostPayoutFunction:', error);
    throw new functions.https.HttpsError('internal', error.message || 'Failed to process payout');
  }
});

/**
 * Process Admin Payout
 * 
 * Called when service fees or subscription payments need to be paid to admin
 */
export const processAdminPayoutFunction = functions.https.onCall(async (data, context) => {
  // Verify authentication
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  // Verify user is admin
  const userDoc = await admin.firestore().collection('users').doc(context.auth.uid).get();
  if (!userDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'User not found');
  }

  const userData = userDoc.data();
  const isAdmin = userData?.role === 'admin' || userData?.roles?.includes('admin');

  if (!isAdmin) {
    throw new functions.https.HttpsError('permission-denied', 'Only admin can process admin payouts');
  }

  try {
    const { transactionId, amount, description } = data;

    if (!transactionId || !amount || !description) {
      throw new functions.https.HttpsError('invalid-argument', 'Missing required fields');
    }

    await processAdminPayout(transactionId, amount, description);

    return { success: true, message: 'Admin payout processed successfully' };
  } catch (error: any) {
    console.error('Error in processAdminPayoutFunction:', error);
    throw new functions.https.HttpsError('internal', error.message || 'Failed to process admin payout');
  }
});

/**
 * Firestore Trigger: Automatically process host payout when transaction is created
 * 
 * This trigger fires when a host earnings transaction is created with status 'completed'
 */
export const autoProcessHostPayout = functions.firestore
  .document('transactions/{transactionId}')
  .onCreate(async (snap, context) => {
    const transaction = snap.data();
    const transactionId = context.params.transactionId;

    // Only process host earnings (type: 'deposit' for host, with bookingId)
    if (
      transaction.type === 'deposit' &&
      transaction.userId &&
      transaction.userId !== 'platform' &&
      transaction.bookingId &&
      transaction.status === 'completed' &&
      transaction.payoutStatus === 'pending' &&
      !transaction.payoutId // Don't process if already processed
    ) {
      try {
        const hostId = transaction.userId;
        const amount = transaction.amount || transaction.netAmount;
        const bookingId = transaction.bookingId;

        if (!amount || amount <= 0) {
          console.log(`Skipping payout for transaction ${transactionId}: Invalid amount`);
          return;
        }

        console.log(`Processing automatic host payout for transaction ${transactionId}`);
        await processHostPayout(hostId, transactionId, amount, bookingId);
      } catch (error: any) {
        console.error(`Error in autoProcessHostPayout for transaction ${transactionId}:`, error);
        // Don't throw - we'll log the error and the transaction will be marked as failed
      }
    }
  });

/**
 * Firestore Trigger: Automatically process admin payout when service fee or subscription transaction is created
 * 
 * This trigger fires when:
 * 1. Service fee transactions are created (userId: 'platform', paymentMethod: 'service_fee', payoutStatus: 'pending')
 * 2. Subscription payment transactions are created (type: 'payment', description contains 'subscription', payoutStatus: 'pending')
 */
export const autoProcessAdminPayout = functions.firestore
  .document('transactions/{transactionId}')
  .onCreate(async (snap, context) => {
    const transaction = snap.data();
    const transactionId = context.params.transactionId;

    // Check if this is a service fee transaction
    const isServiceFee = 
      transaction.userId === 'platform' &&
      transaction.paymentMethod === 'service_fee' &&
      transaction.status === 'completed' &&
      transaction.payoutStatus === 'pending' &&
      !transaction.payoutId; // Don't process if already processed

    // Check if this is a subscription payment transaction
    const isSubscriptionPayment = 
      transaction.type === 'payment' &&
      transaction.status === 'completed' &&
      transaction.payoutStatus === 'pending' &&
      transaction.description &&
      (transaction.description.toLowerCase().includes('host subscription') ||
       transaction.description.toLowerCase().includes('subscription')) &&
      !transaction.payoutId; // Don't process if already processed

    if (isServiceFee || isSubscriptionPayment) {
      try {
        const amount = transaction.amount;
        const description = transaction.description || 
          (isServiceFee ? 'Service fee payment' : 'Subscription payment');

        if (!amount || amount <= 0) {
          console.log(`Skipping admin payout for transaction ${transactionId}: Invalid amount`);
          return;
        }

        console.log(`Processing automatic admin payout for transaction ${transactionId} (${isServiceFee ? 'service fee' : 'subscription'})`);
        await processAdminPayout(transactionId, amount, description);
      } catch (error: any) {
        console.error(`Error in autoProcessAdminPayout for transaction ${transactionId}:`, error);
        // Don't throw - we'll log the error and the transaction will be marked as failed
      }
    }
  });

