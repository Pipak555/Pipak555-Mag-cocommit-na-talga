# StayHub - Multi-Role Booking Platform

A comprehensive booking platform with Host, Guest, and Admin portals built with React, TypeScript, and Firebase.

## 🌟 Features

### 🏠 Host Portal
- Create and manage listings (Homes, Experiences, Services)
- Upload multiple images per listing
- Manage booking requests (approve/decline)
- Real-time messaging with guests
- Track earnings and transactions
- View booking calendar

### 👤 Guest Portal
- Browse and search listings by category
- View detailed listing information with galleries
- Book listings with date selection
- Manage bookings and view history
- Leave reviews and ratings
- Favorite listings
- E-wallet for payments and deposits
- Message hosts

### 🛠️ Admin Portal
- Review and approve/reject new listings
- Manage all users and their roles
- Monitor platform activity
- Full access to bookings and transactions

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

### 4. Deploy Security Rules

The project includes pre-configured security rules:

#### Firestore Rules
1. Go to Firestore Database > Rules
2. Copy the contents of `firestore.rules` from your project root
3. Paste and publish

#### Storage Rules
1. Go to Storage > Rules
2. Copy the contents of `storage.rules` from your project root
3. Paste and publish

See `FIREBASE_SETUP.md` for detailed security rules documentation.

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
- Google OAuth sign-in support
- Role-based access control (host, guest, admin)
- Multi-role support (users can be both guest and host)
- Protected routes per user type
- Form validation with Zod schemas
- Input sanitization for security

### Firestore Collections
- `users` - User profiles with role information and wallet balance
- `listings` - Host listings with details, images, pricing, and availability
- `bookings` - Booking requests and confirmations with status tracking
- `reviews` - Guest reviews and ratings with average calculation
- `messages` - Direct messaging between users with real-time updates
- `transactions` - Wallet and payment transactions with audit trail
- `notifications` - Real-time notifications for users

### Key Features
- **Error Handling**: Error boundaries catch and display errors gracefully
- **Performance**: React.memo, useMemo, and useCallback optimizations
- **Loading States**: Skeleton loaders for better UX
- **Real-time Updates**: Firestore listeners for live data
- **Payment System**: Centralized payment service with refund support
- **Notifications**: Real-time notification system
- **Search & Filtering**: Advanced search with Firestore queries
- **Security**: Input sanitization, validation, and secure Firebase rules

## Testing

This project includes comprehensive tests using Vitest:

### Run Tests
```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage
```

### Test Coverage
- **Validation Tests**: Tests for Zod schemas (login, signup, listing forms)
- **Sanitization Tests**: Tests for input sanitization functions
- **Security Tests**: XSS prevention, input validation

### Writing Tests
Tests are located in `src/lib/__tests__/` and follow the pattern:
- `*.test.ts` - Unit tests for utility functions
- `*.test.tsx` - Component tests (when added)

## Code Quality

### Validation
- All forms use Zod schemas for validation
- Input sanitization prevents XSS attacks
- Type-safe with TypeScript

### Error Handling
- Error boundaries catch React errors
- User-friendly error messages
- Comprehensive error logging

### Performance
- React.memo for expensive components
- useMemo and useCallback for optimization
- Skeleton loaders for better UX

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
