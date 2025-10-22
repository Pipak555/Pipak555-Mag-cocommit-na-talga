# Firebase Setup Guide

## 1. Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" or select existing project
3. Enable Google Analytics (optional)

## 2. Configure Firebase Authentication
1. In Firebase Console, go to **Authentication** → **Sign-in method**
2. Enable **Email/Password** authentication
3. (Optional) Disable **Email verification** for faster testing

## 3. Create Firestore Database
1. Go to **Firestore Database** → **Create database**
2. Start in **production mode**
3. Choose your preferred location

## 4. Deploy Firestore Security Rules
1. In your project root, you'll find `firestore.rules`
2. Go to **Firestore Database** → **Rules** tab
3. Copy the content from `firestore.rules` and paste it
4. Click **Publish**

## 5. Configure Firebase Storage
1. Go to **Storage** → **Get started**
2. Start in **production mode**
3. Choose your preferred location

## 6. Deploy Storage Security Rules
1. In your project root, you'll find `storage.rules`
2. Go to **Storage** → **Rules** tab
3. Copy the content from `storage.rules` and paste it
4. Click **Publish**

## 7. Get Your Firebase Configuration
1. Go to **Project Settings** (gear icon) → **General**
2. Scroll to **Your apps** section
3. Click the web icon (`</>`) to add a web app
4. Register your app with a nickname
5. Copy the Firebase configuration object

## 8. Update Your .env File
Create a `.env` file in your project root with:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

## 9. Create Initial Admin User
After signing up your first user:
1. Go to **Firestore Database**
2. Find the `users` collection
3. Find your user document
4. Manually change the `role` field from `guest` to `admin`

## 10. Verify Setup
1. Run your app: `npm run dev`
2. Try signing up a new user
3. Check if the user appears in Firestore
4. Test creating a listing as a host
5. Test browsing listings as a guest

## Security Notes
- Never commit your `.env` file to version control
- The current role system stores roles in Firestore (readable by authenticated users)
- For production, consider using Firebase Custom Claims for roles
- Review and adjust security rules based on your specific needs

## Troubleshooting
- **Can't create listings**: Make sure your user's role is set to 'host'
- **Images not uploading**: Check storage rules are deployed
- **Can't read data**: Verify Firestore rules are published
- **Authentication errors**: Check if Email/Password is enabled
