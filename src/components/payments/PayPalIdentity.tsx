/**
 * PayPal Account Verification Component
 * 
 * Client-side only implementation (no Cloud Functions - cost-free):
 * 1. User clicks "Link PayPal Account"
 * 2. Redirects to PayPal login page
 * 3. User logs in with their PayPal credentials
 * 4. PayPal redirects back with authorization code
 * 5. Account is verified and user's account email is stored as PayPal email
 * 
 * Note: Since we can't exchange OAuth code server-side (requires Cloud Functions),
 * we use the user's account email as their PayPal email (they logged in with this email).
 * 
 * ⚠️ IMPORTANT: This is configured for SANDBOX mode only - NO REAL MONEY will be processed.
 */

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertCircle, CheckCircle2, ExternalLink, CreditCard, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { PayPalLinkInfo, PayPalRole } from "@/types";
import { buildClientLinkedInfo, getPayPalLinkPath } from "@/lib/paypalLinks";
import { diagnosePayPalOAuth, logPayPalOAuthDiagnostics } from "@/lib/paypalOAuthDiagnostics";

interface PayPalIdentityProps {
  userId: string;
  onVerified: (email: string) => void;
  paypalEmail?: string;
  paypalVerified?: boolean;
  statePrefix?: string; // Optional legacy prefix
  role?: PayPalRole;
  linkedInfo?: PayPalLinkInfo | null;
}

const PayPalIdentity = ({
  userId,
  onVerified,
  paypalEmail,
  paypalVerified,
  statePrefix,
  role = 'guest',
  linkedInfo
}: PayPalIdentityProps) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [paypalEmailInput, setPaypalEmailInput] = useState('');

  const effectiveRole: PayPalRole = (() => {
    if (role) return role;
    if (statePrefix?.startsWith('host-paypal-verify')) return 'host';
    if (statePrefix?.startsWith('admin-paypal-verify')) return 'admin';
    return 'guest';
  })();

  const resolvedStatePrefix = statePrefix || `${effectiveRole}-paypal-verify`;
  const resolvedEmail = linkedInfo?.email ?? paypalEmail;
  const resolvedVerified = !!(linkedInfo?.email || paypalVerified);

  const clientId = import.meta.env.VITE_PAYPAL_CLIENT_ID || '';
  const paypalEnv = import.meta.env.VITE_PAYPAL_ENV || 'sandbox';
  const isSandbox = paypalEnv !== 'production';
  
  // Debug: Log the actual Client ID being used (always log to catch env var issues)
  if (import.meta.env.DEV) {
    console.log('🔑 PayPal Client ID Check:', {
      clientId: clientId ? `${clientId.substring(0, 20)}...` : 'MISSING',
      clientIdLength: clientId?.length || 0,
      startsWith: clientId ? clientId.substring(0, 5) : 'N/A',
      envVar: import.meta.env.VITE_PAYPAL_CLIENT_ID ? 'Present' : 'Missing',
      note: 'If this shows old Client ID, restart dev server after updating .env'
    });
  }
  
  // Get base URL - in production, always use current origin (actual deployed URL)
  // This ensures we use the correct Firebase project URL even after project changes
  // In development, use VITE_APP_URL if set, otherwise use current origin
  const appUrl = import.meta.env.VITE_APP_URL;
  let baseUrl = import.meta.env.PROD 
    ? window.location.origin  // Production: always use actual deployed URL
    : (appUrl || window.location.origin);  // Development: use env var or current origin
  
  // Use the same redirect URI as guests (already configured in PayPal app)
  // The callback handler will route back based on state
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
  
  // Note: In production, ensure VITE_APP_URL is set correctly in .env.production
  // Example: VITE_APP_URL=https://your-project-id.web.app

  const handleOAuthCallback = useCallback(async () => {
    setVerifying(true);
    try {
      // Client-side only - no Cloud Functions (cost-free implementation)
      // OAuth callback means user successfully logged into PayPal
      // Since we can't exchange OAuth code for user info client-side (requires secret),
      // we need to prompt the user to confirm the PayPal email they just logged in with
      
      // Get the authorization code from URL
      const code = searchParams.get('code');
      if (!code) {
        toast.error('No authorization code received from PayPal.');
        return;
      }

      // Show dialog to ask for PayPal email
      // This is necessary because we can't securely exchange the OAuth code client-side
      setShowEmailDialog(true);
      setVerifying(false);
      return; // Wait for user to enter email in dialog
    } catch (error: any) {
      if (import.meta.env.DEV) {
        console.error('PayPal verification error:', error);
      }
      toast.error(error.message || 'Failed to verify PayPal account. Please try again.');
      navigate(window.location.pathname, { replace: true });
    } finally {
      setVerifying(false);
    }
  }, [userId, navigate, onVerified, effectiveRole, searchParams]);

  // Handle email submission from dialog
  const handleEmailSubmit = useCallback(async () => {
    if (!paypalEmailInput || !paypalEmailInput.trim()) {
      toast.error('Please enter the PayPal email address you logged in with.');
      return;
    }

    const accountEmail = paypalEmailInput.trim().toLowerCase();
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(accountEmail)) {
      toast.error('Please enter a valid email address.');
      return;
    }

    setVerifying(true);
    setShowEmailDialog(false);
    
    try {
      const userRef = doc(db, 'users', userId);
      const updateData: Record<string, unknown> = {};
      const linkInfo = buildClientLinkedInfo(accountEmail, effectiveRole);
      updateData[getPayPalLinkPath(effectiveRole)] = linkInfo;

      if (effectiveRole === 'admin') {
        const { setDoc } = await import('firebase/firestore');
        await setDoc(doc(db, 'adminSettings', 'paypal'), {
          paypalEmail: accountEmail,
          updatedAt: new Date().toISOString(),
        }, { merge: true });
      }

      // Legacy fields (keep for compatibility)
      if (effectiveRole === 'admin') {
        updateData.adminPayPalEmailVerified = true;
        updateData.adminPayPalOAuthVerified = true;
        updateData.adminPayPalEmail = accountEmail;
      } else if (effectiveRole === 'host') {
        updateData.hostPayPalEmailVerified = true;
        updateData.hostPayPalOAuthVerified = true;
        updateData.hostPayPalEmail = accountEmail;
      } else {
        updateData.paypalEmailVerified = true;
        updateData.paypalOAuthVerified = true;
        updateData.paypalEmail = accountEmail;
      }

      await updateDoc(userRef, updateData);
      onVerified(accountEmail);
      setPaypalEmailInput('');

      // Clean up URL
      navigate(window.location.pathname, { replace: true });
      
      toast.success('PayPal account linked successfully!');
    } catch (error: any) {
      if (import.meta.env.DEV) {
        console.error('PayPal verification error:', error);
      }
      toast.error(error.message || 'Failed to link PayPal account. Please try again.');
    } finally {
      setVerifying(false);
    }
  }, [paypalEmailInput, userId, effectiveRole, navigate, onVerified]);

  // Handle OAuth callback
  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description') || '';

    // Log all URL parameters for debugging (ALWAYS log, not just in dev)
    console.log('🔍 PayPal OAuth Callback Debug:', {
      code: code ? 'Present' : 'Missing',
      state,
      error,
      errorDescription,
      fullUrl: window.location.href,
      allParams: Object.fromEntries(new URLSearchParams(window.location.search)),
      redirectUri: redirectUri
    });
    
    // If there's an error, log it prominently
    if (error) {
      console.error('❌ PAYPAL OAUTH ERROR DETECTED:', {
        error,
        errorDescription,
        fullUrl: window.location.href,
        redirectUri: redirectUri,
        note: 'Check if redirect URI matches exactly in PayPal settings'
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

    // Handle PayPal verification state based on prefix
    const expectedState = `${resolvedStatePrefix}-${userId}`;
    if (code && state === expectedState) {
      handleOAuthCallback();
    } else if (code) {
      // Code present but state doesn't match - log for debugging
      if (import.meta.env.DEV) {
        console.warn('⚠️ PayPal OAuth code received but state mismatch:', {
          expectedState,
          receivedState: state,
          code: code ? 'Present' : 'Missing'
        });
      }
    }
  }, [searchParams, userId, navigate, handleOAuthCallback, redirectUri, statePrefix]);

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

    // Run diagnostics before proceeding
    const diagnostics = diagnosePayPalOAuth(clientId, redirectUri, isSandbox);
    logPayPalOAuthDiagnostics(diagnostics);
    
    if (!diagnostics.isValid) {
      toast.error('PayPal OAuth configuration has issues. Check console for details.');
      setLoading(false);
      return;
    }

    // Generate OAuth URL for PayPal login
    // Using PayPal's authorization endpoint
    // Use basic OpenID Connect scopes for account linking
    const state = `${resolvedStatePrefix}-${userId}`;
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
    console.log('🔍 PayPal OAuth Configuration:', {
      redirectUri,
      currentOrigin: window.location.origin,
      isProduction: import.meta.env.PROD,
      isSandbox,
      clientIdPrefix: clientId ? clientId.substring(0, 20) + '...' : 'MISSING',
      note: 'This redirect URI must be EXACTLY added to your PayPal app settings'
    });
    
    // Always log the full OAuth URL for debugging (even in production, but truncated)
    console.log('🔗 Full PayPal OAuth URL:', authUrl);
    
    // Parse and display OAuth parameters for verification
    try {
      const urlObj = new URL(authUrl);
      const params = new URLSearchParams(urlObj.search);
      console.log('📊 OAuth Parameters Breakdown:', {
        client_id: params.get('client_id')?.substring(0, 20) + '...',
        redirect_uri: params.get('redirect_uri'),
        scope: params.get('scope'),
        state: params.get('state')?.substring(0, 50) + '...',
        response_type: params.get('response_type')
      });
    } catch (e) {
      console.warn('Could not parse OAuth URL:', e);
    }
    
    if (import.meta.env.DEV) {
      console.log('📋 PayPal OAuth Debug Details:', {
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
      console.warn('');
      console.warn('🔍 TROUBLESHOOTING: If login still fails after adding redirect URI:');
      console.warn('   1. Check that the redirect URI matches EXACTLY (including http/https, port, trailing slash)');
      console.warn('   2. Verify your Client ID is correct in .env file');
      console.warn('   3. Make sure you are using the correct PayPal sandbox account credentials');
      console.warn('   4. Try creating a new sandbox account if the current one has issues');
    }

    // Redirect to PayPal login
    window.location.href = authUrl;
  };

  // If already verified, show success state (email is optional - account can be verified without email)
  if (resolvedVerified) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
            <div>
              <p className="font-medium text-green-900 dark:text-green-100">PayPal Account Verified</p>
              {resolvedEmail ? (
                <p className="text-sm text-green-700 dark:text-green-300">{resolvedEmail}</p>
              ) : (
                <p className="text-sm text-green-700 dark:text-green-300">Email will be stored on your first payment</p>
              )}
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

      {/* Email Input Dialog */}
      <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enter PayPal Email</DialogTitle>
            <DialogDescription>
              Please enter the PayPal email address you just logged in with. This will be used for all PayPal transactions.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="paypal-email">PayPal Email Address</Label>
              <Input
                id="paypal-email"
                type="email"
                placeholder="your-email@example.com"
                value={paypalEmailInput}
                onChange={(e) => setPaypalEmailInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleEmailSubmit();
                  }
                }}
                autoFocus
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-2">
                This should be the email address of the PayPal account you just logged into.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowEmailDialog(false);
                setPaypalEmailInput('');
                navigate(window.location.pathname, { replace: true });
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleEmailSubmit}
              disabled={!paypalEmailInput.trim() || verifying}
            >
              {verifying ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Linking...
                </>
              ) : (
                'Link Account'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PayPalIdentity;
