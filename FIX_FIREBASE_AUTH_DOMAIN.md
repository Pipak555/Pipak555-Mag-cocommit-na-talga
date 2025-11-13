# Fix Firebase Authentication Domain Authorization

## Problem
You're seeing this error:
```
This domain (127.0.0.1:8080) is not authorized for Google sign-in.
```

## Quick Fix Steps

### Step 1: Open Firebase Console
1. Go to: https://console.firebase.google.com/
2. Select your project: **mojo-dojo-casa-house-f31a5**

### Step 2: Navigate to Authorized Domains
1. Click **Authentication** in the left sidebar
2. Click **Settings** tab at the top
3. Scroll down to **"Authorized domains"** section

### Step 3: Add Your Local Development Domain
1. Click **"Add domain"** button
2. Enter: `127.0.0.1`
3. Click **"Add"**
4. Click **"Add domain"** again
5. Enter: `127.0.0.1:8080` (with port)
6. Click **"Add"**

### Step 4: Wait and Test
1. Wait **30-60 seconds** for changes to take effect
2. Refresh your app at `http://127.0.0.1:8080`
3. Try Google sign-in again

## Alternative: Use localhost Instead

If you prefer, you can use `localhost:8080` instead:
1. Access your app at: `http://localhost:8080`
2. Add `localhost` to authorized domains (usually already added)
3. `localhost` is typically pre-authorized by Firebase

## Domains You Should Have

Make sure these domains are in your authorized domains list:
- ✅ `localhost` (usually pre-added)
- ✅ `127.0.0.1` (add this)
- ✅ `127.0.0.1:8080` (add this if using port)
- ✅ `mojo-dojo-casa-house-f31a5.web.app` (production)
- ✅ `mojo-dojo-casa-house-f31a5.firebaseapp.com` (production)

## Visual Guide

```
Firebase Console
└── Your Project (mojo-dojo-casa-house-f31a5)
    └── Authentication (left sidebar)
        └── Settings (top tab)
            └── Authorized domains (scroll down)
                └── [Add domain] button
                    └── Enter: 127.0.0.1
                    └── Enter: 127.0.0.1:8080
```

## After Adding Domains

1. **Wait 30-60 seconds** - Firebase needs time to propagate changes
2. **Refresh your browser** - Clear cache if needed (Ctrl+Shift+R)
3. **Try signing in again** - Should work now!

## Note

- Changes may take a few minutes to fully propagate
- If it still doesn't work after 2 minutes, try:
  - Clearing browser cache
  - Using incognito/private mode
  - Restarting your dev server

