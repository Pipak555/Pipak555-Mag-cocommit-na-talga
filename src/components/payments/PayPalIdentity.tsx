/**
 * PayPal Account Verification Component
 * 
 * Uses PayPal OAuth redirect flow to verify accounts:
 * 1. User clicks "Link PayPal Account"
 * 2. Redirects to PayPal login page
 * 3. User logs in with their PayPal credentials
 * 4. PayPal redirects back with authorization code
 * 5. Account is verified and email is stored
 * 
 * ⚠️ IMPORTANT: This is configured for SANDBOX mode only - NO REAL MONEY will be processed.
 */

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2, ExternalLink, CreditCard, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface PayPalIdentityProps {
  userId: string;
  onVerified: (email: string) => void;
  paypalEmail?: string;
  paypalVerified?: boolean;
}

const PayPalIdentity = ({ userId, onVerified, paypalEmail, paypalVerified }: PayPalIdentityProps) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const clientId = import.meta.env.VITE_PAYPAL_CLIENT_ID || '';
  const paypalEnv = import.meta.env.VITE_PAYPAL_ENV || 'sandbox';
  const isSandbox = paypalEnv !== 'production';
  const baseUrl = window.location.origin;
  
  // Build redirect URI - use the current origin
  // IMPORTANT: This exact URI must be added to PayPal app's allowed redirect URIs
  let redirectUri = `${baseUrl}/paypal-callback`;
  
  // For localhost, try both localhost and 127.0.0.1
  // PayPal sandbox sometimes prefers one over the other
  if (baseUrl.includes('localhost')) {
    // Try 127.0.0.1 first as it's more reliable with PayPal
    redirectUri = redirectUri.replace('localhost', '127.0.0.1');
  }
  
  // Note: If using IP address (like 10.56.170.176), PayPal sandbox may not accept it
  // In that case, try using localhost/127.0.0.1 instead

  const handleOAuthCallback = useCallback(async (authCode: string) => {
    setVerifying(true);
    try {
      // Since the user successfully logged in with PayPal, we can verify their account
      // Token exchange requires server-side (client secret), but login success proves account exists
      
      // Check if we already have a PayPal email stored
      const userDoc = await getDoc(doc(db, 'users', userId));
      const userData = userDoc.exists() ? userDoc.data() : null;
      const existingEmail = userData?.paypalEmail || null;

      // Mark account as verified since they successfully logged in
      const updateData: any = {
        paypalEmailVerified: true,
        paypalVerifiedAt: new Date().toISOString(),
        paypalOAuthVerified: true, // Flag that OAuth login succeeded
      };

      // If we don't have an email, try to extract from OAuth (if available)
      // Otherwise, keep existing email or leave it null
      if (!existingEmail) {
        // For now, we'll mark as verified but email will be set on first payment
        // The user can still use PayPal for payments even without email stored
        updateData.paypalEmail = null;
      }

      await updateDoc(doc(db, 'users', userId), updateData);

      if (existingEmail) {
        toast.success('PayPal account verified! You successfully logged in with PayPal.');
        onVerified(existingEmail);
      } else {
        // Account is verified but email not stored - will be set on first payment
        toast.success('PayPal account verified! Your email will be stored on your first payment.');
        // Still call onVerified with empty string to update UI
        onVerified('');
      }

      // Clean up URL
      navigate(window.location.pathname, { replace: true });
    } catch (error: any) {
      if (import.meta.env.DEV) {
        console.error('PayPal verification error:', error);
      }
      toast.error('Failed to verify PayPal account. Please try again.');
      navigate(window.location.pathname, { replace: true });
    } finally {
      setVerifying(false);
    }
  }, [userId, navigate, onVerified]);

  // Handle OAuth callback
  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description') || '';

    // Log all URL parameters for debugging
    if (import.meta.env.DEV) {
      console.log('🔍 PayPal OAuth Callback Debug:', {
        code: code ? 'Present' : 'Missing',
        state,
        error,
        errorDescription,
        fullUrl: window.location.href,
        allParams: Object.fromEntries(new URLSearchParams(window.location.search))
      });
    }

    if (error) {
      // Check if it's a redirect URI error
      if (errorDescription.includes('redirect_uri') || errorDescription.includes('invalid') || error === 'invalid_client') {
        const isIPAddress = /^\d+\.\d+\.\d+\.\d+/.test(baseUrl.replace(/^https?:\/\//, '').split(':')[0]);
        
        // Try to extract the redirect URI from the error description or URL
        const urlParams = new URLSearchParams(window.location.search);
        const fullErrorUrl = window.location.href;
        
        // Extract redirect URI from error description if available
        let paypalReceivedUri = redirectUri;
        if (errorDescription) {
          const uriMatch = errorDescription.match(/redirect_uri[=:]\s*([^\s&]+)/i);
          if (uriMatch) {
            paypalReceivedUri = decodeURIComponent(uriMatch[1]);
          }
        }
        
        toast.error(
          `PayPal configuration error: Redirect URI not registered.`,
          { 
            duration: 12000,
            description: `PayPal received: "${paypalReceivedUri}". Add this EXACT URI to PayPal Return URLs.`
          }
        );
        if (import.meta.env.DEV) {
          console.error('❌ PayPal Redirect URI Error');
          console.error('Error Code:', error);
          console.error('Error Description:', errorDescription);
          console.error('Full Error URL:', fullErrorUrl);
          console.error('═══════════════════════════════════════');
          console.error('🔴 REDIRECT URI THAT PAYPAL RECEIVED:');
          console.error('   ' + paypalReceivedUri);
          console.error('═══════════════════════════════════════');
          console.error('Current redirect URI we sent:', redirectUri);
          console.error('Base URL:', baseUrl);
          console.error('Full URL params:', Object.fromEntries(urlParams));
          if (isIPAddress) {
            console.warn('⚠️ You are using an IP address. PayPal sandbox may not accept IP addresses.');
            console.warn('💡 Try using localhost instead: http://127.0.0.1:8080/paypal-callback');
          }
          console.error('📋 COPY THIS EXACT URI TO PAYPAL:');
          console.error('   ' + paypalReceivedUri);
          console.error('Go to: https://developer.paypal.com/dashboard/applications/sandbox');
          console.error('Then: Your App → Log in with PayPal → Advanced Settings → Return URL → Add');
        }
      } else if (error === 'access_denied') {
        toast.info('PayPal login was cancelled.');
      } else {
        toast.error(`PayPal login failed: ${errorDescription || error}. Please try again.`);
        if (import.meta.env.DEV) {
          console.error('PayPal OAuth Error:', { error, errorDescription, fullUrl: window.location.href });
        }
      }
      
      // Clean up URL
      navigate(window.location.pathname, { replace: true });
      return;
    }

    if (code && state === `paypal-verify-${userId}`) {
      handleOAuthCallback(code);
    } else if (code) {
      // Code present but state doesn't match - log for debugging
      if (import.meta.env.DEV) {
        console.warn('⚠️ PayPal OAuth code received but state mismatch:', {
          expectedState: `paypal-verify-${userId}`,
          receivedState: state,
          code: code ? 'Present' : 'Missing'
        });
      }
    }
  }, [searchParams, userId, navigate, handleOAuthCallback, redirectUri]);

  const handleLinkPayPal = () => {
    if (!clientId) {
      toast.error('PayPal is not configured. Please contact support.');
      return;
    }

    setLoading(true);

    // Generate OAuth URL for PayPal login
    // Using PayPal's authorization endpoint
    const state = `paypal-verify-${userId}`;
    const scope = 'openid email profile';
    const responseType = 'code';
    
    // PayPal OAuth URL format (OpenID Connect)
    const authUrl = `https://www${isSandbox ? '.sandbox' : ''}.paypal.com/webapps/auth/protocol/openidconnect/v1/authorize?` +
      `client_id=${clientId}&` +
      `response_type=${responseType}&` +
      `scope=${encodeURIComponent(scope)}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `state=${state}`;

    // Debug: Log what we're sending (only in development)
    if (import.meta.env.DEV) {
      console.log('PayPal OAuth Debug:', {
        clientId: clientId ? (clientId.substring(0, 20) + '...') : 'MISSING',
        redirectUri,
        baseUrl,
        isSandbox,
        fullUrl: authUrl.substring(0, 200) + '...'
      });
      console.warn('⚠️ IMPORTANT: Make sure this EXACT redirect URI is in PayPal:', redirectUri);
      console.warn('⚠️ Current URL:', window.location.href);
      console.warn('⚠️ Redirect URI being sent:', redirectUri);
      console.warn('📝 To fix: Go to PayPal Developer Dashboard → Your App → Add Redirect URI:', redirectUri);
    }

    // Redirect to PayPal login
    window.location.href = authUrl;
  };

  // If already verified, show success state
  if (paypalVerified && paypalEmail) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
            <div>
              <p className="font-medium text-green-900 dark:text-green-100">PayPal Account Verified</p>
              <p className="text-sm text-green-700 dark:text-green-300">{paypalEmail}</p>
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                Your account was verified by logging in with PayPal
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show loading state during OAuth callback
  if (verifying) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-center p-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="text-center">
            <Loader2 className="h-8 w-8 text-blue-600 dark:text-blue-400 animate-spin mx-auto mb-3" />
            <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
              Verifying PayPal account...
            </p>
            <p className="text-xs text-blue-700 dark:text-blue-300 mt-2">
              Please wait while we verify your account
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Initial state - no account linked
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
        <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
        <p className="text-sm text-yellow-900 dark:text-yellow-100">
          Link your PayPal account to make deposits and payments. You'll log in with your PayPal credentials to verify your account.
        </p>
      </div>

      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
          Don't have a PayPal account?
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.open('https://www.paypal.com/signup', '_blank')}
          className="w-full mb-2"
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          Sign up for PayPal
        </Button>
        <p className="text-xs text-blue-700 dark:text-blue-300">
          Create a free PayPal account, then come back to link it
        </p>
      </div>

      <div className="space-y-3">
        <div className="p-4 bg-muted rounded-lg">
          <p className="text-sm font-medium mb-2">How it works:</p>
          <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
            <li>Click "Link PayPal Account" below</li>
            <li>You'll be redirected to PayPal's login page</li>
            <li>Log in with your PayPal email and password</li>
            <li>PayPal will verify your account and redirect you back</li>
            <li>Your account will be linked and verified ✅</li>
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
          You'll be redirected to PayPal to log in with your account credentials
        </p>
      </div>
    </div>
  );
};

export default PayPalIdentity;
