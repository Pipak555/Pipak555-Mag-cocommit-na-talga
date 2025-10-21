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
import type { Transaction } from "@/types";

const Wallet = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [balance, setBalance] = useState(0);
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

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <Button variant="ghost" onClick={() => navigate('/guest/dashboard')} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>

        <h1 className="text-3xl font-bold mb-6">E-Wallet</h1>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <WalletIcon className="h-5 w-5" />
              Current Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-primary mb-6">${balance.toFixed(2)}</p>
            
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
                      {tx.type === 'deposit' || tx.type === 'reward' ? '+' : '-'}${tx.amount}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Wallet;
