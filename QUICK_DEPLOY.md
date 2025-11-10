# ⚡ Quick Deployment Guide

## 🚀 Fastest Way to Deploy

### For Windows:
```bash
deploy.bat
```

### For Mac/Linux:
```bash
chmod +x deploy.sh
./deploy.sh
```

### Manual Deployment (3 Steps):

1. **Set up environment variables:**
   ```bash
   # Copy the example file
   cp env.example.txt .env.production
   
   # Edit .env.production with your production values
   # (Use your text editor to fill in the actual values)
   ```

2. **Build and deploy:**
   ```bash
   npm run deploy
   ```

3. **Done!** Your app is live at: `https://mojo-dojo-casa-house-f31a5.web.app`

---

## 📋 Pre-Deployment Checklist

- [ ] `.env.production` file exists with all values filled
- [ ] Firebase CLI installed: `npm install -g firebase-tools`
- [ ] Logged into Firebase: `firebase login`
- [ ] Correct project selected: `firebase use mojo-dojo-casa-house-f31a5`
- [ ] Dependencies installed: `npm install`
- [ ] Test build works: `npm run build:prod`

---

## 🔧 Environment Variables Required

Make sure `.env.production` has these values:

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=mojo-dojo-casa-house-f31a5.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=mojo-dojo-casa-house-f31a5
VITE_FIREBASE_STORAGE_BUCKET=mojo-dojo-casa-house-f31a5.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_MEASUREMENT_ID=...
VITE_EMAILJS_PUBLIC_KEY=...
VITE_EMAILJS_SERVICE_ID=...
VITE_EMAILJS_TEMPLATE_VERIFICATION=...
VITE_EMAILJS_TEMPLATE_BOOKING=...
VITE_CLOUDINARY_CLOUD_NAME=...
VITE_CLOUDINARY_UPLOAD_PRESET=...
VITE_PAYPAL_CLIENT_ID=... (use production ID)
VITE_PAYPAL_ENV=production
VITE_USE_EMULATORS=false
```

---

## 🐛 Common Issues

**Build fails?**
```bash
rm -rf dist node_modules/.vite
npm install
npm run build:prod
```

**Deployment fails?**
```bash
firebase login --reauth
firebase use mojo-dojo-casa-house-f31a5
npm run deploy
```

**Environment variables not working?**
- Ensure file is named `.env.production` (not `.env`)
- All variables must start with `VITE_`
- Rebuild after changing: `npm run build:prod`

---

## 📚 More Details

See `DEPLOYMENT_GUIDE.md` for comprehensive instructions.

