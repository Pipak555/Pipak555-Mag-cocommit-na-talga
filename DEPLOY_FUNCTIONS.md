# 🚀 Quick Fix: Deploy Firebase Functions

## The Problem
You're getting CORS errors because Firebase Functions aren't deployed to your new project (`mojo-dojo-casa-house-80845`).

## Quick Fix Steps

### Step 1: Navigate to Functions Directory
```bash
cd functions
```

### Step 2: Install Dependencies (if needed)
```bash
npm install
```

### Step 3: Build Functions
```bash
npm run build
```

### Step 4: Set PayPal Environment Variables
You need to set these secrets in Firebase Functions:

```bash
# Go back to project root
cd ..

# Set PayPal Client ID (use your sandbox client ID)
firebase functions:secrets:set PAYPAL_CLIENT_ID --project mojo-dojo-casa-house-80845

# When prompted, paste your PayPal Client ID

# Set PayPal Client Secret (use your sandbox client secret)
firebase functions:secrets:set PAYPAL_CLIENT_SECRET --project mojo-dojo-casa-house-80845

# When prompted, paste your PayPal Client Secret

# Set PayPal Environment
firebase functions:secrets:set PAYPAL_ENV --project mojo-dojo-casa-house-80845

# When prompted, type: sandbox
```

**OR** if you want to use the default values (hardcoded in the function), you can skip this step for now.

### Step 5: Deploy Functions
```bash
firebase deploy --only functions --project mojo-dojo-casa-house-80845
```

**First deployment takes 5-10 minutes.** ⏱️

### Step 6: Verify Deployment
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project: `mojo-dojo-casa-house-80845`
3. Go to **Functions**
4. You should see `exchangePayPalOAuth` function listed

### Step 7: Test Again
Go back to your app and try linking PayPal again. The CORS error should be gone!

---

## Alternative: Use Functions Emulator (For Testing)

If you want to test locally without deploying:

### Step 1: Start Functions Emulator
```bash
cd functions
npm run serve
```

### Step 2: Update .env file
Add this line to your `.env` file:
```env
VITE_USE_EMULATORS=true
```

### Step 3: Restart Dev Server
```bash
npm run dev
```

This will connect to the local functions emulator instead of the deployed functions.

---

## Troubleshooting

### Error: "Functions directory not found"
Make sure you're in the project root directory when running `firebase deploy`.

### Error: "Permission denied"
Make sure you're logged in:
```bash
firebase login
```

### Error: "Project not found"
Make sure the project ID is correct:
```bash
firebase use mojo-dojo-casa-house-80845
```

### Still Getting CORS Errors?
1. Make sure functions are deployed: Check Firebase Console → Functions
2. Clear browser cache and hard refresh (Ctrl+Shift+R)
3. Check browser console for the exact error message
4. Verify the function URL matches your project region (us-central1)

