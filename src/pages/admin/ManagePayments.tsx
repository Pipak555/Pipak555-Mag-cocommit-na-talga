import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { collection, getDocs, query, orderBy, doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, DollarSign, CheckCircle, XCircle, Clock } from "lucide-react";
import { toast } from "sonner";
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
import type { Transaction } from "@/types";
import { formatPHP } from "@/lib/currency";
import LoadingScreen from "@/components/ui/loading-screen";

interface TransactionWithUser extends Transaction {
  userEmail?: string;
  userName?: string;
}

const ManagePayments = () => {
  const navigate = useNavigate();
  const { user, userRole } = useAuth();
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<TransactionWithUser[]>([]);
  const [transactionToUpdate, setTransactionToUpdate] = useState<string | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [action, setAction] = useState<'confirm' | 'refund' | null>(null);

  useEffect(() => {
    if (!user || userRole !== 'admin') {
      navigate('/admin/login');
    } else {
      loadTransactions();
    }
  }, [user, userRole, navigate]);

  const loadTransactions = async () => {
    try {
      setLoading(true);
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
    } catch (error: any) {
      console.error('Error loading transactions:', error);
      toast.error(`Failed to load transactions: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = (id: string, action: 'confirm' | 'refund') => {
    setTransactionToUpdate(id);
    setAction(action);
    setConfirmDialogOpen(true);
  };

  const confirmAction = async () => {
    if (!transactionToUpdate || !action) return;
    
    try {
      const transactionRef = doc(db, 'transactions', transactionToUpdate);
      const status = action === 'confirm' ? 'completed' : 'refunded';
      
      await updateDoc(transactionRef, { status });
      
      toast.success(`Transaction ${action === 'confirm' ? 'confirmed' : 'refunded'}`);
      loadTransactions();
      setTransactionToUpdate(null);
      setAction(null);
    } catch (error) {
      toast.error(`Failed to ${action} transaction`);
      console.error(error);
    } finally {
      setConfirmDialogOpen(false);
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Completed</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
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
    .reduce((sum, t) => sum + t.amount, 0);

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
          <Button variant="ghost" onClick={() => navigate('/admin/dashboard')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Payment Management</h1>
            <p className="text-muted-foreground">Review and manage all platform transactions</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatPHP(totalRevenue)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingTransactions.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{transactions.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Transactions List */}
        <Card>
          <CardHeader>
            <CardTitle>All Transactions</CardTitle>
            <CardDescription>Review and manage payment transactions</CardDescription>
          </CardHeader>
          <CardContent>
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
                      {transaction.paymentId && (
                        <p className="text-xs text-muted-foreground">Payment ID: {transaction.paymentId}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-lg font-bold">{formatPHP(transaction.amount)}</p>
                        <p className="text-xs text-muted-foreground">{transaction.paymentMethod || 'N/A'}</p>
                      </div>
                      {transaction.status === 'pending' && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleAction(transaction.id, 'confirm')}
                          >
                            Confirm
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleAction(transaction.id, 'refund')}
                          >
                            Refund
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Confirm Dialog */}
        <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {action === 'confirm' ? 'Confirm Transaction?' : 'Refund Transaction?'}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {action === 'confirm'
                  ? 'Are you sure you want to confirm this transaction? This action cannot be undone.'
                  : 'Are you sure you want to refund this transaction? The payment will be reversed.'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmAction}>
                {action === 'confirm' ? 'Confirm' : 'Refund'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};

export default ManagePayments;

