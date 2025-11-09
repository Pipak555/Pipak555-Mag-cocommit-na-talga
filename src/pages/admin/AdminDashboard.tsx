import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Shield, Users, Home, DollarSign, TrendingUp, FileText, Settings, AlertCircle, Loader2, MessageSquare } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import Logo from '@/components/shared/Logo';
import { collection, onSnapshot, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from 'sonner';
import { formatPHP } from '@/lib/currency';
import type { Transaction, Booking, Listing } from '@/types';
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

const AdminDashboard = () => {
  const { user, userRole, userProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalHosts: 0,
    totalGuests: 0,
    totalAdmins: 0,
    activeListings: 0,
    totalBookings: 0,
    cancelledBookings: 0,
    serviceFees: 0,
  });
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [serviceFeeBreakdownOpen, setServiceFeeBreakdownOpen] = useState(false);
  const [serviceFeeTransactions, setServiceFeeTransactions] = useState<Array<Transaction & { 
    hostName?: string; 
    hostEmail?: string;
    listingTitle?: string;
    bookingId?: string;
  }>>([]);
  const [loadingBreakdown, setLoadingBreakdown] = useState(false);

  useEffect(() => {
    if (!user || userRole !== 'admin') {
      navigate('/admin/login');
      return;
    }

    // Initialize unsubscribe functions as null
    let usersUnsubscribe: (() => void) | null = null;
    let listingsUnsubscribe: (() => void) | null = null;
    let bookingsUnsubscribe: (() => void) | null = null;

    // Set up real-time listeners with error handling
    usersUnsubscribe = onSnapshot(
      collection(db, 'users'), 
      (snapshot) => {
        const users = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            email: data.email as string | undefined,
            role: data.role as string | undefined,
            fullName: data.fullName as string | undefined,
            ...data
          };
        });
        
        // Debug: Log all users and their roles
        console.log('📊 All users fetched:', users.length);
        console.log('📊 User details:', users.map(u => ({
          id: u.id,
          email: (u as any).email || 'N/A',
          role: (u as any).role || 'unknown',
          fullName: (u as any).fullName || 'N/A'
        })));
        
        const hosts = users.filter((u: any) => u.role === 'host').length;
        const guests = users.filter((u: any) => u.role === 'guest').length;
        const admins = users.filter((u: any) => u.role === 'admin').length;
        
        console.log('📊 Count breakdown:', { hosts, guests, admins, total: users.length });
        
        setStats(prev => ({
          ...prev,
          totalUsers: snapshot.size,
          totalHosts: hosts,
          totalGuests: guests,
          totalAdmins: admins,
        }));
      },
      (error) => {
        console.error('❌ Error fetching users:', error);
        toast.error(`Failed to load users: ${error.message}`);
      }
    );

    listingsUnsubscribe = onSnapshot(
      collection(db, 'listing'),
      (snapshot) => {
        const activeListings = snapshot.docs.filter(
          doc => doc.data().status === 'approved'
        ).length;
        setStats(prev => ({ ...prev, activeListings }));
      },
      (error) => {
        console.error('Error fetching listings:', error);
        toast.error(`Failed to load listings: ${error.message}`);
      }
    );

    bookingsUnsubscribe = onSnapshot(
      collection(db, 'bookings'),
      (snapshot) => {
        const bookings = snapshot.docs.map(doc => doc.data());
        // Only count confirmed/completed bookings for revenue
        const activeBookings = bookings.filter(b => b.status === 'confirmed' || b.status === 'completed');
        const cancelledBookings = bookings.filter(b => b.status === 'cancelled');
        const totalRevenue = activeBookings.reduce((sum, b) => sum + (b.totalPrice || 0), 0);
        
        setStats(prev => ({
          ...prev,
          totalBookings: snapshot.size,
          cancelledBookings: cancelledBookings.length,
        }));
      },
      (error) => {
        console.error('Error fetching bookings:', error);
        toast.error(`Failed to load bookings: ${error.message}`);
      }
    );

    // Load actual service fees from transactions
    const loadServiceFees = async () => {
      try {
        const serviceFeeQuery = query(
          collection(db, 'transactions'),
          where('userId', '==', 'platform'),
          where('paymentMethod', '==', 'service_fee')
        );
        const snapshot = await getDocs(serviceFeeQuery);
        const totalServiceFees = snapshot.docs.reduce((sum, doc) => {
          const data = doc.data();
          return sum + (data.amount || 0);
        }, 0);
        
        setStats(prev => ({
          ...prev,
          serviceFees: totalServiceFees,
        }));
      } catch (error: any) {
        console.error('Error loading service fees:', error);
        // Don't show error toast, just log it
      }
    };

    loadServiceFees();

    return () => {
      // Only unsubscribe if the functions were created
      if (usersUnsubscribe) usersUnsubscribe();
      if (listingsUnsubscribe) listingsUnsubscribe();
      if (bookingsUnsubscribe) bookingsUnsubscribe();
    };
  }, [user, userRole, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const handleViewServiceFeeBreakdown = async () => {
    setServiceFeeBreakdownOpen(true);
    setLoadingBreakdown(true);
    
    try {
      // Fetch all service fee transactions
      const serviceFeeQuery = query(
        collection(db, 'transactions'),
        where('userId', '==', 'platform'),
        where('paymentMethod', '==', 'service_fee')
      );
      const snapshot = await getDocs(serviceFeeQuery);
      
      // Fetch host and listing info for each transaction
      const transactionsWithDetails = await Promise.all(
        snapshot.docs.map(async (docSnapshot) => {
          const data = docSnapshot.data() as Transaction;
          const transaction: Transaction & { 
            hostName?: string; 
            hostEmail?: string;
            listingTitle?: string;
            bookingId?: string;
          } = {
            id: docSnapshot.id,
            ...data,
          };

          // Fetch host information
          if (data.hostId) {
            try {
              const hostDoc = await getDoc(doc(db, 'users', data.hostId));
              if (hostDoc.exists()) {
                const hostData = hostDoc.data();
                transaction.hostName = hostData.fullName || 'N/A';
                transaction.hostEmail = hostData.email || 'N/A';
              }
            } catch (error) {
              console.error('Error fetching host info:', error);
            }
          }

          // Fetch booking and listing information
          if (data.bookingId) {
            try {
              const bookingDoc = await getDoc(doc(db, 'bookings', data.bookingId));
              if (bookingDoc.exists()) {
                const bookingData = bookingDoc.data() as Booking;
                transaction.bookingId = data.bookingId;
                
                // Fetch listing title
                if (bookingData.listingId) {
                  try {
                    const listingDoc = await getDoc(doc(db, 'listing', bookingData.listingId));
                    if (listingDoc.exists()) {
                      const listingData = listingDoc.data() as Listing;
                      transaction.listingTitle = listingData.title || 'N/A';
                    }
                  } catch (error) {
                    console.error('Error fetching listing info:', error);
                  }
                }
              }
            } catch (error) {
              console.error('Error fetching booking info:', error);
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60 shadow-soft">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Logo size="sm" />
            <div className="p-2 rounded-lg bg-accent/10">
              <Shield className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h1 className="text-lg font-bold">
                Welcome, {userProfile?.fullName || 'Admin'}!
              </h1>
              <p className="text-xs text-muted-foreground">Platform management</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <ThemeToggle />
            <Button variant="outline" onClick={() => setLogoutDialogOpen(true)}>Sign Out</Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8 p-6 rounded-xl bg-gradient-accent text-white">
          <h2 className="text-3xl font-bold mb-2">Platform Overview</h2>
          <p className="text-white/90">Welcome back, {userProfile?.fullName || 'Admin'}!</p>
        </div>

        {/* Platform Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="shadow-soft">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.totalHosts} hosts, {stats.totalGuests} guests{stats.totalAdmins > 0 ? `, ${stats.totalAdmins} admin${stats.totalAdmins > 1 ? 's' : ''}` : ''}
              </p>
            </CardContent>
          </Card>

          <Card 
            className="shadow-soft cursor-pointer hover:shadow-medium transition-shadow"
            onClick={() => navigate('/admin/active-listings')}
          >
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Listings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeListings}</div>
              <p className="text-xs text-muted-foreground mt-1">Click to manage</p>
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Bookings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalBookings}</div>
            </CardContent>
          </Card>

          <Card 
            className="shadow-soft cursor-pointer hover:shadow-medium transition-shadow"
            onClick={handleViewServiceFeeBreakdown}
          >
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Service Fees</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-accent">{formatPHP(stats.serviceFees)}</div>
              <p className="text-xs text-muted-foreground mt-1">10% commission • Click to view breakdown</p>
            </CardContent>
          </Card>
        </div>

        {/* Admin Tools */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Card className="shadow-medium hover:shadow-hover transition-smooth cursor-pointer" onClick={() => navigate('/admin/users')}>
            <CardHeader>
              <Users className="w-8 h-8 text-primary mb-2" />
              <CardTitle>User Management</CardTitle>
              <CardDescription>
                Manage hosts, guests, and permissions
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="shadow-medium hover:shadow-hover transition-smooth cursor-pointer" onClick={() => navigate('/admin/listings')}>
            <CardHeader>
              <Home className="w-8 h-8 text-primary mb-2" />
              <CardTitle>Listings Review</CardTitle>
              <CardDescription>
                Approve and moderate listings
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="shadow-medium hover:shadow-hover transition-smooth cursor-pointer" onClick={() => navigate('/admin/payments')}>
            <CardHeader>
              <DollarSign className="w-8 h-8 text-accent mb-2" />
              <CardTitle>Payment Management</CardTitle>
              <CardDescription>
                Review and confirm payments
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="shadow-medium hover:shadow-hover transition-smooth cursor-pointer" onClick={() => navigate('/admin/analytics')}>
            <CardHeader>
              <TrendingUp className="w-8 h-8 text-secondary mb-2" />
              <CardTitle>Analytics</CardTitle>
              <CardDescription>
                View platform performance metrics
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="shadow-medium hover:shadow-hover transition-smooth cursor-pointer" onClick={() => navigate('/admin/reports')}>
            <CardHeader>
              <FileText className="w-8 h-8 text-secondary mb-2" />
              <CardTitle>Reports</CardTitle>
              <CardDescription>
                Generate platform reports
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="shadow-medium hover:shadow-hover transition-smooth cursor-pointer" onClick={() => navigate('/admin/policies')}>
            <CardHeader>
              <Settings className="w-8 h-8 text-muted-foreground mb-2" />
              <CardTitle>Policies & Settings</CardTitle>
              <CardDescription>
                Manage platform policies
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="shadow-medium hover:shadow-hover transition-smooth cursor-pointer" onClick={() => navigate('/admin/messages')}>
            <CardHeader>
              <MessageSquare className="w-8 h-8 text-primary mb-2" />
              <CardTitle>Messages</CardTitle>
              <CardDescription>
                View and respond to messages
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card className="shadow-medium">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest platform events</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No recent activity to display</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Service Fee Breakdown Dialog */}
      <Dialog open={serviceFeeBreakdownOpen} onOpenChange={setServiceFeeBreakdownOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Service Fee Breakdown
            </DialogTitle>
            <DialogDescription>
              Detailed breakdown of all service fees collected (10% commission)
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
              <p className="text-muted-foreground">No service fees collected yet</p>
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
                      <p className="text-sm text-muted-foreground">Total Transactions</p>
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
                      <TableHead>Host Name</TableHead>
                      <TableHead>Host Email</TableHead>
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
                        <TableCell>{transaction.hostName || 'N/A'}</TableCell>
                        <TableCell>
                          {transaction.hostEmail ? (
                            <a
                              href={`mailto:${transaction.hostEmail}`}
                              className="text-primary hover:underline"
                            >
                              {transaction.hostEmail}
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

      {/* Logout Confirmation Dialog */}
      <AlertDialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign Out</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to sign out? You'll need to sign in again to access your account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSignOut} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Sign Out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminDashboard;
