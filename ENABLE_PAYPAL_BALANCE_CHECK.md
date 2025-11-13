# 🔒 Enable PayPal Sandbox Balance Checking

## Problem
PayPal sandbox by default allows payments even with $0 balance. To make payments fail when there's insufficient funds, you need to enable Payment Review in your PayPal sandbox account.

## Solution: Enable Payment Review

### Step 1: Go to Sandbox Account Settings

1. Go to [PayPal Developer Dashboard](https://developer.paypal.com/)
2. Navigate to: **Dashboard** → **Testing Tools** → **Sandbox Accounts**
3. Click on your test account (e.g., "Host Doe")

### Step 2: Enable Payment Review

1. Scroll down to the **"Settings"** section
2. Find **"Payment Review"** toggle
3. **Turn it ON** (toggle should be blue/checked)
4. This will make PayPal review payments before completing them

### Step 3: What This Does

When Payment Review is enabled:
- ✅ Payments will be **pending** until you approve them
- ✅ You can **reject** payments with insufficient funds
- ✅ You can **approve** payments with sufficient funds
- ✅ More realistic testing environment

### Step 4: Approve/Reject Payments

After making a payment:

1. Go to: **Dashboard** → **Testing Tools** → **Sandbox Notifications**
2. You'll see pending payments
3. Click on a payment to view details
4. **Approve** if account has sufficient funds
5. **Reject** if account has insufficient funds

---

## Alternative: Use Test Cards with Limits

You can also add test credit cards with spending limits:

1. In account details, click **"Manage"** next to **"Credit Cards"**
2. Add a test card with a **spending limit** (e.g., PHP 500)
3. Try to pay PHP 699 - it will fail due to limit

---

## Code Changes Made

I've updated the PayPal button to:
- ✅ Catch insufficient funds errors
- ✅ Show clear error messages
- ✅ Prevent subscription activation on payment failure
- ✅ Handle PayPal error codes properly

---

## Testing Insufficient Funds

### Test Scenario 1: Account with $0
1. Set account balance to PHP 0
2. Try to pay PHP 699
3. Payment should fail with error message

### Test Scenario 2: Account with Low Balance
1. Set account balance to PHP 500
2. Try to pay PHP 699
3. Payment should fail (if Payment Review is enabled)

### Test Scenario 3: Account with Sufficient Funds
1. Set account balance to PHP 10,000
2. Try to pay PHP 699
3. Payment should succeed
4. Balance should decrease to PHP 9,301

---

## Important Notes

⚠️ **Payment Review Mode:**
- Payments will be **pending** until manually approved
- You need to approve/reject in PayPal Dashboard
- This is more realistic but requires manual steps

✅ **Error Handling:**
- Code now catches insufficient funds errors
- Shows clear error messages to users
- Prevents subscription activation on failure

---

## Summary

1. **Enable Payment Review** in PayPal sandbox account
2. **Add test funds** to account (e.g., PHP 10,000)
3. **Make a payment** - it will be pending
4. **Approve/Reject** in Sandbox Notifications
5. **Test insufficient funds** by rejecting payments

Now payments will behave realistically! 🎉

