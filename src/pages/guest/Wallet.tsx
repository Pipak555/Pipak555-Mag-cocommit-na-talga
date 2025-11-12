import { useEffect, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { getUserTransactions, createTransaction } from "@/lib/firestore";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Wallet as WalletIcon, TrendingUp, TrendingDown, CreditCard, CheckCircle2, XCircle, AlertCircle, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { BackButton } from "@/components/shared/BackButton";
import { CouponManager } from "@/components/coupons/CouponManager";
import { PayPalButton } from "@/components/payments/PayPalButton";
import PayPalIdentity from "@/components/payments/PayPalIdentity";
import type { Transaction, Coupon } from "@/types";
import { formatPHP } from "@/lib/currency";

const Wallet = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [balance, setBalance] = useState(0);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [paypalEmail, setPaypalEmail] = useState("");
  const [paypalLinked, setPaypalLinked] = useState(false);
  const [paypalVerified, setPaypalVerified] = useState(false);

  useEffect(() => {
    if (user) {
      loadWallet();
      loadTransactions();
      
      // Check if returning from PayPal redirect flow
      const searchParams = new URLSearchParams(window.location.search);
      const token = searchParams.get('token');
      const PayerID = searchParams.get('PayerID');
      
      if (token && PayerID) {
        // Handle PayPal redirect callback
        handlePayPalRedirectCallback(token, PayerID);
      }
    }
  }, [user]);

  const handlePayPalRedirectCallback = async (token: string, payerId: string) => {
    // Get stored order data
    const storedData = sessionStorage.getItem('paypal_pending_order');
    if (!storedData) {
      toast.error('Payment session expired. Please try again.');
      return;
    }

    const orderData = JSON.parse(storedData);
    
    try {
      // The order should already be captured by PayPal
      // We just need to verify and process it
      // For now, simulate success - in production, verify with PayPal API
      toast.success('Payment successful! Processing...');
      
      // Process the payment (similar to onApprove logic)
      await handlePayPalDepositSuccess();
      
      // Clean up
      sessionStorage.removeItem('paypal_pending_order');
      window.history.replaceState({}, '', window.location.pathname);
    } catch (error) {
      console.error('Error processing redirect callback:', error);
      toast.error('Payment verification failed. Please contact support.');
    }
  };

  const loadWallet = async () => {
    if (!user) return;
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (userDoc.exists()) {
      const data = userDoc.data();
      setBalance(data.walletBalance || 0);
      setCoupons(data.coupons || []);
      setPaypalEmail(data.paypalEmail || "");
      setPaypalLinked(!!data.paypalEmail);
      setPaypalVerified(!!data.paypalEmailVerified);
    }
  };

  const loadTransactions = async () => {
    if (!user) return;
    const data = await getUserTransactions(user.uid);
    setTransactions(data);
  };

  const handlePayPalVerified = useCallback((email: string) => {
    setPaypalEmail(email);
    setPaypalLinked(true);
    setPaypalVerified(true);
    loadWallet(); // Reload to get updated data
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleUnlinkPayPal = async () => {
    if (!user) return;

    try {
      await updateDoc(doc(db, 'users', user.uid), {
        paypalEmail: null,
        paypalEmailVerified: false,
        paypalLinkedAt: null
      });

      setPaypalLinked(false);
      setPaypalEmail("");
      toast.success("PayPal account unlinked");
    } catch (error) {
      console.error('Error unlinking PayPal:', error);
      toast.error("Failed to unlink PayPal account");
    }
  };

  const handleDeposit = async () => {
    if (!user || !amount || Number(amount) <= 0) {
      toast.error("Enter a valid amount");
      return;
    }

    if (!paypalEmail) {
      toast.error("Please link your PayPal account first to make deposits");
      return;
    }

    // The PayPal button will handle the payment
    toast.info("Please use PayPal to add funds to your wallet");
  };

  const handlePayPalDepositSuccess = async () => {
    if (!user) return;

    // Small delay to ensure Firestore has updated
    await new Promise(resolve => setTimeout(resolve, 500));

    // Reload wallet balance, transactions, and verification status
    await loadWallet();
    await loadTransactions();
    
    // Clear amount after successful deposit
    const depositedAmount = amount;
    setAmount("");
    
    // Show success message with deposited amount
    toast.success(`Successfully deposited ${formatPHP(Number(depositedAmount))} to your wallet!`);
    
    // Check if account is now verified
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (userDoc.exists()) {
      const data = userDoc.data();
      if (data.paypalEmailVerified && !paypalVerified) {
        setPaypalVerified(true);
      }
    }
  };

  const handleApplyCoupon = (code: string) => {
    const coupon = coupons.find(c => c.code === code && !c.used);
    if (!coupon) {
      toast.error("Invalid or already used coupon");
      return;
    }
    toast.success(`Coupon ${code} applied! ${formatPHP(coupon.discount)} discount`);
  };

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6">
      <div className="max-w-6xl mx-auto">
        <BackButton to="/guest/dashboard" className="mb-4 sm:mb-6" />

        <h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6">E-Wallet</h1>

        {/* PayPal Account Verification Section */}
        <Card className="mb-4 sm:mb-6 border-2">
          <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <CreditCard className="h-4 w-4 sm:h-5 sm:w-5" />
              PayPal Account Verification
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Link your PayPal account by logging in with your PayPal credentials. This verifies you have a real PayPal account.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
            {user ? (
              <PayPalIdentity
                userId={user.uid}
                onVerified={handlePayPalVerified}
                paypalEmail={paypalEmail}
                paypalVerified={paypalVerified}
              />
            ) : (
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Please sign in to verify your PayPal account
                </p>
              </div>
            )}
            {paypalVerified && paypalEmail && (
              <div className="mt-4">
                <Button variant="outline" size="sm" onClick={handleUnlinkPayPal} className="w-full">
                  Unlink PayPal Account
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="mb-4 sm:mb-6">
          <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <WalletIcon className="h-4 w-4 sm:h-5 sm:w-5" />
              Current Balance
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
            <div className="mb-6">
              <p className="text-3xl sm:text-4xl font-bold text-primary">{formatPHP(balance)}</p>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">Available balance</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="deposit-amount" className="text-sm font-medium mb-2 block">
                  Deposit Amount
                </Label>
                <Input
                  id="deposit-amount"
                  type="number"
                  placeholder="Enter amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  min="1"
                  step="0.01"
                  disabled={!paypalVerified}
                  className="h-12 text-base sm:text-sm"
                />
              </div>
              
              {!paypalVerified ? (
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
                    <p className="text-sm text-yellow-900 dark:text-yellow-100">
                      Link and verify your PayPal account above to make deposits
                    </p>
                  </div>
                </div>
          ) : user && amount && Number(amount) > 0 ? (
            <div className="space-y-3">
              <PayPalButton
                amount={Number(amount)}
                userId={user.uid}
                description={`Wallet deposit: ${formatPHP(Number(amount))}`}
                onSuccess={handlePayPalDepositSuccess}
                redirectUrl={window.location.origin + '/guest/wallet'}
                useRedirectFlow={true}
              />
              <p className="text-xs text-muted-foreground text-center">
                Secure payment powered by PayPal
              </p>
            </div>
              ) : (
                <Button 
                  onClick={handleDeposit} 
                  disabled={!amount || Number(amount) <= 0}
                  className="w-full h-12"
                  variant="outline"
                >
                  Enter amount to deposit
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
          <CouponManager coupons={coupons} onApplyCoupon={handleApplyCoupon} />
          <Card>
            <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4">
              <CardTitle className="text-base sm:text-lg">Transaction History</CardTitle>
            </CardHeader>
            <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
              {transactions.length === 0 ? (
                <p className="text-center text-muted-foreground py-6 sm:py-8 text-sm sm:text-base">No transactions yet</p>
              ) : (
                <div className="space-y-2 sm:space-y-3">
                  {transactions.map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between p-2.5 sm:p-3 border rounded touch-manipulation">
                      <div className="flex items-center gap-3">
                        {tx.type === 'deposit' || tx.type === 'reward' ? (
                          <TrendingUp className="h-5 w-5 text-green-500" />
                        ) : (
                          <TrendingDown className="h-5 w-5 text-red-500" />
                        )}
                        <div>
                          <p className="font-medium">{tx.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(tx.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <p className={`font-semibold ${
                        tx.type === 'deposit' || tx.type === 'reward' ? 'text-green-500' : 'text-red-500'
                      }`}>
                        {tx.type === 'reward' 
                          ? `+${tx.amount} points`
                          : `${tx.type === 'deposit' ? '+' : '-'}${formatPHP(tx.amount)}`
                        }
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Wallet;
