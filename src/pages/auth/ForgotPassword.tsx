import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { VideoBackground } from '@/components/ui/video-background';
import { toast } from 'sonner';
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import Logo from '@/components/shared/Logo';
import { sanitizeEmail } from '@/lib/sanitize';

const forgotPasswordVideo = '/videos/landing-hero.mp4';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const { sendPasswordReset } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get the user type from location state or default to 'guest'
  const userType = location.state?.userType || 'guest';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast.error('Please enter your email address');
      return;
    }

    setLoading(true);
    try {
      const sanitizedEmail = sanitizeEmail(email);
      await sendPasswordReset(sanitizedEmail);
      setEmailSent(true);
      toast.success('Password reset email sent! Please check your inbox.');
    } catch (error: any) {
      toast.error(error.message || 'Failed to send password reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getLoginPath = () => {
    switch (userType) {
      case 'host':
        return '/host/login';
      case 'admin':
        return '/admin/login';
      default:
        return '/guest/login';
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col relative">
      <VideoBackground 
        src={forgotPasswordVideo} 
        overlay={true}
        className="z-0"
      />
      
      <header className="relative z-10 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate(getLoginPath())}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Login
            </Button>
            <Logo size="sm" />
          </div>
          <ThemeToggle />
        </div>
      </header>
      
      <div className="relative z-10 flex-1 flex items-center justify-center p-6">
        <Card className="w-full max-w-md shadow-2xl border-2 border-primary/20 bg-card/95 backdrop-blur-md relative overflow-hidden">
          {/* Decorative gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 pointer-events-none" />
          
          <CardHeader className="space-y-4 text-center pb-8 relative z-10">
            <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-primary via-primary/80 to-secondary/60 flex items-center justify-center shadow-lg ring-4 ring-primary/20 animate-in fade-in zoom-in duration-500">
              <Mail className="w-10 h-10 text-white" />
            </div>
            <div className="space-y-2">
              <CardTitle className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Forgot Password?
              </CardTitle>
              <CardDescription className="text-base mt-2 font-medium">
                {emailSent 
                  ? 'Check your email for reset instructions'
                  : 'Enter your email to receive a password reset link'
                }
              </CardDescription>
            </div>
          </CardHeader>
          
          <CardContent className="relative z-10">
            {emailSent ? (
              <div className="space-y-6 text-center">
                <div className="w-16 h-16 mx-auto rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>
                <div className="space-y-2">
                  <p className="text-lg font-semibold">Email Sent!</p>
                  <p className="text-sm text-muted-foreground">
                    We've sent a password reset link to <strong className="text-foreground">{email}</strong>
                  </p>
                  <p className="text-xs text-muted-foreground mt-4">
                    Please check your inbox and click the link to reset your password. The link will expire in 1 hour.
                  </p>
                </div>
                <div className="space-y-3 pt-4">
                  <Button
                    onClick={() => setEmailSent(false)}
                    variant="outline"
                    className="w-full"
                  >
                    Send Another Email
                  </Button>
                  <Button
                    onClick={() => navigate(getLoginPath())}
                    className="w-full bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-white shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    Back to Login
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-base font-semibold">Email Address</Label>
                  <div className="relative group">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-primary group-focus-within:text-primary transition-colors" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="pl-10 h-12 border-2 transition-all"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    We'll send you a link to reset your password
                  </p>
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full h-12 text-base font-semibold bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-white shadow-lg hover:shadow-xl transition-all duration-300" 
                  disabled={loading}
                >
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </Button>
                
                <div className="text-center">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => navigate(getLoginPath())}
                    className="text-sm"
                  >
                    Remember your password? Sign in
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ForgotPassword;

