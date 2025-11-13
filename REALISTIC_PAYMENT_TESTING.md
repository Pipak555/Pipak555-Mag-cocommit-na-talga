# 💳 Realistic Payment Testing Setup

## Goal: Test Payments with Real Balance Deductions

To simulate real-world payments where money is actually deducted from accounts, you need to:

1. Add test funds to your sandbox account
2. Verify payments deduct from balance
3. Test different scenarios (sufficient funds, insufficient funds, etc.)

---

## Step 1: Add Test Funds to Sandbox Account

### Method 1: Direct Balance Edit (Easiest)

1. Go to [PayPal Developer Dashboard](https://developer.paypal.com/)
2. Navigate to: **Dashboard** → **Testing Tools** → **Sandbox Accounts**
3. Find your account (e.g., "Host Doe" - Account ID: `TVCSK6VLG5A9U`)
4. Click on the account name to open details
5. Find **"PayPal balance: PHP 0"**
6. Click the **pencil/edit icon** (✏️) next to the balance
7. Enter a test amount:
   - For testing: `50000` (PHP 50,000)
   - Or any amount you want: `100000` (PHP 100,000)
8. Click **Save** or **Update**

### Method 2: Use Test Credit Card

1. In the same account details page
2. Click **"Manage"** next to **"Credit Cards"**
3. Add a test credit card:
   - **Card Number:** `4032031234567890` (Visa test card)
   - **CVV:** `123`
   - **Expiry:** `12/25` (any future date)
   - **Name:** Host Doe
4. Save the card
5. Now you can make payments using this card (it has unlimited test funds)

### Method 3: Transfer from Another Account

1. Create a second sandbox account (e.g., "Buyer Account")
2. Add funds to that account
3. Use PayPal's sandbox transfer feature to send money to your host account

---

## Step 2: Verify Payment Deduction

After adding funds, test a payment:

1. **Make a payment** through your app (e.g., ₱699 subscription)
2. **Check the balance** in PayPal Developer Dashboard:
   - Go back to: **Testing Tools** → **Sandbox Accounts**
   - Click on your account
   - Check **"PayPal balance"**
   - It should show: `PHP 49,301` (if you started with 50,000 and paid 699)

### If Balance Doesn't Deduct

This might happen if:
- Payment Review is enabled (check the toggle in account settings)
- The payment is still pending
- You need to refresh the page

**Solution:**
1. In account details, find **"Payment Review"** toggle
2. Make sure it's **OFF** (grey/unchecked)
3. This allows payments to complete immediately

---

## Step 3: Test Different Scenarios

### Scenario 1: Sufficient Funds
- **Setup:** Account with PHP 10,000
- **Payment:** PHP 699 subscription
- **Expected:** Payment succeeds, balance = PHP 9,301

### Scenario 2: Insufficient Funds
- **Setup:** Account with PHP 500
- **Payment:** PHP 699 subscription
- **Expected:** Payment fails (if PayPal sandbox enforces this)

### Scenario 3: Exact Balance
- **Setup:** Account with PHP 699
- **Payment:** PHP 699 subscription
- **Expected:** Payment succeeds, balance = PHP 0

### Scenario 4: Multiple Payments
- **Setup:** Account with PHP 10,000
- **Payments:** 
  - First: PHP 699 (balance = 9,301)
  - Second: PHP 6,990 (balance = 2,311)
- **Expected:** Both succeed, balance decreases correctly

---

## Step 4: Enable Payment Review (Optional)

If you want to manually approve payments:

1. In account details, find **"Payment Review"** section
2. Toggle it **ON** (blue/checked)
3. Now payments will be pending until you approve them
4. Go to **"Sandbox Notifications"** to approve pending payments

**Use this to test:**
- Pending payment states
- Payment approval workflows
- Payment cancellation

---

## Step 5: Check Payment History

To see all transactions:

1. Go to: **Dashboard** → **Testing Tools** → **Sandbox Notifications**
2. Or: **Dashboard** → **Event Logs**
3. You'll see all payment transactions
4. Check amounts, status, and timestamps

---

## Quick Setup Checklist

- [ ] Add test funds to sandbox account (PHP 50,000 recommended)
- [ ] Disable Payment Review (for immediate payments)
- [ ] Make a test payment through your app
- [ ] Verify balance decreased correctly
- [ ] Check payment appears in Event Logs
- [ ] Test insufficient funds scenario (optional)

---

## Troubleshooting

### Problem: Balance doesn't decrease after payment

**Solutions:**
1. Check Payment Review is OFF
2. Refresh the account page
3. Check Event Logs to see if payment was processed
4. Make sure you're checking the correct account

### Problem: Payment fails even with sufficient funds

**Solutions:**
1. Check account status is "Verified"
2. Make sure test credit card is added (if using card)
3. Check PayPal sandbox status (sometimes it has issues)
4. Try a different test account

### Problem: Can't edit balance

**Solutions:**
1. Make sure you're in Sandbox mode (not Live)
2. Try refreshing the page
3. Try a different browser
4. Contact PayPal Developer Support if issue persists

---

## Recommended Test Account Setup

### Account 1: Host Account (Rich)
- **Balance:** PHP 100,000
- **Purpose:** Test multiple payments, large transactions
- **Status:** Verified

### Account 2: Host Account (Normal)
- **Balance:** PHP 10,000
- **Purpose:** Test regular subscription payments
- **Status:** Verified

### Account 3: Host Account (Low Balance)
- **Balance:** PHP 500
- **Purpose:** Test insufficient funds scenarios
- **Status:** Verified

---

## Summary

✅ **To test realistic payments:**
1. Add test funds to your sandbox account
2. Disable Payment Review for immediate processing
3. Make payments and verify balance decreases
4. Check Event Logs for transaction history

✅ **This simulates real-world behavior:**
- Payments deduct from actual balance
- You can test insufficient funds
- You can verify payment amounts
- You can track transaction history

Now your sandbox testing will behave like real payments! 🎉

