import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { VideoBackground } from '@/components/ui/video-background';
import { toast } from 'sonner';
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import Logo from '@/components/shared/Logo';
import { sanitizeString } from '@/lib/sanitize';

const resetPasswordVideo = '/videos/landing-hero.mp4';

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { resetPassword } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Firebase sends the action code as 'oobCode' in the URL
  const actionCode = searchParams.get('oobCode') || searchParams.get('code') || '';

  useEffect(() => {
    if (!actionCode) {
      setError('Invalid or missing reset link. Please request a new password reset.');
    }
  }, [actionCode]);

  const validatePassword = (pwd: string): string | null => {
    if (pwd.length < 8) {
      return 'Password must be at least 8 characters long';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    const validationError = validatePassword(password);
    if (validationError) {
      setError(validationError);
      return;
    }

    if (!actionCode) {
      setError('Invalid reset link. Please request a new password reset.');
      return;
    }

    setLoading(true);
    try {
      const sanitizedPassword = sanitizeString(password);
      await resetPassword(actionCode, sanitizedPassword);
      setSuccess(true);
      toast.success('Password reset successfully! Redirecting to login...');
      setTimeout(() => {
        navigate('/guest/login');
      }, 2000);
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to reset password. The link may have expired.';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-background flex flex-col relative">
        <VideoBackground 
          src={resetPasswordVideo} 
          overlay={true}
          className="z-0"
        />
        
        <div className="relative z-10 flex-1 flex items-center justify-center p-6">
          <Card className="w-full max-w-md shadow-2xl border-2 border-green-500/20 bg-card/95 backdrop-blur-md relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 via-transparent to-primary/5 pointer-events-none" />
            
            <CardContent className="relative z-10 p-8 text-center space-y-6">
              <div className="w-20 h-20 mx-auto rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-400" />
              </div>
              <div className="space-y-2">
                <CardTitle className="text-3xl font-bold text-green-600 dark:text-green-400">
                  Password Reset Successful!
                </CardTitle>
                <CardDescription className="text-base">
                  Your password has been reset successfully. You can now sign in with your new password.
                </CardDescription>
              </div>
              <Button
                onClick={() => navigate('/guest/login')}
                className="w-full bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-white shadow-lg hover:shadow-xl transition-all duration-300"
              >
                Go to Login
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col relative">
      <VideoBackground 
        src={resetPasswordVideo} 
        overlay={true}
        className="z-0"
      />
      
      <header className="relative z-10 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <Logo size="sm" />
          <ThemeToggle />
        </div>
      </header>
      
      <div className="relative z-10 flex-1 flex items-center justify-center p-6">
        <Card className="w-full max-w-md shadow-2xl border-2 border-primary/20 bg-card/95 backdrop-blur-md relative overflow-hidden">
          {/* Decorative gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 pointer-events-none" />
          
          <CardHeader className="space-y-4 text-center pb-8 relative z-10">
            <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-primary via-primary/80 to-secondary/60 flex items-center justify-center shadow-lg ring-4 ring-primary/20 animate-in fade-in zoom-in duration-500">
              <Lock className="w-10 h-10 text-white" />
            </div>
            <div className="space-y-2">
              <CardTitle className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Reset Password
              </CardTitle>
              <CardDescription className="text-base mt-2 font-medium">
                Enter your new password below
              </CardDescription>
            </div>
          </CardHeader>
          
          <CardContent className="relative z-10">
            {error && (
              <div className="mb-6 p-4 bg-red-100 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-800 rounded-xl">
                <p className="text-sm text-red-800 dark:text-red-200 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  {error}
                </p>
              </div>
            )}

            {!actionCode && (
              <div className="mb-6 p-4 bg-orange-100 dark:bg-orange-900/20 border-2 border-orange-300 dark:border-orange-800 rounded-xl">
                <p className="text-sm text-orange-800 dark:text-orange-200 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  Invalid or missing reset link. Please request a new password reset.
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="password" className="text-base font-semibold">New Password</Label>
                <div className="relative group">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-primary group-focus-within:text-primary transition-colors" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter new password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="pl-10 pr-10 h-12 border-2 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Must be at least 8 characters long
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-base font-semibold">Confirm New Password</Label>
                <div className="relative group">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-primary group-focus-within:text-primary transition-colors" />
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="pl-10 pr-10 h-12 border-2 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
              
              <Button 
                type="submit" 
                className="w-full h-12 text-base font-semibold bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-white shadow-lg hover:shadow-xl transition-all duration-300" 
                disabled={loading || !actionCode}
              >
                {loading ? 'Resetting Password...' : 'Reset Password'}
              </Button>
              
              <div className="text-center">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => navigate('/guest/login')}
                  className="text-sm"
                >
                  Back to Login
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResetPassword;

