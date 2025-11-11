# Payment to Admin PayPal Account - Implementation Guide

## Current Status

⚠️ **IMPORTANT**: Currently, the system only **tracks** payments in the database. It does **NOT** actually send money to the admin's PayPal account.

### What's Currently Happening:

1. **Subscription Payments**: 
   - Payments go to the PayPal merchant account configured in your PayPal Developer Dashboard
   - The system only creates a transaction record in the database
   - Money does NOT automatically go to the admin's linked PayPal account

2. **Service Fees (10% Commission)**:
   - The system calculates and records service fees in the database
   - Money does NOT automatically transfer to the admin's PayPal account
   - It's just tracked as a "platform" transaction

## What Needs to Be Implemented

To actually send payments to the admin's PayPal account, you need to implement **PayPal Payouts API** on the **server-side**.

### Required Changes:

#### 1. Server-Side PayPal Payouts API

You need a backend server (Node.js, Python, etc.) that:

1. **Receives payment notifications** from PayPal (webhooks)
2. **Uses PayPal REST API** to send payouts to the admin's PayPal account
3. **Handles both subscription payments and service fees**

#### 2. PayPal Payouts API Setup

**Requirements:**
- PayPal Business Account (the admin's account)
- PayPal REST API credentials (Client ID + Secret)
- Server-side implementation (cannot be done client-side for security)

**API Endpoint Needed:**
```
POST https://api-m.sandbox.paypal.com/v1/payments/payouts
```

**Example Implementation (Node.js):**

```javascript
const paypal = require('@paypal/checkout-server-sdk');

// Initialize PayPal client
function paypalClient() {
  const environment = new paypal.core.SandboxEnvironment(
    process.env.PAYPAL_CLIENT_ID,
    process.env.PAYPAL_SECRET
  );
  return new paypal.core.PayPalHttpClient(environment);
}

// Send payout to admin's PayPal account
async function sendPayoutToAdmin(amount, adminPayPalEmail, description) {
  const request = new paypal.payouts.PayoutsPostRequest();
  request.requestBody({
    sender_batch_header: {
      email_subject: description,
      sender_batch_id: `batch_${Date.now()}`
    },
    items: [{
      recipient_type: "EMAIL",
      amount: {
        value: amount.toFixed(2),
        currency: "PHP"
      },
      receiver: adminPayPalEmail,
      note: description
    }]
  });

  const client = paypalClient();
  const response = await client.execute(request);
  return response;
}
```

#### 3. Webhook Handler

You need to set up PayPal webhooks to automatically trigger payouts when:
- A subscription payment is completed
- A booking payment is completed (to send service fee)

**Webhook Events to Listen For:**
- `PAYMENT.CAPTURE.COMPLETED` - When a payment is captured
- `PAYMENT.SALE.COMPLETED` - When a sale is completed

#### 4. Update Payment Processing Flow

**For Subscription Payments:**
1. Guest pays via PayPal → Payment goes to merchant account
2. Webhook triggers → Server receives notification
3. Server sends payout to admin's PayPal account (full amount)
4. Update database transaction record

**For Service Fees:**
1. Booking payment completed → Service fee calculated
2. Server sends payout to admin's PayPal account (10% commission)
3. Update database transaction record

## Alternative Solution (Simpler but Less Flexible)

### Option: Configure PayPal App to Use Admin's Account

Instead of using Payouts API, you can:

1. **Create a new PayPal App** in PayPal Developer Dashboard
2. **Set the Merchant Account** to the admin's business PayPal account
3. **All payments will automatically go to that account**

**Limitations:**
- All payments go to one account (can't split between admin and hosts)
- Service fees can't be automatically separated
- Less flexible for future changes

## Recommended Approach

**For Production:**
1. Set up a backend server (Firebase Functions, Node.js server, etc.)
2. Implement PayPal Payouts API
3. Set up PayPal webhooks
4. Automatically send payouts when payments are received

**For Development/Testing:**
- Use PayPal Sandbox accounts
- Test the payout flow
- Verify money actually transfers to admin's sandbox account

## Next Steps

1. **Decide on approach**: Payouts API (flexible) or single merchant account (simple)
2. **Set up backend server** if using Payouts API
3. **Get PayPal REST API credentials** (Client ID + Secret)
4. **Implement payout logic** for subscriptions and service fees
5. **Test thoroughly** in sandbox mode before going live

## Important Notes

⚠️ **Security**: Never store PayPal API secrets in client-side code. Always use server-side.

⚠️ **Fees**: PayPal charges fees for payouts. Factor this into your pricing.

⚠️ **Testing**: Always test in sandbox mode first before going live.

