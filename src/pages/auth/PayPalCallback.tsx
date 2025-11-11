/**
 * PayPal OAuth Callback Handler
 * 
 * This page handles the redirect from PayPal OAuth flow.
 * It extracts the authorization code and redirects to the wallet page
 * where the PayPalIdentity component will handle verification.
 */

import { useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

const PayPalCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    // Get OAuth parameters
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    // Log all parameters for debugging (especially when there's an error)
    if (import.meta.env.DEV) {
      console.log('🔍 PayPalCallback - All URL Parameters:', {
        code: code ? 'Present' : 'Missing',
        state,
        error,
        errorDescription,
        fullUrl: window.location.href,
        allParams: Object.fromEntries(searchParams)
      });
      
      if (error) {
        console.error('❌ PayPal Error Detected in Callback');
        console.error('Error:', error);
        console.error('Error Description:', errorDescription);
        console.error('Full URL:', window.location.href);
        
        // Try to extract redirect_uri from the full URL if present
        const fullUrl = window.location.href;
        const uriMatch = fullUrl.match(/redirect_uri=([^&]+)/i);
        if (uriMatch) {
          const receivedUri = decodeURIComponent(uriMatch[1]);
          console.error('═══════════════════════════════════════');
          console.error('🔴 REDIRECT URI THAT PAYPAL RECEIVED:');
          console.error('   ' + receivedUri);
          console.error('═══════════════════════════════════════');
          console.error('📋 COPY THIS EXACT URI TO PAYPAL:');
          console.error('   ' + receivedUri);
        }
      }
    }

    // Build query string with OAuth params
    const params = new URLSearchParams();
    if (code) params.set('code', code);
    if (state) params.set('state', state);
    if (error) params.set('error', error);
    if (errorDescription) params.set('error_description', errorDescription);

    // Check if this is an admin PayPal linking (state starts with "admin-paypal-verify-")
    // Otherwise, it's a guest PayPal linking
    if (state && state.startsWith('admin-paypal-verify-')) {
      // Redirect to admin PayPal settings page
      navigate(`/admin/paypal-settings?${params.toString()}`, { replace: true });
    } else {
      // Redirect to wallet page with OAuth params
      // The PayPalIdentity component will handle the verification
      navigate(`/guest/wallet?${params.toString()}`, { replace: true });
    }
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-8 w-8 text-primary animate-spin mx-auto mb-4" />
        <p className="text-sm text-muted-foreground">
          Processing PayPal verification...
        </p>
      </div>
    </div>
  );
};

export default PayPalCallback;

