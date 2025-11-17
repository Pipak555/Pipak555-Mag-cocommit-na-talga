import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { collection, getDocs, query, orderBy, doc, getDoc, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, DollarSign, CheckCircle, XCircle, Clock, AlertCircle, CreditCard, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { BackButton } from "@/components/shared/BackButton";
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
import type { Transaction, HostSubscription } from "@/types";
import { formatPHP } from "@/lib/currency";
import LoadingScreen from "@/components/ui/loading-screen";
import { processTransactionRefund, confirmTransaction, declineWithdrawal } from "@/lib/paymentService";
import { readTransactionAmount } from "@/lib/financialUtils";

interface TransactionWithUser extends Transaction {
  userEmail?: string;
  userName?: string;
}

const ManagePayments = () => {
  const navigate = useNavigate();
  const { user, userRole } = useAuth();
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<TransactionWithUser[]>([]);
  const [subscriptions, setSubscriptions] = useState<Array<HostSubscription & { userName?: string; userEmail?: string }>>([]);
  const [transactionToUpdate, setTransactionToUpdate] = useState<TransactionWithUser | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [action, setAction] = useState<'confirm' | 'refund' | 'decline' | null>(null);
  const [refundReason, setRefundReason] = useState('');
  const [declineReason, setDeclineReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [adminPayPalLinked, setAdminPayPalLinked] = useState(false); // Add this line

  useEffect(() => {
    if (!user || userRole !== 'admin') {
      navigate('/admin/login');
    } else {
      loadTransactions();
      loadAdminPayPalStatus(); // Add this line
    }
  }, [user, userRole, navigate]);

  // Add this new function
  const loadAdminPayPalStatus = async () => {
    if (!user) return;
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const hasPayPal = !!(userData.adminPayPalEmail && userData.adminPayPalEmailVerified);
        setAdminPayPalLinked(hasPayPal);
      }
    } catch (error) {
      console.error('Error loading admin PayPal status:', error);
    }
  };

  const loadTransactions = async () => {
    try {
      setLoading(true);
      
      // Load transactions
      const transactionsRef = collection(db, 'transactions');
      const q = query(transactionsRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);

      const transactionsData = await Promise.all(
        snapshot.docs.map(async (docSnapshot) => {
          const data = docSnapshot.data();
          
          // Fetch user data
          let userEmail = 'Unknown';
          let userName = 'Unknown';
          try {
            const userDoc = await getDoc(doc(db, 'users', data.userId));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              userEmail = userData.email || 'Unknown';
              userName = userData.fullName || 'Unknown';
            }
          } catch (error) {
            console.error('Error fetching user data:', error);
          }
          
          return {
            id: docSnapshot.id,
            ...data,
            userEmail,
            userName,
          } as TransactionWithUser;
        })
      );

      setTransactions(transactionsData);

      // Load subscriptions
      const subscriptionsRef = collection(db, 'subscriptions');
      const subscriptionsQuery = query(subscriptionsRef, orderBy('createdAt', 'desc'));
      const subscriptionsSnapshot = await getDocs(subscriptionsQuery);

      const subscriptionsData = await Promise.all(
        subscriptionsSnapshot.docs.map(async (docSnapshot) => {
          const data = docSnapshot.data();
          
          // Fetch user data
          let userEmail = 'Unknown';
          let userName = 'Unknown';
          try {
            const userDoc = await getDoc(doc(db, 'users', data.userId));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              userEmail = userData.email || 'Unknown';
              userName = userData.fullName || 'Unknown';
            }
          } catch (error) {
            console.error('Error fetching user data:', error);
          }
          
          return {
            id: docSnapshot.id,
            ...data,
            userEmail,
            userName,
          } as HostSubscription & { userName?: string; userEmail?: string };
        })
      );

      setSubscriptions(subscriptionsData);
    } catch (error: any) {
      console.error('Error loading transactions:', error);
      toast.error(`Failed to load transactions: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = (transaction: TransactionWithUser, actionType: 'confirm' | 'refund' | 'decline') => {
    setTransactionToUpdate(transaction);
    setAction(actionType);
    setRefundReason('');
    setDeclineReason('');
    setConfirmDialogOpen(true);
  };

  const confirmAction = async () => {
    if (!transactionToUpdate || !action) return;
    
    setProcessing(true);
    try {
      if (action === 'confirm') {
        // Confirm transaction using payment service
        await confirmTransaction(transactionToUpdate.id);
        toast.success('Transaction confirmed successfully');
      } else if (action === 'refund') {
        // Process refund using payment service
        const result = await processTransactionRefund(
          transactionToUpdate.id,
          transactionToUpdate,
          refundReason || undefined
        );
        
        if (result.success) {
          toast.success(`Refund processed successfully. ₱${result.refundAmount?.toFixed(2)} has been returned to user's wallet.`);
        } else {
          throw new Error('Refund processing failed');
        }
      } else if (action === 'decline') {
        // Decline withdrawal transaction
        await declineWithdrawal(transactionToUpdate.id, declineReason || undefined);
        toast.success('Withdrawal declined successfully');
      }
      
      // Reload transactions
      await loadTransactions();
      setTransactionToUpdate(null);
      setAction(null);
      setRefundReason('');
      setDeclineReason('');
    } catch (error: any) {
      console.error(`Error ${action}ing transaction:`, error);
      toast.error(error.message || `Failed to ${action} transaction`);
    } finally {
      setProcessing(false);
      setConfirmDialogOpen(false);
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Completed</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'pending_transfer':
        return <Badge className="bg-yellow-500"><Clock className="h-3 w-3 mr-1" />Pending Transfer</Badge>;
      case 'failed':
        return <Badge className="bg-red-500"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>;
      case 'refunded':
        return <Badge className="bg-gray-500"><XCircle className="h-3 w-3 mr-1" />Refunded</Badge>;
      default:
        return <Badge>{status || 'Unknown'}</Badge>;
    }
  };

  const pendingTransactions = transactions.filter(t => t.status === 'pending');
  const totalRevenue = transactions
    .filter(t => t.status === 'completed')
    .reduce((sum, t) => sum + readTransactionAmount(t.amount), 0);
  
  // Subscription payments (these go to admin PayPal account)
  const subscriptionTransactions = transactions.filter(t => 
    t.description?.toLowerCase().includes('host subscription') || 
    t.description?.toLowerCase().includes('subscription')
  );
  const subscriptionRevenue = subscriptionTransactions
    .filter(t => t.status === 'completed')
    .reduce((sum, t) => sum + readTransactionAmount(t.amount), 0);
  
  
  const activeSubscriptions = subscriptions.filter(s => s.status === 'active');
  const totalSubscriptionValue = subscriptions
    .filter(s => s.status === 'active')
    .reduce((sum, s) => sum + s.amount, 0);

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
          <BackButton to="/admin/dashboard" />
          <div>
            <h1 className="text-3xl font-bold">Payment Management</h1>
            <p className="text-muted-foreground">Review and manage all platform transactions</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">Subscription Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{formatPHP(subscriptionRevenue)}</div>
              <p className="text-xs text-muted-foreground mt-1">Paid to your PayPal</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Subscriptions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeSubscriptions.length}</div>
              <p className="text-xs text-muted-foreground mt-1">Total value: {formatPHP(totalSubscriptionValue)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingTransactions.length}</div>
              <p className="text-xs text-muted-foreground mt-1">Awaiting confirmation</p>
            </CardContent>
          </Card>
        </div>

        {/* PayPal Settings Link - Only show if not linked */}
        {!adminPayPalLinked && (
          <Card className="mb-6 border-primary/20 bg-primary/5">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Link Your PayPal Account</p>
                  <p className="text-sm text-muted-foreground">
                    Link your PayPal account to receive all subscription payments
                  </p>
                </div>
                <Button onClick={() => navigate('/admin/paypal-settings')}>
                  <CreditCard className="h-4 w-4 mr-2" />
                  Link PayPal Account
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Transactions List */}
        <Card>
          <CardHeader>
            <CardTitle>Transactions & Subscriptions</CardTitle>
            <CardDescription>Review and manage all payments and subscriptions</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="all">All Transactions</TabsTrigger>
                <TabsTrigger value="withdrawals">Withdrawals</TabsTrigger>
                <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
                <TabsTrigger value="subscription-payments">Subscription Payments</TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="mt-6">
                {transactions.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No transactions found</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {transactions.map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-2">
                        <p className="font-medium">{transaction.userName}</p>
                        {getStatusBadge(transaction.status)}
                      </div>
                      <p className="text-sm text-muted-foreground">{transaction.description}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {transaction.userEmail} • {new Date(transaction.createdAt).toLocaleDateString()}
                      </p>
                      {transaction.bookingId && (
                        <p className="text-xs text-muted-foreground">Booking ID: {transaction.bookingId.slice(0, 8)}</p>
                      )}
                      {transaction.paymentId && (
                        <p className="text-xs text-muted-foreground">Payment ID: {transaction.paymentId}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-lg font-bold">{formatPHP(readTransactionAmount(transaction.amount))}</p>
                        <p className="text-xs text-muted-foreground">{transaction.paymentMethod || 'N/A'}</p>
                      </div>
                      {transaction.status === 'pending' && (
                        <div className="flex gap-2">
                          {transaction.type === 'withdrawal' ? (
                            <>
                              <Button
                                size="sm"
                                onClick={() => handleAction(transaction, 'confirm')}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                Approve & Deduct Wallet
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleAction(transaction, 'decline')}
                              >
                                Decline
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                onClick={() => handleAction(transaction, 'confirm')}
                              >
                                Confirm
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleAction(transaction, 'refund')}
                              >
                                Refund
                              </Button>
                            </>
                          )}
                        </div>
                      )}
                      {transaction.status === 'completed' && transaction.type === 'withdrawal' && transaction.payoutStatus === 'pending' && (
                        <div className="text-right">
                          <p className="text-xs text-yellow-600 dark:text-yellow-400 font-medium">
                            ⚠️ Send via PayPal
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {transaction.payoutNote || `Send ₱${formatPHP(transaction.amount)} to ${transaction.paypalEmail || 'user'}`}
                          </p>
                        </div>
                      )}
                      {transaction.status === 'completed' && transaction.type === 'payment' && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleAction(transaction, 'refund')}
                        >
                          Refund
                        </Button>
                      )}
                    </div>
                    </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="withdrawals" className="mt-6">
                {(() => {
                  const withdrawalTransactions = transactions.filter(t => t.type === 'withdrawal');
                  const pendingWithdrawals = withdrawalTransactions.filter(t => t.status === 'pending');
                  
                  return withdrawalTransactions.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No withdrawal requests found</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {pendingWithdrawals.length > 0 && (
                        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mb-4">
                          <p className="text-sm font-medium text-yellow-700 dark:text-yellow-400">
                            ⚠️ {pendingWithdrawals.length} pending withdrawal{pendingWithdrawals.length > 1 ? 's' : ''} awaiting approval
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Approve to automatically process withdrawal and send PayPal payout
                          </p>
                        </div>
                      )}
                      {withdrawalTransactions.map((transaction) => (
                        <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex-1">
                            <div className="flex items-center gap-4 mb-2">
                              <p className="font-medium">{transaction.userName}</p>
                              {getStatusBadge(transaction.status)}
                              {transaction.status === 'completed' && transaction.payoutStatus === 'pending' && (
                                <Badge variant="outline" className="border-yellow-500 text-yellow-600 dark:text-yellow-400">
                                  Awaiting PayPal Transfer
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">{transaction.description}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {transaction.userEmail} • {new Date(transaction.createdAt).toLocaleDateString()}
                            </p>
                            {transaction.paypalEmail && (
                              <p className="text-xs text-muted-foreground">PayPal: {transaction.paypalEmail}</p>
                            )}
                            {transaction.payoutNote && (
                              <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1 font-medium">
                                {transaction.payoutNote}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="text-lg font-bold">{formatPHP(readTransactionAmount(transaction.amount))}</p>
                              <p className="text-xs text-muted-foreground">To send</p>
                              {transaction.walletDeduction && (
                                <p className="text-xs text-muted-foreground">
                                  Deduct: {formatPHP(transaction.walletDeduction)}
                                </p>
                              )}
                            </div>
                            {transaction.status === 'pending' && (
                              <Button
                                size="sm"
                                onClick={() => handleAction(transaction, 'confirm')}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                Approve & Deduct Wallet
                              </Button>
                            )}
                            {transaction.status === 'completed' && transaction.payoutStatus === 'pending' && (
                              <div className="text-right">
                                <p className="text-xs text-yellow-600 dark:text-yellow-400 font-medium">
                                  ⚠️ Send via PayPal
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {transaction.payoutNote || `Send ₱${formatPHP(transaction.amount)} to ${transaction.paypalEmail || 'user'}`}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </TabsContent>

              <TabsContent value="subscriptions" className="mt-6">
                {subscriptions.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No subscriptions found</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {subscriptions.map((subscription) => (
                      <div key={subscription.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-4 mb-2">
                            <p className="font-medium">{subscription.userName}</p>
                            <Badge className={subscription.status === 'active' ? 'bg-green-500' : subscription.status === 'cancelled' ? 'bg-yellow-500' : 'bg-gray-500'}>
                              {subscription.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {subscription.planName} ({subscription.billingCycle})
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {subscription.userEmail} • Started: {new Date(subscription.startDate).toLocaleDateString()}
                          </p>
                          {subscription.endDate && (
                            <p className="text-xs text-muted-foreground">
                              Expires: {new Date(subscription.endDate).toLocaleDateString()}
                            </p>
                          )}
                          {subscription.paymentId && (
                            <p className="text-xs text-muted-foreground">Payment ID: {subscription.paymentId}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-primary">{formatPHP(subscription.amount)}</p>
                          <p className="text-xs text-muted-foreground">{subscription.paymentMethod}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="subscription-payments" className="mt-6">
                {subscriptionTransactions.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No subscription payments found</p>
                    <p className="text-xs mt-2">These payments go directly to your PayPal account</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 mb-4">
                      <p className="text-sm font-medium text-primary">
                        💰 These subscription payments are received in your PayPal account
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Total subscription revenue: <strong>{formatPHP(subscriptionRevenue)}</strong>
                      </p>
                    </div>
                    {subscriptionTransactions.map((transaction) => (
                      <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg border-primary/20 bg-primary/5">
                        <div className="flex-1">
                          <div className="flex items-center gap-4 mb-2">
                            <p className="font-medium">{transaction.userName}</p>
                            {getStatusBadge(transaction.status)}
                            <Badge variant="outline" className="border-primary text-primary">
                              Subscription
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{transaction.description}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {transaction.userEmail} • {new Date(transaction.createdAt).toLocaleDateString()}
                          </p>
                          {transaction.paymentId && (
                            <p className="text-xs text-muted-foreground">PayPal Payment ID: {transaction.paymentId}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-primary">{formatPHP(readTransactionAmount(transaction.amount))}</p>
                          <p className="text-xs text-muted-foreground">{transaction.paymentMethod || 'PayPal'}</p>
                          <p className="text-xs text-primary mt-1">→ Your PayPal</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

            </Tabs>
          </CardContent>
        </Card>

        {/* Confirm/Refund Dialog */}
        <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {action === 'confirm' ? 'Confirm Transaction?' : action === 'decline' ? 'Decline Withdrawal?' : 'Refund Transaction?'}
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-4">
                {action === 'decline' ? (
                  <>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-destructive">
                        <AlertCircle className="h-4 w-4" />
                        <p className="font-medium">This will decline the withdrawal request. No wallet balances will be deducted.</p>
                      </div>
                      {transactionToUpdate && (
                        <div className="bg-muted p-3 rounded-lg space-y-1">
                          <p className="text-sm font-medium">Withdrawal Details:</p>
                          <p className="text-xs">Amount: <span className="font-semibold">{formatPHP(transactionToUpdate.amount)}</span></p>
                          <p className="text-xs">User: {transactionToUpdate.userName || transactionToUpdate.userEmail}</p>
                          <p className="text-xs">PayPal: {transactionToUpdate.paypalEmail || 'N/A'}</p>
                        </div>
                      )}
                      <div className="space-y-2">
                        <Label htmlFor="decline-reason">Decline Reason (Optional)</Label>
                        <Textarea
                          id="decline-reason"
                          placeholder="Enter reason for declining..."
                          value={declineReason}
                          onChange={(e) => setDeclineReason(e.target.value)}
                          rows={3}
                        />
                      </div>
                    </div>
                  </>
                ) : action === 'confirm' ? (
                  <>
                    {transactionToUpdate?.type === 'withdrawal' ? (
                      <>
                        <div className="bg-yellow-500/10 border border-yellow-500/20 p-3 rounded-lg">
                          <p className="text-sm font-medium text-yellow-700 dark:text-yellow-400 mb-2">
                            ⚠️ Withdrawal Approval (Automatic Transfer)
                          </p>
                          <p className="text-sm mb-3">
                            This will:
                          </p>
                          <ul className="list-disc list-inside text-sm space-y-1 mb-3">
                            <li>Deduct <strong>{formatPHP(transactionToUpdate.walletDeduction || transactionToUpdate.amount)}</strong> from user's wallet</li>
                            <li>Automatically send <strong>{formatPHP(transactionToUpdate.amount)}</strong> from your linked PayPal account to the recipient</li>
                            <li>Mark the withdrawal as completed</li>
                          </ul>
                          <p className="text-sm font-medium text-green-700 dark:text-green-400 mt-3">
                            ✅ After approval, the system will automatically send <strong>{formatPHP(transactionToUpdate.amount)}</strong> from your linked PayPal account to:
                          </p>
                          <p className="text-sm font-mono bg-background p-2 rounded mt-2">
                            {transactionToUpdate.paypalEmail || 'N/A'}
                          </p>
                        </div>
                        {transactionToUpdate && (
                          <div className="bg-muted p-3 rounded-lg">
                            <p className="text-sm font-medium">Transaction Details:</p>
                            <p className="text-xs text-muted-foreground">Amount to send: {formatPHP(transactionToUpdate.amount)}</p>
                            <p className="text-xs text-muted-foreground">Wallet deduction: {formatPHP(transactionToUpdate.walletDeduction || transactionToUpdate.amount)}</p>
                            <p className="text-xs text-muted-foreground">User: {transactionToUpdate.userName || transactionToUpdate.userEmail}</p>
                            <p className="text-xs text-muted-foreground">PayPal: {transactionToUpdate.paypalEmail || 'N/A'}</p>
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <p>Are you sure you want to confirm this transaction? This will process the payment and update wallet balances.</p>
                        {transactionToUpdate && (
                          <div className="bg-muted p-3 rounded-lg">
                            <p className="text-sm font-medium">Transaction Details:</p>
                            <p className="text-xs text-muted-foreground">Amount: {formatPHP(transactionToUpdate.amount)}</p>
                            <p className="text-xs text-muted-foreground">Type: {transactionToUpdate.type}</p>
                            <p className="text-xs text-muted-foreground">User: {transactionToUpdate.userName || transactionToUpdate.userEmail}</p>
                          </div>
                        )}
                      </>
                    )}
                  </>
                ) : (
                  <>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-destructive">
                        <AlertCircle className="h-4 w-4" />
                        <p className="font-medium">This will refund the payment and reverse wallet balances.</p>
                      </div>
                      {transactionToUpdate && (
                        <div className="bg-muted p-3 rounded-lg space-y-1">
                          <p className="text-sm font-medium">Refund Details:</p>
                          <p className="text-xs">Refund Amount: <span className="font-semibold">{formatPHP(transactionToUpdate.amount)}</span></p>
                          <p className="text-xs">Transaction Type: {transactionToUpdate.type}</p>
                          <p className="text-xs">User: {transactionToUpdate.userName || transactionToUpdate.userEmail}</p>
                          {transactionToUpdate.bookingId && (
                            <p className="text-xs">Booking ID: {transactionToUpdate.bookingId.slice(0, 8)}</p>
                          )}
                        </div>
                      )}
                      <div className="space-y-2">
                        <Label htmlFor="refund-reason">Refund Reason (Optional)</Label>
                        <Textarea
                          id="refund-reason"
                          placeholder="Enter reason for refund..."
                          value={refundReason}
                          onChange={(e) => setRefundReason(e.target.value)}
                          rows={3}
                        />
                      </div>
                    </div>
                  </>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={processing}>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={confirmAction}
                disabled={processing}
                className={action === 'refund' || action === 'decline' ? 'bg-destructive hover:bg-destructive/90' : ''}
              >
                {processing ? 'Processing...' : action === 'confirm' ? 'Confirm' : action === 'decline' ? 'Decline' : 'Refund'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};

export default ManagePayments;

