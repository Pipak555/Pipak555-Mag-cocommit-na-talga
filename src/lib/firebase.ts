import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';

// Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "auth.firebnb.com", // Use custom domain
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app, 'us-central1');

// Connect to emulators in development mode (localhost only)
// This ensures local testing doesn't affect your deployed Firebase project
// Set VITE_USE_EMULATORS=true in your .env file to enable emulator mode
if (import.meta.env.DEV && import.meta.env.VITE_USE_EMULATORS === 'true') {
  console.log('🔥 Connecting to Firebase Emulators (Local Testing Mode)');
  
  try {
    // Connect Auth emulator
    try {
      connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
      console.log('✅ Auth emulator connected on port 9099');
    } catch (error: any) {
      if (error.message?.includes('already been initialized')) {
        console.log('✅ Auth emulator already connected');
      } else {
        console.warn('⚠️  Auth emulator connection issue:', error.message);
      }
    }
    
    // Connect Firestore emulator
    try {
      connectFirestoreEmulator(db, 'localhost', 8080);
      console.log('✅ Firestore emulator connected on port 8080');
    } catch (error: any) {
      if (error.message?.includes('already been initialized')) {
        console.log('✅ Firestore emulator already connected');
      } else {
        console.warn('⚠️  Firestore emulator connection issue:', error.message);
      }
    }
    
    // Connect Storage emulator
    try {
      connectStorageEmulator(storage, 'localhost', 9199);
      console.log('✅ Storage emulator connected on port 9199');
    } catch (error: any) {
      if (error.message?.includes('already been initialized')) {
        console.log('✅ Storage emulator already connected');
      } else {
        console.warn('⚠️  Storage emulator connection issue:', error.message);
      }
    }
    
    // Connect Functions emulator
    try {
      connectFunctionsEmulator(functions, 'localhost', 5001);
      console.log('✅ Functions emulator connected on port 5001');
    } catch (error: any) {
      if (error.message?.includes('already been initialized')) {
        console.log('✅ Functions emulator already connected');
      } else {
        console.warn('⚠️  Functions emulator connection issue:', error.message);
      }
    }
    
    console.log('📍 Emulator UI: http://localhost:4000');
  } catch (error) {
    console.error('❌ Error connecting to emulators:', error);
  }
} else if (import.meta.env.DEV) {
  console.log('ℹ️  Running in development mode - using LIVE Firebase project');
  console.log('   To use emulators, add VITE_USE_EMULATORS=true to your .env file');
}

export default app;