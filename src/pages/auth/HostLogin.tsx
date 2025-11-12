import { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
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
import { Building2, ArrowLeft, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { FcGoogle } from 'react-icons/fc';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import Logo from '@/components/shared/Logo';
import { loginSchema, signUpSchema, type LoginFormData, type SignUpFormData } from '@/lib/validation';
import { sanitizeEmail, sanitizeString } from '@/lib/sanitize';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '@/lib/firebase';

const hostLoginVideo = '/videos/landing-hero.mp4';

const HostLogin = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleUserInfo, setGoogleUserInfo] = useState<{ email: string; fullName: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin');
  const { signIn, signUp, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const shouldShowSignup = location.state?.showSignup === true;
  
  useEffect(() => {
    if (shouldShowSignup) {
      setActiveTab('signup');
    }
  }, [shouldShowSignup]);

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
      const sanitizedEmail = sanitizeEmail(data.email);
      const sanitizedPassword = sanitizeString(data.password);
      
      await signIn(sanitizedEmail, sanitizedPassword, 'host');
      toast.success('Welcome back!');
      navigate('/host/dashboard');
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
    
    const policyAccepted = sessionStorage.getItem('hostPolicyAccepted');
    if (!policyAccepted) {
      toast.error('To create a host account, you must first read and accept our policies and compliance terms. Please review them and accept before continuing.');
      navigate('/host/policies');
      setLoading(false);
      return;
    }
    
    try {
      const sanitizedFullName = sanitizeString(data.fullName);
      const sanitizedEmail = sanitizeEmail(data.email);
      const sanitizedPassword = sanitizeString(data.password);
      
      const policyAcceptedDate = sessionStorage.getItem('hostPolicyAcceptedDate');
      await signUp(sanitizedEmail, sanitizedPassword, sanitizedFullName, 'host', {
        policyAccepted: true,
        policyAcceptedDate: policyAcceptedDate || new Date().toISOString()
      });
      
      sessionStorage.removeItem('hostPolicyAccepted');
      sessionStorage.removeItem('hostPolicyAcceptedDate');
      
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
      await signInWithGoogle('host');
      toast.success('Welcome!');
      navigate('/host/dashboard');
    } catch (error: any) {
      // Check if error is about account not registered
      if (error.message?.includes('not registered as a host') || 
          error.message?.includes('sign up for a host account first')) {
        toast.info('Please complete your host account registration');
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
          src={hostLoginVideo} 
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
        <div className="container mx-auto px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
            <Button variant="ghost" onClick={() => navigate('/')} className="h-9 sm:h-auto text-xs sm:text-sm px-2 sm:px-4 touch-manipulation">
              <ArrowLeft className="h-4 w-4 mr-1.5 sm:mr-2" />
              <span className="hidden sm:inline">Back to Home</span>
              <span className="sm:hidden">Back</span>
            </Button>
            <Logo size="sm" />
          </div>
          <ThemeToggle />
        </div>
      </header>
      
      <div className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6">
        <Card className="w-full max-w-md shadow-2xl border-2 border-secondary/20 bg-card/95 backdrop-blur-md relative overflow-hidden">
          {/* Decorative gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-secondary/5 via-transparent to-primary/5 pointer-events-none" />
          
          <CardHeader className="space-y-3 sm:space-y-4 text-center pb-6 sm:pb-8 px-4 sm:px-6 pt-4 sm:pt-6 relative z-10">
            <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-3xl bg-gradient-to-br from-secondary via-secondary/80 to-primary/60 flex items-center justify-center shadow-lg ring-4 ring-secondary/20 animate-in fade-in zoom-in duration-500">
              <Building2 className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
            </div>
            <div className="space-y-2">
              <CardTitle className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-secondary to-primary bg-clip-text text-transparent">
                Host Portal
              </CardTitle>
              <CardDescription className="text-sm sm:text-base mt-2 font-medium text-foreground/80 dark:text-muted-foreground">
                Start hosting and earning today
              </CardDescription>
            </div>
          </CardHeader>
          
          <CardContent className="relative z-10 px-4 sm:px-6 pb-4 sm:pb-6">
            <Tabs defaultValue={shouldShowSignup ? "signup" : "signin"} onValueChange={(value) => setActiveTab(value as 'signin' | 'signup')} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6 sm:mb-8 bg-muted/50 p-1 rounded-xl relative overflow-hidden h-auto">
                <div 
                  className="absolute inset-y-1 bg-gradient-to-r from-secondary to-secondary/80 rounded-lg transition-all duration-300 ease-in-out"
                  style={{
                    left: activeTab === 'signin' ? '4px' : '50%',
                    right: activeTab === 'signin' ? '50%' : '4px',
                    width: 'calc(50% - 4px)',
                  }}
                />
                <TabsTrigger value="signin" className="!flex !items-center !justify-center text-sm sm:text-base font-semibold text-foreground/90 dark:text-foreground data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-300 ease-in-out relative z-10 !h-10 sm:!h-12 touch-manipulation !py-0 !px-4 leading-none">
                  <span className="flex items-center justify-center h-full">Sign In</span>
                </TabsTrigger>
                <TabsTrigger value="signup" className="!flex !items-center !justify-center text-sm sm:text-base font-semibold text-foreground/90 dark:text-foreground data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-300 ease-in-out relative z-10 !h-10 sm:!h-12 touch-manipulation !py-0 !px-4 leading-none">
                  <span className="flex items-center justify-center h-full">Sign Up</span>
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
                              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-secondary group-focus-within:text-secondary transition-colors" />
                              <Input
                                type="email"
                                placeholder="host@example.com"
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
                              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-secondary group-focus-within:text-secondary transition-colors" />
                              <Input
                                type={showPassword ? "text" : "password"}
                                placeholder="••••••••"
                                className="pl-10 pr-10 h-11 sm:h-12 border-2 transition-all text-base sm:text-sm"
                                {...field}
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-secondary transition-colors h-8 w-8 sm:h-auto sm:w-auto flex items-center justify-center touch-manipulation"
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
                        onClick={() => navigate('/forgot-password', { state: { userType: 'host' } })}
                        className="text-sm text-secondary hover:text-secondary/80 p-0 h-auto font-semibold"
                      >
                        Forgot Password?
                      </Button>
                    </div>
                    
                    <Button 
                      type="submit" 
                      className="w-full h-11 sm:h-12 text-sm sm:text-base font-semibold bg-gradient-to-r from-secondary to-secondary/90 hover:from-secondary/90 hover:to-secondary text-white shadow-lg hover:shadow-xl transition-all duration-300 touch-manipulation" 
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
                      className="w-full h-11 sm:h-12 text-sm sm:text-base font-semibold border-2 hover:bg-muted/50 hover:border-secondary/50 transition-all duration-300 touch-manipulation"
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
                <div className="mb-6 p-4 bg-gradient-to-r from-secondary/10 via-primary/10 to-secondary/10 border-2 border-secondary/30 rounded-xl shadow-md">
                  <p className="text-sm text-foreground font-medium">
                    <strong className="text-secondary">Important:</strong> Before creating your host account, you must read and accept our policies and compliance terms.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-3 w-full border-2 border-secondary/50 hover:bg-secondary/10 hover:border-secondary transition-all"
                    onClick={() => navigate('/host/policies')}
                  >
                    Review Policies & Terms
                  </Button>
                </div>
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
                              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-secondary group-focus-within:text-secondary transition-colors" />
                              <Input
                                type="text"
                                placeholder="Jane Smith"
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
                              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-secondary group-focus-within:text-secondary transition-colors" />
                              <Input
                                type="email"
                                placeholder="host@example.com"
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
                              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-secondary group-focus-within:text-secondary transition-colors" />
                              <Input
                                type={showPassword ? "text" : "password"}
                                placeholder="••••••••"
                                className="pl-10 pr-10 h-11 sm:h-12 border-2 transition-all text-base sm:text-sm"
                                {...field}
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-secondary transition-colors h-8 w-8 sm:h-auto sm:w-auto flex items-center justify-center touch-manipulation"
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
                              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-secondary group-focus-within:text-secondary transition-colors" />
                              <Input
                                type={showConfirmPassword ? "text" : "password"}
                                placeholder="••••••••"
                                className="pl-10 pr-10 h-11 sm:h-12 border-2 transition-all text-base sm:text-sm"
                                {...field}
                              />
                              <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-secondary transition-colors h-8 w-8 sm:h-auto sm:w-auto flex items-center justify-center touch-manipulation"
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
                      className="w-full h-11 sm:h-12 text-sm sm:text-base font-semibold bg-gradient-to-r from-secondary to-secondary/90 hover:from-secondary/90 hover:to-secondary text-white shadow-lg hover:shadow-xl transition-all duration-300 touch-manipulation" 
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
                      className="w-full h-11 sm:h-12 text-sm sm:text-base font-semibold border-2 hover:bg-muted/50 hover:border-secondary/50 transition-all duration-300 touch-manipulation"
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
            
            <div className="mt-8 text-center text-sm text-foreground/70 dark:text-muted-foreground space-y-2">
              <p>
                New to hosting? <Link to="/host/register" className="text-secondary hover:text-secondary/80 hover:underline font-semibold transition-colors">Get Started</Link>
              </p>
              <p>
                Not a host? <Link to="/guest/login" className="text-secondary hover:text-secondary/80 hover:underline font-semibold transition-colors">Browse as Guest</Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default HostLogin;
