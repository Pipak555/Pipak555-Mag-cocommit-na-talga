# Firebase Deployment Checklist

## Issues That Work on Localhost But Not on Deployed Firebase

### 1. ❌ Environment Variables Not Available
**Problem**: Vite environment variables (`VITE_*`) are bundled at BUILD time, not runtime.

**Solution**: 
```bash
# Before deploying, ensure ALL environment variables are in your .env file
# Then build for production:
npm run build:prod

# The build process will inject these values into your code
```

**Required Environment Variables:**
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_MEASUREMENT_ID`
- `VITE_EMAILJS_PUBLIC_KEY`
- `VITE_EMAILJS_SERVICE_ID`
- `VITE_EMAILJS_TEMPLATE_VERIFICATION`
- `VITE_EMAILJS_TEMPLATE_BOOKING`
- `VITE_CLOUDINARY_CLOUD_NAME`
- `VITE_CLOUDINARY_UPLOAD_PRESET`
- `VITE_PAYPAL_CLIENT_ID`
- `VITE_PAYPAL_ENV`

### 2. ❌ Google Sign-In Not Enabled
**Problem**: Google Sign-In provider disabled in Firebase Console

**Solution:**
1. Go to Firebase Console > Authentication > Sign-in method
2. Enable "Google" provider
3. Add support email
4. Save

### 3. ❌ Authorized Domains Not Set
**Problem**: OAuth domains not authorized

**Solution:**
1. Go to Firebase Console > Authentication > Settings > Authorized domains
2. Add these domains:
   - `localhost`
   - `your-project.firebaseapp.com`
   - `your-project.web.app`
3. Save

### 4. ✅ Console Logs (Already Fixed)
Console logs are automatically removed in production builds via Vite config.

### 5. ✅ Emulator Configuration (Already Fixed)
Emulators only connect when `VITE_USE_EMULATORS=true` in development mode.

### 6. ❌ EmailJS Configuration
**Problem**: EmailJS templates and service might not be properly configured

**Solution:**
1. Go to EmailJS Dashboard
2. Create/verify these templates:
   - Verification OTP template
   - Booking confirmation template
3. Copy template IDs to `.env`
4. Rebuild: `npm run build:prod`

### 7. ❌ Cloudinary Configuration
**Problem**: Image uploads might fail if Cloudinary isn't configured

**Solution:**
1. Go to Cloudinary Dashboard
2. Get your Cloud Name and Upload Preset
3. Add to `.env`:
   ```
   VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
   VITE_CLOUDINARY_UPLOAD_PRESET=your_upload_preset
   ```
4. Rebuild: `npm run build:prod`

### 8. ✅ Asset Paths (Already Correct)
Videos and images use relative paths (`/videos/`, `/logo.png`) which work correctly on Firebase Hosting.

### 9. ❌ Firestore Indexes
**Problem**: Composite queries might fail without indexes

**Solution:**
```bash
# Deploy Firestore indexes
firebase deploy --only firestore:indexes
```

### 10. ❌ Firestore Security Rules
**Problem**: Security rules might be outdated

**Solution:**
```bash
# Deploy security rules
firebase deploy --only firestore:rules
```

## Complete Deployment Process

### Step 1: Environment Variables
```bash
# 1. Copy .env.example to .env
cp .env.example .env

# 2. Fill in ALL values in .env file
# (Use your actual Firebase, EmailJS, Cloudinary credentials)
```

### Step 2: Firebase Console Configuration
1. **Enable Google Sign-In**:
   - Authentication > Sign-in method > Google > Enable

2. **Add Authorized Domains**:
   - Authentication > Settings > Authorized domains
   - Add: `localhost`, `your-project.firebaseapp.com`, `your-project.web.app`

3. **Verify Firestore**:
   - Firestore Database should be created
   - Check that collections exist: `users`, `listing`, `bookings`, `messages`, etc.

### Step 3: Build and Deploy
```bash
# 1. Install dependencies
npm install

# 2. Build for production (injects env vars)
npm run build:prod

# 3. Deploy everything
npm run deploy:all

# OR deploy only hosting
npm run deploy
```

### Step 4: Test on Deployed Version
1. Open: `https://your-project.web.app`
2. Test these features:
   - ✅ Sign up with email
   - ✅ Sign in with email
   - ✅ Google sign-in/signup autofill
   - ✅ Email verification (OTP)
   - ✅ Create listing (image upload)
   - ✅ Browse listings
   - ✅ Make booking
   - ✅ Send message
   - ✅ Payment/wallet
   - ✅ Notifications

## Common Issues After Deployment

### Issue: "Firebase: Error (auth/operation-not-allowed)"
**Fix**: Enable Google Sign-In provider in Firebase Console

### Issue: "This domain is not authorized for OAuth"
**Fix**: Add domain to Authorized domains in Firebase Console

### Issue: Images/Videos not loading
**Fix**: 
- Ensure files are in `public/` folder before build
- Check `firebase.json` hosting config
- Verify `dist/` folder contains assets after build

### Issue: Environment variables undefined
**Fix**: 
- Verify `.env` file has all VITE_* variables
- Rebuild: `npm run build:prod`
- Redeploy: `npm run deploy`

### Issue: EmailJS not sending emails
**Fix**:
- Verify VITE_EMAILJS_* variables in `.env`
- Check EmailJS dashboard for template IDs
- Verify service is active
- Rebuild and redeploy

### Issue: Firestore permission denied
**Fix**:
- Deploy security rules: `firebase deploy --only firestore:rules`
- Check rules in `firestore.rules`

### Issue: Missing indexes error
**Fix**:
- Deploy indexes: `firebase deploy --only firestore:indexes`
- Or click the link in Firebase console error message

## Verification Commands

```bash
# Check if .env has all required variables
grep "^VITE_" .env | wc -l  # Should be 16+

# Build and check for errors
npm run build:prod

# Check dist folder size
du -sh dist/

# Test locally before deploying
npm run preview

# Deploy
npm run deploy
```

## Quick Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| Google sign-in fails | Provider not enabled | Enable in Console |
| Domain not authorized | OAuth domains missing | Add to Authorized domains |
| Images not uploading | Cloudinary config missing | Add to .env & rebuild |
| Emails not sending | EmailJS config missing | Add to .env & rebuild |
| Firestore errors | Rules/indexes not deployed | Deploy rules & indexes |
| Features work locally but not deployed | Env vars not in build | Rebuild with .env filled |

## Post-Deployment Checklist

- [ ] Google Sign-In enabled in Firebase Console
- [ ] All domains added to Authorized domains
- [ ] .env file has ALL required variables
- [ ] Built with `npm run build:prod`
- [ ] Deployed with `npm run deploy:all`
- [ ] Firestore rules deployed
- [ ] Firestore indexes deployed
- [ ] Tested on deployed URL
- [ ] All features working (auth, booking, messages, payments)
