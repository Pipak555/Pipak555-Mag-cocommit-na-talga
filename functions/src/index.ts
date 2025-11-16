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
        // CRITICAL FIX: Always use transaction.amount, never fall back to netAmount
        // netAmount might be less than amount if fees were deducted, but we want the full amount
        // For deposits, amount should always be the full deposit amount (no fees deducted)
        // CRITICAL: Convert from centavos to PHP if needed (transactions store amounts as integer centavos)
        let amount = transaction.amount;
        // If amount is stored as integer centavos (>= 100), convert to PHP
        // Otherwise, assume it's already in PHP (legacy format)
        if (Number.isInteger(amount) && amount >= 100) {
          amount = amount / 100; // Convert centavos to PHP
        }
        const bookingId = transaction.bookingId;

        if (!amount || amount <= 0) {
          console.log(`Skipping payout for transaction ${transactionId}: Invalid amount`);
          return;
        }

        console.log(`Processing automatic host payout for transaction ${transactionId} (PayPal), Amount: ₱${amount.toFixed(2)}`);
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
        // CRITICAL: Convert from centavos to PHP if needed (transactions store amounts as integer centavos)
        let amount = transaction.amount;
        // If amount is stored as integer centavos (>= 100), convert to PHP
        // Otherwise, assume it's already in PHP (legacy format)
        if (Number.isInteger(amount) && amount >= 100) {
          amount = amount / 100; // Convert centavos to PHP
        }
        const description = transaction.description || 'Subscription payment';

        if (!amount || amount <= 0) {
          console.log(`Skipping admin payout for transaction ${transactionId}: Invalid amount`);
          return;
        }

        console.log(`Processing automatic admin payout for transaction ${transactionId} (subscription), Amount: ₱${amount.toFixed(2)}`);
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
 * Process Wallet Top-Up
 * 
 * Called when a user tops up their e-wallet via PayPal
 * Verifies the PayPal payment and credits the virtual balance only after confirmation
 * Real money goes to Admin's PayPal account
 */
export const processWalletTopUp = functions.region('us-central1').https.onCall(async (data, context) => {
  // Verify authentication
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  try {
    const { orderId, amount, description } = data;

    if (!orderId || !amount || amount <= 0) {
      throw new functions.https.HttpsError('invalid-argument', 'Missing required fields: orderId and amount');
    }

    const userId = context.auth.uid;

    // Verify the PayPal order was successfully captured
    // Get PayPal access token
    const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || '';
    const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET || '';
    const PAYPAL_ENV = process.env.PAYPAL_ENV || 'sandbox';
    const PAYPAL_BASE_URL = PAYPAL_ENV === 'production' 
      ? 'https://api-m.paypal.com'
      : 'https://api-m.sandbox.paypal.com';

    const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64');
    const tokenResponse = await fetch(
      `${PAYPAL_BASE_URL}/v1/oauth2/token`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
      }
    );

    if (!tokenResponse.ok) {
      throw new Error('Failed to authenticate with PayPal API');
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Get order details from PayPal
    const orderResponse = await fetch(
      `${PAYPAL_BASE_URL}/v2/checkout/orders/${orderId}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!orderResponse.ok) {
      throw new Error('Failed to verify PayPal order');
    }

    const order = await orderResponse.json();

    // Verify order status is COMPLETED
    if (order.status !== 'COMPLETED') {
      throw new functions.https.HttpsError('failed-precondition', `Payment not completed. Status: ${order.status}`);
    }

    // Verify the amount matches
    const orderAmount = parseFloat(order.purchase_units[0]?.amount?.value || '0');
    if (Math.abs(orderAmount - amount) > 0.01) {
      throw new functions.https.HttpsError('failed-precondition', `Amount mismatch. Expected: ${amount}, Got: ${orderAmount}`);
    }

    // Verify payment was captured
    const capture = order.purchase_units[0]?.payments?.captures?.[0];
    if (!capture || capture.status !== 'COMPLETED') {
      throw new functions.https.HttpsError('failed-precondition', 'Payment not captured or not completed');
    }

    // Check if transaction already exists (prevent duplicate processing)
    const existingTransactions = await admin.firestore()
      .collection('transactions')
      .where('userId', '==', userId)
      .where('paymentId', '==', orderId)
      .where('type', '==', 'deposit')
      .limit(1)
      .get();

    if (!existingTransactions.empty) {
      // Transaction already processed
      return {
        success: true,
        transactionId: existingTransactions.docs[0].id,
        message: 'Top-up already processed',
        alreadyProcessed: true,
      };
    }

    // Get user's current balance
    const userDoc = await admin.firestore().collection('users').doc(userId).get();
    if (!userDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'User not found');
    }

    const userData = userDoc.data();
    const currentBalance = userData?.walletBalance || 0;
    const newBalance = currentBalance + amount;

    // Create transaction record first
    const transactionRef = admin.firestore().collection('transactions').doc();
    const transactionId = transactionRef.id;

    const transactionData = {
      userId,
      type: 'deposit',
      amount,
      description: description || `Wallet top-up via PayPal`,
      status: 'completed',
      paymentMethod: 'paypal',
      paymentId: orderId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await transactionRef.set(transactionData);

    // Credit virtual balance only after payment is confirmed
    await admin.firestore().collection('users').doc(userId).update({
      walletBalance: newBalance,
    });

    console.log(`✅ Wallet top-up processed: User ${userId}, Amount: ${amount}, Order ID: ${orderId}`);

    return {
      success: true,
      transactionId,
      newBalance,
      message: `Successfully topped up ${amount.toFixed(2)} to your wallet`,
    };
  } catch (error: any) {
    console.error('Error in processWalletTopUp:', error);
    
    // If it's already an HttpsError, re-throw it
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    
    // Otherwise, wrap it in an HttpsError
    throw new functions.https.HttpsError('internal', error.message || 'Failed to process wallet top-up');
  }
});

/**
 * Get Admin PayPal Email
 * 
 * Helper function to get admin PayPal email from adminSettings or admin user document
 */
async function getAdminPayPalEmail(): Promise<string | null> {
  // First, try to get from adminSettings
  const adminSettingsDoc = await admin.firestore().collection('adminSettings').doc('paypal').get();
  if (adminSettingsDoc.exists) {
    const adminSettings = adminSettingsDoc.data();
    if (adminSettings?.paypalEmail) {
      return adminSettings.paypalEmail;
    }
  }

  // If not found, try to get from admin user document
  const usersSnapshot = await admin.firestore()
    .collection('users')
    .where('role', '==', 'admin')
    .limit(1)
    .get();
  
  if (!usersSnapshot.empty) {
    const adminUser = usersSnapshot.docs[0].data();
    if (adminUser?.adminPayPalEmail) {
      return adminUser.adminPayPalEmail;
    }
  }

  // Also check roles array for admin
  const rolesSnapshot = await admin.firestore()
    .collection('users')
    .where('roles', 'array-contains', 'admin')
    .limit(1)
    .get();
  
  if (!rolesSnapshot.empty) {
    const adminUser = rolesSnapshot.docs[0].data();
    if (adminUser?.adminPayPalEmail) {
      return adminUser.adminPayPalEmail;
    }
  }

  return null;
}

/**
 * Get Admin PayPal Email (Callable Function)
 * 
 * Allows authenticated users (guests, hosts) to get the admin PayPal email
 * for wallet top-ups. This is needed because guests can't read adminSettings directly.
 */
export const getAdminPayPalEmailCallable = functions.region('us-central1').https.onCall(async (data, context) => {
  // Verify authentication
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  try {
    const paypalEmail = await getAdminPayPalEmail();
    return {
      success: true,
      paypalEmail: paypalEmail,
    };
  } catch (error: any) {
    console.error('Error in getAdminPayPalEmailCallable:', error);
    throw new functions.https.HttpsError('internal', error.message || 'Failed to get admin PayPal email');
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

