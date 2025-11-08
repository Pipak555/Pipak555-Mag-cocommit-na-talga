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

    // Build query string with OAuth params
    const params = new URLSearchParams();
    if (code) params.set('code', code);
    if (state) params.set('state', state);
    if (error) params.set('error', error);

    // Redirect to wallet page with OAuth params
    // The PayPalIdentity component will handle the verification
    navigate(`/guest/wallet?${params.toString()}`, { replace: true });
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

