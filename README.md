# StayHub - Firebase Hosting Platform

A complete web application with Host, Guest, and Admin dashboards built using Firebase Free Plan (Spark).

## Features

### 🏠 Host Portal
- Email authentication
- Create and manage listings (Homes, Experiences, Services)
- Save drafts
- Real-time messaging with guests
- Calendar management
- Payment tracking (simulated)
- Points & rewards system

### 👤 Guest Portal
- Browse listings by category
- Search and filter functionality
- Favorites/wishlist
- Booking management
- E-wallet (simulated)
- Personalized recommendations
- Social sharing

### 🛠️ Admin Portal
- Platform analytics dashboard
- User management
- Listing moderation
- Payment approval system
- Policy management
- Report generation

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **UI**: TailwindCSS + shadcn/ui components
- **Backend**: Firebase (Auth, Firestore, Storage, Hosting)
- **State Management**: React Query
- **Routing**: React Router v6

## Firebase Setup

### 1. Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add Project"
3. Follow the setup wizard
4. Stay on the **Spark (Free) Plan**

### 2. Enable Firebase Services

#### Authentication
1. Go to Authentication > Sign-in method
2. Enable "Email/Password" provider

#### Firestore Database
1. Go to Firestore Database
2. Click "Create database"
3. Start in **production mode**
4. Choose your location

#### Storage
1. Go to Storage
2. Click "Get started"
3. Use default security rules

### 3. Configure Environment Variables

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Get your Firebase config:
   - Go to Project Settings > General
   - Scroll to "Your apps"
   - Click the web icon `</>` to create a web app
   - Copy the configuration values

3. Update `.env` with your Firebase config:
   ```env
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   ```

### 4. Set Up Firestore Security Rules

Go to Firestore Database > Rules and add:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // User profiles
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Listings
    match /listings/{listingId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && request.resource.data.hostId == request.auth.uid;
      allow update, delete: if request.auth != null && resource.data.hostId == request.auth.uid;
    }
    
    // Messages
    match /messages/{threadId}/messages/{messageId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
    }
    
    // Admin-only collections
    match /policies/{policyId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
  }
}
```

### 5. Set Up Storage Rules

Go to Storage > Rules and add:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /listings/{listingId}/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
    
    match /users/{userId}/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## Installation

1. Clone the repository:
   ```bash
   git clone <YOUR_GIT_URL>
   cd <YOUR_PROJECT_NAME>
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables (see Firebase Setup above)

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open http://localhost:8080 in your browser

## Creating Your First Admin Account

1. Sign up through the Admin portal at `/admin/login`
2. Go to Firebase Console > Firestore Database
3. Find the `users` collection
4. Locate your user document
5. Manually change the `role` field to `"admin"`

## Project Structure

```
src/
├── assets/          # Images and static files
├── components/      # Reusable UI components
│   └── ui/         # shadcn/ui components
├── contexts/       # React contexts (Auth)
├── lib/            # Utilities and Firebase config
├── pages/          # Route pages
│   ├── auth/       # Login pages
│   ├── host/       # Host dashboard
│   ├── guest/      # Guest dashboard
│   └── admin/      # Admin dashboard
└── App.tsx         # Main app component
```

## Key Features Implementation

### Authentication
- Email/password authentication via Firebase Auth
- Role-based access control (host, guest, admin)
- Protected routes per user type

### Firestore Collections
- `users` - User profiles with role information
- `listings` - Host listings with category, pricing, location
- `bookings` - Guest bookings with payment status
- `messages` - Real-time chat threads
- `policies` - Admin-managed platform policies

### Client-Side Features
- Simulated payment processing
- Points & rewards system
- E-wallet balance tracking
- Favorites/wishlist management
- AI-assisted listing descriptions (optional)

## Testing

Run tests with:
```bash
npm test
```

## Deployment

### Deploy to Firebase Hosting

1. Install Firebase CLI:
   ```bash
   npm install -g firebase-tools
   ```

2. Login to Firebase:
   ```bash
   firebase login
   ```

3. Initialize Firebase Hosting:
   ```bash
   firebase init hosting
   ```
   - Select your project
   - Set `dist` as the public directory
   - Configure as a single-page app: Yes
   - Don't overwrite index.html

4. Build and deploy:
   ```bash
   npm run build
   firebase deploy
   ```

## Free Tier Limits

Firebase Spark Plan includes:
- Firestore: 1 GB storage, 10 GB/month network
- Storage: 5 GB storage, 1 GB/day downloads
- Authentication: Unlimited users
- Hosting: 10 GB storage, 360 MB/day bandwidth

## Support

For issues or questions:
- Check [Firebase Documentation](https://firebase.google.com/docs)
- Review Firestore security rules
- Ensure environment variables are set correctly

## License

MIT License - feel free to use this project for learning or commercial purposes.
