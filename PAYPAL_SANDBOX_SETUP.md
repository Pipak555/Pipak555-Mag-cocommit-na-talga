# PayPal Sandbox Setup Guide

## Where to Put the Environment Variables

### Step 1: Create or Edit `.env` File

Create a `.env` file in the **root directory** of your project (same level as `package.json`).

**Location:** `C:\Users\John Patrick Robles\Documents\firebnb-spark day5\.env`

### Step 2: Add PayPal Variables

Add these lines to your `.env` file:

```env
# PayPal Sandbox Configuration (SIMULATION ONLY - NO REAL MONEY)
VITE_PAYPAL_CLIENT_ID=your_sandbox_client_id_here
VITE_PAYPAL_ENV=sandbox
```

**Important:** 
- Replace `your_sandbox_client_id_here` with your actual PayPal sandbox client ID
- The `.env` file should already be in `.gitignore` (so it won't be committed to git)

---

## Where to Find Your PayPal Sandbox Client ID

### Step 1: Go to PayPal Developer Dashboard

1. Visit: **https://developer.paypal.com/**
2. Click **"Log In"** (or **"Sign Up"** if you don't have an account)
3. Log in with your PayPal account

### Step 2: Create a Sandbox App

1. Once logged in, go to **Dashboard** → **My Apps & Credentials**
2. Click on the **"Sandbox"** tab (NOT "Live" - we only want sandbox for testing)
3. Click **"Create App"** button

### Step 3: Configure Your App

Fill in the app details:
- **App Name:** `Mojo Dojo Casa House` (or any name you prefer)
- **Merchant:** Select your sandbox business account (or create one if needed)
- **Features:** Select **"Accept Payments"**

Click **"Create App"**

### Step 4: Get Your Client ID

After creating the app, you'll see:
- **Client ID** - This is what you need! Copy this value
- **Secret** - You don't need this for the frontend integration

### Step 5: Add Client ID to `.env` File

1. Open your `.env` file
2. Replace `your_sandbox_client_id_here` with the Client ID you copied
3. Save the file

Example:
```env
VITE_PAYPAL_CLIENT_ID=AbCdEf1234567890GhIjKlMnOpQrStUvWxYz
VITE_PAYPAL_ENV=sandbox
```

---

## Create Sandbox Test Accounts (Optional)

To test payments, you can create sandbox test accounts:

1. In PayPal Developer Dashboard, go to **Dashboard** → **Accounts**
2. Click **"Create Account"** under **Sandbox** tab
3. Choose account type:
   - **Personal** - For testing guest payments
   - **Business** - For testing merchant accounts
4. Create test accounts with fake email addresses

**Test Account Credentials:**
- Email: `buyer@example.com` (or any fake email)
- Password: (set during creation)
- These are fake accounts - no real money involved!

---

## Verify Setup

After adding the variables:

1. **Restart your development server** (if it's running)
   ```bash
   npm run dev
   ```

2. The PayPal button should now work with sandbox mode
3. You'll see "SIMULATION - NO REAL MONEY" warnings in the UI

---

## Important Notes

⚠️ **SIMULATION ONLY:**
- All payments are **simulated** - no real money is charged
- Sandbox mode is **automatically enabled** by default
- Even if you set `VITE_PAYPAL_ENV=sandbox`, it defaults to sandbox for safety

🔒 **Security:**
- Never commit your `.env` file to git
- The `.env` file is already in `.gitignore`
- Never share your Client ID publicly (though sandbox IDs are less sensitive)

📝 **File Structure:**
```
firebnb-spark day5/
├── .env                    ← Add PayPal variables here
├── .env.local             ← Alternative (also ignored by git)
├── package.json
└── src/
```

---

## Troubleshooting

**Problem:** PayPal button shows "Simulated" instead of real PayPal button
- **Solution:** Make sure `VITE_PAYPAL_CLIENT_ID` is set correctly in `.env` and restart dev server

**Problem:** Can't find "Sandbox" tab in PayPal Dashboard
- **Solution:** Make sure you're logged into PayPal Developer Dashboard (not regular PayPal)

**Problem:** Payment not working
- **Solution:** 
  1. Verify Client ID is correct
  2. Make sure you're using a **sandbox** Client ID (not live/production)
  3. Check browser console for errors
  4. Restart dev server after changing `.env`

---

## Need Help?

- PayPal Developer Docs: https://developer.paypal.com/docs/
- Sandbox Testing Guide: https://developer.paypal.com/docs/api-basics/sandbox/
- PayPal Support: https://developer.paypal.com/support/

