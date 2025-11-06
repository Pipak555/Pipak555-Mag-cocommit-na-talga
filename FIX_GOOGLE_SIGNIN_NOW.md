# EXACT STEPS TO FIX GOOGLE SIGN-IN

## The Real Problem
Your console shows: **"This sign-in method is not enabled"**

This means: Google Sign-In provider is DISABLED in Firebase.

## SOLUTION: Enable Google Provider in Firebase

### Step-by-Step (Follow Exactly)

#### 1. Open Firebase Console
- Go to: https://console.firebase.google.com/
- Select: **Mojo Dojo Casa House**

#### 2. Go to Authentication
- Click **"Authentication"** in left sidebar
- You should see tabs at the top: **Users | Sign-in method | Templates | Settings | Usage**

#### 3. Click "Sign-in method" Tab
- Click the **"Sign-in method"** tab (second tab)
- NOT "Settings" - that's the wrong tab
- You should now see a list of sign-in providers

#### 4. Find and Enable Google
In the providers list, you'll see:
- Email/Password (probably enabled)
- Phone
- Google ← **THIS ONE**
- Play Games
- etc.

Click on **Google** row

#### 5. Enable Google Provider
A panel will open on the right side:
1. Toggle **"Enable"** switch to ON (it should turn blue)
2. **Project support email**: Select or enter your email
3. Click **"Save"** button at the bottom

#### 6. Verify
After saving, the Google row should show:
- Status: **Enabled** ✓

## That's It!

Once you click Save, wait 10 seconds, then:
1. Refresh your app (F5)
2. Click "Sign in with Google"
3. It will work! ✓

## Why This Happened

Firebase requires TWO separate configurations:
1. ✅ Authorized domains (you already did this)
2. ❌ Enable sign-in providers (this is what's missing)

You completed step 1 but missed step 2.

## Visual Guide

```
Firebase Console
  └─ Authentication (left sidebar)
      └─ Sign-in method (TOP TAB - click here!)
          └─ Providers list
              └─ Google (click to open)
                  └─ Enable toggle: ON
                  └─ Support email: your-email@example.com
                  └─ [Save] button
```

## After Enabling

Google sign-in will work on:
- ✅ localhost:8081 (local development)
- ✅ mojo-dojo-casa-house-f31a5.web.app (deployed)
- ✅ Any other authorized domain

All at once - no code changes needed!

