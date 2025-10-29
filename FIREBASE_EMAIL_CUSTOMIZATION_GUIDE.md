# Firebase Email Customization Guide

## The Problem
Firebase has disabled direct editing of email templates in the console to prevent spam. The message you see ("To help prevent spam, the message can't be edited on this email template") is a recent security measure.

## Solution 1: Custom Domain Setup (Easiest)

### Step 1: Set Up Custom Domain
1. In Firebase Console → Authentication → Settings → Authorized domains
2. Add your custom domain (e.g., `auth.yourdomain.com`)
3. Go to Authentication → Templates → Email address verification
4. Click "Customize action URL"
5. Set it to: `https://yourdomain.com/verify-email`

### Step 2: Configure DNS
Add these DNS records to your domain:
```
Type: CNAME
Name: auth
Value: mojo-dojo-casa-house-f31a5.firebaseapp.com
```

### Step 3: Update Your App
Update your Firebase config to use the custom domain:
```javascript
// In your firebase config
const firebaseConfig = {
  // ... your existing config
  authDomain: "auth.yourdomain.com" // Use your custom domain
};
```

## Solution 2: Custom Email Service (Most Control)

### Step 1: Install Required Packages
```bash
npm install firebase-admin nodemailer
```

### Step 2: Create Custom Email Service
Create `src/lib/customEmailService.ts`:

```typescript
import { getAuth } from 'firebase-admin/auth';
import nodemailer from 'nodemailer';

// Initialize Firebase Admin (you'll need service account key)
import { initializeApp, getApps, cert } from 'firebase-admin/app';

if (!getApps().length) {
  initializeApp({
    credential: cert({
      // Your service account credentials
      projectId: "mojo-dojo-casa-house-f31a5",
      // ... other credentials
    })
  });
}

const transporter = nodemailer.createTransporter({
  // Configure your email service (Gmail, SendGrid, etc.)
  service: 'gmail',
  auth: {
    user: 'your-email@gmail.com',
    pass: 'your-app-password'
  }
});

export const sendCustomVerificationEmail = async (email: string) => {
  try {
    // Generate Firebase action link
    const actionCodeSettings = {
      url: 'https://yourdomain.com/verify-email',
      handleCodeInApp: true
    };
    
    const actionLink = await getAuth().generateEmailVerificationLink(email, actionCodeSettings);
    
    // Send custom email
    await transporter.sendMail({
      from: 'noreply@yourdomain.com',
      to: email,
      subject: 'Welcome to Firebnb! Please verify your email',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            /* Your beautiful email template styles here */
            body { font-family: Arial, sans-serif; }
            .container { max-width: 600px; margin: 0 auto; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px; text-align: center; }
            .button { background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🏠 Welcome to Firebnb!</h1>
              <p>Your Gateway to Amazing Stays</p>
            </div>
            <div style="padding: 40px;">
              <h2>Verify Your Email Address</h2>
              <p>Thank you for joining our community! Please verify your email to complete your registration.</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${actionLink}" class="button">Verify My Email</a>
              </div>
              <p>If the button doesn't work, copy and paste this link:</p>
              <p style="word-break: break-all; color: #666;">${actionLink}</p>
            </div>
          </div>
        </body>
        </html>
      `
    });
  } catch (error) {
    console.error('Error sending verification email:', error);
    throw error;
  }
};
```

### Step 3: Update AuthContext
Modify your AuthContext to use the custom email service:

```typescript
// In src/contexts/AuthContext.tsx
import { sendCustomVerificationEmail } from '@/lib/customEmailService';

const signUp = async (email: string, password: string, role: 'host' | 'guest' | 'admin') => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  
  await setDoc(doc(db, 'users', userCredential.user.uid), {
    email,
    role,
    createdAt: new Date().toISOString(),
    points: 0,
    walletBalance: 0,
    favorites: []
  });
  
  // Use custom email service instead of Firebase default
  await sendCustomVerificationEmail(email);
  
  setUserRole(role);
};
```

## Solution 3: Use Firebase Extensions (Advanced)

### Install Email Template Extension
1. Go to Firebase Console → Extensions
2. Install "Custom Email Templates" extension
3. Configure with your custom HTML templates

## Solution 4: Work with Default Template (Quick Fix)

If you want to keep using Firebase's default template but make it look better:

### Step 1: Customize What You Can
1. In Firebase Console → Authentication → Templates
2. Change the **Subject** to: "Welcome to Firebnb! Please verify your email"
3. Set **Action URL** to: `https://yourdomain.com/verify-email`
4. Add **Reply-to** email: `noreply@yourdomain.com`

### Step 2: Style Your Verification Page
Make your `/verify-email` page so beautiful that users don't mind the plain email:

```typescript
// Your EmailVerification.tsx is already beautifully styled!
// Users will click the plain email link but land on your beautiful page
```

## Recommended Approach

For your Firebnb project, I recommend **Solution 1 (Custom Domain)** because:

1. ✅ Easy to implement
2. ✅ Uses Firebase's built-in security
3. ✅ Professional appearance
4. ✅ No additional services needed
5. ✅ Works with your existing code

## Quick Implementation

1. **Get a domain** (if you don't have one, use a subdomain like `auth.firebnb.com`)
2. **Set up DNS** as shown above
3. **Update Firebase config** to use your custom domain
4. **Test the flow** - emails will now come from your domain!

The custom domain approach gives you professional-looking emails while keeping all the security benefits of Firebase Authentication.

Would you like me to help you implement any of these solutions?
