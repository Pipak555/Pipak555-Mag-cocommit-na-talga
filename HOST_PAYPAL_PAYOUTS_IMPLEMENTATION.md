# Host PayPal Payouts Implementation Guide

## ✅ Implementation Complete

The Host PayPal Payouts system has been fully implemented. This document explains how it works and how to set it up.

## Overview

The system automatically processes PayPal payouts to hosts when they earn money from bookings. When a booking payment is confirmed:

1. Host earnings are calculated (booking total - 10% service fee)
2. A transaction record is created in Firestore
3. A Firebase Cloud Function automatically triggers
4. The function sends a PayPal payout to the host's linked PayPal account
5. The transaction is updated with payout status

## Architecture

### Components

1. **Firebase Cloud Functions** (`functions/src/paypalPayouts.ts`)
   - Handles PayPal API authentication
   - Sends payouts via PayPal Payouts API
   - Updates transaction records with payout status

2. **Firebase Function Triggers** (`functions/src/index.ts`)
   - `autoProcessHostPayout`: Automatically processes payouts when transactions are created
   - `processHostPayoutFunction`: Manual payout processing (callable function)
   - `processAdminPayoutFunction`: Admin payout processing

3. **Client-side Service** (`src/lib/payoutService.ts`)
   - Interface for calling payout functions from the client
   - Used for manual payout processing if needed

4. **Payment Service** (`src/lib/paymentService.ts`)
   - Updated to mark transactions with `payoutStatus: 'pending'`
   - Firebase Function automatically processes these

## Setup Instructions

### 1. Install Dependencies

In the `functions` directory:

```bash
cd functions
npm install
```

**Note:** The code uses native `fetch` API (available in Node.js 18+). If you're using Node.js < 18, you'll need to install a fetch polyfill or use axios.

### 2. Set Environment Variables

Set these in Firebase Functions environment:

```bash
firebase functions:config:set paypal.client_id="YOUR_PAYPAL_CLIENT_ID"
firebase functions:config:set paypal.client_secret="YOUR_PAYPAL_CLIENT_SECRET"
firebase functions:config:set paypal.env="sandbox" # or "production"
```

Or use Firebase Functions environment variables (recommended):

```bash
firebase functions:secrets:set PAYPAL_CLIENT_ID
firebase functions:secrets:set PAYPAL_CLIENT_SECRET
firebase functions:secrets:set PAYPAL_ENV
```

### 3. Deploy Functions

```bash
firebase deploy --only functions
```

### 4. Verify Host PayPal Accounts

Hosts must:
1. Link their PayPal account in Account Settings
2. Verify their PayPal email address
3. Ensure the PayPal account is active and can receive payments

## How It Works

### Automatic Payout Flow

1. **Booking Confirmed** → Host approves booking
2. **Payment Processed** → `processBookingPayment()` creates host earnings transaction
3. **Transaction Created** → Firestore document created with `payoutStatus: 'pending'`
4. **Function Triggered** → `autoProcessHostPayout` Firebase Function fires
5. **Payout Sent** → Function calls PayPal Payouts API
6. **Status Updated** → Transaction updated with `payoutId`, `payoutStatus`, etc.

### Transaction Status Flow

```
pending → processing → completed
                    ↓
                  failed (if error)
```

## Testing

### Sandbox Testing

1. Use PayPal Sandbox accounts for testing
2. Set `PAYPAL_ENV=sandbox` in environment variables
3. Create test bookings and confirm them
4. Check Firebase Functions logs for payout processing
5. Verify payouts in PayPal Sandbox account

### Production Testing

1. Set `PAYPAL_ENV=production` in environment variables
2. Use real PayPal accounts (start with small amounts)
3. Monitor Firebase Functions logs
4. Verify payouts in PayPal accounts

## Monitoring

### Check Payout Status

Payout status is stored in the transaction document:

```typescript
{
  payoutId: "batch_1234567890",
  payoutStatus: "completed", // or "pending", "processing", "failed"
  payoutBatchId: "batch_1234567890",
  payoutProcessedAt: "2025-01-15T10:30:00Z",
  payoutMethod: "paypal",
  payoutError: null // or error message if failed
}
```

### View Function Logs

```bash
firebase functions:log
```

Or in Firebase Console:
- Go to Functions → Logs
- Filter by function name: `autoProcessHostPayout`

## Error Handling

### Common Errors

1. **Host PayPal email not found**
   - Solution: Host must link PayPal account in settings

2. **Host PayPal email not verified**
   - Solution: Host must verify PayPal account

3. **PayPal API authentication failed**
   - Solution: Check `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET`

4. **Insufficient funds in merchant account**
   - Solution: Ensure merchant PayPal account has sufficient balance

### Retry Logic

If a payout fails:
1. Transaction is marked with `payoutStatus: 'failed'`
2. Error message stored in `payoutError` field
3. Admin can manually retry via `processHostPayoutFunction`

## Manual Payout Processing

If automatic payout fails, admins can manually trigger:

```typescript
import { processHostPayout } from '@/lib/payoutService';

await processHostPayout(
  hostId,
  transactionId,
  amount,
  bookingId
);
```

## Security

- ✅ PayPal API credentials stored in Firebase Functions environment (server-side only)
- ✅ Authentication required for manual payout functions
- ✅ Only admins or the host themselves can trigger manual payouts
- ✅ All payout operations logged in Firebase Functions logs

## PayPal Fees

PayPal charges fees for payouts:
- **Domestic (same country):** Typically 2% + fixed fee
- **International:** Varies by country

**Note:** These fees are deducted from the payout amount. The host receives the net amount after fees.

## Production Checklist

- [ ] Set `PAYPAL_ENV=production` in environment variables
- [ ] Use production PayPal Client ID and Secret
- [ ] Test with small amounts first
- [ ] Monitor Firebase Functions logs
- [ ] Set up alerts for failed payouts
- [ ] Document payout process for support team
- [ ] Ensure hosts understand PayPal account requirements

## Support

If payouts are not working:

1. Check Firebase Functions logs
2. Verify PayPal API credentials
3. Check host PayPal account status
4. Verify transaction has `payoutStatus: 'pending'`
5. Check PayPal account balance (merchant account)

## Next Steps

1. **Admin Payouts**: Service fees and subscription payments can also use `processAdminPayoutFunction`
2. **Batch Processing**: Consider batching multiple payouts for efficiency
3. **Webhooks**: Set up PayPal webhooks for real-time payout status updates
4. **Notifications**: Send notifications to hosts when payouts are completed

