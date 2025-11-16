import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getUserTransactions } from "@/lib/firestore";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Wallet as WalletIcon, TrendingUp, TrendingDown, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { toast } from "sonner";
import { BackButton } from "@/components/shared/BackButton";
import { CouponManager } from "@/components/coupons/CouponManager";
import { PayPalButton } from "@/components/payments/PayPalButton";
import { requestGuestWithdrawal } from "@/lib/guestPayoutService";
import { calculatePayPalPayoutFee, calculateWithdrawalWithFees } from "@/lib/financialUtils";
import type { Transaction, Coupon } from "@/types";
import { formatPHP } from "@/lib/currency";
import { readWalletBalance, centavosToPHP, phpToCentavos } from "@/lib/financialUtils";

const Wallet = () => {
  const { user } = useAuth();
  const [balance, setBalance] = useState(0);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [amount, setAmount] = useState("");
  const [activeTab, setActiveTab] = useState<"deposit" | "withdraw">("deposit");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [paypalEmail, setPaypalEmail] = useState("");
  const [withdrawing, setWithdrawing] = useState(false);
  const [adminAbsorbsFees, setAdminAbsorbsFees] = useState(true);

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
      // Read wallet balance (handles both old float and new int centavos formats)
      setBalance(readWalletBalance(data.walletBalance));
      setCoupons(data.coupons || []);
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

    // The PayPal button will handle the payment
    // No need to link PayPal account first - user will enter it when paying
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
  };

  // Load fee configuration
  useEffect(() => {
    const loadFeeConfig = async () => {
      try {
        const { getDoc, doc } = await import('firebase/firestore');
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

    if (!withdrawAmount || Number(withdrawAmount) <= 0) {
      toast.error("Enter a valid withdrawal amount");
      return;
    }

    if (!paypalEmail || !paypalEmail.includes('@')) {
      toast.error("Enter a valid PayPal email address");
      return;
    }

    const amount = Number(withdrawAmount);
    const fee = calculatePayPalPayoutFee(amount);
    const totalRequired = adminAbsorbsFees ? amount : calculateWithdrawalWithFees(amount);
    
    if (totalRequired > balance) {
      if (adminAbsorbsFees) {
        toast.error(`Insufficient balance. Available: ${formatPHP(balance)}, Required: ${formatPHP(amount)}`);
      } else {
        toast.error(`Insufficient balance. Available: ${formatPHP(balance)}, Required: ${formatPHP(totalRequired)} (withdrawal: ${formatPHP(amount)} + fees: ${formatPHP(fee)})`);
      }
      return;
    }

    setWithdrawing(true);
    try {
      const result = await requestGuestWithdrawal(user.uid, amount, paypalEmail, !adminAbsorbsFees);
      
      // Reload wallet and transactions
      await loadWallet();
      await loadTransactions();
      
      // Clear form
      setWithdrawAmount("");
      setPaypalEmail("");
      
      toast.success(result.message);
    } catch (error: any) {
      console.error('Withdrawal error:', error);
      toast.error(error.message || 'Failed to process withdrawal. Please try again.');
    } finally {
      setWithdrawing(false);
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
            
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "deposit" | "withdraw")} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="deposit" className="flex items-center gap-2">
                  <ArrowUpCircle className="h-4 w-4" />
                  Deposit
                </TabsTrigger>
                <TabsTrigger value="withdraw" className="flex items-center gap-2">
                  <ArrowDownCircle className="h-4 w-4" />
                  Withdraw
                </TabsTrigger>
              </TabsList>

              <TabsContent value="deposit" className="space-y-4">
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
                    className="h-12 text-base sm:text-sm"
                  />
                </div>
                
                {user && amount && Number(amount) > 0 ? (
                  <div className="space-y-3">
                    <PayPalButton
                      amount={Number(amount)}
                      userId={user.uid}
                      description={`Wallet deposit: ${formatPHP(Number(amount))}`}
                      onSuccess={handlePayPalDepositSuccess}
                      redirectUrl={window.location.origin + '/guest/wallet'}
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
              </TabsContent>

              <TabsContent value="withdraw" className="space-y-4">
                <div>
                  <Label htmlFor="withdraw-amount" className="text-sm font-medium mb-2 block">
                    Withdrawal Amount
                  </Label>
                  <Input
                    id="withdraw-amount"
                    type="number"
                    placeholder="Enter amount"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    min="1"
                    step="0.01"
                    max={balance}
                    className="h-12 text-base sm:text-sm"
                  />
                  {balance > 0 && withdrawAmount && Number(withdrawAmount) > 0 && (
                    <div className="mt-2 p-3 bg-muted rounded-lg space-y-1">
                      {(() => {
                        const amount = Number(withdrawAmount);
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
                            {totalRequired > balance && (
                              <p className="text-xs text-destructive mt-1">
                                Insufficient balance. Need {formatPHP(totalRequired - balance)} more.
                              </p>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  )}
                  {balance > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Maximum: {formatPHP(balance)}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="paypal-email" className="text-sm font-medium mb-2 block">
                    PayPal Email
                  </Label>
                  <Input
                    id="paypal-email"
                    type="email"
                    placeholder="your.email@example.com"
                    value={paypalEmail}
                    onChange={(e) => setPaypalEmail(e.target.value)}
                    className="h-12 text-base sm:text-sm"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Funds will be sent to this PayPal account
                  </p>
                </div>

                <Button
                  onClick={handleWithdraw}
                  disabled={
                    withdrawing || 
                    !withdrawAmount || 
                    Number(withdrawAmount) <= 0 || 
                    !paypalEmail || 
                    (adminAbsorbsFees 
                      ? Number(withdrawAmount) > balance 
                      : calculateWithdrawalWithFees(Number(withdrawAmount)) > balance)
                  }
                  className="w-full h-12"
                  variant="default"
                >
                  {withdrawing ? (
                    <>
                      <span className="animate-spin mr-2">⏳</span>
                      Processing...
                    </>
                  ) : (
                    <>
                      <ArrowDownCircle className="h-4 w-4 mr-2" />
                      Request Withdrawal
                    </>
                  )}
                </Button>

                <p className="text-xs text-muted-foreground text-center">
                  Withdrawal requests are processed by admin. Funds will be sent to your PayPal account once approved.
                </p>
              </TabsContent>
            </Tabs>
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
                            {tx.type === 'withdrawal' && tx.status && (
                              <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                tx.status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' :
                                tx.status === 'pending' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' :
                                tx.status === 'failed' ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' :
                                'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                              }`}>
                                {tx.status.toUpperCase()}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      <p className={`font-semibold ${
                        tx.type === 'deposit' || tx.type === 'reward' ? 'text-green-500' : 'text-red-500'
                      }`}>
                        {tx.type === 'reward' 
                          ? `+${tx.amount} points`
                          : (() => {
                              // Convert transaction amount to PHP for display
                              // Handle both old format (float PHP) and new format (int centavos)
                              const amountPHP = (Number.isInteger(tx.amount) && tx.amount >= 100) 
                                ? centavosToPHP(tx.amount) 
                                : Number(tx.amount);
                              return `${tx.type === 'deposit' ? '+' : '-'}${formatPHP(amountPHP)}`;
                            })()
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
