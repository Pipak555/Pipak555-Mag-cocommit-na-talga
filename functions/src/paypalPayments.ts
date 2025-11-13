/**
 * PayPal Payments API Service
 * 
 * Handles charging host's linked PayPal account for subscription payments
 */

import * as admin from 'firebase-admin';

const db = admin.firestore();

// PayPal API Configuration
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || 'AV_tLDGMXIHhXnRCrDuX-Nb-2Wa-hEWjAkTj5ssXye5oTJeDZzTQqQym3UgFe-gOZDaQ1Fn-t8YPvfkx';
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET || 'EBY2ts8baThwt97plOoNWxeryVxWHXEe-ANWAexRZ7zq1sfq-qIa90XNhC5JExAaFGTvrF_TT2hqwzj0';
const PAYPAL_ENV = process.env.PAYPAL_ENV || 'sandbox';
const PAYPAL_BASE_URL = PAYPAL_ENV === 'production' 
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';

/**
 * Exchange PayPal OAuth authorization code for access token
 */
export async function exchangePayPalOAuthCode(
  authCode: string,
  redirectUri: string
): Promise<{ access_token: string; refresh_token?: string; expires_in: number; token_type: string }> {
  try {
    const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64');
    
    const response = await fetch(
      `${PAYPAL_BASE_URL}/v1/identity/openidconnect/tokenservice`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code: authCode,
          redirect_uri: redirectUri,
        }).toString(),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`PayPal OAuth exchange error: ${errorData.error_description || response.statusText}`);
    }

    const data = await response.json();
    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_in: data.expires_in || 32400, // Default 9 hours
      token_type: data.token_type || 'Bearer',
    };
  } catch (error: any) {
    console.error('Error exchanging PayPal OAuth code:', error.message || error);
    throw new Error(`Failed to exchange OAuth code: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Get user info from PayPal access token
 */
export async function getPayPalUserInfo(accessToken: string): Promise<{ email?: string; name?: string; user_id?: string }> {
  try {
    const response = await fetch(
      `${PAYPAL_BASE_URL}/v1/identity/openidconnect/userinfo?schema=openid`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`PayPal UserInfo error: ${errorData.error_description || response.statusText}`);
    }

    const data = await response.json();
    return {
      email: data.email,
      name: data.name,
      user_id: data.user_id,
    };
  } catch (error: any) {
    console.error('Error getting PayPal user info:', error.message || error);
    throw new Error(`Failed to get PayPal user info: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Charge host's linked PayPal account for subscription payment
 * Uses PayPal Payment API with stored access token
 */
export async function chargeHostPayPalAccount(
  hostId: string,
  amount: number,
  description: string,
  planId: string
): Promise<{ paymentId: string; orderId: string; status: string }> {
  try {
    // Get host's stored PayPal access token
    const hostDoc = await db.collection('users').doc(hostId).get();
    if (!hostDoc.exists) {
      throw new Error('Host not found');
    }

    const hostData = hostDoc.data();
    const paypalAccessToken = hostData?.paypalAccessToken;
    const paypalEmail = hostData?.paypalEmail;

    if (!paypalAccessToken) {
      throw new Error('Host PayPal account not linked or access token expired. Please link your PayPal account again.');
    }

    if (!paypalEmail) {
      throw new Error('Host PayPal email not found. Please link your PayPal account again.');
    }

    // Get admin PayPal email for recipient
    let adminPayPalEmail: string | undefined;
    
    // First, try to get from adminSettings
    const adminSettingsDoc = await db.collection('adminSettings').doc('paypal').get();
    if (adminSettingsDoc.exists) {
      const adminSettings = adminSettingsDoc.data();
      adminPayPalEmail = adminSettings?.paypalEmail;
    }

    // If not found, try to get from admin user document
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

    // Use PayPal's Orders API v2 to create and capture payment
    // This charges the host's linked account and sends to admin
    // Note: We need to use the merchant's access token (not user's) to create orders
    // But we can use the user's access token to authorize the payment
    
    // First, get merchant access token (using client credentials)
    const merchantAuth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64');
    const merchantTokenResponse = await fetch(
      `${PAYPAL_BASE_URL}/v1/oauth2/token`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${merchantAuth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
      }
    );

    if (!merchantTokenResponse.ok) {
      const errorData = await merchantTokenResponse.json().catch(() => ({}));
      throw new Error(`PayPal merchant token error: ${errorData.error_description || merchantTokenResponse.statusText}`);
    }

    const merchantTokenData = await merchantTokenResponse.json();
    const merchantAccessToken = merchantTokenData.access_token;

    // Create order using merchant token
    // The order will charge the host's account (identified by their access token)
    const orderData = {
      intent: 'CAPTURE',
      purchase_units: [{
        amount: {
          currency_code: 'PHP',
          value: amount.toFixed(2),
        },
        description: description,
        payee: {
          email_address: adminPayPalEmail, // Payment goes to admin
        },
      }],
    };

    const createOrderResponse = await fetch(
      `${PAYPAL_BASE_URL}/v2/checkout/orders`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${merchantAccessToken}`,
          'Content-Type': 'application/json',
          'PayPal-Request-Id': `subscription-${hostId}-${Date.now()}`,
        },
        body: JSON.stringify(orderData),
      }
    );

    if (!createOrderResponse.ok) {
      const errorData = await createOrderResponse.json().catch(() => ({}));
      throw new Error(`PayPal Order creation error: ${errorData.message || createOrderResponse.statusText}`);
    }

    const order = await createOrderResponse.json();
    const orderId = order.id;

    // Authorize the payment using the host's access token
    // This ensures the payment comes from the linked account
    const authorizeResponse = await fetch(
      `${PAYPAL_BASE_URL}/v2/checkout/orders/${orderId}/authorize`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${paypalAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      }
    );

    if (!authorizeResponse.ok) {
      const errorData = await authorizeResponse.json().catch(() => ({}));
      
      // If token expired, clear it and ask user to re-link
      if (errorData.name === 'INVALID_TOKEN' || errorData.name === 'AUTHENTICATION_FAILURE' || errorData.error === 'invalid_token') {
        await db.collection('users').doc(hostId).update({
          paypalAccessToken: admin.firestore.FieldValue.delete(),
          paypalAccessTokenExpiresAt: admin.firestore.FieldValue.delete(),
        });
        throw new Error('PayPal access token expired. Please link your PayPal account again.');
      }
      
      throw new Error(`PayPal authorization error: ${errorData.message || authorizeResponse.statusText}`);
    }

    // Authorization successful, now capture the payment
    // Capture the authorized payment
    const captureResponse = await fetch(
      `${PAYPAL_BASE_URL}/v2/checkout/orders/${orderId}/capture`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${merchantAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      }
    );

    if (!captureResponse.ok) {
      const errorData = await captureResponse.json().catch(() => ({}));
      throw new Error(`PayPal capture error: ${errorData.message || captureResponse.statusText}`);
    }

    const capturedOrder = await captureResponse.json();
    const capture = capturedOrder.purchase_units[0]?.payments?.captures?.[0];
    
    return {
      paymentId: capture?.id || orderId,
      orderId: orderId,
      status: capture?.status || capturedOrder.status,
    };
  } catch (error: any) {
    console.error('Error charging host PayPal account:', error.message || error);
    throw error;
  }
}

