# 🚀 Production Deployment Checklist

## ✅ Pre-Deployment Checklist

### Step 1: Fix Configuration Files
- [x] ✅ Fixed `vercel.json` - Removed incorrect `env` section
- [x] ✅ Server code is ready
- [x] ✅ Frontend code is ready

### Step 2: Get Firebase Admin SDK Credentials
- [ ] Get Firebase Admin SDK JSON from Firebase Console
- [ ] Save the JSON file content (you'll need it for Vercel)

### Step 3: Prepare Environment Variables

**Frontend Environment Variables (for React app):**
```
VITE_VERIFICATION_API_URL=https://your-project.vercel.app/api
VITE_EMAILJS_PUBLIC_KEY=your_emailjs_public_key
VITE_EMAILJS_SERVICE_ID=your_emailjs_service_id
VITE_EMAILJS_TEMPLATE_VERIFICATION=your_template_id
VITE_CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
VITE_CLOUDINARY_UPLOAD_PRESET=your_cloudinary_preset
```

**Backend Environment Variables (for server function):**
```
FIREBASE_ADMIN_SDK_JSON={"type":"service_account","project_id":"..."}
```

## 📋 Deployment Steps

### Step 1: Install Vercel CLI
```bash
npm i -g vercel
```

### Step 2: Deploy to Vercel
```bash
vercel
```

Follow the prompts:
1. **Set up and deploy?** → Yes
2. **Which scope?** → Your account
3. **Link to existing project?** → No (first time) or Yes (if redeploying)
4. **Project name?** → Enter a name (e.g., `firebnb-verification`)
5. **In which directory is your code located?** → `./` (current directory)

### Step 3: Set Environment Variables in Vercel Dashboard

**Important:** After deployment, you MUST set environment variables in Vercel dashboard!

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add each variable below:

#### Production Environment Variables:

**For Frontend (Public):**
```
Name: VITE_VERIFICATION_API_URL
Value: https://your-project.vercel.app/api
Environment: Production, Preview, Development

Name: VITE_EMAILJS_PUBLIC_KEY
Value: (your EmailJS public key)
Environment: Production, Preview, Development

Name: VITE_EMAILJS_SERVICE_ID
Value: (your EmailJS service ID)
Environment: Production, Preview, Development

Name: VITE_EMAILJS_TEMPLATE_VERIFICATION
Value: (your EmailJS template ID)
Environment: Production, Preview, Development

Name: VITE_CLOUDINARY_CLOUD_NAME
Value: (your Cloudinary cloud name)
Environment: Production, Preview, Development

Name: VITE_CLOUDINARY_UPLOAD_PRESET
Value: (your Cloudinary upload preset)
Environment: Production, Preview, Development
```

**For Backend (Server Function):**
```
Name: FIREBASE_ADMIN_SDK_JSON
Value: (paste entire Firebase Admin SDK JSON as a single string)
Environment: Production, Preview, Development
```

**Important Notes:**
- For `FIREBASE_ADMIN_SDK_JSON`, paste the entire JSON file content as a single string
- Make sure to select all environments (Production, Preview, Development)
- After adding variables, you need to **redeploy** for changes to take effect

### Step 4: Redeploy After Setting Environment Variables

After setting environment variables, redeploy:
```bash
vercel --prod
```

Or trigger a redeploy from Vercel dashboard:
1. Go to **Deployments** tab
2. Click **...** on latest deployment
3. Click **Redeploy**

### Step 5: Verify Deployment

1. **Check Health Endpoint:**
   ```bash
   curl https://your-project.vercel.app/api/health
   ```
   Should return: `{"status":"ok","timestamp":"..."}`

2. **Test Verification Link Generation:**
   ```bash
   curl -X POST https://your-project.vercel.app/api/generate-verification-link \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com"}'
   ```
   Should return: `{"verificationLink":"...","success":true}`

3. **Test Frontend:**
   - Visit your deployed site
   - Sign up a new account
   - Check email - should receive EmailJS verification email
   - Click verification link - should work

## 🔍 Troubleshooting

### "Failed to generate verification link" Error
- ✅ Check if `FIREBASE_ADMIN_SDK_JSON` is set correctly in Vercel
- ✅ Verify the JSON is valid (check for missing quotes, commas)
- ✅ Make sure you redeployed after adding environment variables

### "CORS error" or "Failed to fetch"
- ✅ Check if `VITE_VERIFICATION_API_URL` is set correctly
- ✅ Verify the URL matches your Vercel deployment URL
- ✅ Make sure you added `/api` at the end of the URL

### "EmailJS failed"
- ✅ Check EmailJS credentials are correct
- ✅ Verify template ID matches your EmailJS template
- ✅ Check EmailJS template has `{{verification_link}}` variable

### Server Not Working
- ✅ Check Vercel function logs (Deployments → Function Logs)
- ✅ Verify server/verification-link.js is in the correct location
- ✅ Check vercel.json routes configuration

## 📝 Post-Deployment Checklist

- [ ] Health endpoint works: `/api/health`
- [ ] Verification link generation works: `/api/generate-verification-link`
- [ ] Frontend can connect to backend
- [ ] Sign up flow works
- [ ] EmailJS sends verification email
- [ ] Verification link works
- [ ] User can verify email and login

## 🎉 Success!

Once all checks pass, your verification system is fully deployed and working!

**Remember:**
- ✅ Only ONE email is sent (EmailJS template)
- ✅ Firebase Admin SDK generates proper verification links
- ✅ Everything is FREE (using free tiers)
- ✅ Fallback to Firebase email if backend fails

