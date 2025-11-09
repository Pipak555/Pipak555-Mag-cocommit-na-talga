import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { VideoBackground } from '@/components/ui/video-background';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { toast } from 'sonner';
import { Users, ArrowLeft, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { FcGoogle } from 'react-icons/fc';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import Logo from '@/components/shared/Logo';
import { loginSchema, signUpSchema, type LoginFormData, type SignUpFormData } from '@/lib/validation';
import { sanitizeEmail, sanitizeString } from '@/lib/sanitize';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '@/lib/firebase';

const guestLoginVideo = '/videos/landing-hero.mp4';

const GuestLogin = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleUserInfo, setGoogleUserInfo] = useState<{ email: string; fullName: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin');
  const { signIn, signUp, signInWithGoogle } = useAuth();
  const navigate = useNavigate();

  // Login form
  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  // Signup form
  const signUpForm = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const handleSignIn = async (data: LoginFormData) => {
    setLoading(true);
    
    try {
      // Sanitize inputs
      const sanitizedEmail = sanitizeEmail(data.email);
      const sanitizedPassword = sanitizeString(data.password);
      
      await signIn(sanitizedEmail, sanitizedPassword, 'guest');
      toast.success('Welcome back!');
      navigate('/guest/dashboard');
    } catch (error: any) {
      // Check if email is not verified - redirect to verification page
      if (error.message === 'EMAIL_NOT_VERIFIED') {
        toast.info('Please verify your email address to continue.');
        navigate('/verify-otp');
        return;
      }
      toast.error(error.message || 'Unable to sign in. Please check your email and password, then try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (data: SignUpFormData) => {
    setLoading(true);
    
    try {
      // Sanitize inputs
      const sanitizedFullName = sanitizeString(data.fullName);
      const sanitizedEmail = sanitizeEmail(data.email);
      const sanitizedPassword = sanitizeString(data.password);
      
      await signUp(sanitizedEmail, sanitizedPassword, sanitizedFullName, 'guest');
      toast.success('Account created! Please check your email to verify your account.');
      navigate('/verification-pending');
    } catch (error: any) {
      toast.error(error.message || 'Unable to create account. Please check your information and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAutofill = async () => {
    if (googleLoading || loading) return;
    
    setGoogleLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      // Pre-fill the signup form with Google account info using setValue
      signUpForm.setValue('email', user.email || '');
      signUpForm.setValue('fullName', user.displayName || user.email?.split('@')[0] || '');
      
      setGoogleUserInfo({
        email: user.email || '',
        fullName: user.displayName || user.email?.split('@')[0] || ''
      });
      
      toast.success('Signed up with Google! Please set a password to complete registration.');
    } catch (error: any) {
      if (error.code !== 'auth/popup-closed-by-user' && error.code !== 'auth/cancelled-popup-request') {
        toast.error(error.message || 'Failed to get Google account info');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (googleLoading || loading) return;
    
    setGoogleLoading(true);
    try {
      await signInWithGoogle('guest');
      toast.success('Welcome!');
      navigate('/guest/dashboard');
    } catch (error: any) {
      // Check if error is about account not registered
      if (error.message?.includes('not registered as a guest') || 
          error.message?.includes('sign up for a guest account first')) {
        toast.info('Please complete your guest account registration');
        // Don't show error toast, just info
      } else {
        toast.error(error.message || 'Failed to sign in with Google');
        console.error('Google sign-in error:', error);
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col relative">
      <div 
        className="fixed inset-0 z-0"
        style={{ 
          width: '100vw',
          height: '100vh',
          transform: 'translateZ(0)',
          willChange: 'auto',
          pointerEvents: 'none'
        }}
      >
        <VideoBackground 
          src={guestLoginVideo} 
          overlay={true}
          className="w-full h-full"
          style={{ 
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            transform: 'scale(1) translateZ(0)',
            willChange: 'auto'
          }}
        />
      </div>
      
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
      
      <div className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6">
        <Card className="w-full max-w-md shadow-2xl border-2 border-primary/20 bg-card/95 backdrop-blur-md relative overflow-hidden">
          {/* Decorative gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 pointer-events-none" />
          
          <CardHeader className="space-y-3 sm:space-y-4 text-center pb-6 sm:pb-8 px-4 sm:px-6 pt-4 sm:pt-6 relative z-10">
            <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-3xl bg-gradient-to-br from-primary via-primary/80 to-secondary/60 flex items-center justify-center shadow-lg ring-4 ring-primary/20 animate-in fade-in zoom-in duration-500">
              <Users className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
            </div>
            <div className="space-y-2">
              <CardTitle className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Guest Portal
              </CardTitle>
              <CardDescription className="text-sm sm:text-base mt-2 font-medium text-foreground/80 dark:text-muted-foreground">
                Start your adventure today
              </CardDescription>
            </div>
          </CardHeader>
          
          <CardContent className="relative z-10 px-4 sm:px-6 pb-4 sm:pb-6">
            <Tabs defaultValue="signin" onValueChange={(value) => setActiveTab(value as 'signin' | 'signup')} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6 sm:mb-8 bg-muted/50 p-1 rounded-xl relative overflow-hidden">
                <div 
                  className="absolute inset-y-1 bg-gradient-to-r from-primary to-primary/80 rounded-lg transition-all duration-300 ease-in-out"
                  style={{
                    left: activeTab === 'signin' ? '4px' : '50%',
                    right: activeTab === 'signin' ? '50%' : '4px',
                    width: 'calc(50% - 4px)',
                  }}
                />
                <TabsTrigger value="signin" className="text-sm sm:text-base font-semibold text-foreground/90 dark:text-foreground data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-300 ease-in-out relative z-10 h-10 sm:h-auto touch-manipulation">
                  Sign In
                </TabsTrigger>
                <TabsTrigger value="signup" className="text-sm sm:text-base font-semibold text-foreground/90 dark:text-foreground data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-300 ease-in-out relative z-10 h-10 sm:h-auto touch-manipulation">
                  Sign Up
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="signin">
                <Form {...loginForm}>
                  <form onSubmit={loginForm.handleSubmit(handleSignIn)} className="space-y-4 sm:space-y-6">
                    <FormField
                      control={loginForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm sm:text-base font-semibold">Email</FormLabel>
                          <FormControl>
                            <div className="relative group">
                              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-primary group-focus-within:text-primary transition-colors" />
                              <Input
                                type="email"
                                placeholder="guest@example.com"
                                className="pl-10 h-11 sm:h-12 border-2 transition-all text-base sm:text-sm"
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={loginForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm sm:text-base font-semibold">Password</FormLabel>
                          <FormControl>
                            <div className="relative group">
                              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-primary group-focus-within:text-primary transition-colors" />
                              <Input
                                type={showPassword ? "text" : "password"}
                                placeholder="••••••••"
                                className="pl-10 pr-10 h-11 sm:h-12 border-2 transition-all text-base sm:text-sm"
                                {...field}
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors h-8 w-8 sm:h-auto sm:w-auto flex items-center justify-center touch-manipulation"
                              >
                                {showPassword ? <EyeOff className="h-4 w-4 sm:h-5 sm:w-5" /> : <Eye className="h-4 w-4 sm:h-5 sm:w-5" />}
                              </button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        variant="link"
                        onClick={() => navigate('/forgot-password', { state: { userType: 'guest' } })}
                        className="text-sm text-primary hover:text-primary/80 p-0 h-auto font-semibold"
                      >
                        Forgot Password?
                      </Button>
                    </div>
                    
                    <Button 
                      type="submit" 
                      className="w-full h-11 sm:h-12 text-sm sm:text-base font-semibold bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-white shadow-lg hover:shadow-xl transition-all duration-300 touch-manipulation" 
                      disabled={loading}
                    >
                      {loading ? 'Signing in...' : 'Sign In'}
                    </Button>
                    
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-card px-2 text-foreground/70 dark:text-muted-foreground">Or continue with</span>
                      </div>
                    </div>
                    
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full h-11 sm:h-12 text-sm sm:text-base font-semibold border-2 hover:bg-muted/50 hover:border-primary/50 transition-all duration-300 touch-manipulation"
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
                </Form>
              </TabsContent>
              
              <TabsContent value="signup">
                <Form {...signUpForm}>
                  <form onSubmit={signUpForm.handleSubmit(handleSignUp)} className="space-y-4 sm:space-y-6">
                    <FormField
                      control={signUpForm.control}
                      name="fullName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm sm:text-base font-semibold">Full Name</FormLabel>
                          <FormControl>
                            <div className="relative group">
                              <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-primary group-focus-within:text-primary transition-colors" />
                              <Input
                                type="text"
                                placeholder="John Doe"
                                className="pl-10 h-11 sm:h-12 border-2 transition-all text-base sm:text-sm"
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={signUpForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm sm:text-base font-semibold">Email</FormLabel>
                          <FormControl>
                            <div className="relative group">
                              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-primary group-focus-within:text-primary transition-colors" />
                              <Input
                                type="email"
                                placeholder="guest@example.com"
                                className="pl-10 h-11 sm:h-12 border-2 transition-all text-base sm:text-sm"
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={signUpForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm sm:text-base font-semibold">Password</FormLabel>
                          <FormControl>
                            <div className="relative group">
                              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-primary group-focus-within:text-primary transition-colors" />
                              <Input
                                type={showPassword ? "text" : "password"}
                                placeholder="••••••••"
                                className="pl-10 pr-10 h-11 sm:h-12 border-2 transition-all text-base sm:text-sm"
                                {...field}
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors h-8 w-8 sm:h-auto sm:w-auto flex items-center justify-center touch-manipulation"
                              >
                                {showPassword ? <EyeOff className="h-4 w-4 sm:h-5 sm:w-5" /> : <Eye className="h-4 w-4 sm:h-5 sm:w-5" />}
                              </button>
                            </div>
                          </FormControl>
                          <FormMessage />
                          <p className="text-xs text-muted-foreground">Must be at least 8 characters long</p>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={signUpForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm sm:text-base font-semibold">Confirm Password</FormLabel>
                          <FormControl>
                            <div className="relative group">
                              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-primary group-focus-within:text-primary transition-colors" />
                              <Input
                                type={showConfirmPassword ? "text" : "password"}
                                placeholder="••••••••"
                                className="pl-10 pr-10 h-11 sm:h-12 border-2 transition-all text-base sm:text-sm"
                                {...field}
                              />
                              <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors h-8 w-8 sm:h-auto sm:w-auto flex items-center justify-center touch-manipulation"
                              >
                                {showConfirmPassword ? <EyeOff className="h-4 w-4 sm:h-5 sm:w-5" /> : <Eye className="h-4 w-4 sm:h-5 sm:w-5" />}
                              </button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <Button 
                      type="submit" 
                      className="w-full h-11 sm:h-12 text-sm sm:text-base font-semibold bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-white shadow-lg hover:shadow-xl transition-all duration-300 touch-manipulation" 
                      disabled={loading}
                    >
                      {loading ? 'Creating account...' : 'Create Account'}
                    </Button>
                    
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-card px-2 text-foreground/70 dark:text-muted-foreground">Or continue with</span>
                      </div>
                    </div>
                    
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full h-11 sm:h-12 text-sm sm:text-base font-semibold border-2 hover:bg-muted/50 hover:border-primary/50 transition-all duration-300 touch-manipulation"
                      onClick={handleGoogleAutofill}
                      disabled={googleLoading || loading}
                    >
                      {googleLoading ? (
                        'Signing up...'
                      ) : (
                        <>
                          <FcGoogle className="h-5 w-5 mr-2" />
                          Sign up with Google
                        </>
                      )}
                    </Button>
                  </form>
                </Form>
              </TabsContent>
            </Tabs>
            
            <div className="mt-8 text-center text-sm text-foreground/70 dark:text-muted-foreground">
              <p>
                Want to host? <Link to="/host/login" className="text-primary hover:text-primary/80 hover:underline font-semibold transition-colors">Become a Host</Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default GuestLogin;
