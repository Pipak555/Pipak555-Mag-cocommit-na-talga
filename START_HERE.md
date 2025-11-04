# 🚀 Start Here - Verification Server Setup

## ✅ What I've Already Done

I've automated most of the setup! Here's what's ready:

1. ✅ **Server files created** - Express server with Firebase Admin SDK
2. ✅ **Dependencies installed** - All npm packages installed
3. ✅ **Configuration files created** - `.env.example`, `vercel.json`, etc.
4. ✅ **Documentation created** - Complete setup guides
5. ✅ **Helper scripts created** - Test and setup scripts

## 📋 What You Need to Do (5 Steps)

### Step 1: Get Firebase Admin SDK Credentials (5 minutes)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **mojo-dojo-casa-house-f31a5**
3. Go to **⚙️ Project Settings** → **Service Accounts** tab
4. Click **"Generate new private key"**
5. Save the JSON file (e.g., `firebase-admin-key.json`)

### Step 2: Set Up Firebase Admin SDK

**For Local Development:**
- Copy your Firebase Admin SDK JSON file to `server/serviceAccountKey.json`
- ⚠️ **DO NOT commit this file to git!** (already protected in .gitignore)

### Step 3: Test the Server

```bash
cd server
node test-server.js
```

This will test if Firebase Admin SDK is configured correctly.

### Step 4: Start the Server

```bash
cd server
npm start
```

Server will run on `http://localhost:3001`

### Step 5: Update .env File

Copy `.env.example` to `.env` and add:

```env
# Verification Server URL (for local development)
VITE_VERIFICATION_API_URL=http://localhost:3001/api
```

**You should already have EmailJS and Cloudinary configured in your .env file.**

## 🚀 Deploy to Vercel (Optional - Recommended)

For production, deploy to Vercel (FREE):

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

3. **Update .env with your Vercel URL:**
   ```env
   VITE_VERIFICATION_API_URL=https://your-project.vercel.app/api
   ```

## ✅ Verify EmailJS Template

1. Go to [EmailJS Dashboard](https://dashboard.emailjs.com/)
2. Open your verification template
3. Make sure the button/link uses `{{verification_link}}` variable

## 🧪 Test Everything

1. **Start the server** (if running locally):
   ```bash
   cd server
   npm start
   ```

2. **Start your React app:**
   ```bash
   npm run dev
   ```

3. **Sign up a new account**
4. **Check your email** - you should receive ONLY ONE email (from EmailJS)
5. **Click the verification link** - it should work and redirect to login

## 📚 Documentation

- **QUICK_START_VERIFICATION.md** - Quick setup guide
- **SETUP_COMPLETE.md** - Detailed setup instructions
- **server/README.md** - Server-specific documentation

## 🆘 Need Help?

If something doesn't work:

1. **Test the server:**
   ```bash
   cd server
   node test-server.js
   ```

2. **Check server logs:**
   - Look for error messages in the console
   - Check if Firebase Admin SDK is configured correctly

3. **Check .env file:**
   - Make sure `VITE_VERIFICATION_API_URL` is set correctly
   - Verify EmailJS credentials are correct

4. **Check EmailJS template:**
   - Make sure `{{verification_link}}` variable is used
   - Verify template ID matches your .env file

## 🎉 That's It!

Once you complete these 5 steps, your verification system will:
- ✅ Send only ONE email (EmailJS template)
- ✅ Include proper Firebase verification link
- ✅ Work seamlessly with your existing setup
- ✅ Be completely FREE (using free tiers)

**Everything else is already done!** 🚀

