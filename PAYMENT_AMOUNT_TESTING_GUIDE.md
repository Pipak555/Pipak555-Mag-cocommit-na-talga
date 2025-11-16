# 💰 Payment Amount Testing Guide

## Overview
This guide provides step-by-step instructions for testing wallet top-up payments with specific amounts to verify exact matching between guest deposits and admin receipts.

## Test Amounts
- ₱100.00
- ₱50.00
- ₱279.00
- ₱349.00
- ₱999.00

## Prerequisites
1. ✅ PayPal Sandbox account configured
2. ✅ Admin PayPal email set in `adminSettings/paypal` document
3. ✅ Test user account with guest role
4. ✅ Admin user account exists in Firestore
5. ✅ Firebase emulators running (optional, for local testing)

---

## Testing Procedure

### Step 1: Prepare Test Environment

1. **Verify Admin PayPal Email**
   ```bash
   # Check Firestore: adminSettings/paypal document
   # Should have: { paypalEmail: "admin@example.com" }
   ```

2. **Check Admin User**
   ```bash
   # Verify admin user exists in users collection
   # Should have: { role: "admin" } or { roles: ["admin"] }
   ```

3. **Start Development Server**
   ```bash
   npm run dev
   ```

---

### Step 2: Test Each Amount

For each test amount (100, 50, 279, 349, 999), follow these steps:

#### 2.1 Navigate to Wallet Top-Up Page
1. Log in as a guest user
2. Navigate to wallet/top-up page
3. Enter the test amount (e.g., `100.00`)

#### 2.2 Initiate PayPal Payment
1. Click "Pay with PayPal" button
2. Complete PayPal sandbox payment flow
3. Use test PayPal account credentials
4. Complete the payment

#### 2.3 Verify Console Logs

After payment completes, check browser console for these logs:

**✅ Expected Logs:**
```
✅ Processing deposit (no fees): {
  depositAmount: "100.00",
  guestPaidAmount: "100.00",
  walletCreditAmount: "100.00",
  note: "No fees - guest pays exact amount, admin receives exact same amount"
}

✅ Final amounts for processing: {
  depositAmount: "100.00",
  guestPaidAmount: "100.00",
  walletCreditAmount: "100.00",
  adminWillReceive: "100.00 (full amount, no deductions)"
}

✅ Wallet top-up processed: {
  walletCreditAmountPHP: 100,
  walletCreditAmountCentavos: 10000,
  grossAmountPaidPHP: 100,
  paypalFeePHP: 0,
  netAmountToAdminPHP: 100,
  adminReceivedAmountPHP: 100,
  adminReceivedAmountCentavos: 10000,
  adminReceivedEqualsGuestSent: true,
  validation: {
    guestSent: 10000,
    adminReceived: 10000,
    match: true,
    message: "✅ PASS: Admin receives 100% of guest deposit"
  }
}

✅ Admin transaction created: {
  adminUserId: "...",
  adminReceivedAmountPHP: 100,
  adminReceivedAmountCentavos: 10000,
  note: "CRITICAL: Admin receives 100% of what guest paid - no fees, no deductions"
}
```

**❌ Error Indicators:**
- `❌ CRITICAL ERROR: Admin received amount does NOT match guest sent amount!`
- `❌ CRITICAL VALIDATION FAILED: Admin received does not equal guest sent`
- `adminReceivedEqualsGuestSent: false`

#### 2.4 Verify Firestore Data

**Check Guest Transaction:**
```javascript
// Query: transactions collection
// Filter: userId == guestUserId, paymentId == orderId, type == "deposit"
// Expected fields:
{
  amount: 10000, // centavos (100.00 PHP)
  grossAmount: 10000,
  paypalFee: 0,
  netAmount: 10000,
  status: "completed"
}
```

**Check Admin Transaction:**
```javascript
// Query: transactions collection
// Filter: userId == adminUserId, paymentId == orderId, type == "deposit"
// Expected fields:
{
  amount: 10000, // centavos (100.00 PHP)
  grossAmount: 10000,
  paypalFee: 0,
  netAmount: 10000,
  relatedTransactionId: "<guest-transaction-id>",
  status: "completed"
}
```

**Check Wallet Balances:**
```javascript
// Guest user document
{
  walletBalance: <previous_balance> + 10000 // centavos
}

// Admin user document
{
  walletBalance: <previous_balance> + 10000 // centavos
}
```

#### 2.5 Verify Exact Matching

**Critical Validation:**
1. **Guest Transaction Amount** = **Admin Transaction Amount**
2. **Guest Wallet Credit** = **Admin Wallet Credit**
3. **Both amounts** = **Original Deposit Amount**
4. **PayPal Fee** = **0** (no fees)

**Formula:**
```
guest_sent (centavos) === admin_received (centavos)
guest_sent (PHP) === admin_received (PHP)
netAmount === grossAmount (no fees)
```

---

### Step 3: Test Results Checklist

For each amount, verify:

- [ ] Payment completes successfully
- [ ] Console shows `adminReceivedEqualsGuestSent: true`
- [ ] Console shows `validation.match: true`
- [ ] Guest transaction created with correct amount
- [ ] Admin transaction created with correct amount
- [ ] Guest transaction `amount` === Admin transaction `amount`
- [ ] Guest wallet balance increased by exact deposit amount
- [ ] Admin wallet balance increased by exact deposit amount
- [ ] Both transactions have `paypalFee: 0`
- [ ] Both transactions have `netAmount === grossAmount`
- [ ] Admin transaction has `relatedTransactionId` linking to guest transaction
- [ ] No error messages in console

---

### Step 4: Test Summary Table

| Amount | Guest Sent (PHP) | Admin Received (PHP) | Match | Guest Balance Increase | Admin Balance Increase | Status |
|--------|------------------|----------------------|-------|------------------------|------------------------|--------|
| ₱100   | 100.00           | 100.00               | ✅    | +100.00                | +100.00                |        |
| ₱50    | 50.00            | 50.00                | ✅    | +50.00                 | +50.00                 |        |
| ₱279   | 279.00           | 279.00               | ✅    | +279.00                | +279.00                |        |
| ₱349   | 349.00           | 349.00               | ✅    | +349.00                | +349.00                |        |
| ₱999   | 999.00           | 999.00               | ✅    | +999.00                | +999.00                |        |

---

## Automated Testing

### Run Unit Tests
```bash
npm test walletService.test.ts
```

This will test:
- Amount conversions (PHP ↔ centavos)
- Exact matching validation
- No fees logic
- Edge cases

### Expected Test Results
```
✓ should ensure admin receives 100% of guest deposit for ₱100
✓ should ensure admin receives 100% of guest deposit for ₱50
✓ should ensure admin receives 100% of guest deposit for ₱279
✓ should ensure admin receives 100% of guest deposit for ₱349
✓ should ensure admin receives 100% of guest deposit for ₱999
✓ should validate admin_received == guest_sent for all amounts
✓ should ensure no fees deducted for all amounts
```

---

## Troubleshooting

### Issue: Amount Mismatch
**Symptoms:**
- Console shows `adminReceivedEqualsGuestSent: false`
- Admin transaction amount differs from guest transaction

**Solution:**
1. Check `walletService.ts` - ensure `adminReceivedAmountCentavos = walletCreditAmountCentavos`
2. Verify no fee logic is applied
3. Check Firestore transaction logs

### Issue: Admin Transaction Not Created
**Symptoms:**
- Guest transaction exists but admin transaction missing
- Console shows "Admin user not found"

**Solution:**
1. Verify admin user exists: `users` collection with `role: "admin"`
2. Check Firestore permissions
3. Review console logs for admin user lookup errors

### Issue: PayPal Fee Shown
**Symptoms:**
- Console shows `paypalFee > 0`
- Breakdown shows fees deducted

**Solution:**
1. This is expected in some PayPal sandbox scenarios
2. System should still use `depositAmount` for `netAmount` (ignoring PayPal's breakdown)
3. Verify `paypalFee: 0` in transaction records

---

## Success Criteria

✅ **All tests pass** when:
1. All 5 amounts (100, 50, 279, 349, 999) process successfully
2. For each amount: `admin_received === guest_sent` (exact match)
3. All transactions have `paypalFee: 0`
4. All transactions have `netAmount === grossAmount`
5. Both guest and admin wallet balances increase correctly
6. Admin transaction links to guest transaction via `relatedTransactionId`
7. No console errors or warnings

---

## Notes

- **Centavos Storage**: All amounts stored as integers (centavos) in Firestore to avoid floating-point errors
- **No Fees**: System explicitly sets `paypalFee: 0` and uses `depositAmount` for `netAmount`
- **Validation**: Multiple validation checks ensure `admin_received == guest_sent`
- **Logging**: Extensive console logging helps verify correct processing

---

## Next Steps

After completing all tests:
1. Review test results table
2. Document any issues found
3. Verify all amounts match exactly
4. Confirm admin receives 100% of all deposits

