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
    }
  }, [user]);

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
    if (!user || !amount || Number(amount) <= 0) return;

    // Reload wallet balance, transactions, and verification status
    await loadWallet();
    await loadTransactions();
    setAmount("");
    
    // Check if account is now verified
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (userDoc.exists()) {
      const data = userDoc.data();
      if (data.paypalEmailVerified && !paypalVerified) {
        setPaypalVerified(true);
        toast.success("PayPal account verified! Your account has been verified through a successful payment.");
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
        <Button variant="ghost" onClick={() => navigate('/guest/dashboard')} className="mb-4 sm:mb-6 h-10 sm:h-auto">
          <ArrowLeft className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline">Back to Dashboard</span>
          <span className="sm:hidden">Back</span>
        </Button>

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
            <p className="text-3xl sm:text-4xl font-bold text-primary mb-4 sm:mb-6">{formatPHP(balance)}</p>
            
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  type="number"
                  placeholder="Amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  min="1"
                  step="0.01"
                  disabled={!paypalEmail}
                  className="h-11 sm:h-auto text-base sm:text-sm flex-1"
                />
              </div>
              {!paypalEmail ? (
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground text-center">
                    Link your PayPal account above to make deposits
                  </p>
                </div>
              ) : user && amount && Number(amount) > 0 ? (
                <PayPalButton
                  amount={Number(amount)}
                  userId={user.uid}
                  description={`Wallet deposit: ${formatPHP(Number(amount))}`}
                  onSuccess={handlePayPalDepositSuccess}
                  redirectUrl={window.location.origin + '/guest/wallet'}
                />
              ) : (
                <Button onClick={handleDeposit} disabled={!amount || Number(amount) <= 0}>
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
                        {tx.type === 'deposit' || tx.type === 'reward' ? '+' : '-'}{formatPHP(tx.amount)}
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
