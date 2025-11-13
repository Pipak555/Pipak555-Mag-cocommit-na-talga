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
import { processHostPayout, processAdminPayout, sendPayPalPayout } from './paypalPayouts';
import { exchangePayPalOAuthCode, getPayPalUserInfo } from './paypalPayments';

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
    res.status(405).send('Method Not Allowed');
    return;
  }

  try {
    const { email, continueUrl } = req.body;

    if (!email) {
      res.status(400).json({ error: 'Email is required' });
      return;
    }

    const actionCodeSettings = {
      url: continueUrl || `https://${process.env.GCLOUD_PROJECT}.web.app/verify-email?mode=verifyEmail`,
      handleCodeInApp: true,
    };

    const verificationLink = await admin.auth().generateEmailVerificationLink(
      email,
      actionCodeSettings
    );

    res.status(200).json({ 
      verificationLink,
      success: true
    });
  } catch (error: any) {
    console.error('Error generating verification link:', error);
    res.status(500).json({ 
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
 * Called when subscription payments need to be paid to admin
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
    // Only process if payoutMethod is 'paypal' (or not set for backward compatibility)
    // Wallet deposits have payoutStatus: 'completed' and won't trigger this
    if (
      transaction.type === 'deposit' &&
      transaction.userId &&
      transaction.userId !== 'platform' &&
      transaction.bookingId &&
      transaction.status === 'completed' &&
      transaction.payoutStatus === 'pending' &&
      !transaction.payoutId && // Don't process if already processed
      (transaction.payoutMethod === 'paypal' || !transaction.payoutMethod) // Only process PayPal payouts (or legacy transactions)
    ) {
      try {
        const hostId = transaction.userId;
        const amount = transaction.amount || transaction.netAmount;
        const bookingId = transaction.bookingId;

        if (!amount || amount <= 0) {
          console.log(`Skipping payout for transaction ${transactionId}: Invalid amount`);
          return;
        }

        console.log(`Processing automatic host payout for transaction ${transactionId} (PayPal)`);
        await processHostPayout(hostId, transactionId, amount, bookingId);
      } catch (error: any) {
        console.error(`Error in autoProcessHostPayout for transaction ${transactionId}:`, error);
        // Don't throw - we'll log the error and the transaction will be marked as failed
      }
    }
  });

/**
 * Firestore Trigger: Automatically process admin payout when subscription transaction is created
 * 
 * This trigger fires when:
 * Subscription payment transactions are created (type: 'payment', description contains 'subscription', payoutStatus: 'pending')
 */
export const autoProcessAdminPayout = functions.firestore
  .document('transactions/{transactionId}')
  .onCreate(async (snap, context) => {
    const transaction = snap.data();
    const transactionId = context.params.transactionId;

    // Check if this is a subscription payment transaction
    const isSubscriptionPayment = 
      transaction.type === 'payment' &&
      transaction.status === 'completed' &&
      transaction.payoutStatus === 'pending' &&
      transaction.description &&
      (transaction.description.toLowerCase().includes('host subscription') ||
       transaction.description.toLowerCase().includes('subscription')) &&
      !transaction.payoutId; // Don't process if already processed

    if (isSubscriptionPayment) {
      try {
        const amount = transaction.amount;
        const description = transaction.description || 'Subscription payment';

        if (!amount || amount <= 0) {
          console.log(`Skipping admin payout for transaction ${transactionId}: Invalid amount`);
          return;
        }

        console.log(`Processing automatic admin payout for transaction ${transactionId} (subscription)`);
        await processAdminPayout(transactionId, amount, description);
      } catch (error: any) {
        console.error(`Error in autoProcessAdminPayout for transaction ${transactionId}:`, error);
        // Don't throw - we'll log the error and the transaction will be marked as failed
      }
    }
  });

/**
 * Request Host Withdrawal
 * 
 * Called when host requests withdrawal from wallet to PayPal
 * Sends payout via PayPal Payouts API and deducts from wallet
 */
export const requestHostWithdrawal = functions.region('us-central1').https.onCall(async (data, context) => {
  // Verify authentication
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  try {
    const { amount } = data;

    if (!amount || amount <= 0) {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid withdrawal amount');
    }

    const userId = context.auth.uid;
    
    // Get user's current wallet balance and PayPal info
    const userDoc = await admin.firestore().collection('users').doc(userId).get();
    if (!userDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'User not found');
    }

    const userData = userDoc.data();
    const currentBalance = userData?.walletBalance || 0;
    const paypalEmail = userData?.paypalEmail;
    // Check for either paypalEmailVerified or paypalOAuthVerified
    const paypalVerified = userData?.paypalEmailVerified || userData?.paypalOAuthVerified;

    // Validate withdrawal
    if (!paypalVerified) {
      throw new functions.https.HttpsError('failed-precondition', 'Please link and verify your PayPal account first');
    }

    if (amount > currentBalance) {
      throw new functions.https.HttpsError('failed-precondition', `Insufficient balance. Available: ₱${currentBalance.toFixed(2)}`);
    }

    // Calculate new balance
    const newBalance = currentBalance - amount;

    // Create transaction record first
    const transactionRef = admin.firestore().collection('transactions').doc();
    const transactionId = transactionRef.id;
    
    const transactionData = {
      userId,
      type: 'withdrawal',
      amount,
      description: `Withdrawal to PayPal${paypalEmail ? ` (${paypalEmail})` : ''}`,
      status: 'pending', // Will be updated after payout
      paymentMethod: 'paypal',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await transactionRef.set(transactionData);

    try {
      // Try to get email from PayPal if not stored but account is verified
      let recipientEmail = paypalEmail;
      if (!recipientEmail && userData?.paypalAccessToken) {
        try {
          const userInfo = await getPayPalUserInfo(userData.paypalAccessToken);
          if (userInfo.email) {
            recipientEmail = userInfo.email;
            // Store the email for future use
            await admin.firestore().collection('users').doc(userId).update({
              paypalEmail: recipientEmail
            });
          }
        } catch (emailError) {
          console.warn('Could not retrieve PayPal email from access token:', emailError);
        }
      }

      // Send payout to PayPal (only if email is available)
      let payoutResult = null;
      if (recipientEmail) {
        payoutResult = await sendPayPalPayout(
          recipientEmail,
          amount,
          'PHP',
          `Withdrawal from wallet to ${recipientEmail}`,
          transactionId
        );
      } else {
        throw new Error('PayPal email not found. Please re-link your PayPal account to store your email.');
      }

      // Update transaction with payout info first
      await transactionRef.update({
        status: payoutResult.status === 'PENDING' ? 'pending' : 'completed',
        payoutId: payoutResult.payoutId,
        payoutStatus: payoutResult.status,
        payoutBatchId: payoutResult.batchId,
        payoutProcessedAt: admin.firestore.FieldValue.serverTimestamp(),
        paymentId: payoutResult.payoutId,
      });

      // Only deduct from wallet after successful payout
      await admin.firestore().collection('users').doc(userId).update({
        walletBalance: newBalance
      });

      return {
        success: true,
        transactionId,
        payoutId: payoutResult.payoutId,
        message: `Withdrawal of ₱${amount.toFixed(2)} sent to PayPal. Payout ID: ${payoutResult.payoutId}`
      };
    } catch (payoutError: any) {
      // If payout fails, mark transaction as failed (wallet not deducted yet)
      await transactionRef.update({
        status: 'failed',
        payoutError: payoutError.message,
        payoutProcessedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      throw new functions.https.HttpsError('internal', `PayPal payout failed: ${payoutError.message}`);
    }
  } catch (error: any) {
    console.error('Error in requestHostWithdrawal:', error);
    
    // If it's already an HttpsError, re-throw it
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    
    // Otherwise, wrap it in an HttpsError
    throw new functions.https.HttpsError('internal', error.message || 'Failed to process withdrawal');
  }
});

/**
 * Exchange PayPal OAuth Code
 * 
 * Called when user links their PayPal account via OAuth flow
 * Exchanges authorization code for access token and stores user info
 */
export const exchangePayPalOAuth = functions.region('us-central1').https.onCall(async (data, context) => {
  // Verify authentication
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  try {
    const { authCode, redirectUri } = data;

    if (!authCode || !redirectUri) {
      throw new functions.https.HttpsError('invalid-argument', 'Missing required fields: authCode and redirectUri');
    }

    // Exchange OAuth code for access token
    const tokenData = await exchangePayPalOAuthCode(authCode, redirectUri);
    
    // Get user info from PayPal using access token
    const userInfo = await getPayPalUserInfo(tokenData.access_token);

    if (!userInfo.email) {
      throw new functions.https.HttpsError('internal', 'Failed to retrieve PayPal email');
    }

    // Calculate token expiration time
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + (tokenData.expires_in || 32400)); // Default 9 hours

    // Store PayPal info in user document
    const userRef = admin.firestore().collection('users').doc(context.auth.uid);
    await userRef.update({
      paypalEmail: userInfo.email,
      paypalEmailVerified: true,
      paypalAccessToken: tokenData.access_token,
      paypalRefreshToken: tokenData.refresh_token || null,
      paypalAccessTokenExpiresAt: expiresAt,
      paypalLinkedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {
      success: true,
      email: userInfo.email,
      message: 'PayPal account linked successfully',
    };
  } catch (error: any) {
    console.error('Error in exchangePayPalOAuth:', error);
    
    // If it's already an HttpsError, re-throw it
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    
    // Otherwise, wrap it in an HttpsError
    throw new functions.https.HttpsError('internal', error.message || 'Failed to exchange PayPal OAuth code');
  }
});

