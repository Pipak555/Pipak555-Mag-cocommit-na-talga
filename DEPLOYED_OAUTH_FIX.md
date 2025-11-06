# Fix Google Sign-In for Deployed Version

## Problem
Your deployed app (`mojo-dojo-casa-house-f31a5.web.app`) shows this error:
```
The current domain is not authorized for OAuth operations.
```

## Solution: Add Domain to Firebase

### Step 1: Open Firebase Console
1. Go to: https://console.firebase.google.com/
2. Select your project

### Step 2: Navigate to Authorized Domains
1. Click **Authentication** in the left sidebar
2. Click **Settings** tab at the top
3. Scroll down to **Authorized domains** section

### Step 3: Add Your Deployed Domain
Click **Add domain** and add:
```
mojo-dojo-casa-house-f31a5.web.app
```

**Important**: Firebase Hosting domains are USUALLY added automatically, but sometimes they need to be added manually.

### Step 4: Check These Domains Are Present
Make sure you have these domains in the list:
- ✅ `localhost` (for local development)
- ✅ `mojo-dojo-casa-house-f31a5.web.app` (your deployed app)
- ✅ `mojo-dojo-casa-house-f31a5.firebaseapp.com` (alternative Firebase domain)

### Step 5: Test
1. Wait about 10-30 seconds for changes to take effect
2. Refresh your app: https://mojo-dojo-casa-house-f31a5.web.app
3. Try Google sign-in again

## Quick Checklist

- [ ] Opened Firebase Console
- [ ] Selected correct project
- [ ] Went to Authentication > Settings > Authorized domains
- [ ] Added `mojo-dojo-casa-house-f31a5.web.app`
- [ ] Waited 30 seconds
- [ ] Tested Google sign-in

## Visual Guide

### Where to Find Authorized Domains:
```
Firebase Console
└── Your Project
    └── Authentication (left sidebar)
        └── Settings (top tabs)
            └── Authorized domains (scroll down)
                └── [Add domain] button
```

## Expected Result
After adding the domain, Google sign-in should:
1. Open the Google account picker
2. Let you select/sign in with your Google account
3. Redirect back to your app
4. Successfully create/sign in to your account

## Troubleshooting

### Domain Already Listed But Still Not Working?
1. Try removing and re-adding the domain
2. Clear browser cache
3. Try in incognito/private mode
4. Wait a few minutes for Firebase to propagate changes

### Multiple Domains?
If your app has multiple domains (e.g., custom domain), add ALL of them:
- `mojo-dojo-casa-house-f31a5.web.app`
- `mojo-dojo-casa-house-f31a5.firebaseapp.com`
- Your custom domain (if any)

## Notes

- **The code fix is already deployed** - it will show better error messages
- **The domain authorization is a Firebase Console setting** - must be done manually
- **This is a one-time setup** - once added, it stays
- **Changes are instant** - no need to redeploy your app

