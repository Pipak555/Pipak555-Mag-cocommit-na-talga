# 🚀 Getting Started Guide

Welcome! This guide will help you set up and deploy StayHub - a multi-role booking platform.

**Note:** The project structure, code, and configuration files are already set up. You only need to configure your own service accounts and credentials.

## 📋 Prerequisites

- Node.js 18+ installed
- A Firebase account (free tier works)
- A Cloudinary account (free tier works)
- An EmailJS account (free tier works)
- A PayPal Developer account (for payments - sandbox is free)

## 🎯 Quick Setup (3 Steps)

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Configure Your Service Accounts

You need to set up accounts and get credentials for:
- **Firebase** - Create project and get config (see `FIREBASE_SETUP.md`)
- **Cloudinary** - Create account and get upload preset (see `CLOUDINARY_SETUP.md`)
- **EmailJS** - Create account and set up templates (see `EMAILJS_SETUP.md`)
- **PayPal** - Create sandbox app and get client ID (see `PAYPAL_SANDBOX_SETUP.md`)

### Step 3: Set Up Environment Variables

1. Copy `env.example.txt` to `.env`
2. Fill in all your credentials from Step 2
3. Deploy security rules to Firebase:
   ```bash
   firebase deploy --only firestore:rules,storage:rules
   ```
4. Run the development server:
   ```bash
   npm run dev
   ```

Open http://localhost:8080 in your browser.

## 📚 Service Setup Guides

Follow these guides to set up each service:

- **`FIREBASE_SETUP.md`** - Create Firebase project, enable services, get config
- **`CLOUDINARY_SETUP.md`** - Create account, get upload preset
- **`EMAILJS_SETUP.md`** - Create account, set up email templates
- **`PAYPAL_SANDBOX_SETUP.md`** - Create sandbox app, get client ID
- **`ENABLE_GOOGLE_SIGNIN.md`** - Enable Google OAuth in Firebase

## 🚀 Deployment

The project is already configured for Firebase Hosting. To deploy:

```bash
# Deploy everything (hosting + rules + indexes)
npm run deploy:all

# Or deploy only hosting
npm run deploy
```

See `DEPLOYMENT.md` for detailed deployment instructions and `CUSTOM_DOMAIN_SETUP.md` for custom domain setup.

## 👤 Creating Your First Admin Account

1. Sign up through the Admin portal at `/admin/login`
2. Go to Firebase Console → Firestore Database
3. Find the `users` collection
4. Locate your user document
5. Manually change the `role` field to `"admin"`

## 🧪 Testing

Run tests:
```bash
npm test
```

Run tests with UI:
```bash
npm run test:ui
```


## 🔧 Troubleshooting

### Common Issues

1. **Firebase connection errors**
   - Check your `.env` file has correct Firebase config
   - Verify Firebase project is active
   - Check Firestore rules are deployed

2. **Email not sending**
   - Verify EmailJS credentials in `.env`
   - Check EmailJS template IDs match
   - Check browser console for errors

3. **Image upload fails**
   - Verify Cloudinary credentials in `.env`
   - Check upload preset is correct
   - Verify Cloudinary account is active

4. **PayPal errors**
   - Check PayPal sandbox credentials
   - Verify redirect URIs in PayPal dashboard
   - Ensure using sandbox client ID for testing

## 📝 Environment Variables

All required environment variables are listed in `env.example.txt`. Copy it to `.env` and fill in your credentials:

- `VITE_FIREBASE_*` - From Firebase Console (Project Settings)
- `VITE_CLOUDINARY_*` - From Cloudinary Dashboard
- `VITE_EMAILJS_*` - From EmailJS Dashboard
- `VITE_PAYPAL_*` - From PayPal Developer Dashboard

## 🆘 Need Help?

1. Check the detailed setup guides in the root directory
2. Review Firebase Console for errors
3. Check browser console for client-side errors
4. Verify all environment variables are set correctly

## 📄 License

MIT License - feel free to use this project for learning or commercial purposes.

