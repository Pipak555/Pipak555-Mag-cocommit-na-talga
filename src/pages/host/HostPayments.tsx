import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { collection, getDocs, query, where, orderBy, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, DollarSign, TrendingUp, Calendar, Wallet, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { getBookings, getUserTransactions } from "@/lib/firestore";
import type { Booking, Transaction, Listing } from "@/types";
import { formatPHP } from "@/lib/currency";
import LoadingScreen from "@/components/ui/loading-screen";

const HostPayments = () => {
  const navigate = useNavigate();
  const { user, userRole } = useAuth();
  const [loading, setLoading] = useState(true);
  const [earnings, setEarnings] = useState({
    totalEarnings: 0,
    pendingEarnings: 0,
    completedEarnings: 0,
    serviceFees: 0,
  });
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [serviceFeeBreakdownOpen, setServiceFeeBreakdownOpen] = useState(false);
  const [serviceFeeTransactions, setServiceFeeTransactions] = useState<Array<Transaction & { 
    listingTitle?: string;
    bookingId?: string;
    guestName?: string;
    guestEmail?: string;
  }>>([]);
  const [loadingBreakdown, setLoadingBreakdown] = useState(false);

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
      const serviceFees = totalEarnings * 0.1; // 10% service fee
      const completedEarnings = totalEarnings - serviceFees;

      setEarnings({
        totalEarnings,
        pendingEarnings,
        completedEarnings,
        serviceFees,
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

  const handleViewServiceFeeBreakdown = async () => {
    if (!user) return;
    
    setServiceFeeBreakdownOpen(true);
    setLoadingBreakdown(true);
    
    try {
      // Fetch all bookings for this host
      const bookingsData = await getBookings({ hostId: user.uid });
      const confirmedBookings = bookingsData.filter(
        b => b.status === 'confirmed' || b.status === 'completed'
      );

      // Calculate service fees for each booking and fetch details
      const transactionsWithDetails = await Promise.all(
        confirmedBookings.map(async (booking) => {
          const serviceFee = (booking.totalPrice || 0) * 0.1; // 10% service fee
          const transaction: Transaction & { 
            listingTitle?: string;
            bookingId?: string;
            guestName?: string;
            guestEmail?: string;
          } = {
            id: booking.id,
            userId: user.uid,
            type: 'payment',
            amount: serviceFee,
            description: `Service fee from booking #${booking.id.slice(0, 8)}`,
            status: 'completed',
            paymentMethod: 'service_fee',
            bookingId: booking.id,
            createdAt: booking.createdAt || new Date().toISOString(),
          };

          // Fetch listing title
          if (booking.listingId) {
            try {
              const listingDoc = await getDoc(doc(db, 'listing', booking.listingId));
              if (listingDoc.exists()) {
                const listingData = listingDoc.data() as Listing;
                transaction.listingTitle = listingData.title || 'N/A';
              }
            } catch (error) {
              console.error('Error fetching listing info:', error);
            }
          }

          // Fetch guest information
          if (booking.guestId) {
            try {
              const guestDoc = await getDoc(doc(db, 'users', booking.guestId));
              if (guestDoc.exists()) {
                const guestData = guestDoc.data();
                transaction.guestName = guestData.fullName || 'N/A';
                transaction.guestEmail = guestData.email || 'N/A';
              }
            } catch (error) {
              console.error('Error fetching guest info:', error);
            }
          }

          return transaction;
        })
      );

      // Sort by date (newest first)
      transactionsWithDetails.sort((a, b) => {
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return dateB - dateA;
      });

      setServiceFeeTransactions(transactionsWithDetails);
    } catch (error: any) {
      console.error('Error loading service fee breakdown:', error);
      toast.error(`Failed to load service fee breakdown: ${error.message || 'Unknown error'}`);
    } finally {
      setLoadingBreakdown(false);
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
          <Button variant="ghost" onClick={() => navigate('/host/dashboard')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Payments & Earnings</h1>
            <p className="text-muted-foreground">View your earnings and payment history</p>
          </div>
        </div>

        {/* Earnings Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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
              <p className="text-xs text-muted-foreground mt-1">After 10% service fee</p>
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

          <Card 
            className="cursor-pointer hover:shadow-medium transition-shadow"
            onClick={handleViewServiceFeeBreakdown}
          >
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Service Fees</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-accent">{formatPHP(earnings.serviceFees)}</div>
              <p className="text-xs text-muted-foreground mt-1">10% commission • Click to view breakdown</p>
            </CardContent>
          </Card>
        </div>

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
                        {transaction.type === 'deposit' || transaction.type === 'reward' ? '+' : '-'}{formatPHP(transaction.amount)}
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

        {/* Service Fee Breakdown Dialog */}
        <Dialog open={serviceFeeBreakdownOpen} onOpenChange={setServiceFeeBreakdownOpen}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Service Fee Breakdown
              </DialogTitle>
              <DialogDescription>
                Detailed breakdown of service fees deducted from your earnings (10% commission)
              </DialogDescription>
            </DialogHeader>

            {loadingBreakdown ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-3 text-muted-foreground">Loading breakdown...</p>
              </div>
            ) : serviceFeeTransactions.length === 0 ? (
              <div className="text-center py-12">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">No service fees yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Summary */}
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Service Fees</p>
                        <p className="text-2xl font-bold text-accent">
                          {formatPHP(
                            serviceFeeTransactions.reduce((sum, t) => sum + (t.amount || 0), 0)
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Total Bookings</p>
                        <p className="text-2xl font-bold">{serviceFeeTransactions.length}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Transactions Table */}
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Booking ID</TableHead>
                        <TableHead>Listing</TableHead>
                        <TableHead>Guest Name</TableHead>
                        <TableHead>Guest Email</TableHead>
                        <TableHead className="text-right">Service Fee</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {serviceFeeTransactions.map((transaction) => (
                        <TableRow key={transaction.id}>
                          <TableCell>
                            {transaction.createdAt
                              ? new Date(transaction.createdAt).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : 'N/A'}
                          </TableCell>
                          <TableCell>
                            <code className="text-xs bg-muted px-2 py-1 rounded">
                              {transaction.bookingId?.slice(0, 8) || 'N/A'}
                            </code>
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            {transaction.listingTitle || 'N/A'}
                          </TableCell>
                          <TableCell>{transaction.guestName || 'N/A'}</TableCell>
                          <TableCell>
                            {transaction.guestEmail ? (
                              <a
                                href={`mailto:${transaction.guestEmail}`}
                                className="text-primary hover:underline"
                              >
                                {transaction.guestEmail}
                              </a>
                            ) : (
                              'N/A'
                            )}
                          </TableCell>
                          <TableCell className="text-right font-semibold text-accent">
                            {formatPHP(transaction.amount || 0)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default HostPayments;

