import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { collection, getDocs, query, where, orderBy, doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DollarSign, TrendingUp, Wallet, Loader2, AlertCircle, ArrowUpRight, CheckCircle2, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { getUserTransactions } from "@/lib/firestore";
import { requestWithdrawal } from "@/lib/hostPayoutService";
import { calculatePayPalPayoutFee, calculateWithdrawalWithFees } from "@/lib/financialUtils";
import type { Transaction } from "@/types";
import { formatPHP } from "@/lib/currency";
import LoadingScreen from "@/components/ui/loading-screen";
import { BackButton } from "@/components/shared/BackButton";
import PayPalIdentity from "@/components/payments/PayPalIdentity";

const HostPayments = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, userRole, refreshUserProfile, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [walletBalance, setWalletBalance] = useState(0);
  const [paypalEmail, setPaypalEmail] = useState<string | null>(null);
  const [paypalVerified, setPaypalVerified] = useState(false);
  const [withdrawDialogOpen, setWithdrawDialogOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);
  const [adminAbsorbsFees, setAdminAbsorbsFees] = useState(true);
  const [linkPayPalDialogOpen, setLinkPayPalDialogOpen] = useState(false);
  const [unlinkDialogOpen, setUnlinkDialogOpen] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [earningsPayoutMethod, setEarningsPayoutMethod] = useState<'wallet' | 'paypal'>('wallet');

  useEffect(() => {
    // Check if we're processing a PayPal callback
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const isPayPalCallback = code && state && state.startsWith('host-paypal-verify-');
    
    // If we're processing a PayPal callback, wait for auth to be restored
    // Don't redirect immediately as auth state might not be restored yet after redirect
    if (isPayPalCallback) {
      if (authLoading) {
        return; // Wait for auth to load
      }
      // Give auth a moment to restore after redirect, even if loading is false
      const timer = setTimeout(() => {
        if (user && userRole === 'host') {
          loadPaymentsData();
        } else if (!user || userRole !== 'host') {
          // If still not authenticated after waiting, then redirect
          // This should rarely happen, but handle it gracefully
          console.warn('User not authenticated after PayPal callback, redirecting to login');
          navigate('/host/login');
        }
      }, 500); // Small delay to allow auth state to restore
      
      return () => clearTimeout(timer);
    }
    
    // Normal flow: only redirect if auth is loaded and user is not authenticated
    if (!authLoading && (!user || userRole !== 'host')) {
      navigate('/host/login');
    } else if (!authLoading && user && userRole === 'host') {
      loadPaymentsData();
    }
  }, [user, userRole, navigate, authLoading, searchParams]);

  // Check for PayPal callback when page loads and reload data after verification
  useEffect(() => {
    if (!user) return;
    
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    
    // If we have a PayPal callback, reload data after a delay to ensure verification is complete
    if (code && state && state.startsWith('host-paypal-verify-')) {
      // Small delay to allow PayPalIdentity component to process the callback first
      const timer = setTimeout(async () => {
        await loadPaymentsData();
        await refreshUserProfile();
        // Clean up URL params after processing
        window.history.replaceState({}, '', window.location.pathname);
      }, 2000);
      
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, searchParams]);

  const loadPaymentsData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Load user profile for wallet balance and PayPal info
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const { readWalletBalance } = await import('@/lib/financialUtils');
        setWalletBalance(readWalletBalance(userData.walletBalance));
        setPaypalEmail(userData.paypalEmail || null);
        // Check for either paypalEmailVerified or paypalOAuthVerified (fallback method)
        setPaypalVerified(userData.paypalEmailVerified || userData.paypalOAuthVerified || false);
        // Load earnings payout method preference
        setEarningsPayoutMethod(userData.earningsPayoutMethod || 'wallet');
      }

      // Load transactions
      const transactionsData = await getUserTransactions(user.uid);
      setTransactions(transactionsData);
    } catch (error: any) {
      console.error('Error loading payments data:', error);
      toast.error(`Failed to load payments: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLinkPayPal = () => {
    if (!user) return;
    
    const clientId = import.meta.env.VITE_PAYPAL_CLIENT_ID || '';
    const paypalEnv = import.meta.env.VITE_PAYPAL_ENV || 'sandbox';
    const isSandbox = paypalEnv !== 'production';
    
    if (!clientId) {
      toast.error('PayPal is not configured. Please contact support.');
      return;
    }

    // Get base URL from environment variable or use current origin
    // In production, use VITE_APP_URL to ensure consistent redirect URIs
    const appUrl = import.meta.env.VITE_APP_URL || window.location.origin;
    let baseUrl = import.meta.env.PROD ? appUrl : window.location.origin;
    
    // Build redirect URI - PayPal sandbox doesn't accept IP addresses, so use localhost for local dev
    // IMPORTANT: This exact URI must be added to PayPal app's allowed redirect URIs
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
      } else if (baseUrl.includes('localhost') && !baseUrl.includes(':8081')) {
        // Replace localhost with 127.0.0.1 for consistency (except port 8081)
      redirectUri = redirectUri.replace('localhost', '127.0.0.1');
      }
    }

    // Generate OAuth URL for PayPal login
    // Using PayPal's authorization endpoint
    // Use host-specific state so callback can redirect to host payments page
    const state = `host-paypal-verify-${user.uid}`;
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
      console.log('🔍 PayPal OAuth Debug:', {
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
      console.warn('📝 PayPal Dashboard: https://developer.paypal.com/dashboard/applications/sandbox');
    }

    // Redirect to PayPal login
    window.location.href = authUrl;
  };

  const handleUnlinkPayPal = async () => {
    if (!user) return;

    try {
      await updateDoc(doc(db, 'users', user.uid), {
        paypalEmail: null,
        paypalEmailVerified: false,
        paypalVerifiedAt: null,
        paypalOAuthVerified: false,
        paypalLinkedViaPayment: false
      });

      setPaypalEmail(null);
      setPaypalVerified(false);
      setUnlinkDialogOpen(false);
      await refreshUserProfile();
      await loadPaymentsData();
      toast.success("PayPal account unlinked successfully");
    } catch (error: any) {
      console.error('Error unlinking PayPal:', error);
      toast.error("Failed to unlink PayPal account");
    }
  };

  // Load fee configuration
  useEffect(() => {
    const loadFeeConfig = async () => {
      try {
        const { getDoc, doc } = await import('firebase/firestore');
        const { db } = await import('@/lib/firebase');
        const adminSettingsDoc = await getDoc(doc(db, 'adminSettings', 'withdrawal'));
        if (adminSettingsDoc.exists()) {
          const settings = adminSettingsDoc.data();
          setAdminAbsorbsFees(settings?.adminAbsorbsFees !== false); // Default to true
        }
      } catch (error) {
        // Default to admin absorbs fees
        setAdminAbsorbsFees(true);
      }
    };
    loadFeeConfig();
  }, []);

  const handleWithdraw = async () => {
    if (!user) return;

    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    const fee = calculatePayPalPayoutFee(amount);
    const totalRequired = adminAbsorbsFees ? amount : calculateWithdrawalWithFees(amount);

    if (totalRequired > walletBalance) {
      if (adminAbsorbsFees) {
        toast.error(`Insufficient balance. Available: ${formatPHP(walletBalance)}, Required: ${formatPHP(amount)}`);
      } else {
        toast.error(`Insufficient balance. Available: ${formatPHP(walletBalance)}, Required: ${formatPHP(totalRequired)} (withdrawal: ${formatPHP(amount)} + fees: ${formatPHP(fee)})`);
      }
      return;
    }

    // This check should not be needed since we prevent opening the dialog,
    // but keeping it as a safety check
    if (!paypalVerified) {
      toast.error('Please link and verify your PayPal account first');
      setWithdrawDialogOpen(false);
      setLinkPayPalDialogOpen(true);
      return;
    }

    setWithdrawing(true);
    try {
      const result = await requestWithdrawal(user.uid, amount, !adminAbsorbsFees);
      toast.success(result.message || `Withdrawal request submitted successfully!${paypalEmail ? ` Funds will be sent to ${paypalEmail}` : ' Funds will be sent to your linked PayPal account'} once processed by admin.`);
      setWithdrawDialogOpen(false);
      setWithdrawAmount('');
      // Reload data to update wallet balance
      await loadPaymentsData();
      await refreshUserProfile();
    } catch (error: any) {
      toast.error(error.message || 'Failed to process withdrawal');
    } finally {
      setWithdrawing(false);
    }
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto">
          <LoadingScreen />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <BackButton to="/host/dashboard" />
          <div>
            <h1 className="text-3xl font-bold">Payments</h1>
            <p className="text-muted-foreground">Manage your payment methods and withdrawals</p>
          </div>
        </div>

        {/* Wallet Balance Card */}
        <Card className="mb-8 relative overflow-hidden border-0 shadow-md">
          <div className="absolute top-0 left-0 right-0 h-1 bg-primary" />
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Wallet Balance
            </CardTitle>
            </CardHeader>
            <CardContent>
            <div className="text-4xl font-bold text-primary mb-2">{formatPHP(walletBalance)}</div>
            <p className="text-sm text-muted-foreground mb-4">Available for withdrawal to your PayPal account</p>
              {walletBalance > 0 && (
                <Button
                size="lg"
                className="w-full sm:w-auto"
                  onClick={() => {
                    if (!paypalVerified) {
                      setLinkPayPalDialogOpen(true);
                    } else {
                      setWithdrawDialogOpen(true);
                    }
                  }}
                >
                  <ArrowUpRight className="h-4 w-4 mr-2" />
                  Withdraw to PayPal
                </Button>
              )}
            {walletBalance === 0 && (
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Your wallet is empty. Earnings from confirmed bookings will be added to your wallet.
                </p>
                <Button
                  variant="outline"
                  className="mt-3"
                  onClick={() => navigate('/host/earnings')}
                >
                  View Earnings
                </Button>
              </div>
            )}
            </CardContent>
          </Card>

        {/* PayPal Account Status */}
        {!paypalVerified && (
          <Card id="paypal-linking-section" className="mb-8 border-yellow-500/50 bg-yellow-500/10">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold mb-1">PayPal Account Required</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Link your PayPal account to receive payouts from your bookings. Payments will be sent directly to your PayPal account.
                  </p>
                  {user && (
                    <PayPalIdentity
                      userId={user.uid}
                      paypalEmail={paypalEmail || undefined}
                      paypalVerified={paypalVerified}
                      statePrefix="host-paypal-verify"
                      onVerified={async (email: string) => {
                        // Update local state immediately for instant UI feedback
                        setPaypalEmail(email || paypalEmail);
                        setPaypalVerified(true);
                        // Refresh data from server to get latest info
                        await refreshUserProfile();
                        await loadPaymentsData();
                        toast.success('PayPal account linked successfully! You can now withdraw funds.');
                      }}
                    />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {paypalVerified && (
          <Card className="mb-8 border-green-500/50 bg-green-500/10">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1">PayPal Account Linked</h3>
                    {paypalEmail ? (
                      <>
                        <p className="text-sm font-medium text-muted-foreground mb-1">{paypalEmail}</p>
                        <p className="text-xs text-muted-foreground">
                          Payouts will be sent to this PayPal account
                        </p>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Your PayPal account has been verified. Email will be stored on your first payment.
                      </p>
                    )}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setUnlinkDialogOpen(true)}
                >
                  Unlink
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Payment Preference Selection */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Earnings Payout Method</CardTitle>
            <CardDescription>Choose how you want to receive your earnings from bookings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <div
                className={`flex items-start gap-4 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  earningsPayoutMethod === 'wallet'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
                onClick={() => setEarningsPayoutMethod('wallet')}
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    earningsPayoutMethod === 'wallet'
                      ? 'border-primary bg-primary'
                      : 'border-muted-foreground'
                  }`}>
                    {earningsPayoutMethod === 'wallet' && (
                      <div className="w-2.5 h-2.5 rounded-full bg-white" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Wallet className="h-5 w-5 text-primary" />
                      <Label className="text-base font-semibold cursor-pointer">
                        E-Wallet
                      </Label>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Earnings will be added to your e-wallet balance. You can withdraw to PayPal anytime.
                    </p>
                  </div>
                </div>
              </div>

              <div
                className={`flex items-start gap-4 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  earningsPayoutMethod === 'paypal'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
                onClick={() => {
                  if (!paypalVerified) {
                    toast.error('Please link and verify your PayPal account first');
                    return;
                  }
                  setEarningsPayoutMethod('paypal');
                }}
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    earningsPayoutMethod === 'paypal'
                      ? 'border-primary bg-primary'
                      : 'border-muted-foreground'
                  }`}>
                    {earningsPayoutMethod === 'paypal' && (
                      <div className="w-2.5 h-2.5 rounded-full bg-white" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <CreditCard className="h-5 w-5 text-primary" />
                      <Label className="text-base font-semibold cursor-pointer">
                        PayPal Account
                      </Label>
                      </div>
                        <p className="text-sm text-muted-foreground">
                      Earnings will be sent directly to your linked PayPal account automatically.
                        </p>
                    {paypalEmail && (
                        <p className="text-xs text-muted-foreground mt-1">
                        Linked account: {paypalEmail}
                      </p>
                    )}
                    {!paypalVerified && (
                      <div className="mt-2 p-2 bg-yellow-500/10 border border-yellow-500/50 rounded text-xs text-yellow-700 dark:text-yellow-400">
                        <AlertCircle className="h-3 w-3 inline mr-1" />
                        You need to link and verify your PayPal account first
                      </div>
                    )}
                  </div>
                      </div>
                    </div>
                    </div>

            {earningsPayoutMethod === 'paypal' && !paypalVerified && (
              <div className="p-4 bg-yellow-500/10 border border-yellow-500/50 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-sm mb-1">PayPal Account Required</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      To receive earnings directly to PayPal, you need to link and verify your PayPal account first.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="pt-4 border-t">
              <Button 
                onClick={async () => {
                  if (!user) return;
                  if (earningsPayoutMethod === 'paypal' && !paypalVerified) {
                    toast.error('Please link and verify your PayPal account first');
                    return;
                  }
                  setLoading(true);
                  try {
                    await updateDoc(doc(db, 'users', user.uid), {
                      earningsPayoutMethod: earningsPayoutMethod
                    });
                    await loadPaymentsData();
                    await refreshUserProfile();
                    toast.success('Payment preference saved successfully!');
                  } catch (error) {
                    console.error('Error saving payment preference:', error);
                    toast.error('Failed to save payment preference');
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading || (earningsPayoutMethod === 'paypal' && !paypalVerified)}
                className="w-full sm:w-auto"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Preference'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Quick Earnings Link */}
        <Card className="mb-8 border-blue-500/50 bg-blue-500/10">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <DollarSign className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold mb-1">View Your Earnings</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  See detailed breakdown of your total earnings, booking revenue, and earnings statistics.
                </p>
                <Button
                  variant="outline"
                  onClick={() => navigate('/host/earnings')}
                >
                  View Earnings Dashboard
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Transaction History */}
        <Card>
          <CardHeader>
            <CardTitle>Transaction History</CardTitle>
            <CardDescription>Your payment and withdrawal history</CardDescription>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Wallet className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No transactions yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {transactions.map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                        transaction.type === 'deposit' || transaction.type === 'reward'
                          ? 'bg-green-500/10'
                          : 'bg-red-500/10'
                      }`}>
                        {transaction.type === 'deposit' || transaction.type === 'reward' ? (
                          <TrendingUp className="h-6 w-6 text-green-500" />
                        ) : (
                          <TrendingUp className="h-6 w-6 text-red-500 rotate-180" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{transaction.description}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(transaction.createdAt).toLocaleString()}
                        </p>
                        {transaction.paymentMethod && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Method: {transaction.paymentMethod}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-bold ${
                        transaction.type === 'deposit' || transaction.type === 'reward'
                          ? 'text-green-500'
                          : 'text-red-500'
                      }`}>
                        {transaction.type === 'reward' 
                          ? `+${transaction.amount} points`
                          : `${transaction.type === 'deposit' ? '+' : '-'}${formatPHP(transaction.amount)}`
                        }
                      </p>
                      {transaction.status && (
                        <Badge className={
                          transaction.status === 'completed'
                            ? 'bg-green-500'
                            : transaction.status === 'pending'
                            ? 'bg-yellow-500'
                            : transaction.status === 'failed'
                            ? 'bg-red-500'
                            : 'bg-gray-500'
                        }>
                          {transaction.status}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Unlink PayPal Dialog */}
        <AlertDialog open={unlinkDialogOpen} onOpenChange={setUnlinkDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Unlink PayPal Account</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to unlink your PayPal account? You won't be able to withdraw funds until you link a PayPal account again.
                {paypalEmail && (
                  <span className="block mt-2 font-medium">Account: {paypalEmail}</span>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleUnlinkPayPal}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Unlink Account
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Link PayPal Dialog */}
        <AlertDialog open={linkPayPalDialogOpen} onOpenChange={setLinkPayPalDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                PayPal Account Required
              </AlertDialogTitle>
              <AlertDialogDescription>
                You need to link and verify your PayPal account before you can withdraw funds. 
                Payments will be sent directly to your linked PayPal account.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  setLinkPayPalDialogOpen(false);
                  handleLinkPayPal();
                }}
              >
                Link PayPal Account
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Withdrawal Dialog */}
        <Dialog open={withdrawDialogOpen} onOpenChange={setWithdrawDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Withdraw to PayPal</DialogTitle>
              <DialogDescription>
                Request a withdrawal from your wallet to your PayPal account
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Available Balance</Label>
                <div className="text-2xl font-bold text-primary mt-1">{formatPHP(walletBalance)}</div>
              </div>
              <div>
                <Label htmlFor="withdrawAmount">Withdrawal Amount</Label>
                <Input
                  id="withdrawAmount"
                  type="number"
                  placeholder="0.00"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  min="0"
                  max={walletBalance}
                  step="0.01"
                  className="mt-2"
                />
                {withdrawAmount && parseFloat(withdrawAmount) > 0 && (
                  <div className="mt-2 p-3 bg-muted rounded-lg space-y-1">
                    {(() => {
                      const amount = parseFloat(withdrawAmount);
                      const fee = calculatePayPalPayoutFee(amount);
                      const totalRequired = adminAbsorbsFees ? amount : calculateWithdrawalWithFees(amount);
                      const amountReceived = adminAbsorbsFees ? amount : amount - fee;
                      
                      return (
                        <>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">PayPal Fee:</span>
                            <span className="font-medium">{formatPHP(fee)}</span>
                          </div>
                          {adminAbsorbsFees ? (
                            <>
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">You will receive:</span>
                                <span className="font-semibold text-green-600 dark:text-green-400">{formatPHP(amountReceived)}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Deducted from wallet:</span>
                                <span className="font-medium">{formatPHP(amount)}</span>
                              </div>
                              <p className="text-xs text-muted-foreground mt-2 pt-2 border-t">
                                ✓ Fees paid by admin
                              </p>
                            </>
                          ) : (
                            <>
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">You will receive:</span>
                                <span className="font-semibold text-green-600 dark:text-green-400">{formatPHP(amountReceived)}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Total deducted from wallet:</span>
                                <span className="font-medium">{formatPHP(totalRequired)}</span>
                              </div>
                              <p className="text-xs text-muted-foreground mt-2 pt-2 border-t">
                                Fees deducted from your wallet
                              </p>
                            </>
                          )}
                          {totalRequired > walletBalance && (
                            <p className="text-xs text-destructive mt-1">
                              Insufficient balance. Need {formatPHP(totalRequired - walletBalance)} more.
                            </p>
                          )}
                        </>
                      );
                    })()}
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  Enter amount to withdraw (max: {formatPHP(walletBalance)})
                </p>
              </div>
              {paypalEmail && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm font-medium mb-1">PayPal Account</p>
                  <p className="text-sm text-muted-foreground">{paypalEmail}</p>
                </div>
              )}
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-xs text-muted-foreground">
                  ⚠️ <strong>Sandbox Mode:</strong> This is a simulation. No real money will be transferred. 
                  In production, funds will be sent to your PayPal account via PayPal Payouts API.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setWithdrawDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleWithdraw} 
                disabled={
                  withdrawing || 
                  !withdrawAmount || 
                  parseFloat(withdrawAmount) <= 0 ||
                  (adminAbsorbsFees 
                    ? parseFloat(withdrawAmount) > walletBalance 
                    : calculateWithdrawalWithFees(parseFloat(withdrawAmount)) > walletBalance)
                }
              >
                {withdrawing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <ArrowUpRight className="h-4 w-4 mr-2" />
                    Withdraw
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </div>
  );
};

export default HostPayments;

