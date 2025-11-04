import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { getUserTransactions, createTransaction } from "@/lib/firestore";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Wallet as WalletIcon, TrendingUp, TrendingDown } from "lucide-react";
import { toast } from "sonner";
import { PointsDisplay } from "@/components/rewards/PointsDisplay";
import { CouponManager } from "@/components/coupons/CouponManager";
import type { Transaction, Coupon } from "@/types";
import { formatPHP } from "@/lib/currency";

const Wallet = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [balance, setBalance] = useState(0);
  const [points, setPoints] = useState(0);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

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
      setBalance(userDoc.data().walletBalance || 0);
      setPoints(userDoc.data().points || 0);
      setCoupons(userDoc.data().coupons || []);
    }
  };

  const loadTransactions = async () => {
    if (!user) return;
    const data = await getUserTransactions(user.uid);
    setTransactions(data);
  };

  const handleDeposit = async () => {
    if (!user || !amount || Number(amount) <= 0) {
      toast.error("Enter a valid amount");
      return;
    }

    setLoading(true);
    try {
      const newBalance = balance + Number(amount);
      await updateDoc(doc(db, 'users', user.uid), { walletBalance: newBalance });
      await createTransaction({
        userId: user.uid,
        type: 'deposit',
        amount: Number(amount),
        description: 'Wallet deposit',
      });
      setBalance(newBalance);
      setAmount("");
      loadTransactions();
      toast.success("Deposit successful!");
    } catch (error) {
      toast.error("Deposit failed");
    } finally {
      setLoading(false);
    }
  };

  const handleRedeemPoints = async (pointsToRedeem: number) => {
    if (!user) return;
    if (points < pointsToRedeem) {
      toast.error("Not enough points");
      return;
    }
    
    try {
      const discountAmount = pointsToRedeem === 100 ? 10 : 
                            pointsToRedeem === 250 ? 30 : 
                            pointsToRedeem === 500 ? 75 : 200;
      
      const newCoupon: Coupon = {
        id: `REWARD${Date.now()}`,
        code: `REWARD${Date.now()}`,
        discount: (discountAmount / balance) * 100,
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        used: false
      };

      const newPoints = points - pointsToRedeem;
      await updateDoc(doc(db, 'users', user.uid), {
        points: newPoints,
        coupons: [...coupons, newCoupon]
      });
      
      setPoints(newPoints);
      setCoupons([...coupons, newCoupon]);
      toast.success(`Redeemed ${pointsToRedeem} points for ${formatPHP(discountAmount)} coupon!`);
    } catch (error) {
      toast.error("Failed to redeem points");
    }
  };

  const handleApplyCoupon = (code: string) => {
    const coupon = coupons.find(c => c.code === code && !c.used);
    if (!coupon) {
      toast.error("Invalid or already used coupon");
      return;
    }
    toast.success(`Coupon ${code} applied! ${coupon.discount}% discount`);
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        <Button variant="ghost" onClick={() => navigate('/guest/dashboard')} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>

        <h1 className="text-3xl font-bold mb-6">E-Wallet & Rewards</h1>

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <WalletIcon className="h-5 w-5" />
                Current Balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-primary mb-6">{formatPHP(balance)}</p>
              
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="Amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
                <Button onClick={handleDeposit} disabled={loading}>
                  Deposit
                </Button>
              </div>
            </CardContent>
          </Card>

          <PointsDisplay points={points} onRedeem={handleRedeemPoints} />
        </div>

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
