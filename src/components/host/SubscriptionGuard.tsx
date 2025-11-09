/**
 * Subscription Guard Component
 * 
 * Checks if host has active subscription and blocks access if not
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { hasActiveSubscription, getUserSubscription } from '@/lib/billingService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, CreditCard } from 'lucide-react';
import { formatPHP } from '@/lib/currency';
import type { HostSubscription } from '@/types';

interface SubscriptionGuardProps {
  children: React.ReactNode;
  showWarning?: boolean; // If true, shows warning but allows access
  required?: boolean; // If true, blocks access completely
}

export const SubscriptionGuard = ({ 
  children, 
  showWarning = false,
  required = true 
}: SubscriptionGuardProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [hasSubscription, setHasSubscription] = useState<boolean | null>(null);
  const [subscription, setSubscription] = useState<HostSubscription | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSubscription = async () => {
      if (!user) {
        setHasSubscription(false);
        setLoading(false);
        return;
      }

      try {
        const active = await hasActiveSubscription(user.uid);
        setHasSubscription(active);
        
        if (active) {
          const sub = await getUserSubscription(user.uid);
          setSubscription(sub);
        }
      } catch (error) {
        console.error('Error checking subscription:', error);
        setHasSubscription(false);
      } finally {
        setLoading(false);
      }
    };

    checkSubscription();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Checking subscription...</p>
        </div>
      </div>
    );
  }

  // If subscription is required and user doesn't have one, block access
  if (required && !hasSubscription) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <AlertCircle className="h-6 w-6 text-destructive" />
              <CardTitle>Subscription Required</CardTitle>
            </div>
            <CardDescription>
              You need an active subscription to access this feature.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              To create listings and manage your properties, you need to subscribe to one of our hosting plans.
            </p>
            <div className="space-y-2">
              <Button 
                className="w-full" 
                onClick={() => navigate('/host/register')}
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Subscribe Now
              </Button>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => navigate('/host/dashboard')}
              >
                Back to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If showWarning is true and no subscription, show warning but allow access
  if (showWarning && !hasSubscription) {
    return (
      <>
        <Card className="mb-6 border-yellow-500/50 bg-yellow-500/10">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold mb-1">Subscription Required</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  You need an active subscription to create and manage listings. Subscribe now to unlock all features.
                </p>
                <Button 
                  size="sm"
                  onClick={() => navigate('/host/register')}
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  Subscribe Now
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        {children}
      </>
    );
  }

  // If subscription is active or not required, show children
  return <>{children}</>;
};

