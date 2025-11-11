/**
 * Host Payment Success Page
 * 
 * Shows success message after payment completion
 */

import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getPlanById, getUserSubscription } from '@/lib/billingService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, ArrowRight, Home } from 'lucide-react';
import { toast } from 'sonner';
import type { HostPlan } from '@/types';

const HostPaymentSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [plan, setPlan] = useState<HostPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscriptionStatus, setSubscriptionStatus] = useState<'active' | 'pending' | 'unknown'>('unknown');

  const planId = searchParams.get('planId') || 'active-host-monthly';

  useEffect(() => {
    if (!user) return;
    
    // Wait a moment for auth state to stabilize (in case of redirect from PayPal)
    const checkAuth = setTimeout(() => {
      const urlUserId = searchParams.get('userId');
      
      // Verify the userId in URL matches the current user (if provided)
      if (urlUserId && urlUserId !== user.uid) {
        console.warn('User ID mismatch detected. URL userId:', urlUserId, 'Current user:', user.uid);
        toast.error('Payment verification failed. Please contact support if you completed payment.');
        navigate('/host/dashboard');
        return;
      }

      // Load plan
      const selectedPlan = getPlanById(planId);
      if (!selectedPlan) {
        toast.error('Invalid plan selected');
        navigate('/host/register');
        return;
      }

      setPlan(selectedPlan);
    }, 500);

    return () => clearTimeout(checkAuth);
  }, [planId, user, navigate, searchParams]);

  // Separate effect for subscription verification (runs after plan is set)
  useEffect(() => {
    if (!user || !plan) return;

    // Verify subscription was created (with retry logic)
    const verifySubscription = async (retryCount = 0) => {
      try {
        // Wait a bit for subscription to be created (if just paid)
        if (retryCount === 0) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        const subscription = await getUserSubscription(user.uid);
        if (subscription && subscription.status === 'active') {
          // Subscription is active - no warning needed
          setSubscriptionStatus('active');
          console.log('✅ Subscription verified and active:', subscription);
          setLoading(false);
        } else {
          // Subscription not found or not active
          if (retryCount < 3) {
            // Retry up to 3 times (subscription might still be processing)
            console.log(`⏳ Subscription not found yet, retrying... (${retryCount + 1}/3)`);
            setTimeout(() => verifySubscription(retryCount + 1), 2000);
          } else {
            // After 3 retries, show pending status
            setSubscriptionStatus('pending');
            console.warn('⚠️ Subscription not yet active after retries:', subscription);
            setLoading(false);
            // Only show warning toast once
            setTimeout(() => {
              toast.warning('Payment received but subscription activation is pending. Please wait a moment or refresh the page.');
            }, 500);
          }
        }
      } catch (error) {
        console.error('Error verifying subscription:', error);
        if (retryCount < 2) {
          // Retry on error
          setTimeout(() => verifySubscription(retryCount + 1), 2000);
        } else {
          setSubscriptionStatus('unknown');
          setLoading(false);
        }
      }
    };

    verifySubscription();
  }, [user, plan]);

  if (loading || !plan) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Verifying payment...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full">
        <CardContent className="p-8">
          <div className="text-center">
            {/* Success Icon */}
            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="h-12 w-12 text-green-600 dark:text-green-400" />
            </div>

            {/* Success Message */}
            <h1 className="text-3xl font-bold mb-4">Payment Successful!</h1>
            <p className="text-lg text-muted-foreground mb-8">
              {subscriptionStatus === 'active' 
                ? `Your subscription to ${plan.name} has been activated.`
                : subscriptionStatus === 'pending'
                ? `Payment received! Your subscription to ${plan.name} is being activated...`
                : `Payment received! Processing your subscription to ${plan.name}...`}
            </p>

            {/* Subscription Details */}
            <div className="bg-muted rounded-lg p-6 mb-8 text-left">
              <h2 className="font-semibold mb-4">Subscription Details</h2>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Plan:</span>
                  <span className="font-medium">{plan.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Billing Cycle:</span>
                  <span className="font-medium capitalize">{plan.billingCycle}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <span className={`font-medium ${
                    subscriptionStatus === 'active' 
                      ? 'text-green-600 dark:text-green-400' 
                      : subscriptionStatus === 'pending'
                      ? 'text-yellow-600 dark:text-yellow-400'
                      : 'text-muted-foreground'
                  }`}>
                    {subscriptionStatus === 'active' ? 'Active' : subscriptionStatus === 'pending' ? 'Activating...' : 'Processing...'}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                onClick={() => navigate('/host/dashboard')}
                className="min-w-[200px]"
              >
                Go to Dashboard
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate('/host/dashboard')}
              >
                <Home className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </div>

            {/* Additional Info */}
            <p className="text-sm text-muted-foreground mt-8">
              {subscriptionStatus === 'active' 
                ? 'You can now start creating listings and managing your properties.'
                : subscriptionStatus === 'pending'
                ? 'Your subscription is being activated. This may take a few moments.'
                : 'Processing your subscription activation...'}
            </p>
            
            {/* Warning message - only show if subscription is pending */}
            {subscriptionStatus === 'pending' && (
              <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  <strong>Note:</strong> Payment received but subscription activation is pending. Please wait a moment or refresh the page. If the issue persists, contact support.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default HostPaymentSuccess;

