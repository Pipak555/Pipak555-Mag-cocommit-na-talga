# 🚫 Force PayPal Sandbox to Reject Payments with Insufficient Funds

## The Problem
PayPal sandbox by default allows payments even with $0 balance. To make payments fail when there's insufficient funds, you need to enable **Negative Testing** mode.

## Solution: Enable Negative Testing

### Step 1: Enable Negative Testing in Sandbox Account

1. Go to [PayPal Developer Dashboard](https://developer.paypal.com/)
2. Navigate to: **Dashboard** → **Testing Tools** → **Sandbox Accounts**
3. Click on your test account (e.g., "Host Doe")
4. Scroll down to **"Settings"** section
5. Find **"Negative Testing"** toggle
6. **Turn it ON** (toggle should be blue/checked)

### Step 2: Use Negative Testing Error Codes

When Negative Testing is enabled, you can simulate errors by including specific error codes in your payment amount or description.

#### Method 1: Use Error Code in Amount (Easiest)

When creating a payment, use these special amounts to trigger errors:

- **Insufficient Funds:** Use amount ending in `.57` (e.g., `699.57`)
  - Example: `699.57` will trigger `INSUFFICIENT_FUNDS` error
  
- **Payment Declined:** Use amount ending in `.58` (e.g., `699.58`)
  - Example: `699.58` will trigger `INSTRUMENT_DECLINED` error

#### Method 2: Use Error Code in Description

Add error codes to the payment description:
- Add `INSUFFICIENT_FUNDS` to description
- Add `INSTRUMENT_DECLINED` to description

### Step 3: Test Insufficient Funds

1. **Enable Negative Testing** in sandbox account (Step 1)
2. **Set account balance to PHP 0**
3. **Make a payment with amount ending in `.57`** (e.g., `699.57`)
4. Payment will fail with "Insufficient Funds" error
5. Your app will catch the error and show the message

### Step 4: Test Normal Payment

1. **Set account balance to PHP 10,000**
2. **Make a payment with normal amount** (e.g., `699.00`)
3. Payment will succeed
4. Balance decreases correctly

---

## Alternative: Use Payment Review + Manual Rejection

If Negative Testing doesn't work for you:

1. **Enable Payment Review** in sandbox account
2. **Set account balance to PHP 0**
3. **Make a payment** - it will be pending
4. **Go to:** Dashboard → Testing Tools → Sandbox Notifications
5. **Reject the payment** manually
6. Your app will show the error

---

## Code Changes Made

I've updated the code to:
- ✅ Catch capture errors (where PayPal checks balance)
- ✅ Detect insufficient funds errors
- ✅ Show clear error messages
- ✅ Prevent subscription activation on failure
- ✅ Handle PayPal error codes properly

---

## Testing Scenarios

### Scenario 1: Insufficient Funds (Negative Testing)
- **Setup:** Account with PHP 0, Negative Testing ON
- **Payment:** PHP 699.57 (triggers INSUFFICIENT_FUNDS)
- **Expected:** Payment fails with error message

### Scenario 2: Normal Payment
- **Setup:** Account with PHP 10,000
- **Payment:** PHP 699.00
- **Expected:** Payment succeeds, balance = PHP 9,301

### Scenario 3: Payment Declined
- **Setup:** Account with PHP 0, Negative Testing ON
- **Payment:** PHP 699.58 (triggers INSTRUMENT_DECLINED)
- **Expected:** Payment fails with declined message

---

## Important Notes

⚠️ **Negative Testing Mode:**
- Must be enabled in sandbox account settings
- Uses special amounts/descriptions to trigger errors
- More realistic error simulation

✅ **Error Handling:**
- Code now catches capture errors
- Shows clear error messages
- Prevents subscription activation

---

## Quick Setup Checklist

- [ ] Enable Negative Testing in sandbox account
- [ ] Set account balance to PHP 0 (for testing)
- [ ] Try payment with amount ending in `.57` (should fail)
- [ ] Try payment with normal amount (should succeed if balance sufficient)
- [ ] Verify error messages appear correctly

---

## Summary

1. **Enable Negative Testing** in PayPal sandbox account
2. **Use special amounts** (`.57` for insufficient funds) to test errors
3. **Code will catch errors** and show appropriate messages
4. **Payments will fail** when insufficient funds are detected

Now payments will properly fail when there's insufficient balance! 🎉

