/**
 * PayPal Payouts API Service
 * 
 * Handles sending payouts to hosts and admin via PayPal Payouts API
 */

import * as admin from 'firebase-admin';

const db = admin.firestore();

// PayPal API Configuration
// PayPal Sandbox credentials (for testing)
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || 'AV_tLDGMXIHhXnRCrDuX-Nb-2Wa-hEWjAkTj5ssXye5oTJeDZzTQqQym3UgFe-gOZDaQ1Fn-t8YPvfkx';
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET || 'EBY2ts8baThwt97plOoNWxeryVxWHXEe-ANWAexRZ7zq1sfq-qIa90XNhC5JExAaFGTvrF_TT2hqwzj0';
const PAYPAL_ENV = process.env.PAYPAL_ENV || 'sandbox'; // 'sandbox' or 'production'
const PAYPAL_BASE_URL = PAYPAL_ENV === 'production' 
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';

/**
 * Get PayPal OAuth access token
 */
async function getPayPalAccessToken(): Promise<string> {
  try {
    const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64');
    
    const response = await fetch(
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

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`PayPal API error: ${errorData.error_description || response.statusText}`);
    }

    const data = await response.json();
    return data.access_token;
  } catch (error: any) {
    console.error('Error getting PayPal access token:', error.message || error);
    throw new Error('Failed to authenticate with PayPal API');
  }
}

/**
 * Send payout to a PayPal account
 */
export async function sendPayPalPayout(
  recipientEmail: string,
  amount: number,
  currency: string = 'PHP',
  description: string,
  transactionId: string
): Promise<{ payoutId: string; status: string; batchId: string }> {
  try {
    const accessToken = await getPayPalAccessToken();
    
    // Generate unique batch ID
    const batchId = `batch_${Date.now()}_${transactionId.slice(0, 8)}`;
    
    const payoutData = {
      sender_batch_header: {
        sender_batch_id: batchId,
        email_subject: description,
        email_message: `You have received a payment: ${description}. Amount: ${currency} ${amount.toFixed(2)}`,
      },
      items: [
        {
          recipient_type: 'EMAIL',
          amount: {
            value: amount.toFixed(2),
            currency: currency,
          },
          receiver: recipientEmail,
          note: description,
          sender_item_id: transactionId,
        },
      ],
    };

    const response = await fetch(
      `${PAYPAL_BASE_URL}/v1/payments/payouts`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payoutData),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`PayPal Payout API error: ${errorData.message || response.statusText}`);
    }

    const payout = await response.json();
    
    return {
      payoutId: payout.batch_header.payout_batch_id,
      status: payout.batch_header.batch_status,
      batchId: payout.batch_header.payout_batch_id,
    };
  } catch (error: any) {
    console.error('Error sending PayPal payout:', error.response?.data || error.message);
    throw new Error(`Failed to send PayPal payout: ${error.response?.data?.message || error.message}`);
  }
}

/**
 * Get payout status
 */
export async function getPayoutStatus(payoutId: string): Promise<any> {
  try {
    const accessToken = await getPayPalAccessToken();
    
    const response = await fetch(
      `${PAYPAL_BASE_URL}/v1/payments/payouts/${payoutId}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`PayPal API error: ${errorData.message || response.statusText}`);
    }

    return await response.json();
  } catch (error: any) {
    console.error('Error getting payout status:', error.message || error);
    throw new Error(`Failed to get payout status: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Process host payout for booking earnings
 */
export async function processHostPayout(
  hostId: string,
  transactionId: string,
  amount: number,
  bookingId: string
): Promise<void> {
  try {
    // Get host's PayPal email
    const hostDoc = await db.collection('users').doc(hostId).get();
    if (!hostDoc.exists) {
      throw new Error('Host not found');
    }

    const hostData = hostDoc.data();
    const hostPayPalEmail = hostData?.paypalEmail;

    if (!hostPayPalEmail) {
      throw new Error('Host PayPal email not found. Host must link their PayPal account first.');
    }

    if (!hostData?.paypalEmailVerified) {
      throw new Error('Host PayPal email not verified. Host must verify their PayPal account first.');
    }

    // Send payout
    const description = `Earnings from booking #${bookingId.slice(0, 8)}`;
    const payoutResult = await sendPayPalPayout(
      hostPayPalEmail,
      amount,
      'PHP',
      description,
      transactionId
    );

    // Update transaction with payout information
    await db.collection('transactions').doc(transactionId).update({
      payoutId: payoutResult.payoutId,
      payoutStatus: payoutResult.status,
      payoutBatchId: payoutResult.batchId,
      payoutProcessedAt: admin.firestore.FieldValue.serverTimestamp(),
      payoutMethod: 'paypal',
    });

    console.log(`✅ Host payout processed: ${hostId}, Amount: ${amount}, Payout ID: ${payoutResult.payoutId}`);
  } catch (error: any) {
    console.error('Error processing host payout:', error);
    
    // Update transaction with error
    try {
      await db.collection('transactions').doc(transactionId).update({
        payoutStatus: 'failed',
        payoutError: error.message,
        payoutProcessedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } catch (updateError) {
      console.error('Error updating transaction with payout error:', updateError);
    }
    
    throw error;
  }
}

/**
 * Process admin payout for service fees or subscription payments
 */
export async function processAdminPayout(
  transactionId: string,
  amount: number,
  description: string
): Promise<void> {
  try {
    // Get admin PayPal email - check both adminSettings and admin user document
    let adminPayPalEmail: string | undefined;
    
    // First, try to get from adminSettings
    const adminSettingsDoc = await db.collection('adminSettings').doc('paypal').get();
    if (adminSettingsDoc.exists) {
      const adminSettings = adminSettingsDoc.data();
      adminPayPalEmail = adminSettings?.paypalEmail;
    }

    // If not found in adminSettings, try to get from admin user document
    if (!adminPayPalEmail) {
      const usersSnapshot = await db.collection('users')
        .where('role', '==', 'admin')
        .limit(1)
        .get();
      
      if (!usersSnapshot.empty) {
        const adminUser = usersSnapshot.docs[0].data();
        adminPayPalEmail = adminUser?.adminPayPalEmail;
      }
    }

    // Also check roles array for admin
    if (!adminPayPalEmail) {
      const usersSnapshot = await db.collection('users')
        .where('roles', 'array-contains', 'admin')
        .limit(1)
        .get();
      
      if (!usersSnapshot.empty) {
        const adminUser = usersSnapshot.docs[0].data();
        adminPayPalEmail = adminUser?.adminPayPalEmail;
      }
    }

    if (!adminPayPalEmail) {
      throw new Error('Admin PayPal email not found. Admin must link their PayPal account first.');
    }

    // Send payout
    const payoutResult = await sendPayPalPayout(
      adminPayPalEmail,
      amount,
      'PHP',
      description,
      transactionId
    );

    // Update transaction with payout information
    await db.collection('transactions').doc(transactionId).update({
      payoutId: payoutResult.payoutId,
      payoutStatus: payoutResult.status,
      payoutBatchId: payoutResult.batchId,
      payoutProcessedAt: admin.firestore.FieldValue.serverTimestamp(),
      payoutMethod: 'paypal',
    });

    console.log(`✅ Admin payout processed: Amount: ${amount}, Payout ID: ${payoutResult.payoutId}`);
  } catch (error: any) {
    console.error('Error processing admin payout:', error);
    
    // Update transaction with error
    try {
      await db.collection('transactions').doc(transactionId).update({
        payoutStatus: 'failed',
        payoutError: error.message,
        payoutProcessedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } catch (updateError) {
      console.error('Error updating transaction with payout error:', updateError);
    }
    
    throw error;
  }
}

