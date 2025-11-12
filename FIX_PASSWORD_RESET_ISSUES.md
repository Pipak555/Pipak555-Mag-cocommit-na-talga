# Fix Password Reset Issues

## Issues Found

1. **Firestore Permission Error**: Cannot query users by email
2. **Firebase Auth Domain Error**: Domain not authorized for continue URL
3. **Missing Firestore Indexes**: Composite indexes needed for bookings and notifications

## Fixes Applied

### 1. ✅ Firestore Rules Updated
- Added `allow list` rule for users collection to allow querying by email
- This enables password reset to fetch user profile by email

### 2. ✅ Code Updated
- Changed password reset to use production URL instead of `window.location.origin`
- This ensures the domain is always authorized

### 3. ⚠️ Firestore Indexes Required

You need to create these indexes in Firebase Console:

#### Index 1: Bookings Collection
**Collection**: `bookings`
**Fields**:
- `guestId` (Ascending)
- `createdAt` (Descending)

**Steps**:
1. Click the link in the error message, OR
2. Go to: https://console.firebase.google.com/v1/r/project/mojo-dojo-casa-house-f31a5/firestore/indexes?create_composite=Cltwcm9qZWN0cy9tb2pvLWRvam8tY2FzYS1ob3VzZS1mMzFhNS9kYXRhYmFzZXMvKGRlZmF1bHQpL2NvbGxlY3Rpb25Hcm91cHMvYm9va2luZ3MvaW5kZXhlcy9fEAEaCwoHZ3Vlc3RJZBABGg0KCWNyZWF0ZWRBdBACGgwKCF9fbmFtZV9fEAI
3. Click "Create Index"
4. Wait for index to build (usually 1-2 minutes)

#### Index 2: Notifications Collection
**Collection**: `notifications`
**Fields**:
- `role` (Ascending)
- `userId` (Ascending)
- `createdAt` (Descending)

**Steps**:
1. Click the link in the error message, OR
2. Go to: https://console.firebase.google.com/v1/r/project/mojo-dojo-casa-house-f31a5/firestore/indexes?create_composite=CmBwcm9qZWN0cy9tb2pvLWRvam8tY2FzYS1ob3VzZS1mMzFhNS9kYXRhYmFzZXMvKGRlZmF1bHQpL2NvbGxlY3Rpb25Hcm91cHMvbm90aWZpY2F0aW9ucy9pbmRleGVzL18QARoICgRyb2xlEAEaCgoGdXNlcklkEAEaDQoJY3JlYXRlZEF0EAIaDAoIX19uYW1lX18QAg
3. Click "Create Index"
4. Wait for index to build (usually 1-2 minutes)

## Additional Steps

### 4. Authorize Domain in Firebase Console

1. Go to: https://console.firebase.google.com/project/mojo-dojo-casa-house-f31a5/authentication/settings
2. Scroll to **"Authorized domains"** section
3. Make sure these domains are listed:
   - `localhost` (for local development)
   - `mojo-dojo-casa-house-f31a5.web.app` (your production domain)
   - `mojo-dojo-casa-house-f31a5.firebaseapp.com` (Firebase hosting)
4. If any are missing, click **"Add domain"** and add them

### 5. Deploy Updated Firestore Rules

After updating the rules, deploy them:

```bash
firebase deploy --only firestore:rules
```

## Testing

After completing these steps:

1. **Test Password Reset**:
   - Go to forgot password page
   - Enter an email
   - Should receive password reset email
   - No more permission errors in console

2. **Check Console**:
   - No more index errors
   - No more permission errors
   - Password reset should work

## Summary

✅ **Fixed**: Firestore rules updated to allow querying users by email
✅ **Fixed**: Code updated to use production URL for password reset
⚠️ **Action Required**: Create Firestore indexes (click links in error messages)
⚠️ **Action Required**: Verify authorized domains in Firebase Console
⚠️ **Action Required**: Deploy updated Firestore rules

