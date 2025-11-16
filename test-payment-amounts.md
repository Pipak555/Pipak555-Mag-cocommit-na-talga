# 🧪 Quick Test Reference - Payment Amounts

## Run Automated Tests
```bash
npx vitest run src/lib/__tests__/walletService.test.ts
```

## Test Results
✅ All 54 tests passed for amounts: 100, 50, 279, 349, 999

## Manual Testing Checklist

For each amount (₱100, ₱50, ₱279, ₱349, ₱999):

1. **Navigate to wallet top-up page**
2. **Enter amount and complete PayPal payment**
3. **Check console logs for:**
   - ✅ `adminReceivedEqualsGuestSent: true`
   - ✅ `validation.match: true`
   - ✅ `adminReceivedAmountPHP` matches deposit amount
4. **Verify Firestore:**
   - Guest transaction: `amount` = deposit amount (in centavos)
   - Admin transaction: `amount` = deposit amount (in centavos)
   - Both have `paypalFee: 0`
   - Both have `netAmount === grossAmount`
   - Admin transaction has `relatedTransactionId`

## Expected Results

| Amount | Guest Sent | Admin Received | Match |
|--------|------------|----------------|-------|
| ₱100   | 100.00     | 100.00         | ✅    |
| ₱50    | 50.00      | 50.00          | ✅    |
| ₱279   | 279.00     | 279.00         | ✅    |
| ₱349   | 349.00     | 349.00         | ✅    |
| ₱999   | 999.00     | 999.00         | ✅    |

See `PAYMENT_AMOUNT_TESTING_GUIDE.md` for detailed instructions.

