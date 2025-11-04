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
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { sendWelcomeEmail } from '@/lib/emailjs';

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
  sendPasswordReset: (email: string) => Promise<void>;
  resetPassword: (actionCode: string, newPassword: string) => Promise<void>;
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

    // Check if email is verified
    if (!userCredential.user.emailVerified) {
      throw new Error('Please verify your email before signing in. Check your inbox for a verification link.');
    }
  };

  const signUp = async (email: string, password: string, fullName: string, role: 'host' | 'guest' | 'admin', policyData?: { policyAccepted: boolean; policyAcceptedDate: string }) => {
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
    
    try {
      // Send Firebase verification email (contains the actual verification link)
      await sendEmailVerification(userCredential.user, {
        url: `${window.location.origin}/verify-email?mode=verifyEmail`,
        handleCodeInApp: true,
      });

      // Send beautiful welcome email via EmailJS (non-blocking)
      // This will show the beautiful template you created
      sendWelcomeEmail(email, fullName, role).catch(error => {
        console.error('Welcome email failed (non-critical):', error);
      });
    } catch (error) {
      console.error('Error sending verification email:', error);
      // Still try to send welcome email even if Firebase email fails
      sendWelcomeEmail(email, fullName, role).catch(err => {
        console.error('Welcome email also failed:', err);
      });
    }
    
    setUserRole(role);
    setUserProfile(userData);
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
      sendPasswordReset, 
      resetPassword 
    }}>
      {children}
    </AuthContext.Provider>
  );
};