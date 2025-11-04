# 🚀 Complete Production Deployment Guide

## Overview

This guide will walk you through deploying your verification server to production on Vercel (FREE).

## Prerequisites

- ✅ Firebase Admin SDK JSON file (from Firebase Console)
- ✅ EmailJS credentials (Public Key, Service ID, Template ID)
- ✅ Cloudinary credentials (Cloud Name, Upload Preset)
- ✅ Vercel account (free tier works perfectly)

## Step 1: Install Vercel CLI

```bash
npm i -g vercel
```

## Step 2: Deploy to Vercel

```bash
vercel
```

Follow the prompts:
1. **Set up and deploy?** → `Y`
2. **Which scope?** → Select your account
3. **Link to existing project?** → `N` (first time) or `Y` (if redeploying)
4. **Project name?** → Enter a name (e.g., `firebnb-verification`)
5. **In which directory is your code located?** → `./`

**After deployment, Vercel will show you a URL like:**
```
https://your-project.vercel.app
```

**Save this URL!** You'll need it for environment variables.

## Step 3: Set Environment Variables

### Option A: Via Vercel Dashboard (Recommended)

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add each variable (see `VERCEL_ENV_SETUP.md` for detailed instructions)

### Option B: Via Vercel CLI

```bash
# Set each variable
vercel env add VITE_VERIFICATION_API_URL production
# Enter value: https://your-project.vercel.app/api

vercel env add VITE_EMAILJS_PUBLIC_KEY production
# Enter value: (your EmailJS public key)

vercel env add VITE_EMAILJS_SERVICE_ID production
# Enter value: (your EmailJS service ID)

vercel env add VITE_EMAILJS_TEMPLATE_VERIFICATION production
# Enter value: (your EmailJS template ID)

vercel env add VITE_CLOUDINARY_CLOUD_NAME production
# Enter value: (your Cloudinary cloud name)

vercel env add VITE_CLOUDINARY_UPLOAD_PRESET production
# Enter value: (your Cloudinary upload preset)

vercel env add FIREBASE_ADMIN_SDK_JSON production
# Enter value: (paste entire Firebase Admin SDK JSON)
```

**Important:** For `FIREBASE_ADMIN_SDK_JSON`, paste the entire JSON file content as a single string.

## Step 4: Redeploy

After setting environment variables, redeploy:

```bash
vercel --prod
```

Or from Vercel dashboard:
1. Go to **Deployments** tab
2. Click **...** on latest deployment
3. Click **Redeploy**

## Step 5: Verify Deployment

### 1. Test Health Endpoint

```bash
curl https://your-project.vercel.app/api/health
```

**Expected Response:**
```json
{"status":"ok","timestamp":"2024-01-01T00:00:00.000Z"}
```

### 2. Test Verification Link Generation

```bash
curl -X POST https://your-project.vercel.app/api/generate-verification-link \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

**Expected Response:**
```json
{
  "verificationLink": "https://yourapp.com/verify-email?mode=verifyEmail&oobCode=...",
  "success": true
}
```

### 3. Test Full Flow

1. Visit your deployed site: `https://your-project.vercel.app`
2. Sign up a new account
3. Check email - should receive EmailJS verification email
4. Click verification link - should work and redirect to login

## Step 6: Update Your Frontend Deployment

If your React app is deployed separately, update its environment variables:

1. Go to your frontend project in Vercel
2. Go to **Settings** → **Environment Variables**
3. Add/Update: `VITE_VERIFICATION_API_URL=https://your-project.vercel.app/api`
4. Redeploy frontend

## Troubleshooting

### Server Not Working

**Check:**
- ✅ `FIREBASE_ADMIN_SDK_JSON` is set correctly
- ✅ JSON is valid (no extra spaces/line breaks)
- ✅ You redeployed after adding variables

**View Logs:**
1. Go to Vercel Dashboard
2. Select your project
3. Go to **Deployments** → Click on deployment
4. Click **Function Logs**

### Frontend Can't Connect to Backend

**Check:**
- ✅ `VITE_VERIFICATION_API_URL` is set correctly
- ✅ URL matches your Vercel deployment URL
- ✅ URL ends with `/api`
- ✅ You redeployed after adding variables

### EmailJS Not Working

**Check:**
- ✅ EmailJS credentials are correct
- ✅ Template ID matches your EmailJS template
- ✅ Template has `{{verification_link}}` variable

## Production Checklist

- [ ] Deployed to Vercel
- [ ] All 7 environment variables set
- [ ] Redeployed after adding variables
- [ ] Health endpoint works
- [ ] Verification link generation works
- [ ] Sign up flow works
- [ ] EmailJS sends verification email
- [ ] Verification link works
- [ ] User can verify and login

## Cost

**Everything is FREE:**
- ✅ Vercel Hobby Plan (Free) - Unlimited functions
- ✅ EmailJS Free Tier - 200 emails/month
- ✅ Firebase Admin SDK - Free
- ✅ Cloudinary Free Tier - 25GB storage

## Next Steps

Once deployed:
1. ✅ Monitor function logs in Vercel
2. ✅ Test with real signups
3. ✅ Monitor EmailJS usage (stay under 200/month)
4. ✅ If you exceed EmailJS limit, upgrade or use Firebase email fallback

## Support

If you encounter issues:
1. Check `DEPLOYMENT_CHECKLIST.md` for detailed checklist
2. Check `VERCEL_ENV_SETUP.md` for environment variable setup
3. Check Vercel function logs for errors
4. Verify all environment variables are set correctly

## 🎉 Success!

Once all checks pass, your verification system is fully deployed and working in production!

**Your system will:**
- ✅ Send only ONE email (EmailJS template)
- ✅ Include proper Firebase verification link
- ✅ Work seamlessly with your deployed site
- ✅ Be completely FREE (using free tiers)

