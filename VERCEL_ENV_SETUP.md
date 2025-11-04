# 🔧 Vercel Environment Variables Setup Guide

## Quick Setup

After deploying to Vercel, you **MUST** set environment variables in the Vercel dashboard.

## Step-by-Step Instructions

### 1. Go to Vercel Dashboard

1. Visit [https://vercel.com/dashboard](https://vercel.com/dashboard)
2. Sign in to your account
3. Select your project

### 2. Navigate to Environment Variables

1. Click **Settings** (top navigation)
2. Click **Environment Variables** (left sidebar)

### 3. Add Environment Variables

Click **Add New** and add each variable below:

#### Frontend Variables (Public)

**1. Verification API URL**
```
Name: VITE_VERIFICATION_API_URL
Value: https://your-project.vercel.app/api
Environment: Production, Preview, Development
```

**2. EmailJS Public Key**
```
Name: VITE_EMAILJS_PUBLIC_KEY
Value: (your EmailJS public key from dashboard)
Environment: Production, Preview, Development
```

**3. EmailJS Service ID**
```
Name: VITE_EMAILJS_SERVICE_ID
Value: (your EmailJS service ID)
Environment: Production, Preview, Development
```

**4. EmailJS Template ID**
```
Name: VITE_EMAILJS_TEMPLATE_VERIFICATION
Value: (your EmailJS verification template ID)
Environment: Production, Preview, Development
```

**5. Cloudinary Cloud Name**
```
Name: VITE_CLOUDINARY_CLOUD_NAME
Value: (your Cloudinary cloud name)
Environment: Production, Preview, Development
```

**6. Cloudinary Upload Preset**
```
Name: VITE_CLOUDINARY_UPLOAD_PRESET
Value: (your Cloudinary upload preset name)
Environment: Production, Preview, Development
```

#### Backend Variables (Server Function)

**7. Firebase Admin SDK JSON** ⚠️ **IMPORTANT**
```
Name: FIREBASE_ADMIN_SDK_JSON
Value: (paste entire JSON file content as a single string)
Environment: Production, Preview, Development
```

**How to get Firebase Admin SDK JSON:**
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **mojo-dojo-casa-house-f31a5**
3. Go to **⚙️ Project Settings** → **Service Accounts** tab
4. Click **"Generate new private key"**
5. Download the JSON file
6. Open the JSON file
7. Copy the **entire content**
8. Paste it as the value for `FIREBASE_ADMIN_SDK_JSON`

**Important:** 
- Paste the JSON as a single string (it should be one long line)
- Make sure there are no extra spaces or line breaks
- The value should start with `{"type":"service_account",...}`

### 4. Redeploy

After adding all environment variables:

1. Go to **Deployments** tab
2. Click **...** on the latest deployment
3. Click **Redeploy**
4. Or run: `vercel --prod`

**Why redeploy?**
- Environment variables are only available after redeployment
- Changes won't take effect until you redeploy

### 5. Verify

After redeployment, test:

1. **Health Check:**
   ```
   https://your-project.vercel.app/api/health
   ```
   Should return: `{"status":"ok","timestamp":"..."}`

2. **Test Verification:**
   - Sign up a new account on your deployed site
   - Check email - should receive EmailJS verification email
   - Click verification link - should work

## Common Issues

### Issue: "Failed to generate verification link"
**Solution:**
- Check if `FIREBASE_ADMIN_SDK_JSON` is set correctly
- Verify JSON is valid (no extra spaces/line breaks)
- Make sure you redeployed after adding the variable

### Issue: "CORS error" or "Failed to fetch"
**Solution:**
- Check if `VITE_VERIFICATION_API_URL` is set correctly
- Verify URL matches your Vercel deployment URL
- Make sure URL ends with `/api`

### Issue: "EmailJS failed"
**Solution:**
- Check EmailJS credentials are correct
- Verify template ID matches your EmailJS template
- Check EmailJS template has `{{verification_link}}` variable

## Quick Reference

**Your Vercel URL Format:**
- Frontend: `https://your-project.vercel.app`
- API: `https://your-project.vercel.app/api`

**Environment Variables Needed:**
- 6 Frontend variables (VITE_*)
- 1 Backend variable (FIREBASE_ADMIN_SDK_JSON)

**Total: 7 environment variables**

## ✅ Checklist

- [ ] All 7 environment variables added
- [ ] All variables set for Production, Preview, Development
- [ ] Redeployed after adding variables
- [ ] Health endpoint works
- [ ] Verification link generation works
- [ ] Sign up flow works
- [ ] EmailJS sends verification email
- [ ] Verification link works

## 🎉 Done!

Once all checks pass, your verification system is fully configured and working in production!

