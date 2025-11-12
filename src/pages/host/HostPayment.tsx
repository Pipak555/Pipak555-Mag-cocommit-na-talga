/**
 * Host Payment Page
 * 
 * Complete payment page for host subscription with PayPal integration
 * Matches the billing system design from the image
 */

import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { PayPalButton } from '@/components/payments/PayPalButton';
import { getPlanById, getUserSubscription } from '@/lib/billingService';
import { formatPHP } from '@/lib/currency';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, ArrowLeft, CreditCard, X, Home, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { HostPlan } from '@/types';

const HostPayment = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user, hasRole } = useAuth();
  const [plan, setPlan] = useState<HostPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentCompleted, setPaymentCompleted] = useState(false);
  const [checkingPayment, setCheckingPayment] = useState(true);
  
  // Check if user came from dashboard
  const cameFromDashboard = (location.state as any)?.from === 'dashboard' || 
                            document.referrer.includes('/host/dashboard');

  const planId = searchParams.get('planId') || 'active-host-monthly';
  const isSuccessPage = location.pathname === '/host/payment/success';

  useEffect(() => {
    if (!user) {
      toast.error('Please sign in to continue');
      navigate('/host/login');
      return;
    }

    const selectedPlan = getPlanById(planId);
    if (!selectedPlan) {
      toast.error('Invalid plan selected');
      navigate('/host/register');
      return;
    }

    setPlan(selectedPlan);

    // Check if payment was already completed
    const checkPaymentStatus = async () => {
      try {
        const subscription = await getUserSubscription(user.uid);
        if (subscription && subscription.status === 'active' && subscription.planId === planId) {
          setPaymentCompleted(true);
          // If on payment page but payment is complete, redirect to success
          if (!isSuccessPage) {
            navigate(`/host/payment/success?planId=${planId}`, { replace: true });
            return;
          }
        }
      } catch (error) {
        console.error('Error checking payment status:', error);
      } finally {
        setCheckingPayment(false);
        setLoading(false);
      }
    };

    checkPaymentStatus();
  }, [planId, user, navigate, isSuccessPage]);

  const handlePaymentSuccess = async () => {
    if (!user || !plan) return;

    try {
      // The PayPal button will handle the payment processing
      // This callback is called after successful payment
      setPaymentCompleted(true);
      
      // Redirect to success page
      setTimeout(() => {
        navigate(`/host/payment/success?planId=${plan.id}`, { replace: true });
      }, 500);
    } catch (error: any) {
      console.error('Error processing payment:', error);
      toast.error('Payment processed but there was an error activating your subscription. Please contact support.');
    }
  };

  // Note: PayPalButton now handles subscription processing internally
  // This function is called after successful payment

  if (loading || checkingPayment || !plan) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="mt-4 text-muted-foreground">
            {checkingPayment ? 'Checking payment status...' : 'Loading payment page...'}
          </p>
        </div>
      </div>
    );
  }

  // If payment is already completed, show success message
  if (paymentCompleted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-2xl w-full">
          <CardContent className="p-8 text-center">
            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Check className="h-12 w-12 text-green-600 dark:text-green-400" />
            </div>
            <h1 className="text-3xl font-bold mb-4">Payment Already Completed</h1>
            <p className="text-muted-foreground mb-8">
              Your subscription is already active. Redirecting to dashboard...
            </p>
            <Button onClick={() => navigate('/host/dashboard')}>
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleExit = () => {
    if (window.confirm('Are you sure you want to exit? Your payment progress will not be saved.')) {
      // If user came from dashboard, go back there
      if (cameFromDashboard || (user && hasRole('host'))) {
        navigate('/host/dashboard');
      } else {
        navigate('/host/settings');
      }
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
            onClick={() => navigate('/host/register')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/host/dashboard')}
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
                    <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                      <Check className="h-4 w-4 text-primary-foreground" />
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
                    <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                      <Check className="h-4 w-4 text-primary-foreground" />
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
                      paymentCompleted ? 'bg-green-600' : 'bg-primary'
                    }`}>
                      {paymentCompleted ? (
                        <Check className="h-4 w-4 text-white" />
                      ) : (
                        <CreditCard className="h-4 w-4 text-primary-foreground" />
                      )}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">3. Payment</div>
                    <div className="text-sm text-muted-foreground">
                      {paymentCompleted ? 'Payment completed!' : 'Complete your payment.'}
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="pt-4">
                  <div className="text-sm text-muted-foreground mb-2">Progress</div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all ${
                        paymentCompleted ? 'bg-green-600' : 'bg-primary'
                      }`}
                      style={{ width: paymentCompleted ? '100%' : '66%' }}
                    ></div>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 text-right">
                    {paymentCompleted ? '100%' : '66%'}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Panel - Complete Payment */}
          <div className="lg:col-span-2">
            <Card>
              <CardContent className="p-8">
                {/* Header */}
                <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <CreditCard className="h-8 w-8 text-primary" />
                  </div>
                  <h1 className="text-3xl font-bold mb-2">Complete Payment</h1>
                  <p className="text-muted-foreground">
                    You'll be redirected to PayPal to complete your payment.
                  </p>
                </div>

                {/* Order Summary */}
                <div className="mb-8">
                  <h2 className="text-lg font-semibold mb-4">Order Summary</h2>
                  <div className="space-y-3 border rounded-lg p-4">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Plan:</span>
                      <span className="font-medium">{plan.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Billing:</span>
                      <span className="font-medium capitalize">{plan.billingCycle}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Amount:</span>
                      <span className="font-medium">{formatPHP(plan.price)}</span>
                    </div>
                    <div className="border-t pt-3 mt-3">
                      <div className="flex justify-between">
                        <span className="font-semibold">Total Due:</span>
                        <span className="font-bold text-primary text-lg">{formatPHP(plan.price)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Payment Options */}
                <div className="space-y-6">
                  {/* PayPal Checkout Option */}
                  <div className="border-2 border-primary rounded-lg p-6 bg-primary/5">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-lg mb-1">PayPal Checkout</h3>
                        <p className="text-sm text-muted-foreground">
                          Secure payment with PayPal.
                        </p>
                      </div>
                      <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                      Click the button below to complete your payment. You'll be redirected to PayPal to securely complete the transaction.
                    </p>
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 mb-4">
                      <p className="text-xs text-yellow-800 dark:text-yellow-200">
                        <strong>Note:</strong> You don't need to link your PayPal account beforehand. You'll log in to PayPal during checkout.
                      </p>
                    </div>

                    {/* PayPal Button */}
                    {user && (
                      <div className="space-y-4">
                        <div className="border-t pt-4">
                          <div className="flex justify-between items-center mb-4">
                            <span className="text-sm font-medium">Pay with PayPal</span>
                            <span className="text-lg font-bold text-primary">{formatPHP(plan.price)}</span>
                          </div>
                          
                          <PayPalButton
                            amount={plan.price}
                            userId={user.uid}
                            description={`Host subscription: ${plan.name} (${plan.billingCycle}) - planId=${plan.id}`}
                            onSuccess={handlePaymentSuccess}
                            redirectUrl={`${window.location.origin}/host/payment/success?planId=${plan.id}&userId=${user.uid}`}
                          />

                          <div className="mt-4 text-center">
                            <Button
                              variant="outline"
                              className="w-full"
                              onClick={() => {
                                // Alternative payment method (could be credit card)
                                toast.info('Credit card payment coming soon');
                              }}
                            >
                              <CreditCard className="h-4 w-4 mr-2" />
                              Debit or Credit Card
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="text-center text-sm text-muted-foreground">
                    Powered by PayPal
                  </div>

                  {/* Debug Message (only in dev) */}
                  {import.meta.env.DEV && (
                    <div className="text-xs text-muted-foreground text-center">
                      Debug: PayPal button ready!
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HostPayment;

