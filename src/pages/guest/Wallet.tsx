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
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        <Button variant="ghost" onClick={() => navigate('/guest/dashboard')} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>

        <h1 className="text-3xl font-bold mb-6">E-Wallet</h1>

        {/* PayPal Account Verification Section */}
        <Card className="mb-6 border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              PayPal Account Verification
            </CardTitle>
            <CardDescription>
              Link your PayPal account by logging in with your PayPal credentials. This verifies you have a real PayPal account.
            </CardDescription>
          </CardHeader>
          <CardContent>
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

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <WalletIcon className="h-5 w-5" />
              Current Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-primary mb-6">{formatPHP(balance)}</p>
            
            <div className="space-y-4">
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="Amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  min="1"
                  step="0.01"
                  disabled={!paypalEmail}
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

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <CouponManager coupons={coupons} onApplyCoupon={handleApplyCoupon} />
          <Card>
            <CardHeader>
              <CardTitle>Transaction History</CardTitle>
            </CardHeader>
            <CardContent>
              {transactions.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No transactions yet</p>
              ) : (
                <div className="space-y-3">
                  {transactions.map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between p-3 border rounded">
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
