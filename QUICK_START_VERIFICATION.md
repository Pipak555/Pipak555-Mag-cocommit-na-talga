# Quick Start: Single EmailJS Verification Setup

## What Changed?

✅ **Before**: Two emails sent (Firebase + EmailJS welcome)  
✅ **After**: Only ONE email sent (EmailJS with verification link)

## Setup Steps

### Step 1: Get Firebase Admin SDK Credentials

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **mojo-dojo-casa-house-f31a5**
3. Go to **⚙️ Project Settings** → **Service Accounts** tab
4. Click **"Generate new private key"**
5. Save the JSON file (e.g., `firebase-admin-key.json`)

### Step 2: Deploy the Server (Choose ONE option)

#### Option A: Deploy to Vercel (Recommended - 5 minutes)

1. **Install Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

2. **Deploy:**
   ```bash
   vercel
   ```
   - Follow prompts
   - When asked for environment variables, add:
     - Name: `FIREBASE_ADMIN_SDK_JSON`
     - Value: Paste the **entire content** of your service account JSON file

3. **Get your URL:**
   - After deployment, Vercel will show your URL
   - Example: `https://your-project.vercel.app`

4. **Add to `.env` file:**
   ```env
   VITE_VERIFICATION_API_URL=https://your-project.vercel.app/api
   ```

#### Option B: Run Locally (For Testing)

1. **Install dependencies:**
   ```bash
   cd server
   npm install
   ```

2. **Create `server/serviceAccountKey.json`:**
   - Copy the Firebase Admin SDK JSON file you downloaded
   - Paste it as `server/serviceAccountKey.json`

3. **Run the server:**
   ```bash
   npm start
   ```
   Server runs on `http://localhost:3001`

4. **Add to `.env` file:**
   ```env
   VITE_VERIFICATION_API_URL=http://localhost:3001/api
   ```

#### Option C: Use Firebase Cloud Functions

1. **Install Firebase CLI:**
   ```bash
   npm i -g firebase-tools
   ```

2. **Initialize Functions:**
   ```bash
   firebase init functions
   ```
   - Choose TypeScript
   - Install dependencies

3. **Copy `functions/src/index.ts`** (already created)

4. **Deploy:**
   ```bash
   firebase deploy --only functions
   ```

5. **Add to `.env` file:**
   ```env
   VITE_VERIFICATION_API_URL=https://YOUR-REGION-YOUR-PROJECT.cloudfunctions.net
   ```

### Step 3: Update EmailJS Template

1. Go to [EmailJS Dashboard](https://dashboard.emailjs.com/)
2. Open your verification template
3. Make sure the button/link uses `{{verification_link}}` variable
4. The link should point to your verification page

### Step 4: Test

1. **Sign up a new account**
2. **Check your email** - you should receive ONLY ONE email (from EmailJS)
3. **Click the verification link** - it should work and redirect to login

## Troubleshooting

### "Failed to generate verification link"
- ✅ Check if the server is running
- ✅ Verify `VITE_VERIFICATION_API_URL` in `.env`
- ✅ Check Firebase Admin SDK credentials are correct

### "EmailJS failed"
- ✅ Check EmailJS credentials in `.env`
- ✅ Verify template ID is correct
- ✅ Check EmailJS template has `{{verification_link}}` variable

### Fallback to Firebase Email
- If the backend fails, the system automatically falls back to Firebase's default email
- This ensures users can still verify even if your server is down

## File Structure

```
firebnb-spark day5/
├── server/
│   ├── verification-link.js    # Express server
│   └── package.json            # Server dependencies
├── functions/
│   └── src/
│       └── index.ts            # Cloud Functions alternative
├── src/
│   ├── contexts/
│   │   └── AuthContext.tsx     # Updated to use backend
│   └── lib/
│       └── emailjs.ts          # Updated to send verification email
└── vercel.json                  # Vercel deployment config
```

## What Happens Now?

1. **User signs up** → Account created
2. **Backend generates verification link** → Firebase Admin SDK creates link with `oobCode`
3. **EmailJS sends email** → Beautiful template with verification link
4. **User clicks link** → Goes to `/verify-email?mode=verifyEmail&oobCode=...`
5. **Email verified** → Redirects to dashboard

**Only ONE email is sent!** 🎉

