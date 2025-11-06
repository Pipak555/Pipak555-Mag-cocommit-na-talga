import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { VideoBackground } from '@/components/ui/video-background';
import { toast } from 'sonner';
import { Shield, ArrowLeft, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { FcGoogle } from 'react-icons/fc';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import Logo from '@/components/shared/Logo';
// Import video background (replace with your actual video file)
// import adminLoginVideo from '@/assets/videos/admin-login-bg.mp4';
const adminLoginVideo = '/videos/landing-hero.mp4'; // Same as landing page

const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { signIn, signInWithGoogle } = useAuth();
  const navigate = useNavigate();

      const handleSignIn = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        
        try {
          await signIn(email, password, 'admin');
          toast.success('Admin access granted');
          navigate('/admin/dashboard');
        } catch (error: any) {
          // Check if email is not verified - redirect to verification page
          if (error.message === 'EMAIL_NOT_VERIFIED') {
            toast.info('Please verify your email address to continue.');
            navigate('/verify-otp');
            return;
          }
          // Error messages are already user-friendly from AuthContext
          toast.error(error.message || 'Unable to sign in. Please check your email and password, then try again.');
        } finally {
          setLoading(false);
        }
      };

  const handleGoogleSignIn = async () => {
    // Prevent multiple simultaneous clicks
    if (googleLoading || loading) return;
    
    setGoogleLoading(true);
    try {
      await signInWithGoogle('admin');
      toast.success('Admin access granted');
      navigate('/admin/dashboard');
    } catch (error: any) {
      // Error messages are already user-friendly from AuthContext
      toast.error(error.message || 'Failed to sign in with Google');
      console.error('Google sign-in error:', error);
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col relative">
      {/* Video Background */}
      <VideoBackground 
        src={adminLoginVideo} 
        overlay={true}
        className="z-0"
      />
      
      {/* Header */}
      <header className="relative z-10 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
            <Logo size="sm" />
          </div>
          <ThemeToggle />
        </div>
      </header>
      
      {/* Form Card */}
      <div className="relative z-10 flex-1 flex items-center justify-center p-6">
        <Card className="w-full max-w-md shadow-2xl border-border/50 bg-card/95 backdrop-blur-md">
          <CardHeader className="space-y-4 text-center pb-8">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-accent/10 flex items-center justify-center">
              <Shield className="w-8 h-8 text-accent" />
            </div>
            <div>
              <CardTitle className="text-3xl font-bold">Admin Portal</CardTitle>
              <CardDescription className="text-base mt-2">
                Platform management and oversight
              </CardDescription>
            </div>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSignIn} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-base">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@stayhub.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="pl-10 h-12"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password" className="text-base">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="pl-10 pr-10 h-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
              
              <Button type="submit" className="w-full h-12 text-base" disabled={loading}>
                {loading ? 'Signing in...' : 'Sign In as Admin'}
              </Button>
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
                </div>
              </div>
              
              <Button
                type="button"
                variant="outline"
                className="w-full h-12 text-base"
                onClick={handleGoogleSignIn}
                disabled={googleLoading || loading}
              >
                {googleLoading ? (
                  'Signing in...'
                ) : (
                  <>
                    <FcGoogle className="h-5 w-5 mr-2" />
                    Sign in with Google
                  </>
                )}
              </Button>
            </form>
            
            <div className="mt-8 p-4 bg-accent/10 rounded-lg border border-accent/20">
              <p className="text-sm text-muted-foreground text-center">
                <Shield className="w-4 h-4 inline mr-1 text-accent" />
                Admin access is restricted. Contact support if you need access.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminLogin;
