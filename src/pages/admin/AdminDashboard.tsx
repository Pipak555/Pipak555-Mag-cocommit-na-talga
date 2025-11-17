import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { AdminEmailVerificationBanner } from '@/components/admin/EmailVerificationBanner';
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
import { Shield, Users, Home, DollarSign, TrendingUp, FileText, Settings, AlertCircle, Loader2, MessageSquare, CreditCard, Megaphone, Gift, Calendar, Star, TrendingDown } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import Logo from '@/components/shared/Logo';
import { collection, onSnapshot, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from 'sonner';
import { formatPHP } from '@/lib/currency';
import type { Transaction, Booking, Listing, PlatformEvent, Review } from '@/types';
import { getAllEvents } from '@/lib/eventService';
import { readTransactionAmount } from '@/lib/financialUtils';
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
    totalEarnings: 0,
    subscriptionRevenue: 0,
  });
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [earningsBreakdownOpen, setEarningsBreakdownOpen] = useState(false);
  const [allEarningsTransactions, setAllEarningsTransactions] = useState<Array<Transaction & { 
    hostName?: string; 
    hostEmail?: string;
    listingTitle?: string;
    bookingId?: string;
    earningsType?: 'subscription';
  }>>([]);
  const [loadingBreakdown, setLoadingBreakdown] = useState(false);
  const [recentEvents, setRecentEvents] = useState<PlatformEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [analytics, setAnalytics] = useState({
    topRatedListings: [] as Array<{ id: string; title: string; rating: number; reviewCount: number; price: number }>,
    lowestRatedListings: [] as Array<{ id: string; title: string; rating: number; reviewCount: number; price: number }>,
    revenueTrends: [] as Array<{ week: string; revenue: number; percentage: number }>,
    avgRating: 0,
    listingChange: 0,
    bookingChange: 0,
  });
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

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
          roles: (u as any).roles || [],
          fullName: (u as any).fullName || 'N/A'
        })));
        
        // Count users by checking both roles array and role field
        // A user can have multiple roles, so count each role separately
        let hosts = 0;
        let guests = 0;
        let admins = 0;
        
        users.forEach((u: any) => {
          // Get all roles - check roles array first, fallback to role field
          const allRoles = (u.roles && Array.isArray(u.roles) && u.roles.length > 0)
            ? u.roles
            : u.role
              ? [u.role]
              : [];
          
          // Count each role (user can be counted in multiple categories)
          const uniqueRoles = Array.from(new Set(allRoles));
          uniqueRoles.forEach((role: string) => {
            if (role === 'host') hosts++;
            if (role === 'guest') guests++;
            if (role === 'admin') admins++;
          });
        });
        
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
        // Only count confirmed and completed bookings (not pending)
        const confirmedBookings = bookings.filter(b => b.status === 'confirmed' || b.status === 'completed');
        const totalRevenue = activeBookings.reduce((sum, b) => sum + (b.totalPrice || 0), 0);
        
        setStats(prev => ({
          ...prev,
          totalBookings: confirmedBookings.length,
          cancelledBookings: cancelledBookings.length,
        }));
      },
      (error) => {
        console.error('Error fetching bookings:', error);
        toast.error(`Failed to load bookings: ${error.message}`);
      }
    );

    // Load total earnings (subscription revenue only)
    const loadTotalEarnings = async () => {
      try {
        // Load subscription payments (transactions with subscription in description)
        const allTransactionsSnapshot = await getDocs(collection(db, 'transactions'));
        const subscriptionTransactions = allTransactionsSnapshot.docs
          .map(doc => doc.data())
          .filter((t: any) => 
            (t.description?.toLowerCase().includes('host subscription') || 
             t.description?.toLowerCase().includes('subscription')) &&
            t.status === 'completed'
          );
        const subscriptionRevenue = subscriptionTransactions.reduce((sum: number, t: any) => {
          return sum + readTransactionAmount(t.amount || 0);
        }, 0);

        const totalEarnings = subscriptionRevenue;
        
        setStats(prev => ({
          ...prev,
          totalEarnings,
          subscriptionRevenue,
        }));
      } catch (error: any) {
        console.error('Error loading total earnings:', error);
        // Don't show error toast, just log it
      }
    };

    loadTotalEarnings();

    // Load recent events
    const loadEvents = async () => {
      try {
        setLoadingEvents(true);
        const events = await getAllEvents();
        // Get latest 10 events
        setRecentEvents(events.slice(0, 10));
      } catch (error: any) {
        console.error('Error loading events:', error);
      } finally {
        setLoadingEvents(false);
      }
    };

    loadEvents();

    // Load analytics
    const loadAnalytics = async () => {
      setLoadingAnalytics(true);
      try {
        const [listingsSnap, bookingsSnap, reviewsSnap, transactionsSnap] = await Promise.all([
          getDocs(collection(db, 'listing')),
          getDocs(collection(db, 'bookings')),
          getDocs(collection(db, 'reviews')),
          getDocs(collection(db, 'transactions'))
        ]);

        const listings = listingsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Listing));
        const approvedListings = listings.filter(l => l.status === 'approved');
        const bookings = bookingsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));
        const confirmedBookings = bookings.filter(b => b.status === 'confirmed' || b.status === 'completed');
        const reviews = reviewsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Review));

        // Calculate average rating
        const avgRating = reviews.length > 0
          ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
          : 0;

        // Calculate top rated listings
        const listingRatings = new Map<string, { totalRating: number; count: number }>();
        reviews.forEach(review => {
          const existing = listingRatings.get(review.listingId) || { totalRating: 0, count: 0 };
          listingRatings.set(review.listingId, {
            totalRating: existing.totalRating + review.rating,
            count: existing.count + 1
          });
        });

        const topListings = Array.from(listingRatings.entries())
          .map(([listingId, data]) => {
            const listing = approvedListings.find(l => l.id === listingId);
            if (!listing) return null;
            return {
              id: listingId,
              title: listing.title,
              rating: data.totalRating / data.count,
              reviewCount: data.count,
              price: listing.price
            };
          })
          .filter((listing): listing is { id: string; title: string; rating: number; reviewCount: number; price: number } => listing !== null)
          .sort((a, b) => {
            if (b.rating !== a.rating) return b.rating - a.rating;
            return b.reviewCount - a.reviewCount;
          })
          .slice(0, 3);

        const lowestListings = Array.from(listingRatings.entries())
          .map(([listingId, data]) => {
            const listing = approvedListings.find(l => l.id === listingId);
            if (!listing) return null;
            return {
              id: listingId,
              title: listing.title,
              rating: data.totalRating / data.count,
              reviewCount: data.count,
              price: listing.price
            };
          })
          .filter((listing): listing is { id: string; title: string; rating: number; reviewCount: number; price: number } => listing !== null)
          .sort((a, b) => {
            if (a.rating !== b.rating) return a.rating - b.rating;
            return b.reviewCount - a.reviewCount;
          })
          .slice(0, 3);

        // Calculate revenue trends (last 30 days)
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const subscriptionTransactions = transactionsSnap.docs
          .map(doc => doc.data())
          .filter((t: any) => 
            (t.description?.toLowerCase().includes('host subscription') || 
             t.description?.toLowerCase().includes('subscription')) &&
            t.status === 'completed'
          );

        const weeklyRevenue: Array<{ week: string; revenue: number; percentage: number }> = [];
        const maxRevenue = Math.max(...subscriptionTransactions.map((t: any) => readTransactionAmount(t.amount || 0)), 1);

        for (let week = 0; week < 4; week++) {
          const weekStart = new Date(thirtyDaysAgo);
          weekStart.setDate(weekStart.getDate() + week * 7);
          weekStart.setHours(0, 0, 0, 0);
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekEnd.getDate() + 7);

          const weekTransactions = subscriptionTransactions.filter((t: any) => {
            const transactionDate = new Date(t.createdAt);
            return transactionDate >= weekStart && transactionDate < weekEnd;
          });

          const weekRev = weekTransactions.reduce((sum: number, t: any) => 
            sum + readTransactionAmount(t.amount || 0), 0);
          const percentage = maxRevenue > 0 ? (weekRev / maxRevenue) * 100 : 0;

          weeklyRevenue.push({
            week: `Week ${week + 1}`,
            revenue: weekRev,
            percentage: Math.min(percentage, 100)
          });
        }

        // Calculate percentage changes
        const firstHalfBookings = confirmedBookings.filter(b => {
          const bookingDate = new Date(b.createdAt);
          const daysAgo = (now.getTime() - bookingDate.getTime()) / (1000 * 60 * 60 * 24);
          return daysAgo <= 30 && daysAgo > 15;
        }).length;

        const secondHalfBookings = confirmedBookings.filter(b => {
          const bookingDate = new Date(b.createdAt);
          const daysAgo = (now.getTime() - bookingDate.getTime()) / (1000 * 60 * 60 * 24);
          return daysAgo <= 15;
        }).length;

        const bookingChangePercent = firstHalfBookings > 0
          ? ((secondHalfBookings - firstHalfBookings) / firstHalfBookings) * 100
          : 0;

        const firstHalfListings = approvedListings.filter(l => {
          const listingDate = new Date(l.createdAt);
          const daysAgo = (now.getTime() - listingDate.getTime()) / (1000 * 60 * 60 * 24);
          return daysAgo <= 30 && daysAgo > 15;
        }).length;

        const secondHalfListings = approvedListings.filter(l => {
          const listingDate = new Date(l.createdAt);
          const daysAgo = (now.getTime() - listingDate.getTime()) / (1000 * 60 * 60 * 24);
          return daysAgo <= 15;
        }).length;

        const listingChangePercent = firstHalfListings > 0
          ? ((secondHalfListings - firstHalfListings) / firstHalfListings) * 100
          : 0;

        setAnalytics({
          topRatedListings: topListings,
          lowestRatedListings: lowestListings,
          revenueTrends: weeklyRevenue,
          avgRating,
          listingChange: listingChangePercent,
          bookingChange: bookingChangePercent,
        });
      } catch (error: any) {
        console.error('Error loading analytics:', error);
      } finally {
        setLoadingAnalytics(false);
      }
    };

    loadAnalytics();

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

  // Recent Activity Component
  const RecentActivity = () => {
    if (loadingEvents) {
      return (
        <div className="text-center py-8">
          <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin text-role-admin" />
          <p className="text-muted-foreground">Loading events...</p>
        </div>
      );
    }

    if (recentEvents.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No recent activity to display</p>
          <Button 
            variant="outline" 
            size="sm" 
            className="mt-4"
            onClick={() => navigate('/admin/create-event')}
          >
            <Megaphone className="h-4 w-4 mr-2" />
            Create Your First Event
          </Button>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {recentEvents.map((event) => (
          <div
            key={event.id}
            className="flex items-start gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
          >
            <div className={`p-2 rounded-lg ${
              event.type === 'coupon' ? 'bg-green-100 dark:bg-green-900/20' :
              event.type === 'announcement' ? 'bg-blue-100 dark:bg-blue-900/20' :
              'bg-purple-100 dark:bg-purple-900/20'
            }`}>
              {event.type === 'coupon' ? (
                <Gift className="h-5 w-5 text-green-600 dark:text-green-400" />
              ) : (
                <Megaphone className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <h4 className="font-semibold text-sm mb-1">{event.title}</h4>
                  <p className="text-sm text-muted-foreground line-clamp-2">{event.description}</p>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <Badge variant="outline" className="text-xs">
                      {event.type}
                    </Badge>
                    {event.type === 'coupon' && event.couponCode && (
                      <Badge variant="secondary" className="text-xs font-mono">
                        {event.couponCode}
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {event.targetRoles.join(', ')}
                    </span>
                    {event.notificationSent && (
                      <Badge variant="outline" className="text-xs bg-green-50 dark:bg-green-900/20">
                        Sent
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground whitespace-nowrap">
                  {new Date(event.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const handleViewEarningsBreakdown = async () => {
    setEarningsBreakdownOpen(true);
    setLoadingBreakdown(true);
    
    try {
      // Fetch all transactions
      const allTransactionsSnapshot = await getDocs(collection(db, 'transactions'));
      
      // Filter for earnings transactions (subscriptions only)
      const earningsTransactions = allTransactionsSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Transaction))
        .filter((t: Transaction) => 
          (t.description?.toLowerCase().includes('host subscription') || 
           t.description?.toLowerCase().includes('subscription')) &&
          t.status === 'completed'
        );
      
      // Fetch host info for each transaction
      const transactionsWithDetails = await Promise.all(
        earningsTransactions.map(async (data) => {
          const transaction: Transaction & { 
            hostName?: string; 
            hostEmail?: string;
            earningsType?: 'subscription';
          } = {
            ...data,
            earningsType: 'subscription',
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

          // For subscription payments, try to get host from userId if hostId is not available
          if (transaction.earningsType === 'subscription' && !transaction.hostId && data.userId && data.userId !== 'platform') {
            try {
              const hostDoc = await getDoc(doc(db, 'users', data.userId));
              if (hostDoc.exists()) {
                const hostData = hostDoc.data();
                transaction.hostName = hostData.fullName || 'N/A';
                transaction.hostEmail = hostData.email || 'N/A';
              }
            } catch (error) {
              console.error('Error fetching subscription host info:', error);
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

      setAllEarningsTransactions(transactionsWithDetails);
    } catch (error: any) {
      console.error('Error loading earnings breakdown:', error);
      toast.error(`Failed to load earnings breakdown: ${error.message || 'Unknown error'}`);
    } finally {
      setLoadingBreakdown(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60 shadow-soft">
        <div className="container mx-auto px-3 sm:px-4 md:px-6 py-3 sm:py-4 flex justify-between items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <Logo size="sm" />
            <div className="hidden sm:block p-2 rounded-lg bg-role-admin/10">
              <Shield className="w-5 h-5 text-role-admin" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-sm sm:text-base md:text-lg font-bold truncate">
                Welcome, {userProfile?.fullName || 'Admin'}!
              </h1>
              <p className="text-xs text-muted-foreground hidden sm:block">Platform management</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            <NotificationBell />
            <ThemeToggle />
            <Button variant="outline" onClick={() => setLogoutDialogOpen(true)} className="h-9 sm:h-auto text-xs sm:text-sm px-2 sm:px-4 touch-manipulation hover:bg-role-admin/10 hover:text-role-admin hover:border-role-admin/30">
              <span className="hidden sm:inline">Sign Out</span>
              <span className="sm:hidden">Out</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
        {/* Email Verification Banner */}
        <AdminEmailVerificationBanner />
        {/* Welcome Section */}
        <div className="mb-4 sm:mb-6 md:mb-8 p-4 sm:p-5 md:p-6 rounded-xl bg-role-admin text-role-admin-foreground">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold mb-2">Platform Overview</h2>
          <p className="text-sm sm:text-base text-role-admin-foreground/90">Welcome back, {userProfile?.fullName || 'Admin'}!</p>
        </div>

        {/* Platform Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-4 sm:mb-6 md:mb-8">
          <Card className="shadow-soft">
            <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6 pt-3 sm:pt-6">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Total Users</CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
              <div className="text-xl sm:text-2xl font-bold">{stats.totalUsers}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.totalHosts} hosts, {stats.totalGuests} guests{stats.totalAdmins > 0 ? `, ${stats.totalAdmins} admin${stats.totalAdmins > 1 ? 's' : ''}` : ''}
              </p>
            </CardContent>
          </Card>

          <Card 
            className="shadow-soft cursor-pointer hover:shadow-medium transition-shadow touch-manipulation"
            onClick={() => navigate('/admin/active-listings')}
          >
            <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6 pt-3 sm:pt-6">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Active Listings</CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
              <div className="text-xl sm:text-2xl font-bold">{stats.activeListings}</div>
              <p className="text-xs text-muted-foreground mt-1">Click to manage</p>
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6 pt-3 sm:pt-6">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Total Bookings</CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
              <div className="text-xl sm:text-2xl font-bold">{stats.totalBookings}</div>
              {analytics.bookingChange !== 0 && (
                <div className={`flex items-center text-xs mt-1 ${analytics.bookingChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {analytics.bookingChange >= 0 ? (
                    <TrendingUp className="h-3 w-3 mr-1" />
                  ) : (
                    <TrendingDown className="h-3 w-3 mr-1" />
                  )}
                  {analytics.bookingChange >= 0 ? '+' : ''}{analytics.bookingChange.toFixed(1)}% from last period
                </div>
              )}
            </CardContent>
          </Card>

          <Card 
            className="shadow-soft cursor-pointer hover:shadow-medium transition-shadow touch-manipulation"
            onClick={handleViewEarningsBreakdown}
          >
            <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6 pt-3 sm:pt-6">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Total Earnings</CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
              <div className="text-xl sm:text-2xl font-bold text-role-admin">{formatPHP(stats.totalEarnings)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Subscriptions: {formatPHP(stats.subscriptionRevenue)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Click to view breakdown</p>
            </CardContent>
          </Card>
        </div>

        {/* Analytics Section */}
        <Card className="shadow-medium mb-4 sm:mb-6 md:mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-role-admin" />
                  Platform Analytics
                </CardTitle>
                <CardDescription>Key performance metrics and insights</CardDescription>
              </div>
              <Button onClick={() => navigate('/admin/analytics')} size="sm" variant="outline">
                View Full Analytics
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loadingAnalytics ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-role-admin" />
                <p className="ml-3 text-muted-foreground">Loading analytics...</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {/* Top Rated Listings */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Star className="h-4 w-4 text-yellow-500" />
                      Top Rated Listings
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {analytics.topRatedListings.length === 0 ? (
                      <div className="text-center py-4 text-muted-foreground text-sm">
                        <Star className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>No reviews yet</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {analytics.topRatedListings.map((listing) => (
                          <div key={listing.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{listing.title}</p>
                              <div className="flex items-center text-xs text-muted-foreground mt-1">
                                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400 mr-1" />
                                {listing.rating.toFixed(1)} ({listing.reviewCount} reviews)
                              </div>
                            </div>
                            <div className="text-xs text-muted-foreground ml-2">
                              {formatPHP(listing.price)}/night
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Lowest Rated Listings */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <TrendingDown className="h-4 w-4 text-red-500" />
                      Lowest Rated Listings
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {analytics.lowestRatedListings.length === 0 ? (
                      <div className="text-center py-4 text-muted-foreground text-sm">
                        <TrendingDown className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>No reviews yet</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {analytics.lowestRatedListings.map((listing) => (
                          <div key={listing.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{listing.title}</p>
                              <div className="flex items-center text-xs text-muted-foreground mt-1">
                                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400 mr-1" />
                                {listing.rating.toFixed(1)} ({listing.reviewCount} reviews)
                              </div>
                            </div>
                            <div className="text-xs text-muted-foreground ml-2">
                              {formatPHP(listing.price)}/night
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Revenue Trends */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-green-500" />
                      Revenue Trends
                    </CardTitle>
                    <CardDescription className="text-xs">Last 30 days</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {analytics.revenueTrends.length === 0 ? (
                      <div className="text-center py-4 text-muted-foreground text-sm">
                        <DollarSign className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>No revenue data yet</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {analytics.revenueTrends.map((week, index) => (
                          <div key={index} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">{week.week}</span>
                              <span className="font-medium">{formatPHP(week.revenue)}</span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-2">
                              <div 
                                className="bg-role-admin h-2 rounded-full transition-all" 
                                style={{ width: `${week.percentage}%` }} 
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Admin Tools */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6 mb-4 sm:mb-6 md:mb-8">
          <Card className="shadow-medium hover:shadow-hover hover:border-role-admin/50 hover:bg-role-admin/5 transition-smooth cursor-pointer touch-manipulation" onClick={() => navigate('/admin/users')}>
            <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4">
              <Users className="w-6 h-6 sm:w-8 sm:h-8 text-role-admin mb-2" />
              <CardTitle className="text-base sm:text-lg">User Management</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Manage hosts, guests, and permissions
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="shadow-medium hover:shadow-hover hover:border-role-admin/50 hover:bg-role-admin/5 transition-smooth cursor-pointer touch-manipulation" onClick={() => navigate('/admin/listings')}>
            <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4">
              <Home className="w-6 h-6 sm:w-8 sm:h-8 text-role-admin mb-2" />
              <CardTitle className="text-base sm:text-lg">Listings Review</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Approve and moderate listings
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="shadow-medium hover:shadow-hover hover:border-role-admin/50 hover:bg-role-admin/5 transition-smooth cursor-pointer touch-manipulation" onClick={() => navigate('/admin/cancellation-requests')}>
            <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4">
              <Calendar className="w-6 h-6 sm:w-8 sm:h-8 text-role-admin mb-2" />
              <CardTitle className="text-base sm:text-lg">Cancellation Requests</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Review and process booking cancellations
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="shadow-medium hover:shadow-hover hover:border-role-admin/50 hover:bg-role-admin/5 transition-smooth cursor-pointer touch-manipulation" onClick={() => navigate('/admin/payments')}>
            <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4">
              <DollarSign className="w-6 h-6 sm:w-8 sm:h-8 text-role-admin mb-2" />
              <CardTitle className="text-base sm:text-lg">Payment Management</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Review and confirm payments
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="shadow-medium hover:shadow-hover hover:border-role-admin/50 hover:bg-role-admin/5 transition-smooth cursor-pointer touch-manipulation" onClick={() => navigate('/admin/paypal-settings')}>
            <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4">
              <CreditCard className="w-6 h-6 sm:w-8 sm:h-8 text-role-admin mb-2" />
              <CardTitle className="text-base sm:text-lg">PayPal Settings</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Configure PayPal account for subscriptions
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="shadow-medium hover:shadow-hover hover:border-role-admin/50 hover:bg-role-admin/5 transition-smooth cursor-pointer touch-manipulation" onClick={() => navigate('/admin/analytics')}>
            <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4">
              <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8 text-role-admin mb-2" />
              <CardTitle className="text-base sm:text-lg">Analytics</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                View platform performance metrics
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="shadow-medium hover:shadow-hover hover:border-role-admin/50 hover:bg-role-admin/5 transition-smooth cursor-pointer touch-manipulation" onClick={() => navigate('/admin/reports')}>
            <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4">
              <FileText className="w-6 h-6 sm:w-8 sm:h-8 text-role-admin mb-2" />
              <CardTitle className="text-base sm:text-lg">Reports</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Generate platform reports
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="shadow-medium hover:shadow-hover hover:border-role-admin/50 hover:bg-role-admin/5 transition-smooth cursor-pointer touch-manipulation" onClick={() => navigate('/admin/policies')}>
            <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4">
              <Settings className="w-6 h-6 sm:w-8 sm:h-8 text-role-admin mb-2" />
              <CardTitle className="text-base sm:text-lg">Policies & Settings</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Manage platform policies
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="shadow-medium hover:shadow-hover hover:border-role-admin/50 hover:bg-role-admin/5 transition-smooth cursor-pointer touch-manipulation" onClick={() => navigate('/admin/messages')}>
            <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4">
              <MessageSquare className="w-6 h-6 sm:w-8 sm:h-8 text-role-admin mb-2" />
              <CardTitle className="text-base sm:text-lg">Messages</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                View and respond to messages
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card className="shadow-medium">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest platform events</CardDescription>
              </div>
              <Button onClick={() => navigate('/admin/create-event')} size="sm" variant="role-admin">
                <Megaphone className="h-4 w-4 mr-2" />
                Create Event
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <RecentActivity />
          </CardContent>
        </Card>
      </div>

      {/* Total Earnings Breakdown Dialog */}
      <Dialog open={earningsBreakdownOpen} onOpenChange={setEarningsBreakdownOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-6xl max-h-[90vh] overflow-y-auto p-3 sm:p-6">
          <DialogHeader className="px-0 sm:px-0">
            <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <DollarSign className="h-4 w-4 sm:h-5 sm:w-5" />
              Total Earnings Breakdown
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Detailed breakdown of all platform earnings (subscription payments)
            </DialogDescription>
          </DialogHeader>

          {loadingBreakdown ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-role-admin" />
              <p className="ml-3 text-muted-foreground">Loading breakdown...</p>
            </div>
          ) : allEarningsTransactions.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">No earnings recorded yet</p>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4 px-0 sm:px-0">
              {/* Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
                <Card>
                  <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6 pb-3 sm:pb-6">
                    <p className="text-xs sm:text-sm text-muted-foreground">Total Earnings</p>
                    <p className="text-lg sm:text-xl md:text-2xl font-bold text-role-admin">
                      {formatPHP(
                        allEarningsTransactions.reduce((sum, t) => sum + readTransactionAmount(t.amount || 0), 0)
                      )}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6 pb-3 sm:pb-6">
                    <p className="text-xs sm:text-sm text-muted-foreground">Subscription Revenue</p>
                    <p className="text-lg sm:text-xl md:text-2xl font-bold text-role-admin">
                      {formatPHP(
                        allEarningsTransactions
                          .filter(t => t.earningsType === 'subscription')
                          .reduce((sum, t) => sum + readTransactionAmount(t.amount || 0), 0)
                      )}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6 pb-3 sm:pb-6">
                    <p className="text-xs sm:text-sm text-muted-foreground">Total Transactions</p>
                    <p className="text-lg sm:text-xl md:text-2xl font-bold">{allEarningsTransactions.length}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Transactions Table */}
              <div className="border rounded-lg overflow-x-auto">
                {/* Mobile Card View */}
                <div className="block md:hidden divide-y">
                  {allEarningsTransactions.map((transaction) => (
                    <div key={transaction.id} className="p-3 sm:p-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-muted-foreground">
                            {transaction.createdAt
                              ? new Date(transaction.createdAt).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : 'N/A'}
                          </p>
                        </div>
                        <Badge 
                          variant={transaction.earningsType === 'subscription' ? 'default' : 'secondary'}
                          className={
                            transaction.earningsType === 'subscription' 
                              ? 'bg-role-admin text-xs' 
                              : 'bg-role-admin text-xs'
                          }
                        >
                          Subscription
                        </Badge>
                      </div>
                      <div className="space-y-1 text-xs">
                        {transaction.bookingId && (
                          <div>
                            <span className="text-muted-foreground">Booking ID: </span>
                            <code className="bg-muted px-1.5 py-0.5 rounded text-xs">
                              {transaction.bookingId.slice(0, 8)}
                            </code>
                          </div>
                        )}
                        {transaction.listingTitle && (
                          <div>
                            <span className="text-muted-foreground">Listing: </span>
                            <span className="truncate block">{transaction.listingTitle}</span>
                          </div>
                        )}
                        {transaction.hostName && (
                          <div>
                            <span className="text-muted-foreground">Host: </span>
                            <span>{transaction.hostName}</span>
                          </div>
                        )}
                        {transaction.hostEmail && (
                          <div>
                            <span className="text-muted-foreground">Email: </span>
                            <a
                              href={`mailto:${transaction.hostEmail}`}
                              className="text-role-admin hover:underline truncate block"
                            >
                              {transaction.hostEmail}
                            </a>
                          </div>
                        )}
                      </div>
                      <div className="pt-1">
                        <p className="text-base font-semibold text-role-admin">
                          {formatPHP(readTransactionAmount(transaction.amount || 0))}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Desktop Table View */}
                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Booking ID</TableHead>
                        <TableHead>Listing</TableHead>
                        <TableHead>Host Name</TableHead>
                        <TableHead>Host Email</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allEarningsTransactions.map((transaction) => (
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
                            <Badge 
                              variant={transaction.earningsType === 'subscription' ? 'default' : 'secondary'}
                              className={
                                transaction.earningsType === 'subscription' 
                                ? 'bg-role-admin' 
                                : 'bg-role-admin'
                              }
                            >
                              Subscription
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {transaction.bookingId ? (
                              <code className="text-xs bg-muted px-2 py-1 rounded">
                                {transaction.bookingId.slice(0, 8)}
                              </code>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            {transaction.listingTitle || '—'}
                          </TableCell>
                          <TableCell>{transaction.hostName || '—'}</TableCell>
                          <TableCell>
                            {transaction.hostEmail ? (
                              <a
                                href={`mailto:${transaction.hostEmail}`}
                                className="text-primary hover:underline text-sm"
                              >
                                {transaction.hostEmail}
                              </a>
                            ) : (
                              '—'
                            )}
                          </TableCell>
                          <TableCell className="text-right font-semibold text-accent">
                            {formatPHP(readTransactionAmount(transaction.amount || 0))}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
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
