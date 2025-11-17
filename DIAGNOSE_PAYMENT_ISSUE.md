# 🔍 Diagnosing Payment Amount Issue

## Possible Reasons Admin Not Receiving Exact Amount

### 1. **PayPal Actually Deducting Fees** ⚠️ MOST LIKELY
**Problem:** Even though we set `paypalFee: 0` in our database, PayPal might be deducting actual fees from the payment.

**How to Check:**
- Look at the PayPal order breakdown in console logs
- Check if `breakdown.paypal_fee.value > 0`
- Check if `breakdown.net_amount.value < breakdown.gross_amount.value`

**Solution:** 
- We're already ignoring PayPal's breakdown and using `depositAmount` for `netAmount`
- But the **actual money** PayPal sends to admin's account might be less
- This is a PayPal configuration issue, not a code issue

### 2. **Payee Email Not Set in PayPal Order** ⚠️ LIKELY
**Problem:** If the PayPal order doesn't have a `payee` email set, money goes to merchant account instead of admin.

**How to Check:**
- Console log: `purchaseUnit?.payee?.email_address`
- Should match admin PayPal email from `adminSettings/paypal`

**Solution:**
- Verify `createOrder` function sets `payee` in PayPal order
- Check `PayPalButton.tsx` createOrder function

### 3. **Admin User Not Found** ⚠️ POSSIBLE
**Problem:** If `adminUserId` is null, admin balance won't be updated.

**How to Check:**
- Console log: `adminUserId: adminUserId || 'NOT FOUND'`
- Check if admin user exists in Firestore with `role: 'admin'`

**Solution:**
- Verify admin user exists
- Check both `role` field and `roles` array

### 4. **Firestore Security Rules Blocking Update** ⚠️ POSSIBLE
**Problem:** Security rules might prevent updating admin balance.

**How to Check:**
- Check browser console for permission errors
- Check Firestore rules for `users/{userId}` write permissions

**Solution:**
- Update Firestore rules to allow admin balance updates

### 5. **Amount Conversion Issues** ⚠️ UNLIKELY
**Problem:** PHP to centavos conversion might have rounding errors.

**How to Check:**
- Console logs show amounts in both PHP and centavos
- Verify `adminReceivedAmountCentavos === walletCreditAmountCentavos`

**Solution:**
- Already handled with integer centavos storage

### 6. **Transaction Not Committing** ⚠️ UNLIKELY
**Problem:** Firestore transaction might be failing silently.

**How to Check:**
- Check console for transaction errors
- Verify both guest and admin transactions are created

**Solution:**
- Check error handling in `runTransaction`

---

## Diagnostic Steps

### Step 1: Check Console Logs
After making a payment, look for these logs:

```javascript
// Should show:
✅ Processing deposit (no fees): {
  depositAmount: "100.00",
  guestPaidAmount: "100.00",
  walletCreditAmount: "100.00"
}

// Check PayPal breakdown:
📊 PayPal Breakdown: {
  paypalGrossAmount: "100.00",
  paypalNetAmount: "??.??",  // <-- CHECK THIS
  paypalFee: "?.??"          // <-- CHECK THIS
}

// Should show:
✅ Wallet top-up processed: {
  adminReceivedEqualsGuestSent: true,  // <-- MUST BE TRUE
  validation: {
    match: true,  // <-- MUST BE TRUE
    message: "✅ PASS: Admin receives 100% of guest deposit"
  }
}

// Check admin transaction:
✅ Admin transaction created: {
  adminReceivedAmountPHP: 100,  // <-- CHECK THIS
  adminReceivedAmountCentavos: 10000  // <-- CHECK THIS
}
```

### Step 2: Check Firestore Data

**Guest Transaction:**
```javascript
// Query: transactions collection
// Filter: paymentId == orderId, type == "deposit", userId == guestUserId
// Check:
{
  amount: 10000,  // centavos (should be 100.00 PHP)
  grossAmount: 10000,
  paypalFee: 0,
  netAmount: 10000
}
```

**Admin Transaction:**
```javascript
// Query: transactions collection
// Filter: paymentId == orderId, type == "deposit", userId == adminUserId
// Check:
{
  amount: 10000,  // centavos (should be 100.00 PHP)
  grossAmount: 10000,
  paypalFee: 0,
  netAmount: 10000,
  relatedTransactionId: "<guest-transaction-id>"
}
```

**Admin Balance:**
```javascript
// Query: users collection
// Filter: userId == adminUserId
// Check:
{
  walletBalance: <previous_balance> + 10000  // Should increase by deposit amount
}
```

### Step 3: Check PayPal Order

**In PayPal Dashboard:**
1. Go to PayPal Developer Dashboard
2. Check the order details
3. Look at:
   - **Gross Amount:** Should be ₱100.00
   - **PayPal Fee:** Should be ₱0.00 (but might show fees)
   - **Net Amount:** Should be ₱100.00 (but might be less if fees deducted)
   - **Payee Email:** Should match admin PayPal email

---

## Most Likely Issue: PayPal Actually Deducting Fees

**The Problem:**
Even though we're setting `paypalFee: 0` in our database and using `depositAmount` for calculations, **PayPal itself might be deducting fees** from the actual payment sent to the admin's PayPal account.

**Why This Happens:**
- PayPal sandbox might have fees enabled
- PayPal merchant account settings might charge fees
- PayPal's actual payment processing deducts fees before sending to payee

**The Reality:**
- Our code correctly tracks that admin should receive 100%
- But PayPal's actual payment might be less
- This is a **PayPal configuration issue**, not a code bug

**Solutions:**

1. **Check PayPal Account Settings:**
   - Go to PayPal Developer Dashboard
   - Check if fees are enabled for sandbox
   - Disable fees if possible

2. **Use PayPal's Fee Absorption:**
   - Configure PayPal to absorb fees
   - Money sent to admin will be gross amount

3. **Accept the Reality:**
   - In production, PayPal will deduct fees
   - Our code correctly tracks what admin should receive
   - The difference is PayPal's fee, not our code

---

## Quick Diagnostic Script

Run this in browser console after a payment:

```javascript
// Get the last transaction
const transactions = await db.collection('transactions')
  .where('paymentId', '==', '<ORDER_ID>')
  .get();

transactions.forEach(doc => {
  const tx = doc.data();
  console.log(`Transaction ${doc.id}:`, {
    userId: tx.userId,
    type: tx.type,
    amount: tx.amount,
    grossAmount: tx.grossAmount,
    paypalFee: tx.paypalFee,
    netAmount: tx.netAmount,
    amountPHP: tx.amount / 100,
    netAmountPHP: tx.netAmount / 100
  });
});

// Check admin balance
const adminDoc = await db.collection('users')
  .where('role', '==', 'admin')
  .get();

adminDoc.forEach(doc => {
  const admin = doc.data();
  console.log('Admin Balance:', {
    userId: doc.id,
    walletBalance: admin.walletBalance,
    walletBalancePHP: admin.walletBalance / 100
  });
});
```

---

## Next Steps

1. **Check console logs** for the exact amounts
2. **Check Firestore** for transaction records
3. **Check PayPal dashboard** for actual payment details
4. **Share the results** so we can identify the exact issue

