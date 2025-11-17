# 🔧 PayPal Login Troubleshooting Guide

## Understanding the Error

If you see **"Some of your information isn't correct"** on PayPal's login page, this is a **PayPal account credential issue**, not a code issue. The OAuth flow is working correctly (PayPal accepted the request and showed the login page).

## Step-by-Step Fix

### 1. Verify Redirect URI is Registered

**Critical:** The redirect URI `http://127.0.0.1:8080/paypal-callback` MUST be registered in PayPal.

1. Go to: https://developer.paypal.com/dashboard/applications/sandbox
2. Click your app: **"Mojo Dojo Casa House"**
3. Go to: **"Log in with PayPal"** → **"Advanced Settings"**
4. Under **"Return URL"**, check if this EXACT URI exists:
   ```
   http://127.0.0.1:8080/paypal-callback
   ```
5. If it's NOT there:
   - Click **"Add URI"** or **"+"**
   - Paste: `http://127.0.0.1:8080/paypal-callback`
   - Click **"Save"**
   - Wait 1-2 minutes for changes to propagate

### 2. Verify Sandbox Account Credentials

The error means PayPal is rejecting your login credentials. Check:

1. **Go to PayPal Developer Dashboard:**
   - https://developer.paypal.com/dashboard/accounts/sandbox
   
2. **Find your sandbox account:**
   - Look for the account you're trying to log in with
   - Example: `guest89439825938590@personal.example.com`

3. **Verify the credentials:**
   - Click on the account
   - Check the **"Password"** field
   - Make sure you're using the EXACT password shown (case-sensitive)
   - Copy the password exactly (no extra spaces)

4. **Check account status:**
   - Make sure the account shows **"Verified"** status
   - If it shows "Unverified", you may need to verify it first

### 3. Try a Different Sandbox Account

If the current account has issues:

1. **Create a new sandbox account:**
   - Go to: https://developer.paypal.com/dashboard/accounts/sandbox
   - Click **"Create Account"**
   - Choose **"Personal"** account type
   - Set a simple password you can remember
   - Note the email and password

2. **Use the new account:**
   - When linking PayPal, use the new account's email and password
   - This will help determine if it's account-specific or a general issue

### 4. Clear Browser Cache and Cookies

Sometimes cached data causes issues:

1. **Clear PayPal cookies:**
   - Open browser DevTools (F12)
   - Go to **Application** tab → **Cookies**
   - Delete all cookies for `sandbox.paypal.com`
   - Refresh the page

2. **Try incognito/private mode:**
   - This ensures no cached data interferes

### 5. Verify Client ID

Make sure your Client ID is correct:

1. **Check your `.env` file:**
   ```
   VITE_PAYPAL_CLIENT_ID=your_client_id_here
   ```

2. **Compare with PayPal Dashboard:**
   - Go to: https://developer.paypal.com/dashboard/applications/sandbox
   - Click your app: **"Mojo Dojo Casa House"**
   - Check the **"Client ID"** shown
   - Make sure it matches your `.env` file EXACTLY

3. **Restart your dev server** after changing `.env`:
   ```bash
   # Stop the server (Ctrl+C)
   npm run dev
   ```

## Common Issues and Solutions

### Issue: "Redirect URI not registered"
**Solution:** Add `http://127.0.0.1:8080/paypal-callback` to PayPal Return URLs (see Step 1)

### Issue: Wrong password
**Solution:** Copy the password EXACTLY from PayPal Developer Dashboard (case-sensitive, no spaces)

### Issue: Account not verified
**Solution:** Use a "Verified" sandbox account, or verify the account first

### Issue: Client ID mismatch
**Solution:** Verify your `.env` file has the correct Client ID and restart the dev server

### Issue: Using IP address instead of localhost
**Solution:** The code automatically converts IP addresses to `127.0.0.1`, but make sure you're accessing the app via `http://127.0.0.1:8080` not `http://YOUR_IP:8080`

## Console Errors Explained

The CSP (Content Security Policy) errors you see are **harmless**:
- They're from PayPal's page trying to load Google Analytics
- PayPal blocks these for security
- They don't affect the OAuth flow
- You can ignore them

## Still Not Working?

If you've tried all the above and it still doesn't work:

1. **Check the browser console** when you click "Link PayPal Account"
2. **Look for the diagnostic output:**
   - `🔍 PayPal OAuth Configuration`
   - `📊 OAuth Parameters Breakdown`
   - `🔍 PayPal OAuth Diagnostics`

3. **Share the console output** with the exact:
   - Redirect URI shown
   - Client ID prefix
   - Any error messages

4. **Verify the OAuth URL:**
   - Copy the full OAuth URL from console
   - Try opening it directly in a new tab
   - See if PayPal shows any different error

## Quick Checklist

- [ ] Redirect URI `http://127.0.0.1:8080/paypal-callback` is registered in PayPal
- [ ] Using the EXACT password from PayPal Developer Dashboard
- [ ] Sandbox account shows "Verified" status
- [ ] Client ID in `.env` matches PayPal Dashboard
- [ ] Dev server restarted after changing `.env`
- [ ] Accessing app via `http://127.0.0.1:8080` (not IP address)
- [ ] Cleared browser cache/cookies for PayPal

