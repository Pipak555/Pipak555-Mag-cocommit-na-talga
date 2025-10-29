import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Mail, RefreshCw, ArrowLeft, CheckCircle, Clock } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/theme-toggle';

const VerificationPending = () => {
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const { sendVerificationEmail, user, userProfile } = useAuth();
  const navigate = useNavigate();

  const handleResendVerification = async () => {
    setLoading(true);
    try {
      await sendVerificationEmail();
      setEmailSent(true);
      toast.success('Verification email sent! Check your inbox.');
    } catch (error: any) {
      toast.error(error.message || 'Failed to send verification email');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    // Sign out and redirect to login
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
            <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/20 dark:to-orange-900/20 flex items-center justify-center">
              <Mail className="w-16 h-16 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="space-y-2">
              <CardTitle className="text-3xl font-bold bg-gradient-to-r from-orange-500 via-blue-500 to-green-500 bg-clip-text text-transparent">
                Check Your Email
              </CardTitle>
              <CardDescription className="text-base leading-relaxed">
                Hi <strong>{userProfile?.fullName || 'there'}</strong>! We've sent a verification link to <strong>{user?.email}</strong>
              </CardDescription>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6 pb-12">
            <div className="space-y-4">
              <div className="flex items-start space-x-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <CheckCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-800 dark:text-blue-200">
                  <p className="font-medium">Next Steps:</p>
                  <ol className="mt-2 space-y-1 list-decimal list-inside">
                    <li>Check your email inbox (and spam folder)</li>
                    <li>Click the verification link in the email</li>
                    <li>Return here to sign in to your account</li>
                  </ol>
                </div>
              </div>

              {emailSent && (
                <div className="flex items-center space-x-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                  <span className="text-sm text-green-800 dark:text-green-200">
                    Verification email sent successfully!
                  </span>
                </div>
              )}

              <div className="flex items-start space-x-3 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-amber-800 dark:text-amber-200">
                  <p className="font-medium">Didn't receive the email?</p>
                  <p className="mt-1">The verification link may take a few minutes to arrive. Check your spam folder or request a new one.</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Button 
                onClick={handleResendVerification}
                className="w-full h-12 text-base font-semibold"
                disabled={loading}
                size="lg"
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
                    Resend Verification Email
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
