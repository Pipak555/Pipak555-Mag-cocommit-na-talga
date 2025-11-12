/**
 * Host Registration Flow
 * 
 * Multi-step registration: Choose Plan -> Create Account -> Payment
 */

import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getAvailablePlans, getPlanById } from '@/lib/billingService';
import { formatPHP } from '@/lib/currency';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Check, ArrowRight, ArrowLeft, CreditCard, User, X, Home } from 'lucide-react';
import { toast } from 'sonner';
import type { HostPlan } from '@/types';

type Step = 'plan' | 'account' | 'payment';

const HostRegister = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signUp, signInWithGoogle, hasRole } = useAuth();
  const [currentStep, setCurrentStep] = useState<Step>('plan');
  const [selectedPlan, setSelectedPlan] = useState<HostPlan | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Check if user came from dashboard
  const cameFromDashboard = (location.state as any)?.from === 'dashboard' || 
                            document.referrer.includes('/host/dashboard');

  const plans = getAvailablePlans();

  // Check if policies have been accepted
  useEffect(() => {
    const policyAccepted = sessionStorage.getItem('hostPolicyAccepted');
    if (!policyAccepted) {
      // If user is already logged in and has host role, they've already accepted policies
      if (user && hasRole('host')) {
        // Set policy accepted in session so we don't redirect
        sessionStorage.setItem('hostPolicyAccepted', 'true');
      } else {
        // Redirect to policy acceptance page first
        navigate('/host/policies', { 
          state: { 
            returnTo: '/host/register',
            planId: new URLSearchParams(window.location.search).get('planId'),
            from: cameFromDashboard ? 'dashboard' : undefined
          } 
        });
      }
    }
  }, [navigate, user, hasRole, cameFromDashboard]);

  // Check if user is already logged in and has a planId in URL - go directly to payment
  useEffect(() => {
    const planIdFromUrl = new URLSearchParams(window.location.search).get('planId');
    if (user && hasRole('host') && planIdFromUrl) {
      const plan = getPlanById(planIdFromUrl);
      if (plan) {
        // User is logged in, has host role, and has a plan selected - go directly to payment
        navigate(`/host/payment?planId=${planIdFromUrl}`, { 
          state: { from: cameFromDashboard ? 'dashboard' : undefined } 
        });
      }
    }
  }, [user, hasRole, navigate, cameFromDashboard]);

  const handlePlanSelect = (plan: HostPlan) => {
    setSelectedPlan(plan);
    // If user is already logged in and has host role, skip account creation and go to payment
    if (user && hasRole('host')) {
      navigate(`/host/payment?planId=${plan.id}`, { 
        state: { from: cameFromDashboard ? 'dashboard' : (location.state as any)?.from } 
      });
    } else {
      // User needs to create account, show account creation step
      setCurrentStep('account');
    }
  };

  const handleAccountCreated = () => {
    if (selectedPlan) {
      // Navigate to payment page, preserve the 'from' state
      navigate(`/host/payment?planId=${selectedPlan.id}`, { 
        state: { from: cameFromDashboard ? 'dashboard' : (location.state as any)?.from } 
      });
    } else {
      toast.error('Please select a plan first');
      setCurrentStep('plan');
    }
  };

  const handleGoogleSignUp = async () => {
    // Check if policies have been accepted
    const policyAccepted = sessionStorage.getItem('hostPolicyAccepted');
    if (!policyAccepted) {
      toast.error('To create a host account, you must first read and accept our policies and compliance terms. Please review them and accept before continuing.');
      navigate('/host/policies', { 
        state: { 
          returnTo: '/host/register',
          planId: selectedPlan?.id
        } 
      });
      return;
    }

    setLoading(true);
    try {
      const policyAcceptedDate = sessionStorage.getItem('hostPolicyAcceptedDate') || new Date().toISOString();
      await signInWithGoogle('host', {
        policyAccepted: true,
        policyAcceptedDate
      });
      
      // Clear session storage after successful signup
      sessionStorage.removeItem('hostPolicyAccepted');
      sessionStorage.removeItem('hostPolicyAcceptedDate');
      
      // After successful signup, proceed to payment
      handleAccountCreated();
    } catch (error: any) {
      toast.error(error.message || 'Failed to sign up with Google');
    } finally {
      setLoading(false);
    }
  };

  // If user is already logged in and has selected a plan, go to payment
  if (user && selectedPlan && currentStep === 'account') {
    handleAccountCreated();
  }

  const handleBack = () => {
    if (currentStep === 'account') {
      setCurrentStep('plan');
      setSelectedPlan(null);
    } else if (currentStep === 'payment') {
      setCurrentStep('account');
    }
  };

  const handleExit = () => {
    if (window.confirm('Are you sure you want to exit registration? Your progress will be saved.')) {
      // If user is logged in and has host role, go to dashboard
      if (user && hasRole('host')) {
        navigate('/host/dashboard');
      } else if (cameFromDashboard) {
        navigate('/host/dashboard');
      } else {
        navigate('/');
      }
    }
  };

  const handleBackToHome = () => {
    // If user is logged in and has host role, go to dashboard
    if (user && hasRole('host')) {
      navigate('/host/dashboard');
    } else if (cameFromDashboard) {
      navigate('/host/dashboard');
    } else {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header with Exit Button */}
        <div className="flex justify-between items-center mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBackToHome}
          >
            <Home className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            onClick={handleExit}
            className="gap-2 text-muted-foreground hover:text-destructive"
          >
            <X className="h-4 w-4" />
            Exit
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Panel - Registration Progress */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Registration Progress</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Step 1: Choose Plan */}
                <div className="flex items-start gap-3">
                  <div className="mt-1">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                      currentStep === 'plan' 
                        ? 'bg-primary' 
                        : 'bg-primary'
                    }`}>
                      {currentStep !== 'plan' ? (
                        <Check className="h-4 w-4 text-primary-foreground" />
                      ) : (
                        <span className="text-xs font-bold text-primary-foreground">1</span>
                      )}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">1. Choose Plan</div>
                    <div className="text-sm text-muted-foreground">Select your hosting package.</div>
                  </div>
                </div>

                {/* Step 2: Create Account */}
                <div className="flex items-start gap-3">
                  <div className="mt-1">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                      currentStep === 'account' 
                        ? 'bg-primary' 
                        : currentStep === 'payment' 
                        ? 'bg-primary' 
                        : 'bg-muted'
                    }`}>
                      {currentStep === 'payment' ? (
                        <Check className="h-4 w-4 text-primary-foreground" />
                      ) : currentStep === 'account' ? (
                        <span className="text-xs font-bold text-primary-foreground">2</span>
                      ) : (
                        <span className="text-xs font-bold text-muted-foreground">2</span>
                      )}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">2. Create Account</div>
                    <div className="text-sm text-muted-foreground">Set up your host profile.</div>
                  </div>
                </div>

                {/* Step 3: Payment */}
                <div className="flex items-start gap-3">
                  <div className="mt-1">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                      currentStep === 'payment' 
                        ? 'bg-primary' 
                        : 'bg-muted'
                    }`}>
                      {currentStep === 'payment' ? (
                        <CreditCard className="h-4 w-4 text-primary-foreground" />
                      ) : (
                        <span className="text-xs font-bold text-muted-foreground">3</span>
                      )}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">3. Payment</div>
                    <div className="text-sm text-muted-foreground">Connect PayPal & pay.</div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="pt-4">
                  <div className="text-sm text-muted-foreground mb-2">Progress</div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full transition-all duration-300" 
                      style={{ 
                        width: currentStep === 'plan' ? '33%' : currentStep === 'account' ? '66%' : '100%' 
                      }}
                    ></div>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 text-right">
                    {currentStep === 'plan' ? '33%' : currentStep === 'account' ? '66%' : '100%'}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Panel - Current Step Content */}
          <div className="lg:col-span-2">
            {currentStep === 'plan' && (
              <Card>
                <CardHeader>
                  <CardTitle>Choose Your Plan</CardTitle>
                  <CardDescription>
                    Select a hosting package that fits your needs
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {plans.map((plan) => (
                      <Card
                        key={plan.id}
                        className={`cursor-pointer transition-all hover:border-primary ${
                          selectedPlan?.id === plan.id ? 'border-primary border-2' : ''
                        }`}
                        onClick={() => handlePlanSelect(plan)}
                      >
                        <CardHeader>
                          <CardTitle className="text-xl">{plan.name}</CardTitle>
                          <CardDescription>{plan.description}</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="mb-4">
                            <span className="text-3xl font-bold">{formatPHP(plan.price)}</span>
                            <span className="text-muted-foreground">/{plan.billingCycle}</span>
                          </div>
                          <ul className="space-y-2 mb-4">
                            {plan.features.map((feature, index) => (
                              <li key={index} className="flex items-start gap-2">
                                <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                                <span className="text-sm">{feature}</span>
                              </li>
                            ))}
                          </ul>
                          <Button
                            className="w-full"
                            variant={selectedPlan?.id === plan.id ? 'default' : 'outline'}
                            onClick={() => handlePlanSelect(plan)}
                          >
                            Select Plan
                            <ArrowRight className="h-4 w-4 ml-2" />
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {currentStep === 'account' && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Create Your Account</CardTitle>
                      <CardDescription>
                        Sign up to start hosting. You can also sign in if you already have an account.
                      </CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleBack}
                      className="ml-auto"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Back Button */}
                  <Button
                    variant="ghost"
                    onClick={handleBack}
                    className="mb-4 -ml-2"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Plan Selection
                  </Button>

                  <div className="text-center py-8">
                    <User className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-xl font-semibold mb-2">Ready to Start Hosting?</h3>
                    <p className="text-muted-foreground mb-6">
                      {selectedPlan && `You've selected the ${selectedPlan.name} plan (${formatPHP(selectedPlan.price)}/${selectedPlan.billingCycle}).`}
                    </p>
                    
                    <div className="space-y-3 max-w-md mx-auto">
                      <Button
                        className="w-full"
                        onClick={() => navigate('/host/login', { state: { showSignup: true, planId: selectedPlan?.id } })}
                      >
                        Create Account
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                      
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={handleGoogleSignUp}
                        disabled={loading}
                      >
                        <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
                          <path
                            fill="currentColor"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          />
                          <path
                            fill="currentColor"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          />
                          <path
                            fill="currentColor"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                          />
                          <path
                            fill="currentColor"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                          />
                        </svg>
                        Continue with Google
                      </Button>
                      
                      <div className="text-sm text-muted-foreground text-center pt-4">
                        Already have an account?{' '}
                        <Button
                          variant="link"
                          className="p-0 h-auto"
                          onClick={() => navigate('/host/login', { state: { planId: selectedPlan?.id } })}
                        >
                          Sign in
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HostRegister;

