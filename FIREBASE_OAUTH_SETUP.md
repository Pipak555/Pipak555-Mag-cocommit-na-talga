# Firebase OAuth Domain Setup Guide

## Problem
If you see this error when trying to sign in with Google:
```
The current domain is not authorized for OAuth operations. 
Add your domain to the OAuth redirect domains list in the Firebase console.
```

## Solution: Add Authorized Domains

### For Local Development (localhost)
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to **Authentication** > **Settings** > **Authorized domains** tab
4. Click **Add domain**
5. Add these domains:
   - `localhost` (usually already added)
   - `127.0.0.1` (if you're using IP address)
   - Your local IP address (e.g., `10.113.172.176`) if accessing from another device

### For Production (Firebase Hosting)
1. Go to Firebase Console > Authentication > Settings > Authorized domains
2. Your Firebase Hosting domain is automatically added (e.g., `your-project.firebaseapp.com`)
3. If you have a custom domain, add it manually:
   - Click **Add domain**
   - Enter your custom domain (e.g., `example.com`)

## Quick Steps

1. **Open Firebase Console**
   - Visit: https://console.firebase.google.com/
   - Select your project

2. **Navigate to Authentication Settings**
   - Click **Authentication** in the left sidebar
   - Click **Settings** tab
   - Scroll to **Authorized domains** section

3. **Add Your Domain**
   - Click **Add domain** button
   - Enter your domain (e.g., `10.113.172.176` for local IP)
   - Click **Add**

4. **Wait a Few Seconds**
   - Changes may take a few seconds to propagate
   - Refresh your app and try Google sign-in again

## Common Domains to Add

### Development
- `localhost`
- `127.0.0.1`
- Your local network IP (e.g., `10.113.172.176`, `192.168.1.x`)

### Production
- Your Firebase Hosting domain (auto-added)
- Custom domain (if applicable)

## Notes

- **localhost** is usually pre-configured
- **IP addresses** need to be added manually for local network access
- Changes take effect immediately (no deployment needed)
- You can add up to 50 authorized domains per project

## Troubleshooting

### Still Not Working?
1. Clear browser cache and cookies
2. Try in an incognito/private window
3. Check browser console for specific error messages
4. Verify the domain matches exactly (including port if applicable)
5. Wait a few minutes for changes to propagate

### For Team Development
If multiple developers are testing:
- Each developer's local IP may need to be added
- Or use `localhost` and access via `localhost:8080` only
- Consider using Firebase emulators for local development

