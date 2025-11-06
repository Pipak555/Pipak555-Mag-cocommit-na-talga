import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { RefreshCw, ArrowLeft, CheckCircle, Clock } from 'lucide-react'; // Removed Mail icon
import { ThemeToggle } from '@/components/ui/theme-toggle';
import Logo from '@/components/shared/Logo'; // Added Logo import

const VerificationPending = () => {
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const { sendOTP, user, userProfile, userRole } = useAuth(); // Changed to sendOTP
  const navigate = useNavigate();

  // Auto-detect when email is verified
  useEffect(() => {
    if (!user) return;

    // Check if email is already verified (check Firestore field)
    if (userProfile?.emailVerified && !isVerified) {
      setIsVerified(true);
      toast.success('Email verified successfully! Redirecting to dashboard...');
      
      // Redirect based on user role
      setTimeout(() => {
        if (userRole === 'guest') {
          navigate('/guest/dashboard');
        } else if (userRole === 'host') {
          navigate('/host/dashboard');
        } else if (userRole === 'admin') {
          navigate('/admin/dashboard');
        } else {
          navigate('/guest/dashboard');
        }
      }, 2000);
    }
  }, [user, userProfile, userRole, isVerified, navigate]);

  // Poll for verification status every 2 seconds
  useEffect(() => {
    if (!user || isVerified || !userProfile) return;

    const checkInterval = setInterval(() => {
      // Check Firestore field for emailVerified
      if (userProfile.emailVerified && !isVerified) {
        setIsVerified(true);
        clearInterval(checkInterval);
        toast.success('Email verified successfully! Redirecting to dashboard...');
        
        setTimeout(() => {
          if (userRole === 'guest') {
            navigate('/guest/dashboard');
          } else if (userRole === 'host') {
            navigate('/host/dashboard');
          } else if (userRole === 'admin') {
            navigate('/admin/dashboard');
          } else {
            navigate('/guest/dashboard');
          }
        }, 2000);
      }
    }, 2000);

    return () => clearInterval(checkInterval);
  }, [user, userProfile, userRole, isVerified, navigate]);

  const handleResendVerification = async () => {
    setLoading(true);
    try {
      await sendOTP(); // Changed to sendOTP
      setEmailSent(true);
      toast.success('Verification code sent! Check your inbox.');
    } catch (error: any) {
      toast.error(error.message || 'Unable to send verification code. Please try again in a moment or contact support if the problem persists.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    navigate('/guest/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex flex-col">
      <header className="border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <Button variant="ghost" onClick={() => navigate('/')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
          <ThemeToggle />
        </div>
      </header>
      
      <div className="flex-1 flex items-center justify-center p-6">
        <Card className="w-full max-w-md shadow-2xl border-border/50 bg-card/95 backdrop-blur">
          <CardHeader className="space-y-6 text-center pb-8 pt-12">
            {/* Replaced Mail icon with Logo component */}
            <div className="w-24 h-24 mx-auto flex items-center justify-center">
              <Logo size="xl" showText={false} />
            </div>
            <div className="space-y-2">
              <CardTitle className="text-3xl font-bold bg-gradient-to-r from-orange-500 via-blue-500 to-green-500 bg-clip-text text-transparent">
                {isVerified ? 'Email Verified!' : 'Check Your Email'}
              </CardTitle>
              <CardDescription className="text-base leading-relaxed">
                {isVerified ? (
                  <>
                    Your email has been verified successfully! Redirecting you to dashboard...
                  </>
                ) : (
                  <>
                    Hi <strong>{userProfile?.fullName || 'there'}</strong>! We've sent a 6-digit verification code to <strong>{user?.email}</strong>
                  </>
                )}
              </CardDescription>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6 pb-12">
            {isVerified ? (
              // Show success message when verified
              <div className="flex items-center space-x-2 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                <span className="text-sm text-green-800 dark:text-green-200">
                  Email verified! You will be redirected to the dashboard shortly...
                </span>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  <div className="flex items-start space-x-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-blue-800 dark:text-blue-200">
                      <p className="font-medium">Next Steps:</p>
                      <ol className="mt-2 space-y-1 list-decimal list-inside">
                        <li>Check your email inbox (and spam folder)</li>
                        <li>Copy the 6-digit verification code from the email</li>
                        <li>Click the button below to enter the code and verify your email</li>
                      </ol>
                    </div>
                  </div>

                  {emailSent && (
                    <div className="flex items-center space-x-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                      <span className="text-sm text-green-800 dark:text-green-200">
                        Verification code sent successfully!
                      </span>
                    </div>
                  )}

                  <div className="flex items-start space-x-3 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                    <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-amber-800 dark:text-amber-200">
                      <p className="font-medium">Didn't receive the email?</p>
                      <p className="mt-1">The verification code may take a few minutes to arrive. Check your spam folder or request a new one.</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <Button 
                    onClick={() => navigate('/verify-otp')}
                    className="w-full h-12 text-base font-semibold"
                    size="lg"
                  >
                    Enter Verification Code
                  </Button>
                  
                  <Button 
                    onClick={handleResendVerification}
                    className="w-full"
                    disabled={loading}
                    variant="outline"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Resend Verification Code
                      </>
                    )}
                  </Button>

                  <Button 
                    onClick={handleSignOut}
                    variant="ghost"
                    className="w-full"
                  >
                    Sign Out
                  </Button>
                </div>
              </>
            )}

            <div className="text-center space-y-4">
              <div className="w-full h-px bg-gradient-to-r from-transparent via-border to-transparent"></div>
              <p className="text-sm text-muted-foreground">
                Need help? Contact our support team for assistance.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default VerificationPending;