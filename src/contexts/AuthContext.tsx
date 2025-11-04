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
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { sendOTPEmail } from '@/lib/emailjs';
import { createOTP, verifyOTP, resendOTP } from '@/lib/firestore';
import { toast } from 'sonner';

interface AuthContextType {
  user: User | null;
  userRole: 'host' | 'guest' | 'admin' | null;
  userProfile: any | null;
  loading: boolean;
  signIn: (email: string, password: string, role: 'host' | 'guest' | 'admin') => Promise<void>;
  signUp: (email: string, password: string, fullName: string, role: 'host' | 'guest' | 'admin', policyData?: { policyAccepted: boolean; policyAcceptedDate: string }) => Promise<void>;
  signOut: () => Promise<void>;
  sendVerificationEmail: () => Promise<void>;
  verifyEmail: (actionCode: string) => Promise<void>;
  sendOTP: () => Promise<void>;
  verifyOTPCode: (otpCode: string) => Promise<boolean>;
  sendPasswordReset: (email: string) => Promise<void>;
  resetPassword: (actionCode: string, newPassword: string) => Promise<void>;
  refreshUserProfile: () => Promise<void>;
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
          setUserRole(userData.role);
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
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
    
    if (userDoc.exists() && userDoc.data().role !== role) {
      await firebaseSignOut(auth);
      throw new Error(`This account is not registered as a ${role}`);
    }

    // Check if email is verified (ONLY check Firestore field - OTP verification)
    const userData = userDoc.data();
    const isEmailVerified = userData?.emailVerified === true;
    
    if (!isEmailVerified) {
      await firebaseSignOut(auth);
      throw new Error('Please verify your email before signing in. Check your inbox for the verification code.');
    }
  };

  const signUp = async (email: string, password: string, fullName: string, role: 'host' | 'guest' | 'admin', policyData?: { policyAccepted: boolean; policyAcceptedDate: string }) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      const userData: any = {
        email,
        fullName,
        role,
        createdAt: new Date().toISOString(),
        points: 0,
        walletBalance: 0,
        favorites: [],
        wishlist: []
      };
      
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
          // EmailJS failed - show error to user
          console.error('❌ Failed to send OTP email via EmailJS');
          toast.error('Failed to send verification email. Please try again or contact support.');
          // Don't throw error - let user continue but they need to use resend
        }
      } catch (error: any) {
        console.error('❌ Error in OTP email flow:', error);
        toast.error(error.message || 'Failed to send verification email. Please try again.');
        // Don't throw - user is created, they can use resend button
      }
      
      setUserRole(role);
      setUserProfile(userData);
    } catch (error: any) {
      // Handle email already in use error
      if (error.code === 'auth/email-already-in-use') {
        // Try to sign in with the provided credentials
        try {
          const userCredential = await signInWithEmailAndPassword(auth, email, password);
          const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            const isEmailVerified = userData?.emailVerified === true;
            
            if (!isEmailVerified) {
              // Account exists but not verified - resend OTP
              try {
                const otpCode = await createOTP(userCredential.user.uid, email);
                await sendOTPEmail(email, userData.fullName || fullName, otpCode, userData.role || role);
                
                // Update user profile state
                setUserRole(userData.role || role);
                setUserProfile(userData);
                setUser(userCredential.user);
                
                toast.success('Verification code resent! Please check your email.');
                // Don't throw - redirect to verification page
                return;
              } catch (otpError: any) {
                console.error('❌ Error resending OTP:', otpError);
                throw new Error('Account exists but not verified. Please check your email for the verification code or try signing in.');
              }
            } else {
              // Account exists and is verified
              await firebaseSignOut(auth);
              throw new Error('This email is already registered and verified. Please sign in instead.');
            }
          } else {
            // Account exists in Firebase Auth but not in Firestore - this shouldn't happen
            await firebaseSignOut(auth);
            throw new Error('Account exists but data is missing. Please contact support.');
          }
        } catch (signInError: any) {
          // Sign in failed - wrong password or other issue
          if (signInError.code === 'auth/wrong-password' || signInError.code === 'auth/invalid-credential') {
            throw new Error('This email is already registered. Please sign in with your password, or use password reset if you forgot it.');
          }
          // Re-throw the original error with a better message
          throw new Error('This email is already registered. Please sign in to verify your account.');
        }
      } else {
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
    await sendPasswordResetEmail(auth, email);
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
        setUserRole(userData.role);
        setUserProfile(userData);
      }
    } catch (error) {
      console.error('Error refreshing user profile:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      userRole, 
      userProfile,
      loading, 
      signIn, 
      signUp, 
      signOut, 
      sendVerificationEmail, 
      verifyEmail,
      sendOTP,
      verifyOTPCode,
      sendPasswordReset, 
      resetPassword,
      refreshUserProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
};