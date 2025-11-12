import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { collection, getDocs, query, where, orderBy, doc, getDoc } from "firebase/firestore";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, DollarSign, TrendingUp, Calendar, Wallet, Loader2, AlertCircle, CreditCard, ArrowUpRight, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { getBookings, getUserTransactions } from "@/lib/firestore";
import { requestWithdrawal } from "@/lib/hostPayoutService";
import type { Booking, Transaction } from "@/types";
import { formatPHP } from "@/lib/currency";
import LoadingScreen from "@/components/ui/loading-screen";
import { BackButton } from "@/components/shared/BackButton";

const HostPayments = () => {
  const navigate = useNavigate();
  const { user, userRole } = useAuth();
  const [loading, setLoading] = useState(true);
  const [walletBalance, setWalletBalance] = useState(0);
  const [paypalEmail, setPaypalEmail] = useState<string | null>(null);
  const [paypalVerified, setPaypalVerified] = useState(false);
  const [withdrawDialogOpen, setWithdrawDialogOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);
  const [earnings, setEarnings] = useState({
    totalEarnings: 0,
    pendingEarnings: 0,
    completedEarnings: 0,
  });
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    if (!user || userRole !== 'host') {
      navigate('/host/login');
    } else {
      loadPaymentsData();
    }
  }, [user, userRole, navigate]);

  const loadPaymentsData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Load user profile for wallet balance and PayPal info
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setWalletBalance(userData.walletBalance || 0);
        setPaypalEmail(userData.paypalEmail || null);
        setPaypalVerified(userData.paypalEmailVerified || false);
      }

      // Load bookings to calculate earnings
      const bookingsData = await getBookings({ hostId: user.uid });
      setBookings(bookingsData);

      // Calculate earnings
      const confirmedBookings = bookingsData.filter(
        b => b.status === 'confirmed' || b.status === 'completed'
      );
      const pendingBookings = bookingsData.filter(b => b.status === 'pending');
      
      const totalEarnings = confirmedBookings.reduce((sum, b) => sum + (b.totalPrice || 0), 0);
      const pendingEarnings = pendingBookings.reduce((sum, b) => sum + (b.totalPrice || 0), 0);
      const completedEarnings = totalEarnings; // Host gets 100% of earnings

      setEarnings({
        totalEarnings,
        pendingEarnings,
        completedEarnings,
      });

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

  const handleWithdraw = async () => {
    if (!user) return;

    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (amount > walletBalance) {
      toast.error(`Insufficient balance. Available: ${formatPHP(walletBalance)}`);
      return;
    }

    if (!paypalEmail || !paypalVerified) {
      toast.error('Please link and verify your PayPal account in account settings first');
      setWithdrawDialogOpen(false);
      navigate('/host/settings?tab=payments');
      return;
    }

    setWithdrawing(true);
    try {
      const result = await requestWithdrawal(user.uid, amount);
      toast.success(`Withdrawal of ${formatPHP(amount)} processed successfully! Funds will be sent to ${paypalEmail}`);
      setWithdrawDialogOpen(false);
      setWithdrawAmount('');
      // Reload data
      await loadPaymentsData();
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
            <h1 className="text-3xl font-bold">Payments & Earnings</h1>
            <p className="text-muted-foreground">View your earnings and payment history</p>
          </div>
        </div>

        {/* Earnings Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Wallet Balance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{formatPHP(walletBalance)}</div>
              <p className="text-xs text-muted-foreground mt-1">Available for withdrawal</p>
              {walletBalance > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-3 w-full"
                  onClick={() => setWithdrawDialogOpen(true)}
                  disabled={!paypalVerified}
                >
                  <ArrowUpRight className="h-4 w-4 mr-2" />
                  Withdraw to PayPal
                </Button>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Earnings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{formatPHP(earnings.totalEarnings)}</div>
              <p className="text-xs text-muted-foreground mt-1">From all confirmed bookings</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Your Earnings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{formatPHP(earnings.completedEarnings)}</div>
              <p className="text-xs text-muted-foreground mt-1">100% of booking payments</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending Earnings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{formatPHP(earnings.pendingEarnings)}</div>
              <p className="text-xs text-muted-foreground mt-1">Awaiting confirmation</p>
            </CardContent>
          </Card>
        </div>

        {/* PayPal Account Status */}
        {!paypalVerified && (
          <Card className="mb-8 border-yellow-500/50 bg-yellow-500/10">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold mb-1">PayPal Account Required</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Link your PayPal account to receive payouts from your bookings. Payments will be sent directly to your PayPal account.
                  </p>
                  <Button
                    size="sm"
                    onClick={() => navigate('/host/settings?tab=payments')}
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    Link PayPal Account
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {paypalVerified && paypalEmail && (
          <Card className="mb-8 border-green-500/50 bg-green-500/10">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                  <div>
                    <h3 className="font-semibold">PayPal Account Linked</h3>
                    <p className="text-sm text-muted-foreground">{paypalEmail}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Payouts will be sent to this PayPal account
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/host/settings?tab=payments')}
                >
                  Manage
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Bookings */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Recent Bookings</CardTitle>
            <CardDescription>Your recent booking payments</CardDescription>
          </CardHeader>
          <CardContent>
            {bookings.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No bookings yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {bookings.slice(0, 5).map((booking) => (
                  <div key={booking.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Calendar className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">Booking #{booking.id.slice(0, 8)}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(booking.checkIn).toLocaleDateString()} - {new Date(booking.checkOut).toLocaleDateString()}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {booking.guests} guest{booking.guests > 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold">{formatPHP(booking.totalPrice || 0)}</p>
                      <Badge className={
                        booking.status === 'confirmed' || booking.status === 'completed'
                          ? 'bg-green-500'
                          : booking.status === 'pending'
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                      }>
                        {booking.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
              <Button onClick={handleWithdraw} disabled={withdrawing || !withdrawAmount || parseFloat(withdrawAmount) <= 0}>
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

