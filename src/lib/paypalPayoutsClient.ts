/**
 * PayPal Payouts API Client-Side Implementation
 * 
 * Handles sending payouts directly from client-side (no Cloud Functions)
 * Uses PayPal Client ID and Secret from environment variables
 * 
 * ⚠️ NOTE: Client secret is exposed in the bundle. Only use in sandbox mode.
 * For production, use Cloud Functions or a secure backend.
 */

const PAYPAL_CLIENT_ID = import.meta.env.VITE_PAYPAL_CLIENT_ID || '';
const PAYPAL_CLIENT_SECRET = import.meta.env.VITE_PAYPAL_CLIENT_SECRET || '';
const PAYPAL_ENV = import.meta.env.VITE_PAYPAL_ENV || 'sandbox';
const PAYPAL_BASE_URL = PAYPAL_ENV === 'production' 
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';

/**
 * Get PayPal OAuth access token using client credentials
 */
async function getPayPalAccessToken(): Promise<string> {
  try {
    if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
      throw new Error('PayPal credentials not configured. Please set VITE_PAYPAL_CLIENT_ID and VITE_PAYPAL_CLIENT_SECRET in environment variables.');
    }

    const auth = btoa(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`);
    
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
    throw new Error(`Failed to authenticate with PayPal API: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Send payout to a PayPal account
 * 
 * @param recipientEmail - PayPal email address of the recipient
 * @param amount - Amount to send (in PHP)
 * @param currency - Currency code (default: PHP)
 * @param description - Description of the payout
 * @param transactionId - Transaction ID for tracking
 * @returns Payout result with batch ID and status
 */
export async function sendPayPalPayoutClient(
  recipientEmail: string,
  amount: number,
  currency: string = 'PHP',
  description: string,
  transactionId: string
): Promise<{ payoutId: string; status: string; batchId: string }> {
  try {
    console.log(`🔄 Initiating PayPal payout (client-side):`, {
      recipientEmail,
      amount,
      currency,
      description,
      transactionId
    });

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

    console.log(`📤 Sending PayPal payout request:`, {
      batchId,
      recipientEmail,
      amount: amount.toFixed(2),
      currency
    });

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
      const errorMessage = errorData.message || errorData.error_description || response.statusText;
      console.error(`❌ PayPal Payout API error:`, {
        status: response.status,
        statusText: response.statusText,
        error: errorData
      });
      throw new Error(`PayPal Payout API error: ${errorMessage}`);
    }

    const payout = await response.json();
    
    console.log(`✅ PayPal payout sent successfully:`, {
      payoutId: payout.batch_header?.payout_batch_id,
      status: payout.batch_header?.batch_status,
      batchId: payout.batch_header?.payout_batch_id
    });
    
    return {
      payoutId: payout.batch_header?.payout_batch_id || batchId,
      status: payout.batch_header?.batch_status || 'PENDING',
      batchId: payout.batch_header?.payout_batch_id || batchId,
    };
  } catch (error: any) {
    console.error('❌ Error sending PayPal payout:', error);
    throw new Error(`Failed to send PayPal payout: ${error.message || 'Unknown error'}`);
  }
}

