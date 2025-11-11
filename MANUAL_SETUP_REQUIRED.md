# Manual Setup Required - Quick Guide

## ✅ Features That Work WITHOUT Manual Setup

These features work immediately - **no manual setup needed**:

1. ✅ **Date Filter Integration** - Pure frontend code, works immediately
2. ✅ **Host Points & Rewards System** - Pure frontend/database code, works immediately

---

## ⚠️ Features That REQUIRE Manual Setup

These features need manual configuration to work:

### 1. Host PayPal Payouts
### 2. Admin PayPal Receiving Payments

**Both use the same Firebase Cloud Functions**, so you only need to set them up once.

---

## 📋 Step-by-Step Setup Instructions

### Prerequisites

1. **Firebase CLI** installed
   ```bash
   npm install -g firebase-tools
   ```

2. **Node.js 18+** installed (check with `node --version`)

3. **PayPal Developer Account** (for sandbox testing)
   - Go to: https://developer.paypal.com/
   - Sign in or create account
   - Create a sandbox app to get credentials

---

### Step 1: Install Firebase Functions Dependencies

Open terminal in your project root and run:

```bash
cd functions
npm install
cd ..
```

This installs:
- `firebase-admin`
- `firebase-functions`
- `typescript`

---

### Step 2: Get PayPal API Credentials

#### For Sandbox (Testing):

1. Go to: **https://developer.paypal.com/**
2. Log in with your PayPal account
3. Navigate to: **Dashboard** → **My Apps & Credentials**
4. Click the **"Sandbox"** tab (NOT "Live")
5. Click **"Create App"**
6. Fill in:
   - **App Name:** `Mojo Dojo Casa House` (or any name)
   - **Merchant:** Select your sandbox business account
   - **Features:** Select **"Accept Payments"** and **"Payouts"**
7. Click **"Create App"**
8. Copy the **Client ID** and **Secret** (click "Show" to reveal secret)

#### For Production (Real Money):

⚠️ **Only do this when ready for production!**

1. Same steps as above, but use the **"Live"** tab instead
2. You'll need a verified PayPal Business Account

---

### Step 3: Set Firebase Functions Environment Variables

You need to set these in Firebase Functions (NOT in your `.env` file - these are server-side only):

#### Option A: Using Firebase CLI (Recommended)

```bash
# Set PayPal Client ID
firebase functions:secrets:set PAYPAL_CLIENT_ID

# When prompted, paste your PayPal Client ID

# Set PayPal Client Secret
firebase functions:secrets:set PAYPAL_CLIENT_SECRET

# When prompted, paste your PayPal Client Secret

# Set PayPal Environment
firebase functions:secrets:set PAYPAL_ENV

# When prompted, type: sandbox (or production for live)
```

#### Option B: Using Firebase Console

1. Go to: **Firebase Console** → **Functions** → **Configuration**
2. Click **"Add Secret"**
3. Add these secrets:
   - `PAYPAL_CLIENT_ID` = Your PayPal Client ID
   - `PAYPAL_CLIENT_SECRET` = Your PayPal Client Secret
   - `PAYPAL_ENV` = `sandbox` (or `production`)

**Important:** These secrets are stored securely and only accessible by your Firebase Functions.

---

### Step 4: Deploy Firebase Functions

```bash
# Make sure you're in the project root directory
firebase deploy --only functions
```

This will:
- Compile TypeScript to JavaScript
- Upload functions to Firebase
- Set up the triggers for automatic payouts

**First deployment may take 5-10 minutes.**

---

### Step 5: Verify Setup

#### Check Functions Are Deployed:

1. Go to: **Firebase Console** → **Functions**
2. You should see these functions:
   - `autoProcessHostPayout`
   - `autoProcessAdminPayout`
   - `processHostPayoutFunction`
   - `processAdminPayoutFunction`

#### Test the Setup:

1. **For Host Payouts:**
   - Create a test booking
   - Confirm the booking (this triggers payment)
   - Check Firebase Functions logs: `firebase functions:log`
   - Look for `autoProcessHostPayout` entries

2. **For Admin Payouts:**
   - Create a test subscription payment
   - Check Firebase Functions logs
   - Look for `autoProcessAdminPayout` entries

---

## 🔍 Troubleshooting

### Error: "PayPal API authentication failed"

**Solution:**
- Check that `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET` are set correctly
- Make sure you're using sandbox credentials for sandbox environment
- Verify the credentials in PayPal Developer Dashboard

### Error: "Admin PayPal email not found"

**Solution:**
- Admin must link their PayPal account in Admin Settings
- Go to: `/admin/paypal-settings`
- Link and verify PayPal account

### Error: "Host PayPal email not found"

**Solution:**
- Host must link their PayPal account in their Wallet settings
- Host must verify their PayPal email

### Functions Not Deploying

**Solution:**
1. Check you're logged in: `firebase login`
2. Check you're in the right project: `firebase projects:list`
3. Make sure `functions/package.json` exists
4. Try: `cd functions && npm install && cd ..` then deploy again

---

## 📝 Quick Checklist

- [ ] Installed Firebase CLI (`npm install -g firebase-tools`)
- [ ] Installed functions dependencies (`cd functions && npm install`)
- [ ] Created PayPal Sandbox app
- [ ] Got PayPal Client ID and Secret
- [ ] Set `PAYPAL_CLIENT_ID` secret in Firebase
- [ ] Set `PAYPAL_CLIENT_SECRET` secret in Firebase
- [ ] Set `PAYPAL_ENV` secret in Firebase (value: `sandbox`)
- [ ] Deployed functions (`firebase deploy --only functions`)
- [ ] Verified functions appear in Firebase Console
- [ ] Tested with a booking/subscription payment

---

## 🎯 What Happens After Setup

Once setup is complete:

1. **Host Payouts:**
   - When a booking is confirmed → Host earnings transaction created
   - Firebase Function automatically triggers
   - Money sent to host's PayPal account
   - Transaction updated with payout status

2. **Admin Payouts:**
   - When service fee is collected → Transaction created
   - When subscription payment is made → Transaction created
   - Firebase Function automatically triggers
   - Money sent to admin's PayPal account
   - Transaction updated with payout status

---

## 💰 PayPal Fees

**Important:** PayPal charges fees for payouts:
- **Domestic (same country):** ~2% + fixed fee
- **International:** Varies by country

These fees are deducted from the payout amount automatically by PayPal.

---

## 🔐 Security Notes

- ✅ PayPal credentials are stored securely in Firebase Functions (server-side only)
- ✅ Never commit credentials to git
- ✅ Use sandbox for testing, production for real money
- ✅ All payout operations are logged in Firebase Functions logs

---

## 📞 Need Help?

If you encounter issues:

1. Check Firebase Functions logs: `firebase functions:log`
2. Check PayPal Developer Dashboard for API errors
3. Verify all environment variables are set correctly
4. Make sure PayPal accounts are verified and active

---

## 🚀 Production Checklist

Before going live:

- [ ] Switch `PAYPAL_ENV` to `production`
- [ ] Use production PayPal Client ID and Secret
- [ ] Test with small amounts first
- [ ] Set up monitoring/alerts for failed payouts
- [ ] Ensure all PayPal accounts are verified
- [ ] Document the process for your team

---

**That's it!** Once you complete these steps, both Host and Admin payouts will work automatically. 🎉

