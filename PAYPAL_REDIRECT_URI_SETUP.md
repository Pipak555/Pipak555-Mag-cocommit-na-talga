# 🔧 PayPal Redirect URI Setup Guide

## Problem
If you're getting an error like "invalid client_id or redirect_uri" when trying to link your PayPal account, you need to add the redirect URI to your PayPal app settings.

## Quick Fix Steps

### Step 1: Find Your Redirect URI

The redirect URI is shown in:
- **Console logs** (in development mode)
- **On the wallet page** (blue info box in development mode)
- **Format**: `http://YOUR_IP_OR_HOST:PORT/paypal-callback`

Examples:
- `http://127.0.0.1:8080/paypal-callback` (localhost)
- `http://10.56.170.176:8080/paypal-callback` (IP address)
- `http://localhost:5173/paypal-callback` (Vite default)

### Step 2: Add Redirect URI to PayPal

1. **Go to PayPal Developer Dashboard:**
   - Visit: https://developer.paypal.com/
   - Log in with your PayPal account

2. **Navigate to Your App:**
   - Click **"Dashboard"** → **"My Apps & Credentials"**
   - Click the **"Sandbox"** tab (for testing)
   - Find your app and click on it

3. **Add Redirect URI:**
   - Scroll down to **"Redirect URIs"** section
   - Click **"Add URI"** or **"+"** button
   - Enter your redirect URI **EXACTLY** as shown (case-sensitive, must match exactly)
   - Click **"Save"**

4. **Important Notes:**
   - You can add multiple redirect URIs
   - Add both `localhost` and `127.0.0.1` versions if using localhost
   - Add your IP address version if accessing from network
   - The URI must match **EXACTLY** (including `http://` vs `https://`, port number, etc.)

### Step 3: Test Again

1. Go back to your app
2. Try linking PayPal account again
3. It should work now!

## Common Issues

### Issue: "invalid redirect_uri"
**Solution:** Make sure the redirect URI in PayPal matches EXACTLY what's being sent (check console logs)

### Issue: Using IP address (like 10.56.170.176)
**Solution:** 
- Add the IP-based redirect URI to PayPal: `http://10.56.170.176:8080/paypal-callback`
- Or use `localhost`/`127.0.0.1` if possible

### Issue: Port number mismatch
**Solution:** Make sure the port in the redirect URI matches your dev server port (e.g., `:8080`, `:5173`, etc.)

### Issue: http vs https
**Solution:** 
- For local development, use `http://`
- For production, use `https://`
- Make sure it matches in PayPal settings

## Example Redirect URIs to Add

For local development, add these:
```
http://127.0.0.1:8080/paypal-callback
http://localhost:8080/paypal-callback
http://127.0.0.1:5173/paypal-callback
http://localhost:5173/paypal-callback
```

For network access (if using IP):
```
http://10.56.170.176:8080/paypal-callback
```

## Still Having Issues?

1. **Check console logs** - The exact redirect URI is logged there
2. **Verify Client ID** - Make sure `VITE_PAYPAL_CLIENT_ID` is set in `.env`
3. **Check PayPal app status** - Make sure app is active in sandbox
4. **Try different redirect URI format** - Sometimes PayPal prefers one format over another

## Production Deployment

When deploying to production:
1. Use your production domain: `https://yourdomain.com/paypal-callback`
2. Add this to PayPal app's **Live** redirect URIs (not Sandbox)
3. Make sure to use `https://` (not `http://`)

