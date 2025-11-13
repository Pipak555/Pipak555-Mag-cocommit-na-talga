/**
 * Email Verification Banner Component for Hosts
 * 
 * Displays a banner prompting hosts to verify their email address
 * Similar to the subscription banner and guest verification banner
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, Mail, X } from 'lucide-react';
import { toast } from 'sonner';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export const HostEmailVerificationBanner = () => {
  const { user, userProfile, sendOTP, refreshUserProfile } = useAuth();
  const navigate = useNavigate();
  const [sending, setSending] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [isVerified, setIsVerified] = useState(userProfile?.emailVerified || false);

  // Listen for email verification status changes
  useEffect(() => {
    if (!user) return;

    const unsubscribe = onSnapshot(doc(db, 'users', user.uid), (docSnap) => {
      if (docSnap.exists()) {
        const userData = docSnap.data();
        const verified = userData.emailVerified || false;
        setIsVerified(verified);
        
        // If email is verified, refresh user profile and dismiss banner
        if (verified && !isVerified) {
          refreshUserProfile();
          setDismissed(true);
          toast.success('Email verified successfully! All features are now enabled.');
        }
      }
    });

    return () => unsubscribe();
  }, [user, isVerified, refreshUserProfile]);

  // Don't show if user is not a host, email is verified, or banner is dismissed
  if (!user || userProfile?.role !== 'host' || isVerified || dismissed) {
    return null;
  }

  const handleVerifyNow = async () => {
    if (!user) return;

    setSending(true);
    try {
      // Use the same OTP method as sign-up
      await sendOTP();
      toast.success('Verification code sent! Please check your inbox for the 6-digit code.');
      // Navigate to OTP verification page (same as sign-up)
      navigate('/verify-otp');
    } catch (error: any) {
      toast.error(error.message || 'Failed to send verification code. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
  };

  return (
    <Card className="mb-6 border-role-host/50 bg-role-host/10">
      <CardContent className="pt-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-role-host mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="font-semibold mb-1">Email Verification Required</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Please verify your email to enable all features including creating listings. Check your inbox for a 6-digit verification code.
            </p>
            <div className="flex gap-2">
              <Button 
                size="sm"
                variant="role-host"
                onClick={handleVerifyNow}
                disabled={sending}
                className="gap-2"
              >
                <Mail className="h-4 w-4" />
                {sending ? 'Sending...' : 'Verify Now'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDismiss}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

