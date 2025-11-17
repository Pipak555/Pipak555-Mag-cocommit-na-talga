# 🔧 PayPal Redirect URI Update Guide

## Problem
After changing your Firebase project, PayPal OAuth redirects are still pointing to the old project domain, causing "Bandwidth Quota Exceeded" errors.

## Solution

The code has been updated to **automatically use your current Firebase project URL** in production. However, you need to **add the new redirect URI to your PayPal app settings**.

### Step 1: Find Your New Redirect URI

1. **Open your browser console** (F12) when trying to link PayPal
2. **Look for the log message**: `🔍 PayPal OAuth Redirect URI:`
3. **Copy the `redirectUri` value** - it should look like:
   - `https://your-new-project-id.web.app/paypal-callback`
   - or `https://your-new-project-id.firebaseapp.com/paypal-callback`

### Step 2: Add Redirect URI to PayPal Developer Dashboard

1. **Go to PayPal Developer Dashboard:**
   - Visit: https://developer.paypal.com/
   - Log in with your PayPal account

2. **Navigate to Your App:**
   - Click **"Dashboard"** → **"My Apps & Credentials"**
   - Click the **"Sandbox"** tab (for testing) or **"Live"** tab (for production)
   - Find your app and click on it

3. **Add the New Redirect URI:**
   - Scroll down to **"Redirect URIs"** section
   - Click **"Add URI"** or **"+"** button
   - Enter your new redirect URI **EXACTLY** as shown in the console log
   - Example: `https://your-new-project-id.web.app/paypal-callback`
   - Click **"Save"**

4. **Important Notes:**
   - You can have **multiple redirect URIs** in PayPal
   - Keep the old one if you want (it won't hurt)
   - The URI must match **EXACTLY** (including `https://`, no trailing slash, etc.)
   - Add both `.web.app` and `.firebaseapp.com` versions if you use both

### Step 3: Test Again

1. Go back to your app
2. Try linking PayPal account again
3. It should now redirect to your new Firebase project!

## What Changed in the Code

The code now:
- ✅ **Automatically uses `window.location.origin` in production** - this ensures it always uses the correct Firebase project URL
- ✅ **Logs the redirect URI** to the console for easy copying
- ✅ **Works with any Firebase project** without needing to update environment variables

## Troubleshooting

### Still getting bandwidth error?
- Make sure you added the **exact** redirect URI from the console log
- Check that you're using the correct PayPal app (Sandbox vs Live)
- Verify the redirect URI has no trailing slash: `/paypal-callback` not `/paypal-callback/`

### Redirect URI not working?
- Check the browser console for the exact redirect URI being used
- Make sure it's added to PayPal **exactly** as shown (case-sensitive)
- Try adding both `.web.app` and `.firebaseapp.com` versions

### Need help?
Check the browser console logs - they will show you exactly what redirect URI is being sent to PayPal.

