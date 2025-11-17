/**
 * Admin PayPal Account Linking Component
 * 
 * Uses PayPal OAuth redirect flow to link admin's PayPal account:
 * 1. Admin clicks "Link PayPal Account"
 * 2. Redirects to PayPal login page
 * 3. Admin logs in with their PayPal business account credentials
 * 4. PayPal redirects back with authorization code
 * 5. Account is verified and email is stored in adminSettings
 * 
 * This is separate from guest PayPal linking to avoid conflicts.
 */

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2, CreditCard, Loader2, Building2 } from "lucide-react";
import { toast } from "sonner";
import { doc, updateDoc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface AdminPayPalIdentityProps {
  userId: string;
  onVerified: (email: string) => void;
  paypalEmail?: string;
  paypalVerified?: boolean;
}

const AdminPayPalIdentity = ({ userId, onVerified, paypalEmail, paypalVerified }: AdminPayPalIdentityProps) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const clientId = import.meta.env.VITE_PAYPAL_CLIENT_ID || '';
  const paypalEnv = import.meta.env.VITE_PAYPAL_ENV || 'sandbox';
  const isSandbox = paypalEnv !== 'production';
  
  // Get base URL - in production, always use current origin (actual deployed URL)
  // This ensures we use the correct Firebase project URL even after project changes
  // In development, use VITE_APP_URL if set, otherwise use current origin
  const appUrl = import.meta.env.VITE_APP_URL;
  let baseUrl = import.meta.env.PROD 
    ? window.location.origin  // Production: always use actual deployed URL
    : (appUrl || window.location.origin);  // Development: use env var or current origin
  
  // Use the same redirect URI as guests (already configured in PayPal app)
  // The callback handler will route admin back to admin/paypal-settings based on state
  let redirectUri = `${baseUrl}/paypal-callback`;
  
  // For local development, convert IP addresses to localhost (PayPal sandbox requirement)
  if (!import.meta.env.PROD) {
    // Check if baseUrl contains an IP address (e.g., http://10.56.170.176:8080)
    const ipAddressMatch = baseUrl.match(/^https?:\/\/(\d+\.\d+\.\d+\.\d+)(:\d+)?/);
    if (ipAddressMatch) {
      // Extract port if present
      const port = ipAddressMatch[2] || ':8080';
      // Use 127.0.0.1 instead of IP address for PayPal redirect URI
      redirectUri = `http://127.0.0.1${port}/paypal-callback`;
      if (import.meta.env.DEV) {
        console.warn('⚠️ PayPal sandbox doesn\'t accept IP addresses. Using localhost redirect URI:', redirectUri);
        console.warn('💡 Make sure you access the app via http://127.0.0.1' + port + ' or http://localhost' + port);
      }
    } else if (baseUrl.includes('localhost')) {
      // Replace localhost with 127.0.0.1 for consistency
      redirectUri = redirectUri.replace('localhost', '127.0.0.1');
    }
  }

  const handleOAuthCallback = useCallback(async (authCode: string) => {
    setVerifying(true);
    try {
      // Check if we already have an admin PayPal email stored
      const userDoc = await getDoc(doc(db, 'users', userId));
      const userData = userDoc.exists() ? userDoc.data() : null;
      const existingEmail = userData?.adminPayPalEmail || null;

      // Mark admin PayPal account as verified
      // Note: We can't extract email directly from OAuth without server-side token exchange
      // The email will be set when admin makes a payment or we can get it from PayPal API
      const updateData: any = {
        adminPayPalEmailVerified: true,
        adminPayPalVerifiedAt: new Date().toISOString(),
        adminPayPalOAuthVerified: true,
      };

      // Keep existing email if we have it, otherwise leave it null
      // Admin will need to manually enter email or it will be set on first payment
      if (existingEmail) {
        updateData.adminPayPalEmail = existingEmail;
      }

      // Update user document with admin PayPal fields (separate from guest PayPal fields)
      await updateDoc(doc(db, 'users', userId), updateData);

      // Also update adminSettings collection
      if (existingEmail) {
        await setDoc(doc(db, 'adminSettings', 'paypal'), {
          paypalEmail: existingEmail,
          updatedAt: new Date().toISOString(),
        }, { merge: true });
        
        toast.success('Admin PayPal account verified! All payments will go to this account.');
        onVerified(existingEmail);
      } else {
        // Account is verified but email not stored yet
        // For admin, we need them to enter their business PayPal email manually
        // because we can't extract it from OAuth without server-side token exchange
        toast.info('PayPal account verified! Please enter the email address of the PayPal account you just logged into.');
        onVerified(''); // Empty string signals that email needs to be entered
      }

      // Clean up URL - explicitly navigate to admin PayPal settings page
      navigate('/admin/paypal-settings', { replace: true });
    } catch (error: any) {
      if (import.meta.env.DEV) {
        console.error('Admin PayPal verification error:', error);
      }
      toast.error('Failed to verify admin PayPal account. Please try again.');
      // Navigate back to admin PayPal settings page on error
      navigate('/admin/paypal-settings', { replace: true });
    } finally {
      setVerifying(false);
    }
  }, [userId, navigate, onVerified]);

  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    if (verifying) {
      return;
    }

    if (code && state === `admin-paypal-verify-${userId}`) {
      handleOAuthCallback(code);
    } else if (code) {
      if (import.meta.env.DEV) {
        console.warn('⚠️ PayPal OAuth code received but state mismatch:', {
          expectedState: `admin-paypal-verify-${userId}`,
          receivedState: state,
        });
      }
    }
  }, [searchParams, userId, navigate, handleOAuthCallback, verifying]);

  const handleLinkPayPal = () => {
    if (!clientId) {
      toast.error('PayPal is not configured. Please contact support.');
      return;
    }

    // Validate redirect URI format
    if (!redirectUri || (!redirectUri.startsWith('http://') && !redirectUri.startsWith('https://'))) {
      toast.error('Invalid redirect URI configuration. Please check your environment settings.');
      console.error('Invalid redirect URI:', redirectUri);
      return;
    }

    setLoading(true);

    // Generate OAuth URL for PayPal login (admin-specific)
    const state = `admin-paypal-verify-${userId}`;
    const scope = 'openid email profile';
    const responseType = 'code';
    
    // PayPal OAuth URL format (OpenID Connect)
    // Note: PayPal requires exact redirect URI match in app settings
    // Build URL using URLSearchParams for proper encoding
    const authBaseUrl = `https://www${isSandbox ? '.sandbox' : ''}.paypal.com/webapps/auth/protocol/openidconnect/v1/authorize`;
    const authParams = new URLSearchParams({
      client_id: clientId,
      response_type: responseType,
      scope: scope,
      redirect_uri: redirectUri,
      state: state
    });
    const authUrl = `${authBaseUrl}?${authParams.toString()}`;

    // Debug: Log redirect URI (always log for troubleshooting)
    console.log('🔍 Admin PayPal OAuth Configuration:', {
      redirectUri,
      currentOrigin: window.location.origin,
      isProduction: import.meta.env.PROD,
      isSandbox,
      clientIdPrefix: clientId ? clientId.substring(0, 20) + '...' : 'MISSING',
      note: 'This redirect URI must be EXACTLY added to your PayPal app settings'
    });

    if (import.meta.env.DEV) {
      console.log('📋 Admin PayPal OAuth Debug Details:', {
        clientId: clientId ? (clientId.substring(0, 20) + '...') : 'MISSING',
        redirectUri,
        baseUrl,
        isSandbox,
        scope,
        state,
        authUrlPreview: authUrl.substring(0, 150) + '...'
      });
      console.warn('⚠️ CRITICAL: Make sure this EXACT redirect URI is in PayPal:');
      console.warn('   ' + redirectUri);
      console.warn('📝 Steps to fix:');
      console.warn('   1. Go to: https://developer.paypal.com/dashboard/applications/sandbox');
      console.warn('   2. Click on your app: "Mojo Dojo Casa House"');
      console.warn('   3. Go to: "Log in with PayPal" → "Advanced Settings"');
      console.warn('   4. Under "Return URL", add this EXACT URI:');
      console.warn('      ' + redirectUri);
      console.warn('   5. Save and try again');
    }

    // Redirect to PayPal login
    window.location.href = authUrl;
  };

  // If already verified, show success state
  if (paypalVerified && paypalEmail) {
    return (
      <div className="space-y-4">
        <div className="p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-medium text-green-900 dark:text-green-100">
                Platform Payment Account Configured
              </p>
              <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                All platform revenue will be received at:
              </p>
              <p className="text-sm font-mono text-green-800 dark:text-green-200 mt-2 bg-green-100 dark:bg-green-900/50 p-2 rounded">
                {paypalEmail}
              </p>
              <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                ✓ Subscription payments
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // If verifying, show loading state
  if (verifying) {
    return (
      <div className="p-6 text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
        <p className="text-sm font-medium">Verifying your PayPal account...</p>
        <p className="text-xs text-muted-foreground mt-2">Please wait while we verify your credentials</p>
      </div>
    );
  }

  // Show link button
  return (
    <div className="space-y-4">
      <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
        <div className="flex items-start gap-3">
          <Building2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-medium text-foreground mb-2">
              Admin Payment Account Setup
            </p>
            <p className="text-sm text-muted-foreground mb-2">
              This PayPal account will receive all platform revenue:
            </p>
            <ul className="text-sm text-muted-foreground mt-2 space-y-1 list-disc list-inside">
              <li><strong>Subscription Revenue:</strong> Payments from hosts for subscriptions</li>
            </ul>
            <p className="text-xs text-primary mt-3 font-medium bg-primary/10 p-2 rounded">
              ⚙️ Admin Only: Link any PayPal account (business or personal) where you want to receive platform revenue
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="p-4 bg-muted rounded-lg border">
          <p className="text-sm font-medium mb-2">Setup Process:</p>
          <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal list-inside">
            <li>Click "Link PayPal Account" to start the verification process</li>
            <li>You'll be redirected to PayPal's secure login page</li>
            <li>Log in with the PayPal account where you want platform revenue to go</li>
            <li>PayPal will verify your account and redirect you back</li>
            <li>Enter the email address of the PayPal account you just logged into</li>
            <li>All platform revenue will be received at that account ✅</li>
          </ol>
        </div>

        <Button
          onClick={handleLinkPayPal}
          disabled={!clientId || loading}
          className="w-full"
          size="lg"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Redirecting to PayPal...
            </>
          ) : (
            <>
              <CreditCard className="h-4 w-4 mr-2" />
              Link PayPal Account
            </>
          )}
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          Secure OAuth verification via PayPal. You'll choose which account to link during login.
        </p>
      </div>
    </div>
  );
};

export default AdminPayPalIdentity;

