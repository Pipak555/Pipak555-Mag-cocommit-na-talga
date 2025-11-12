import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { 
  User, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  sendEmailVerification,
  applyActionCode,
  checkActionCode,
  confirmPasswordReset,
  sendPasswordResetEmail,
  signInWithPopup,
  GoogleAuthProvider
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { sendOTPEmail, sendPasswordResetEmail as sendPasswordResetEmailJS } from '@/lib/emailjs';
import { createOTP, verifyOTP, resendOTP } from '@/lib/firestore';
import { toast } from 'sonner';

// Helper function to translate Firebase errors into user-friendly messages
const getAuthErrorMessage = (error: any): string => {
  const code = error?.code || '';
  const message = error?.message || '';

  // Firebase Auth error codes
  switch (code) {
    case 'auth/user-not-found':
      return 'No account found with this email address. Please check your email or sign up for a new account.';
    
    case 'auth/wrong-password':
      return 'The password you entered is incorrect. Please try again or use "Forgot Password" to reset it.';
    
    case 'auth/invalid-credential':
      return 'Invalid email or password. Please check your credentials and try again.';
    
    case 'auth/invalid-email':
      return 'The email address you entered is not valid. Please check and try again.';
    
    case 'auth/email-already-in-use':
      return 'This email address is already registered. Please sign in instead, or use a different email address.';
    
    case 'auth/weak-password':
      return 'Your password is too weak. Please use at least 8 characters.';
    
    case 'auth/too-many-requests':
      return 'Too many failed login attempts. Please wait a few minutes and try again, or reset your password.';
    
    case 'auth/network-request-failed':
      return 'Unable to connect to the server. Please check your internet connection and try again.';
    
    case 'auth/operation-not-allowed':
      return 'This sign-in method is not enabled. Please contact support for assistance.';
    
    case 'auth/user-disabled':
      return 'This account has been disabled. Please contact support for assistance.';
    
    case 'auth/requires-recent-login':
      return 'For security reasons, please sign out and sign in again before making this change.';
    
    case 'auth/popup-closed-by-user':
      return 'The sign-in window was closed. Please try again and complete the sign-in process.';
    
    case 'auth/popup-blocked':
      return 'Your browser blocked the sign-in window. Please allow popups for this site and try again.';
    
    case 'auth/cancelled-popup-request':
      return 'A sign-in request is already in progress. Please wait for it to complete.';
    
    case 'auth/account-exists-with-different-credential':
      return 'An account already exists with this email using a different sign-in method. Please sign in with your email and password instead.';
    
    case 'auth/unauthorized-domain':
      const currentDomain = typeof window !== 'undefined' ? window.location.hostname : 'this domain';
      return `This domain (${currentDomain}) is not authorized for Google sign-in. Please add it to Firebase Console > Authentication > Settings > Authorized domains, or contact support.`;
    
    case 'auth/invalid-action-code':
      return 'This verification link has expired or is invalid. Please request a new verification code.';
    
    case 'auth/expired-action-code':
      return 'This verification link has expired. Please request a new verification code.';
    
    default:
      // If there's already a user-friendly message, use it
      if (message && !message.includes('auth/')) {
        return message;
      }
      // Otherwise provide a generic friendly message
      return 'Something went wrong. Please try again, or contact support if the problem persists.';
  }
};

interface AuthContextType {
  user: User | null;
  userRole: 'host' | 'guest' | 'admin' | null;
  userProfile: any | null;
  loading: boolean;
  hasRole: (role: 'host' | 'guest' | 'admin') => boolean;
  signIn: (email: string, password: string, role: 'host' | 'guest' | 'admin') => Promise<void>;
  signInWithGoogle: (role: 'host' | 'guest' | 'admin', policyData?: { policyAccepted: boolean; policyAcceptedDate: string }) => Promise<void>;
  signUp: (email: string, password: string, fullName: string, role: 'host' | 'guest' | 'admin', policyData?: { policyAccepted: boolean; policyAcceptedDate: string }) => Promise<void>;
  signOut: () => Promise<void>;
  sendVerificationEmail: () => Promise<void>;
  verifyEmail: (actionCode: string) => Promise<void>;
  sendOTP: () => Promise<void>;
  verifyOTPCode: (otpCode: string) => Promise<boolean>;
  sendPasswordReset: (email: string) => Promise<void>;
  resetPassword: (actionCode: string, newPassword: string) => Promise<void>;
  refreshUserProfile: () => Promise<void>;
  addRole: (role: 'host' | 'guest' | 'admin', policyData?: { policyAccepted: boolean; policyAcceptedDate: string }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<'host' | 'guest' | 'admin' | null>(null);
  const [userProfile, setUserProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      
      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          // Support both old (single role) and new (multiple roles) format
          setUserRole(userData.role || (userData.roles && userData.roles[0]) || null);
          setUserProfile(userData);
        }
      } else {
        setUserRole(null);
        setUserProfile(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string, role: 'host' | 'guest' | 'admin') => {
    try {
      // Log attempt for debugging (only in development)
      if (import.meta.env.DEV) {
        console.log(`[Auth] Sign in attempt for role: ${role}, email: ${email}`);
      }
      
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      if (import.meta.env.DEV) {
        console.log(`[Auth] Firebase auth successful, fetching user doc for: ${userCredential.user.uid}`);
      }
      
      const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
      
      if (!userDoc.exists()) {
        if (import.meta.env.DEV) {
          console.error(`[Auth] User document not found for uid: ${userCredential.user.uid}`);
        }
        await firebaseSignOut(auth);
        throw new Error('Your account was not found. Please sign up first or contact support if you believe this is an error.');
      }

      const userData = userDoc.data();
      
      if (import.meta.env.DEV) {
        console.log(`[Auth] User data retrieved:`, { 
          roles: userData.roles || userData.role, 
          emailVerified: userData?.emailVerified 
        });
      }
      
      // Support both old (single role) and new (multiple roles) format
      const userRoles = userData.roles || (userData.role ? [userData.role] : []);
      
      // Admin cannot be guest or host, and vice versa
      if (role === 'admin') {
        // Admin must only be admin
        if (!userRoles.includes('admin')) {
          if (import.meta.env.DEV) {
            console.error(`[Auth] Admin access denied. User roles:`, userRoles);
          }
          await firebaseSignOut(auth);
          throw new Error('Admin access denied. This account does not have admin privileges.');
        }
      } else {
        // Check if user has this role - if not, they need to sign up for it
        // Allow admins to also sign in as guest or host if they have those roles
        if (!userRoles.includes(role)) {
          if (import.meta.env.DEV) {
            console.error(`[Auth] User does not have ${role} role. User roles:`, userRoles);
          }
          await firebaseSignOut(auth);
          const roleName = role === 'guest' ? 'guest' : 'host';
          throw new Error(`This account is not registered as a ${roleName}. Please sign up for a ${roleName} account first, or sign in with an account that has ${roleName} access.`);
        }
      }
      
      // User has the required role, update the primary role
      if (userData.role !== role) {
        await updateDoc(doc(db, 'users', userCredential.user.uid), {
          role: role,
        });
      }
      setUserRole(role);
      setUserProfile({ ...userData, role });

      if (import.meta.env.DEV) {
        console.log(`[Auth] Sign in successful for role: ${role}`);
      }
    } catch (error: any) {
      // Log error for debugging (only in development)
      if (import.meta.env.DEV) {
        console.error(`[Auth] Sign in error:`, {
          code: error.code,
          message: error.message,
          role: role,
          email: email
        });
      }
      
      // Handle Firebase Auth errors
      if (error.code && error.code.startsWith('auth/')) {
        throw new Error(getAuthErrorMessage(error));
      }
      // Re-throw custom errors
      throw error;
    }
  };

  const signInWithGoogle = async (role: 'host' | 'guest' | 'admin', policyData?: { policyAccepted: boolean; policyAcceptedDate: string }) => {
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('email');
      provider.addScope('profile');
      // Set custom parameters for better UX
      provider.setCustomParameters({
        prompt: 'select_account'
      });
      
      let userCredential;
      try {
        userCredential = await signInWithPopup(auth, provider);
      } catch (popupError: any) {
        // If popup is blocked or fails, try redirect method
        if (popupError.code === 'auth/popup-blocked' || popupError.code === 'auth/popup-closed-by-user') {
          throw new Error('Popup was blocked or closed. Please allow popups and try again.');
        }
        // Check for domain authorization error
        if (popupError.message?.includes('not authorized for OAuth') || 
            popupError.code === 'auth/unauthorized-domain' ||
            popupError.code === 'auth/operation-not-allowed') {
          const currentDomain = window.location.hostname;
          const currentPort = window.location.port ? `:${window.location.port}` : '';
          const fullDomain = `${currentDomain}${currentPort}`;
          
          const errorMessage = `This domain (${fullDomain}) is not authorized for Google sign-in.\n\n` +
            `To fix this:\n` +
            `1. Go to Firebase Console (https://console.firebase.google.com)\n` +
            `2. Select your project\n` +
            `3. Go to Authentication > Settings > Authorized domains\n` +
            `4. Click "Add domain"\n` +
            `5. Add: ${currentDomain}\n` +
            `6. If using a port, also add: ${fullDomain}\n` +
            `7. Wait a few minutes for changes to take effect\n\n` +
            `Note: For local development, you can also use 'localhost' which is usually pre-authorized.`;
          
          console.error('Google OAuth Domain Error:', errorMessage);
          throw new Error(errorMessage);
        }
        throw popupError;
      }
      const user = userCredential.user;
      
      // Check if user already exists in Firestore
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      if (userDoc.exists()) {
        // User exists - check if they have this role
        const userData = userDoc.data();
        const userRoles = userData.roles || (userData.role ? [userData.role] : []);
        
        // Admin cannot be guest or host, and vice versa
        if (role === 'admin') {
          // Admin must only be admin
          if (!userRoles.includes('admin')) {
            await firebaseSignOut(auth);
            throw new Error('Admin access denied. This account does not have admin privileges.');
          }
        } else {
          // Check if user has this role - if not, they need to sign up for it
          // Allow admins to also sign in as guest or host if they have those roles
          if (!userRoles.includes(role)) {
            await firebaseSignOut(auth);
            const roleName = role === 'guest' ? 'guest' : 'host';
            throw new Error(`This account is not registered as a ${roleName}. Please sign up for a ${roleName} account first, or sign in with an account that has ${roleName} access.`);
          }
        }
        
        // User has the required role, update profile info
        const updates: any = {};
        
        // Update primary role if different
        if (userData.role !== role) {
          updates.role = role;
        }
        
        // Google sign-in auto-verifies email, so mark as verified
        if (!userData.emailVerified) {
          updates.emailVerified = true;
          updates.emailVerifiedAt = new Date().toISOString();
        }
        
        // Update user profile with latest Google info if needed
        if (user.displayName && user.displayName !== userData.fullName) {
          updates.fullName = user.displayName;
        }
        if (user.photoURL && !userData.photoURL) {
          updates.photoURL = user.photoURL;
        }
        
        if (Object.keys(updates).length > 0) {
          await updateDoc(doc(db, 'users', user.uid), updates);
          // Update local state
          setUserRole(role);
          setUserProfile({ ...userData, ...updates });
        } else {
          setUserRole(role);
          setUserProfile(userData);
        }
      } else {
        // New user - create profile in Firestore
        const fullName = user.displayName || user.email?.split('@')[0] || 'User';
        
        // For hosts, check if policy was accepted
        let finalPolicyData = policyData;
        if (role === 'host') {
          // Use provided policyData if available, otherwise check sessionStorage
          if (!finalPolicyData) {
            const policyAccepted = sessionStorage.getItem('hostPolicyAccepted');
            if (policyAccepted) {
              const policyAcceptedDate = sessionStorage.getItem('hostPolicyAcceptedDate');
              finalPolicyData = {
                policyAccepted: true,
                policyAcceptedDate: policyAcceptedDate || new Date().toISOString()
              };
              sessionStorage.removeItem('hostPolicyAccepted');
              sessionStorage.removeItem('hostPolicyAcceptedDate');
            } else {
              await firebaseSignOut(auth);
              throw new Error('To create a host account, you must first read and accept our policies and compliance terms. Please go back and accept them before signing up.');
            }
          }
        }
        
        const userData: any = {
          email: user.email || '',
          fullName,
          role,
          roles: [role], // Initialize with the role they're signing up with
          createdAt: new Date().toISOString(),
          points: 0,
          walletBalance: 0,
          favorites: [],
          wishlist: [],
          emailVerified: true, // Google accounts are automatically verified
          emailVerifiedAt: new Date().toISOString(),
        };
        
        // Initialize host points if user is signing up as host
        if (role === 'host') {
          userData.hostPoints = 0;
        }
        
        // Add profile photo if available
        if (user.photoURL) {
          userData.photoURL = user.photoURL;
        }
        
        if (finalPolicyData) {
          userData.policyAccepted = finalPolicyData.policyAccepted;
          userData.policyAcceptedDate = finalPolicyData.policyAcceptedDate;
        }
        
        await setDoc(doc(db, 'users', user.uid), userData);
        
        setUserRole(role);
        setUserProfile(userData);
      }
    } catch (error: any) {
      // Handle Firebase errors with user-friendly messages
      if (error.code && error.code.startsWith('auth/')) {
        throw new Error(getAuthErrorMessage(error));
      }
      // Re-throw custom errors (already user-friendly)
      throw error;
    }
  };

  const signUp = async (email: string, password: string, fullName: string, role: 'host' | 'guest' | 'admin', policyData?: { policyAccepted: boolean; policyAcceptedDate: string }) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      const userData: any = {
        email,
        fullName,
        role,
        roles: [role], // Initialize with the role they're signing up with
        createdAt: new Date().toISOString(),
        walletBalance: 0,
        // Initialize guest-specific data
        points: 0,
        favorites: [],
        wishlist: [],
        // Initialize host-specific data if signing up as host
        ...(role === 'host' ? {
          hostPoints: 0,
          hostFavorites: [],
          hostWishlist: []
        } : {}),
        // Initialize guest-specific arrays if signing up as guest
        ...(role === 'guest' ? {
          coupons: []
        } : {})
      };
      
      // Add host policy data if provided
      if (role === 'host') {
        // hostPoints already added above
      }
      
      // Add policy acceptance data for hosts
      if (role === 'host' && policyData) {
        userData.policyAccepted = policyData.policyAccepted;
        userData.policyAcceptedDate = policyData.policyAcceptedDate;
      }
      
      await setDoc(doc(db, 'users', userCredential.user.uid), userData);
      
      // Generate and send OTP via EmailJS
      try {
        const otpCode = await createOTP(userCredential.user.uid, email);
        console.log('🔐 OTP generated:', otpCode);
        
        const emailSent = await sendOTPEmail(email, fullName, otpCode, role);
        
        if (emailSent) {
          console.log('✅ OTP verification email sent via EmailJS');
          toast.success('Verification code sent! Check your email.');
        } else {
          // EmailJS failed - show OTP in console for development
          console.error('❌ Failed to send OTP email via EmailJS');
          console.warn('⚠️ EmailJS not configured. Your OTP code is:', otpCode);
          console.warn('⚠️ Copy this code and enter it on the verification page.');
          toast.warning(`Email service not configured. Check console for OTP code: ${otpCode}`, {
            duration: 10000,
          });
          // Don't throw error - let user continue but they need to use resend
        }
      } catch (error: any) {
        console.error('❌ Error in OTP email flow:', error);
        // If OTP was created, show it in console
        try {
          const otpCode = await createOTP(userCredential.user.uid, email);
          console.warn('⚠️ Your OTP code is:', otpCode);
          toast.warning(`Check console for your verification code: ${otpCode}`, {
            duration: 10000,
          });
        } catch (otpError) {
          toast.error('Failed to generate verification code. Please try again.');
        }
        // Don't throw - user is created, they can use resend button
      }
      
      setUserRole(role);
      setUserProfile(userData);
    } catch (error: any) {
      // Handle email already in use error
      if (error.code === 'auth/email-already-in-use') {
        // Try to sign in with the provided credentials to add the new role
        try {
          const userCredential = await signInWithEmailAndPassword(auth, email, password);
          const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            const isEmailVerified = userData?.emailVerified === true;
            const userRoles = userData.roles || (userData.role ? [userData.role] : []);
            
            // Admin cannot be guest or host, and vice versa
            if (role === 'admin') {
              if (!userRoles.includes('admin')) {
                await firebaseSignOut(auth);
                throw new Error('Admin access denied. This account does not have admin privileges.');
              }
              await firebaseSignOut(auth);
              throw new Error('This email is already registered with an admin account. Please sign in instead.');
            } else {
              if (userRoles.includes('admin')) {
                await firebaseSignOut(auth);
                throw new Error('Admin accounts cannot sign up as guest or host. Please use the admin login page.');
              }
            }
            
            if (!isEmailVerified) {
              // Account exists but not verified - resend OTP and add role if needed
              try {
                const otpCode = await createOTP(userCredential.user.uid, email);
                const emailSent = await sendOTPEmail(email, userData.fullName || fullName, otpCode, role);
                
                if (!emailSent) {
                  console.warn('⚠️ EmailJS not configured. Your OTP code is:', otpCode);
                  toast.warning(`Email service not configured. Check console for OTP code: ${otpCode}`, {
                    duration: 10000,
                  });
                }
                
                // Add the new role if they don't have it
                if (!userRoles.includes(role)) {
                  const updateData: any = {
                    roles: [...userRoles, role],
                    role: role, // Update primary role to the new one
                  };
                  
                  // If signing up as host, initialize host-specific data
                  if (role === 'host') {
                    updateData.hostPoints = 0;
                    updateData.hostFavorites = [];
                    updateData.hostWishlist = [];
                    // Add policy data if provided
                    if (policyData) {
                      updateData.policyAccepted = policyData.policyAccepted;
                      updateData.policyAcceptedDate = policyData.policyAcceptedDate;
                    }
                  }
                  
                  // If signing up as guest, initialize guest-specific data if not already present
                  if (role === 'guest') {
                    // Check if these fields exist, if not initialize them
                    if (!userData.points) updateData.points = 0;
                    if (!userData.favorites) updateData.favorites = [];
                    if (!userData.wishlist) updateData.wishlist = [];
                    if (!userData.coupons) updateData.coupons = [];
                  }
                  
                  await updateDoc(doc(db, 'users', userCredential.user.uid), updateData);
                  toast.success(`${role === 'host' ? 'Host' : 'Guest'} access added to your account!`);
                }
                
                // Update user profile state
                setUserRole(role);
                setUserProfile({ ...userData, ...{ roles: userRoles.includes(role) ? userRoles : [...userRoles, role], role } });
                setUser(userCredential.user);
                
                toast.success('Verification code sent! Please check your email.');
                // Don't throw - redirect to verification page
                return;
              } catch (otpError: any) {
                console.error('❌ Error resending OTP:', otpError);
                throw new Error('Your account exists but hasn\'t been verified yet. We\'ve sent a new verification code to your email. Please check your inbox and verify your account.');
              }
            } else {
              // Account exists and is verified
              if (userRoles.includes(role)) {
                // User already has this role
                await firebaseSignOut(auth);
                throw new Error(`This email is already registered with a ${role} account. Please sign in instead.`);
              } else {
                // Add the new role to the verified account
                const updateData: any = {
                  roles: [...userRoles, role],
                  role: role, // Update primary role to the new one
                };
                
                // If signing up as host, initialize host-specific data
                if (role === 'host') {
                  updateData.hostPoints = 0;
                  updateData.hostFavorites = [];
                  updateData.hostWishlist = [];
                  // Add policy data if provided
                  if (policyData) {
                    updateData.policyAccepted = policyData.policyAccepted;
                    updateData.policyAcceptedDate = policyData.policyAcceptedDate;
                  }
                }
                
                // If signing up as guest, initialize guest-specific data if not already present
                if (role === 'guest') {
                  if (!userData.points) updateData.points = 0;
                  if (!userData.favorites) updateData.favorites = [];
                  if (!userData.wishlist) updateData.wishlist = [];
                  if (!userData.coupons) updateData.coupons = [];
                }
                
                await updateDoc(doc(db, 'users', userCredential.user.uid), updateData);
                
                // Generate and send OTP for the new role (optional, for security)
                try {
                  const otpCode = await createOTP(userCredential.user.uid, email);
                  const emailSent = await sendOTPEmail(email, userData.fullName || fullName, otpCode, role);
                  
                  if (emailSent) {
                    toast.success(`${role === 'host' ? 'Host' : 'Guest'} access added! Please verify with the code sent to your email.`);
                  } else {
                    console.warn('⚠️ EmailJS not configured. Your OTP code is:', otpCode);
                    toast.warning(`${role === 'host' ? 'Host' : 'Guest'} access added! Check console for OTP code: ${otpCode}`, {
                      duration: 10000,
                    });
                  }
                } catch (otpError) {
                  console.error('Error sending OTP:', otpError);
                  toast.success(`${role === 'host' ? 'Host' : 'Guest'} access added! Please verify your account.`);
                }
                
                // Update user profile state
                setUserRole(role);
                setUserProfile({ ...userData, ...updateData });
                setUser(userCredential.user);
                
                // Don't throw - redirect to verification page
                return;
              }
            }
          } else {
            // Account exists in Firebase Auth but not in Firestore - this shouldn't happen
            await firebaseSignOut(auth);
            throw new Error('We found your account, but some information is missing. Please contact support for assistance.');
          }
        } catch (signInError: any) {
          // Sign in failed - check if it's a password error
          if (signInError.code === 'auth/wrong-password' || signInError.code === 'auth/invalid-credential') {
            await firebaseSignOut(auth);
            throw new Error('This email address is already registered. Please sign in with your existing password, or use "Forgot Password" if you don\'t remember it.');
          }
          // Handle other Firebase Auth errors
          if (signInError.code && signInError.code.startsWith('auth/')) {
            throw new Error(getAuthErrorMessage(signInError));
          }
          // Re-throw custom errors
          throw signInError;
        }
      } else {
        // Handle other Firebase errors
        if (error.code && error.code.startsWith('auth/')) {
          throw new Error(getAuthErrorMessage(error));
        }
        // Re-throw other errors
        throw error;
      }
    }
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    setUserRole(null);
    setUserProfile(null);
  };

  const sendVerificationEmail = async () => {
    if (!user) {
      throw new Error('No user logged in');
    }
    await sendEmailVerification(user);
  };

  const verifyEmail = async (actionCode: string) => {
    await applyActionCode(auth, actionCode);
    // Reload the user to get the updated emailVerified status
    if (auth.currentUser) {
      await auth.currentUser.reload();
      // Force update the context state
      setUser(auth.currentUser);
    }
  };

  const sendPasswordReset = async (email: string) => {
    try {
      // Get user profile to get fullName
      // Note: This query requires authentication, so it may fail for password reset
      // If it fails, we'll just use "User" as the default name
      let fullName = 'User';
      try {
        // Try to find user by email in Firestore
        // This requires the user to be authenticated, which they won't be on forgot password page
        // So we'll skip this and just use "User" as default
        // If you want to get the name, you'd need to use Firebase Admin SDK on the server side
      } catch (error) {
        // Silently fail - we'll use "User" as default
      }

      // Get the current origin (localhost in dev, or your domain in production)
      // Use production URL for password reset to ensure domain is authorized
      const appUrl = import.meta.env.VITE_APP_URL || 'https://mojo-dojo-casa-house-f31a5.web.app';
      const actionCodeSettings = {
        url: `${appUrl}/reset-password`,
        handleCodeInApp: false, // Set to false to open the link in a browser
      };
      
      // Generate password reset link using Firebase
      // Firebase will send its own email, but we'll also send our custom EmailJS email
      await sendPasswordResetEmail(auth, email, actionCodeSettings);
      
      // Send custom EmailJS email with better template
      // Note: The actual reset link with oobCode is sent by Firebase's email
      // We send a custom email for better UX, but users should use the link from Firebase's email
      // The reset link format will be: ${appUrl}/reset-password?oobCode=...
      const resetLink = `${appUrl}/reset-password`;
      
      // Try to send custom EmailJS email (non-blocking - if it fails, Firebase email still works)
      try {
        await sendPasswordResetEmailJS(email, fullName, resetLink);
      } catch (emailJSError) {
        // EmailJS failed, but Firebase email was sent, so we don't throw
        console.warn('Custom EmailJS password reset email failed, but Firebase email was sent:', emailJSError);
      }
      
    } catch (error: any) {
      // Re-throw Firebase errors (user not found, etc.)
      throw error;
    }
  };

  const resetPassword = async (actionCode: string, newPassword: string) => {
    await confirmPasswordReset(auth, actionCode, newPassword);
  };

  // 🔐 OTP Functions
  const sendOTP = async () => {
    if (!user || !userProfile) {
      throw new Error('No user logged in');
    }
    const otpCode = await createOTP(user.uid, user.email || '');
    await sendOTPEmail(user.email || '', userProfile.fullName, otpCode, userRole || 'guest');
  };

  const verifyOTPCode = async (otpCode: string): Promise<boolean> => {
    if (!user) {
      throw new Error('No user logged in');
    }
    const isValid = await verifyOTP(user.uid, otpCode);
    
    if (isValid) {
      // Mark email as verified in Firestore (we use this for OTP verification)
      await updateDoc(doc(db, 'users', user.uid), {
        emailVerified: true,
        emailVerifiedAt: new Date().toISOString(),
      });
      
      // Update user profile state
      if (userProfile) {
        setUserProfile({
          ...userProfile,
          emailVerified: true,
          emailVerifiedAt: new Date().toISOString(),
        });
      }
      
      // Reload user to get updated profile
      if (auth.currentUser) {
        await auth.currentUser.reload();
        setUser(auth.currentUser);
      }
      
      return true;
    }
    
    return false;
  };

  const refreshUserProfile = async () => {
    if (!user) return;
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        // Support both old (single role) and new (multiple roles) format
        setUserRole(userData.role || (userData.roles && userData.roles[0]) || null);
        setUserProfile(userData);
      }
    } catch (error) {
      console.error('Error refreshing user profile:', error);
    }
  };

  // Helper function to check if user has a specific role
  const hasRole = (role: 'host' | 'guest' | 'admin'): boolean => {
    if (!userProfile) return false;
    // Support both old (single role) and new (multiple roles) format
    const userRoles = userProfile.roles || [userProfile.role];
    return userRoles.includes(role);
  };

  // Add a new role to an existing user (for becoming a host/guest without signing up again)
  const addRole = async (role: 'host' | 'guest' | 'admin', policyData?: { policyAccepted: boolean; policyAcceptedDate: string }) => {
    if (!user) {
      throw new Error('Please sign in first to add a new role to your account.');
    }

    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (!userDoc.exists()) {
      throw new Error('Your account was not found. Please contact support.');
    }

    const userData = userDoc.data();
    const userRoles = userData.roles || (userData.role ? [userData.role] : []);

    // Admin role cannot be added through this method
    if (role === 'admin') {
      throw new Error('Admin role cannot be added through this method. Admin access must be granted by the system administrator.');
    }
    // Allow admins to also be hosts or guests

    // Check if user already has this role
    if (userRoles.includes(role)) {
      // Update primary role if needed
      if (userData.role !== role) {
        await updateDoc(doc(db, 'users', user.uid), {
          role: role,
        });
        setUserRole(role);
        setUserProfile({ ...userData, role });
      }
      return; // Already has the role
    }

    // For hosts, check if policy was accepted
    if (role === 'host') {
      if (!policyData) {
        throw new Error('To become a host, you must first read and accept our policies and compliance terms.');
      }
    }

    // Add the new role
    const updatedRoles = [...userRoles, role];
    const updates: any = {
      roles: updatedRoles,
      role: role, // Update primary role to the one they're adding
    };

    // Add policy data if provided (for hosts)
    if (policyData) {
      updates.policyAccepted = policyData.policyAccepted;
      updates.policyAcceptedDate = policyData.policyAcceptedDate;
    }

    await updateDoc(doc(db, 'users', user.uid), updates);
    
    // Update local state
    setUserRole(role);
    setUserProfile({ ...userData, ...updates });
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      userRole, 
      userProfile,
      loading,
      hasRole,
      signIn,
      signInWithGoogle, 
      signUp, 
      signOut, 
      sendVerificationEmail, 
      verifyEmail,
      sendOTP,
      verifyOTPCode,
      sendPasswordReset, 
      resetPassword,
      refreshUserProfile,
      addRole
    }}>
      {children}
    </AuthContext.Provider>
  );
};