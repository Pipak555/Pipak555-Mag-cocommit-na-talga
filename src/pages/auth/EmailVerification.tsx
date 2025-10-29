import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { CheckCircle, Mail, ArrowLeft, RefreshCw } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/theme-toggle';

const EmailVerification = () => {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const { verifyEmail, sendVerificationEmail, user } = useAuth();
  const navigate = useNavigate();

  const actionCode = searchParams.get('oobCode');
  const mode = searchParams.get('mode');

  useEffect(() => {
    if (actionCode && mode === 'verifyEmail') {
      handleVerification();
    } else {
      setVerificationStatus('error');
    }
  }, [actionCode, mode]);

  const handleVerification = async () => {
    if (!actionCode) return;
    
    setLoading(true);
    try {
      await verifyEmail(actionCode);
      setVerificationStatus('success');
      toast.success('Email verified successfully!');
    } catch (error: any) {
      console.error('Verification error:', error);
      setVerificationStatus('error');
      toast.error(error.message || 'Failed to verify email');
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setLoading(true);
    try {
      await sendVerificationEmail();
      toast.success('Verification email sent! Check your inbox.');
    } catch (error: any) {
      toast.error(error.message || 'Failed to send verification email');
    } finally {
      setLoading(false);
    }
  };

  const getContent = () => {
    if (verificationStatus === 'verifying') {
      return {
        icon: <RefreshCw className="w-16 h-16 text-primary animate-spin" />,
        title: "Verifying Your Email...",
        description: "Please wait while we verify your email address.",
        showButton: false
      };
    }

    if (verificationStatus === 'success') {
      return {
        icon: <CheckCircle className="w-16 h-16 text-green-500" />,
        title: "Email Verified Successfully!",
        description: "Your email has been verified. You can now sign in to your account and start using our platform.",
        showButton: true,
        buttonText: "Continue to Sign In",
        buttonAction: () => navigate('/guest/login')
      };
    }

    return {
      icon: <Mail className="w-16 h-16 text-red-500" />,
      title: "Verification Failed",
      description: "We couldn't verify your email. The link may have expired or been used already. Please request a new verification email.",
      showButton: true,
      buttonText: "Resend Verification Email",
      buttonAction: handleResendVerification
    };
  };

  const content = getContent();

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
            <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center">
              {content.icon}
            </div>
            <div className="space-y-2">
              <CardTitle className="text-3xl font-bold bg-gradient-to-r from-orange-500 via-blue-500 to-green-500 bg-clip-text text-transparent">
                {content.title}
              </CardTitle>
              <CardDescription className="text-base leading-relaxed">
                {content.description}
              </CardDescription>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6 pb-12">
            {content.showButton && (
              <Button 
                onClick={content.buttonAction}
                className="w-full h-12 text-base font-semibold"
                disabled={loading}
                size="lg"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  content.buttonText
                )}
              </Button>
            )}

            {verificationStatus === 'success' && (
              <div className="text-center space-y-4">
                <div className="w-full h-px bg-gradient-to-r from-transparent via-border to-transparent"></div>
                <p className="text-sm text-muted-foreground">
                  Welcome to our platform! We're excited to have you on board.
                </p>
              </div>
            )}

            {verificationStatus === 'error' && (
              <div className="text-center space-y-4">
                <div className="w-full h-px bg-gradient-to-r from-transparent via-border to-transparent"></div>
                <p className="text-sm text-muted-foreground">
                  Need help? Contact our support team for assistance.
                </p>
                <Button 
                  variant="outline" 
                  onClick={() => navigate('/')}
                  className="w-full"
                >
                  Return to Home
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EmailVerification;
