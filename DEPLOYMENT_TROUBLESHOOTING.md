# 🔧 Firebase Deployment Troubleshooting Guide

## Why It Works Locally But Not on Firebase

The most common reason is **Environment Variables**. Vite bundles environment variables at **BUILD TIME**, not runtime. If your `.env` file isn't used during the build, the production app won't have those values.

---

## 🚨 Most Common Issues

### 1. ❌ Environment Variables Not Set in Production Build

**Problem:** Your app works locally because it reads from `.env`, but the production build doesn't have these values.

**Solution:**

1. **Create `.env.production` file** in your project root:
   ```bash
   # .env.production
   VITE_FIREBASE_API_KEY=your_actual_api_key
   VITE_FIREBASE_AUTH_DOMAIN=mojo-dojo-casa-house-f31a5.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=mojo-dojo-casa-house-f31a5
   VITE_FIREBASE_STORAGE_BUCKET=mojo-dojo-casa-house-f31a5.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
   
   # PayPal (CRITICAL for billing system)
   VITE_PAYPAL_CLIENT_ID=your_paypal_sandbox_client_id
   VITE_PAYPAL_ENV=sandbox
   
   # EmailJS
   VITE_EMAILJS_PUBLIC_KEY=your_emailjs_key
   VITE_EMAILJS_SERVICE_ID=your_service_id
   VITE_EMAILJS_TEMPLATE_VERIFICATION=your_template_id
   VITE_EMAILJS_TEMPLATE_BOOKING=your_booking_template_id
   
   # Cloudinary
   VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
   VITE_CLOUDINARY_UPLOAD_PRESET=your_upload_preset
   
   # Emulators (MUST be false for production)
   VITE_USE_EMULATORS=false
   ```

2. **Rebuild with production env:**
   ```bash
   npm run build:prod
   ```

3. **Verify the build has the values:**
   ```bash
   # Check if env vars are in the built files
   grep -r "VITE_PAYPAL_CLIENT_ID" dist/
   # Should NOT find the literal string - it should be replaced with actual values
   ```

---

### 2. ❌ Firestore Rules Blocking Operations

**Problem:** Firestore security rules might be too restrictive in production.

**Check:**
1. Go to Firebase Console > Firestore Database > Rules
2. Check if your rules allow the operations you need
3. Look for errors in browser console related to "permission-denied"

**Common Rule Issues:**
```javascript
// ❌ BAD - Too restrictive
match /subscriptions/{subscriptionId} {
  allow read, write: if false; // Blocks everything!
}

// ✅ GOOD - Allow users to read their own subscriptions
match /subscriptions/{subscriptionId} {
  allow read: if request.auth != null && resource.data.userId == request.auth.uid;
  allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
  allow update, delete: if request.auth != null && resource.data.userId == request.auth.uid;
}
```

**Fix:**
1. Update `firestore.rules` file
2. Deploy rules: `firebase deploy --only firestore:rules`

---

### 3. ❌ PayPal Client ID Missing in Production

**Problem:** Billing system shows "Simulated Payment" instead of real PayPal button.

**Check:**
1. Open browser console on deployed site
2. Look for: `PayPal SDK not available, using simulated payment`
3. Check if `VITE_PAYPAL_CLIENT_ID` is set in production build

**Solution:**
1. Add `VITE_PAYPAL_CLIENT_ID` to `.env.production`
2. Rebuild: `npm run build:prod`
3. Redeploy: `npm run deploy`

---

### 4. ❌ Authorized Domains Not Set

**Problem:** Google Sign-In or OAuth doesn't work.

**Solution:**
1. Go to Firebase Console > Authentication > Settings > Authorized domains
2. Add these domains:
   - `localhost` (for local dev)
   - `mojo-dojo-casa-house-f31a5.firebaseapp.com`
   - `mojo-dojo-casa-house-f31a5.web.app`
   - Your custom domain (if you have one)

---

### 5. ❌ Build Mode Mismatch

**Problem:** Using development build instead of production build.

**Check your build command:**
```bash
# ❌ WRONG - Uses development mode
npm run build

# ✅ CORRECT - Uses production mode
npm run build:prod
```

**Verify in `package.json`:**
```json
{
  "scripts": {
    "build:prod": "vite build --mode production",
    "deploy": "npm run build:prod && firebase deploy --only hosting"
  }
}
```

---

### 6. ❌ Subscription Collection Not Created

**Problem:** Subscription checks fail because Firestore collection doesn't exist.

**Solution:**
- Firestore collections are created automatically on first write
- Make sure Firestore rules allow creating subscriptions
- Check browser console for Firestore errors

---

## 🔍 How to Debug Production Issues

### Step 1: Check Browser Console
1. Open deployed site
2. Open DevTools (F12)
3. Check Console tab for errors
4. Check Network tab for failed requests

### Step 2: Verify Environment Variables
1. Open deployed site
2. Open DevTools Console
3. Type: `console.log(import.meta.env)`
4. Check if all `VITE_*` variables are present

### Step 3: Check Firebase Console
1. Go to Firebase Console
2. Check Authentication > Users (are users being created?)
3. Check Firestore > Data (are documents being created?)
4. Check Functions > Logs (if using functions)

### Step 4: Compare Local vs Production
```bash
# Local build
npm run build:prod
npm run preview

# Check if preview works (should match production)
# If preview works but production doesn't, it's a deployment issue
```

---

## ✅ Quick Fix Checklist

Run through this checklist:

- [ ] `.env.production` file exists with all variables
- [ ] `VITE_PAYPAL_CLIENT_ID` is set in `.env.production`
- [ ] `VITE_USE_EMULATORS=false` in `.env.production`
- [ ] Built with `npm run build:prod` (not `npm run build`)
- [ ] Firestore rules allow subscription operations
- [ ] Authorized domains include Firebase hosting URLs
- [ ] Browser console shows no errors
- [ ] Network tab shows successful API calls

---

## 🚀 Correct Deployment Process

```bash
# 1. Ensure .env.production exists with all variables
# 2. Build for production
npm run build:prod

# 3. Test the build locally
npm run preview
# Visit http://localhost:4173 and test everything

# 4. If preview works, deploy
npm run deploy

# 5. Or deploy everything (hosting + rules)
npm run deploy:all
```

---

## 🐛 Specific Issues

### Issue: "Subscription Required" shows even after payment
**Cause:** Subscription not being created in Firestore
**Fix:** Check Firestore rules allow creating subscriptions

### Issue: PayPal button shows "Simulated"
**Cause:** `VITE_PAYPAL_CLIENT_ID` not in production build
**Fix:** Add to `.env.production` and rebuild

### Issue: Can't create listings
**Cause:** Subscription check failing or Firestore rules blocking
**Fix:** Check browser console for errors, verify Firestore rules

### Issue: Authentication not working
**Cause:** Authorized domains not set or Firebase config wrong
**Fix:** Add Firebase hosting URLs to authorized domains

---

## 📝 Environment Variable Template

Copy this to `.env.production`:

```env
# Get these from Firebase Console > Project Settings > General
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=mojo-dojo-casa-house-f31a5.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=mojo-dojo-casa-house-f31a5
VITE_FIREBASE_STORAGE_BUCKET=mojo-dojo-casa-house-f31a5.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_MEASUREMENT_ID=

# PayPal Sandbox (get from https://developer.paypal.com/)
VITE_PAYPAL_CLIENT_ID=
VITE_PAYPAL_ENV=sandbox

# EmailJS (get from https://www.emailjs.com/)
VITE_EMAILJS_PUBLIC_KEY=
VITE_EMAILJS_SERVICE_ID=
VITE_EMAILJS_TEMPLATE_VERIFICATION=
VITE_EMAILJS_TEMPLATE_BOOKING=

# Cloudinary (get from https://cloudinary.com/)
VITE_CLOUDINARY_CLOUD_NAME=
VITE_CLOUDINARY_UPLOAD_PRESET=

# MUST be false for production
VITE_USE_EMULATORS=false
```

---

## 🎯 Most Likely Issue for Your Case

Based on your billing system implementation, the most likely issue is:

**Missing `VITE_PAYPAL_CLIENT_ID` in production build**

This would cause:
- PayPal button to show "Simulated Payment"
- Subscription payments not working
- Billing system appearing broken

**Quick Fix:**
1. Create `.env.production` file
2. Add `VITE_PAYPAL_CLIENT_ID=your_sandbox_client_id`
3. Run `npm run build:prod`
4. Run `npm run deploy`

---

## 📞 Still Not Working?

1. Check browser console for specific errors
2. Check Firebase Console > Firestore > Rules
3. Verify all environment variables are set
4. Compare local `.env` with `.env.production`
5. Test with `npm run preview` first

