# 💳 Host PayPal Sandbox Integration Guide

## Complete PayPal Integration for Hosts

This document explains how hosts can pay for subscriptions and receive payments from guests using PayPal Sandbox.

---

## 🔄 Two Payment Flows

### 1. **Host Pays for Subscription** (Host → Platform)
**Status:** ✅ Fully Implemented

**How it works:**
1. Host visits `/host/register`
2. Selects a plan (Active Host - Monthly ₱699 or Yearly ₱6,990)
3. Creates account
4. Goes to payment page (`/host/payment`)
5. Clicks "Pay with PayPal" button
6. Redirected to PayPal Sandbox to complete payment
7. Payment processed → Subscription activated
8. Host can now create listings

**Files:**
- `src/pages/host/HostPayment.tsx` - Payment page
- `src/lib/billingService.ts` - Subscription management
- `src/components/payments/PayPalButton.tsx` - PayPal integration

**PayPal Integration:**
- Uses PayPal Sandbox Client ID from `VITE_PAYPAL_CLIENT_ID`
- Creates PayPal order via PayPal SDK
- Captures payment on approval
- Creates subscription record in Firestore
- Creates transaction record

---

### 2. **Host Receives Payment from Guests** (Guest → Host)
**Status:** ✅ Fully Implemented

**How it works:**

#### Step 1: Guest Pays for Booking
1. Guest makes booking → Booking status: `pending`
2. Guest can pay via:
   - **Wallet** (if sufficient balance)
   - **PayPal** (if wallet insufficient)
3. If PayPal: Guest clicks PayPal button → Completes payment via PayPal Sandbox
4. Payment transaction created in Firestore

#### Step 2: Host Approves Booking
1. Host approves booking → Status changes to `confirmed`
2. Payment automatically processed:
   - Guest's payment is verified (PayPal or wallet)
   - Host's wallet is credited with 100% of booking amount
   - Transaction record created for host

#### Step 3: Host Withdraws to PayPal
1. Host goes to `/host/payments`
2. Sees wallet balance (earnings from bookings)
3. Clicks "Withdraw to PayPal"
4. Enters withdrawal amount
5. Funds deducted from wallet
6. Withdrawal transaction created
7. **In Production:** Would call PayPal Payouts API to send money to host's PayPal
8. **In Sandbox:** Simulated (transaction recorded, no actual transfer)

**Files:**
- `src/pages/guest/MyBookings.tsx` - Guest PayPal payment
- `src/lib/paymentService.ts` - Payment processing
- `src/pages/host/HostPayments.tsx` - Host withdrawal
- `src/lib/hostPayoutService.ts` - Withdrawal processing

---

## 🔐 PayPal Account Setup for Hosts

### Required Steps:
1. **Link PayPal Account:**
   - Go to `/host/settings?tab=payments`
   - Click "Link PayPal Account"
   - Redirected to PayPal Sandbox login
   - Log in with PayPal credentials
   - Account verified and email stored

2. **Verify Account:**
   - Account is automatically verified after successful PayPal login
   - `paypalEmail` and `paypalEmailVerified` stored in user profile

3. **Receive Payments:**
   - When guests pay, money goes to host's wallet
   - Host can withdraw wallet balance to PayPal
   - Withdrawal creates transaction record

---

## 📊 Payment Flow Diagram

```
HOST SUBSCRIPTION PAYMENT:
Host → Select Plan → Create Account → PayPal Payment → Subscription Active

GUEST TO HOST PAYMENT:
Guest → Makes Booking → Pays via PayPal/Wallet → Host Approves → 
Host Wallet Credited → Host Withdraws to PayPal
```

---

## 🧪 Sandbox Testing

### For Host Subscription Payment:
1. Use PayPal Sandbox test account
2. Complete payment flow
3. Subscription activated immediately
4. Can create listings

### For Guest Payments:
1. Guest pays via PayPal Sandbox
2. Payment recorded in transactions
3. Host wallet credited
4. Host can withdraw (simulated in sandbox)

### For Host Withdrawals:
1. Host requests withdrawal
2. Wallet balance deducted
3. Withdrawal transaction created
4. **Note:** In sandbox, this is simulated. No actual PayPal transfer occurs.

---

## 🔧 Configuration

### Environment Variables Required:
```env
VITE_PAYPAL_CLIENT_ID=your_sandbox_client_id
VITE_PAYPAL_ENV=sandbox
```

### Get PayPal Sandbox Client ID:
1. Go to https://developer.paypal.com/
2. Log in
3. Dashboard → My Apps & Credentials
4. Sandbox tab → Create App
5. Copy Client ID
6. Add to `.env.production`

---

## ✅ Current Implementation Status

| Feature | Status | PayPal Integration |
|---------|--------|-------------------|
| Host Subscription Payment | ✅ Working | PayPal Sandbox |
| Guest PayPal Payment | ✅ Working | PayPal Sandbox |
| Host Receives Payment | ✅ Working | Wallet Credit |
| Host Withdraws to PayPal | ✅ Working | Simulated (Sandbox) |
| PayPal Account Linking | ✅ Working | PayPal OAuth |

---

## 🚀 Production vs Sandbox

### Sandbox (Current):
- ✅ All PayPal payments are simulated
- ✅ No real money transferred
- ✅ Withdrawals are simulated (transaction recorded)
- ✅ Perfect for testing

### Production (Future):
- Use production PayPal Client ID
- Real money transactions
- PayPal Payouts API for host withdrawals (requires Firebase Functions)
- Requires PayPal Business account

---

## 📝 Summary

**Hosts can:**
1. ✅ Pay for subscription via PayPal Sandbox
2. ✅ Link PayPal account for receiving payments
3. ✅ Receive payments from guests (credited to wallet)
4. ✅ Withdraw wallet balance to PayPal (simulated in sandbox)

**All PayPal integrations use PayPal Sandbox and are fully functional for testing!**

