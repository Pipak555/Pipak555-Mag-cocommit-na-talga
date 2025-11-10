# 🚀 Complete Firebase Deployment Guide

This guide will help you deploy your application to Firebase Hosting with full optimization, ensuring it works exactly like your local environment.

## 📋 Prerequisites

1. **Firebase CLI installed and logged in**
   ```bash
   npm install -g firebase-tools
   firebase login
   ```

2. **Node.js and npm installed** (you already have this)

3. **Firebase project set up** (already configured: `mojo-dojo-casa-house-f31a5`)

## 🔧 Step 1: Environment Variables Setup

Your app uses environment variables. For production deployment, you have two options:

### Option A: Build-time Environment Variables (Recommended)

Create a `.env.production` file in your project root with your production values:

```bash
# .env.production
VITE_FIREBASE_API_KEY=your_production_api_key
VITE_FIREBASE_AUTH_DOMAIN=mojo-dojo-casa-house-f31a5.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=mojo-dojo-casa-house-f31a5
VITE_FIREBASE_STORAGE_BUCKET=mojo-dojo-casa-house-f31a5.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX

# EmailJS Configuration
VITE_EMAILJS_PUBLIC_KEY=your_emailjs_public_key
VITE_EMAILJS_SERVICE_ID=your_service_id
VITE_EMAILJS_TEMPLATE_VERIFICATION=your_template_id
VITE_EMAILJS_TEMPLATE_BOOKING=your_booking_template_id

# Cloudinary Configuration
VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
VITE_CLOUDINARY_UPLOAD_PRESET=your_upload_preset

# PayPal Configuration (use production client ID for live)
VITE_PAYPAL_CLIENT_ID=your_production_paypal_client_id
VITE_PAYPAL_ENV=production

# Emulator Mode (MUST be false for production)
VITE_USE_EMULATORS=false
```

**⚠️ Important:** Add `.env.production` to `.gitignore` to keep your secrets safe!

### Option B: Firebase Hosting Environment Variables (Alternative)

If you prefer to use Firebase Hosting's environment variables, you'll need to use Firebase Functions or a different approach, as Vite needs build-time variables.

## 🏗️ Step 2: Pre-Deployment Checklist

Before deploying, ensure:

- [ ] All environment variables are set in `.env.production`
- [ ] Firebase project is correct in `.firebaserc`
- [ ] Firestore rules are deployed (if changed)
- [ ] Storage rules are deployed (if changed)
- [ ] All dependencies are installed: `npm install`
- [ ] Local build works: `npm run build:prod`

## 🚀 Step 3: Build for Production

Build your optimized production bundle:

```bash
npm run build:prod
```

This will:
- ✅ Minify and optimize all code
- ✅ Remove console logs and debuggers
- ✅ Split code into optimized chunks
- ✅ Compress assets
- ✅ Generate production-ready files in `dist/` folder

**Verify the build:**
```bash
# Preview the production build locally
npm run preview
```

Visit `http://localhost:4173` to test your production build locally.

## 📦 Step 4: Deploy to Firebase

### Deploy Only Hosting (Recommended for quick updates)

```bash
npm run deploy
```

This will:
1. Build the production bundle
2. Deploy to Firebase Hosting

### Deploy Everything (Hosting + Firestore Rules + Storage Rules)

```bash
npm run deploy:all
```

This will deploy:
- Hosting (your app)
- Firestore rules
- Firestore indexes
- Storage rules

## 🔍 Step 5: Verify Deployment

After deployment, Firebase will provide you with a URL like:
```
https://mojo-dojo-casa-house-f31a5.web.app
```

**Checklist:**
- [ ] App loads correctly
- [ ] Authentication works
- [ ] Database operations work
- [ ] File uploads work
- [ ] All pages are accessible
- [ ] Mobile responsiveness works
- [ ] No console errors

## 🎯 Step 6: Custom Domain (Optional)

If you have a custom domain, follow the `CUSTOM_DOMAIN_SETUP.md` guide.

## 🔄 Step 7: Continuous Deployment (Optional)

For automatic deployments on git push, you can set up GitHub Actions or use Firebase Hosting GitHub integration.

## 🐛 Troubleshooting

### Build Fails
```bash
# Clear cache and rebuild
rm -rf dist node_modules/.vite
npm run build:prod
```

### Environment Variables Not Working
- Ensure `.env.production` exists and has correct values
- Check that variable names start with `VITE_`
- Rebuild after changing environment variables

### Deployment Fails
```bash
# Check Firebase login
firebase login --reauth

# Check project
firebase projects:list
firebase use mojo-dojo-casa-house-f31a5

# Try deploying again
npm run deploy
```

### App Works Locally But Not in Production
1. Check browser console for errors
2. Verify environment variables are set correctly
3. Check Firebase console for any quota/limit issues
4. Verify Firestore/Storage rules allow your operations

### Performance Issues
- Check Network tab in DevTools
- Verify assets are being cached (check Cache-Control headers)
- Use Lighthouse to audit performance
- Check bundle sizes in build output

## 📊 Post-Deployment Optimization

1. **Enable Firebase Performance Monitoring** (if not already enabled)
2. **Set up Firebase Analytics** (already configured with measurementId)
3. **Monitor Firebase Console** for errors and usage
4. **Set up alerts** for quota limits

## 🔐 Security Checklist

- [ ] `.env.production` is in `.gitignore`
- [ ] No API keys in source code
- [ ] Firestore rules are restrictive
- [ ] Storage rules are restrictive
- [ ] HTTPS is enforced (Firebase does this automatically)
- [ ] Security headers are set (already configured in firebase.json)

## 📝 Quick Deploy Commands

```bash
# Quick deploy (build + deploy hosting)
npm run deploy

# Full deploy (everything)
npm run deploy:all

# Build only (test locally)
npm run build:prod && npm run preview

# Deploy only Firestore rules
firebase deploy --only firestore:rules

# Deploy only Storage rules
firebase deploy --only storage:rules
```

## 🎉 Success!

Your app should now be live and fully optimized! The deployment includes:
- ✅ Optimized code splitting
- ✅ Minified assets
- ✅ Proper caching headers
- ✅ Security headers
- ✅ Mobile optimizations
- ✅ Production-ready build

---

**Need Help?** Check the other documentation files:
- `FIREBASE_SETUP.md` - Initial Firebase setup
- `CUSTOM_DOMAIN_SETUP.md` - Custom domain configuration
- `DEPLOYMENT_CHECKLIST.md` - Detailed checklist

