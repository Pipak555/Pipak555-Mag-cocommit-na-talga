# Enable Google Sign-In Provider in Firebase

## The Problem
Even though domains are authorized, Google Sign-In won't work unless the **Google provider is enabled** in Firebase Authentication.

## Solution: Enable Google Sign-In Provider

### Step 1: Go to Sign-in Methods
1. Open Firebase Console: https://console.firebase.google.com/
2. Select your project: **Mojo Dojo Casa House**
3. Click **Authentication** in the left sidebar
4. Click **Sign-in method** tab (at the top)
   - NOT "Settings" - this is a different tab!

### Step 2: Enable Google Provider
1. In the providers list, find **Google**
2. Check its status:
   - If it says **"Disabled"** - you need to enable it
   - If it says **"Enabled"** - skip to Step 3

3. Click on **Google** to open settings
4. Toggle **Enable** switch to ON
5. Add **Support email** (required):
   - Use your email address
   - Example: `your-email@gmail.com`
6. Click **Save**

### Step 3: Verify Configuration
After enabling, you should see:
- ✅ Google provider status: **Enabled**
- ✅ Support email: **your-email@gmail.com**

### Step 4: Test
1. Wait 10-20 seconds
2. Refresh your app: https://mojo-dojo-casa-house-f31a5.web.app
3. Click "Sign in with Google"
4. It should now work!

## Visual Guide

```
Firebase Console
└── Your Project
    └── Authentication (left sidebar)
        └── Sign-in method (top tab) ← IMPORTANT: Use this tab!
            └── Providers list
                └── Google
                    └── [Enable toggle]
                    └── [Support email field]
                    └── [Save button]
```

## Common Mistakes

❌ **Wrong tab**: Looking at "Settings" instead of "Sign-in method"
❌ **Wrong section**: Looking at "Authorized domains" instead of "Providers"
✅ **Correct**: Authentication > Sign-in method > Google > Enable

## What to Enable

You need to enable these providers for your app:
- ✅ **Email/Password** (probably already enabled)
- ✅ **Google** (needs to be enabled)

## After Enabling

Once Google provider is enabled:
1. Google sign-in will work on ALL authorized domains
2. Users can sign in/sign up with Google accounts
3. No code changes needed - it just works

## Troubleshooting

### Still not working after enabling?
1. Clear browser cache (Ctrl+Shift+Delete)
2. Try incognito/private mode
3. Hard refresh (Ctrl+F5)
4. Wait 1-2 minutes for changes to propagate

### Can't find "Sign-in method" tab?
- Make sure you're in **Authentication** section
- Look at the tabs at the top: Users | Sign-in method | Settings | Usage
- Click on **Sign-in method**

### Need help?
Share a screenshot of your Firebase Authentication > Sign-in method page

