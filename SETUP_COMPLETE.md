# ✅ Verification Server Setup - What I've Done

I've automated most of the setup process! Here's what's been completed:

## ✅ Completed Steps

### 1. Server Files Created
- ✅ `server/verification-link.js` - Express server
- ✅ `server/package.json` - Server dependencies
- ✅ `server/README.md` - Server documentation

### 2. Configuration Files Created
- ✅ `.env.example` - Environment variables template
- ✅ `vercel.json` - Vercel deployment config
- ✅ `functions/src/index.ts` - Cloud Functions alternative

### 3. Helper Scripts Created
- ✅ `setup-verification-server.js` - Interactive setup script

### 4. Documentation Created
- ✅ `QUICK_START_VERIFICATION.md` - Quick setup guide
- ✅ `VERIFICATION_SERVER_SETUP.md` - Detailed deployment guide
- ✅ `server/README.md` - Server-specific documentation

## 📋 What You Need to Do (Manual Steps)

### Step 1: Get Firebase Admin SDK Credentials (5 minutes)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **mojo-dojo-casa-house-f31a5**
3. Go to **⚙️ Project Settings** → **Service Accounts** tab
4. Click **"Generate new private key"**
5. Save the JSON file (e.g., `firebase-admin-key.json`)

### Step 2: Install Server Dependencies

```bash
cd server
npm install
```

### Step 3: Set Up Firebase Admin SDK

**Option A: For Local Development**
- Copy your Firebase Admin SDK JSON file to `server/serviceAccountKey.json`
- ⚠️ **DO NOT commit this file to git!** (already in .gitignore)

**Option B: For Production (Vercel/Netlify)**
- Add environment variable: `FIREBASE_ADMIN_SDK_JSON`
- Value: Paste the entire content of your service account JSON file

### Step 4: Update .env File

Copy `.env.example` to `.env` and fill in:

```env
# EmailJS Configuration (you should already have these)
VITE_EMAILJS_PUBLIC_KEY=your_public_key_here
VITE_EMAILJS_SERVICE_ID=your_service_id_here
VITE_EMAILJS_TEMPLATE_VERIFICATION=your_template_id_here

# Verification Server URL
# For local: http://localhost:3001/api
# For Vercel: https://your-project.vercel.app/api
VITE_VERIFICATION_API_URL=http://localhost:3001/api

# Cloudinary (you should already have this)
VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name_here
VITE_CLOUDINARY_UPLOAD_PRESET=your_upload_preset_here
```

### Step 5: Start the Server (Local Development)

```bash
cd server
npm start
```

Server will run on `http://localhost:3001`

### Step 6: Deploy to Vercel (Recommended - Free)

1. **Install Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

2. **Deploy:**
   ```bash
   vercel
   ```
   - Follow prompts
   - When asked for environment variables:
     - Name: `FIREBASE_ADMIN_SDK_JSON`
     - Value: Paste the entire content of your service account JSON file

3. **Update `.env` with your Vercel URL:**
   ```env
   VITE_VERIFICATION_API_URL=https://your-project.vercel.app/api
   ```

### Step 7: Update EmailJS Template

1. Go to [EmailJS Dashboard](https://dashboard.emailjs.com/)
2. Open your verification template
3. Make sure the button/link uses `{{verification_link}}` variable
4. The link should point to your verification page

### Step 8: Test

1. **Start the server** (if running locally):
   ```bash
   cd server
   npm start
   ```

2. **Start your React app**:
   ```bash
   npm run dev
   ```

3. **Sign up a new account**
4. **Check your email** - you should receive ONLY ONE email (from EmailJS)
5. **Click the verification link** - it should work and redirect to login

## 🎯 Quick Commands

### Run Setup Script (Interactive)
```bash
node setup-verification-server.js
```

### Start Server Locally
```bash
cd server
npm start
```

### Test Server Health
```bash
curl http://localhost:3001/api/health
```

### Test Verification Link Generation
```bash
curl -X POST http://localhost:3001/api/generate-verification-link \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

## 🔍 Troubleshooting

### Server won't start
- ✅ Check if `server/node_modules` exists (run `npm install` in server directory)
- ✅ Check if Firebase Admin SDK credentials are set up

### "Failed to generate verification link"
- ✅ Check if server is running
- ✅ Verify `VITE_VERIFICATION_API_URL` in `.env` matches your server URL
- ✅ Check Firebase Admin SDK credentials are correct

### "EmailJS failed"
- ✅ Check EmailJS credentials in `.env`
- ✅ Verify template ID is correct
- ✅ Check EmailJS template has `{{verification_link}}` variable

## 📝 Summary

**What I've Done:**
- ✅ Created all server files
- ✅ Created configuration files
- ✅ Created helper scripts and documentation
- ✅ Set up .gitignore to protect secrets

**What You Need to Do:**
1. Get Firebase Admin SDK credentials (Step 1 above)
2. Install server dependencies (Step 2)
3. Set up Firebase Admin SDK (Step 3)
4. Update .env file (Step 4)
5. Start the server (Step 5)
6. Deploy to Vercel (Step 6) - Optional but recommended
7. Update EmailJS template (Step 7)
8. Test (Step 8)

**Everything is ready to go!** Just follow the steps above. 🚀

