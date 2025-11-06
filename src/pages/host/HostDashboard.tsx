import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Home, Calendar, MessageSquare, DollarSign, Settings, Award, CalendarDays } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import Logo from '@/components/shared/Logo';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getBookings } from '@/lib/firestore';
import type { Booking } from '@/types';
import { formatPHP } from '@/lib/currency';
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

// Today's Schedule Component
const TodaySchedule = () => {
  const { user } = useAuth();
  const [todayBookings, setTodayBookings] = useState<Booking[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const unsubscribe = onSnapshot(
      query(collection(db, 'bookings'), where('hostId', '==', user.uid)),
      (snapshot) => {
        const bookings = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as Booking))
          .filter(booking => {
            const checkIn = new Date(booking.checkIn);
            checkIn.setHours(0, 0, 0, 0);
            const checkOut = new Date(booking.checkOut);
            checkOut.setHours(0, 0, 0, 0);
            
            // Include bookings that have check-in or check-out today
            return (checkIn.getTime() === today.getTime() || 
                    checkOut.getTime() === today.getTime()) &&
                   (booking.status === 'confirmed' || booking.status === 'pending');
          })
          .sort((a, b) => new Date(a.checkIn).getTime() - new Date(b.checkIn).getTime());
        
        setTodayBookings(bookings);
      }
    );

    return () => unsubscribe();
  }, [user]);

  return (
    <Card className="shadow-medium">
      <CardHeader>
        <CardTitle>Today's Schedule</CardTitle>
        <CardDescription>
          {todayBookings.length > 0 
            ? `${todayBookings.length} booking${todayBookings.length > 1 ? 's' : ''} today`
            : 'No bookings scheduled for today'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {todayBookings.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>You're all set! No check-ins or check-outs today.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {todayBookings.map((booking) => {
              const checkIn = new Date(booking.checkIn);
              const checkOut = new Date(booking.checkOut);
              const isCheckIn = checkIn.toDateString() === new Date().toDateString();
              const isCheckOut = checkOut.toDateString() === new Date().toDateString();

              return (
                <div
                  key={booking.id}
                  className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => navigate('/host/bookings')}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">
                        {isCheckIn && isCheckOut
                          ? 'Check-in & Check-out'
                          : isCheckIn
                          ? 'Check-in'
                          : 'Check-out'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {checkIn.toLocaleDateString()} - {checkOut.toLocaleDateString()}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {booking.guests} guest{booking.guests > 1 ? 's' : ''} • {formatPHP(booking.totalPrice || 0)}
                      </p>
                    </div>
                    <Badge>{booking.status}</Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const HostDashboard = () => {
  const { user, userRole, userProfile, signOut, hasRole } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    activeListings: 0,
    upcomingBookings: 0,
    totalEarnings: 0,
    rewardPoints: userProfile?.points || 0,
  });
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);

  useEffect(() => {
    if (!user || !hasRole('host')) {
      navigate('/host/login');
      return;
    }

    // Load real-time data
    loadDashboardData();

    // Set up real-time listeners
    const listingsUnsubscribe = onSnapshot(
      query(collection(db, 'listing'), where('hostId', '==', user.uid)),
      (snapshot) => {
        const activeListings = snapshot.docs.filter(
          doc => doc.data().status === 'approved'
        ).length;
        setStats(prev => ({ ...prev, activeListings }));
      }
    );

    const bookingsUnsubscribe = onSnapshot(
      query(collection(db, 'bookings'), where('hostId', '==', user.uid)),
      (snapshot) => {
        const now = new Date();
        const upcomingBookings = snapshot.docs.filter(doc => {
          const booking = doc.data();
          const checkIn = new Date(booking.checkIn);
          return checkIn >= now && booking.status === 'confirmed';
        }).length;

        const totalEarnings = snapshot.docs
          .filter(doc => doc.data().status === 'confirmed' || doc.data().status === 'completed')
          .reduce((sum, doc) => sum + (doc.data().totalPrice || 0), 0);

        setStats(prev => ({
          ...prev,
          upcomingBookings,
          totalEarnings,
        }));
      }
    );

    return () => {
      listingsUnsubscribe();
      bookingsUnsubscribe();
    };
  }, [user, userRole, navigate]);

  const loadDashboardData = async () => {
    if (!user) return;

    try {
      // Load bookings for today's schedule
      const bookings = await getBookings({ hostId: user.uid });
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const todayBookings = bookings.filter(booking => {
        const checkIn = new Date(booking.checkIn);
        checkIn.setHours(0, 0, 0, 0);
        return checkIn.getTime() === today.getTime();
      });

      // Update reward points from userProfile
      if (userProfile?.points) {
        setStats(prev => ({ ...prev, rewardPoints: userProfile.points }));
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60 shadow-soft">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Logo size="sm" />
            <div className="p-2 rounded-lg bg-primary/10">
              <Home className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold">
                Welcome, {userProfile?.fullName || 'Host'}!
              </h1>
              <p className="text-xs text-muted-foreground">Manage your properties</p>
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
        <div className="mb-8 p-6 rounded-xl bg-gradient-hero text-white">
          <h2 className="text-3xl font-bold mb-2">Welcome back, {userProfile?.fullName || 'Host'}!</h2>
          <p className="text-white/90">{userProfile?.fullName || 'Host'}</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="relative overflow-hidden border-0 shadow-md hover:shadow-xl transition-all duration-300 group">
            {/* Accent Bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-secondary to-accent" />
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Active Listings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline justify-between">
                <div className="text-4xl font-bold bg-gradient-to-br from-primary to-primary-glow bg-clip-text text-transparent">
                  {stats.activeListings}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-0 shadow-md hover:shadow-xl transition-all duration-300 group">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-secondary via-primary to-accent" />
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Upcoming Bookings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline justify-between">
                <div className="text-4xl font-bold bg-gradient-to-br from-secondary to-secondary/80 bg-clip-text text-transparent">
                  {stats.upcomingBookings}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-0 shadow-md hover:shadow-xl transition-all duration-300 group">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-accent via-primary to-secondary" />
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Total Earnings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline justify-between">
                <div className="text-4xl font-bold">{formatPHP(stats.totalEarnings)}</div>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-0 shadow-md hover:shadow-xl transition-all duration-300 group">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-accent via-green-500 to-green-600" />
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Reward Points
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline justify-between">
                <div className="text-4xl font-bold bg-gradient-accent bg-clip-text text-transparent">
                  {stats.rewardPoints}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Actions */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Card className="shadow-medium hover:shadow-hover transition-all duration-300 cursor-pointer border-border/50 hover:border-primary/50 group" onClick={() => navigate('/host/create-listing')}>
            <CardHeader className="space-y-3">
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Plus className="w-7 h-7 text-primary" />
              </div>
              <CardTitle className="group-hover:text-primary transition-colors">Create New Listing</CardTitle>
              <CardDescription>
                Add a new property, experience, or service
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="shadow-medium hover:shadow-hover transition-all duration-300 cursor-pointer border-border/50 hover:border-primary/50 group" onClick={() => navigate('/host/listings')}>
            <CardHeader className="space-y-3">
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Home className="w-7 h-7 text-primary" />
              </div>
              <CardTitle className="group-hover:text-primary transition-colors">My Listings</CardTitle>
              <CardDescription>
                View and manage your active listings
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="shadow-medium hover:shadow-hover transition-all duration-300 cursor-pointer border-border/50 hover:border-secondary/50 group" onClick={() => navigate('/host/bookings')}>
            <CardHeader className="space-y-3">
              <div className="w-14 h-14 rounded-xl bg-secondary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Calendar className="w-7 h-7 text-secondary" />
              </div>
              <CardTitle className="group-hover:text-secondary transition-colors">Bookings</CardTitle>
              <CardDescription>
                Manage booking requests
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="shadow-medium hover:shadow-hover transition-all duration-300 cursor-pointer border-border/50 hover:border-primary/50 group" onClick={() => navigate('/host/calendar')}>
            <CardHeader className="space-y-3">
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <CalendarDays className="w-7 h-7 text-primary" />
              </div>
              <CardTitle className="group-hover:text-primary transition-colors">Calendar</CardTitle>
              <CardDescription>
                View bookings schedule
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="shadow-medium hover:shadow-hover transition-all duration-300 cursor-pointer border-border/50 hover:border-secondary/50 group" onClick={() => navigate('/host/messages')}>
            <CardHeader className="space-y-3">
              <div className="w-14 h-14 rounded-xl bg-secondary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <MessageSquare className="w-7 h-7 text-secondary" />
              </div>
              <CardTitle className="group-hover:text-secondary transition-colors">Messages</CardTitle>
              <CardDescription>
                Chat with guests and respond to inquiries
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="shadow-medium hover:shadow-hover transition-all duration-300 cursor-pointer border-border/50 hover:border-accent/50 group" onClick={() => navigate('/host/payments')}>
            <CardHeader className="space-y-3">
              <div className="w-14 h-14 rounded-xl bg-accent/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <DollarSign className="w-7 h-7 text-accent" />
              </div>
              <CardTitle className="group-hover:text-accent transition-colors">Payments</CardTitle>
              <CardDescription>
                View earnings and payment methods
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="shadow-medium hover:shadow-hover transition-all duration-300 cursor-pointer border-border/50 hover:border-accent/50 group" onClick={() => navigate('/host/settings?tab=profile')}>
            <CardHeader className="space-y-3">
              <div className="w-14 h-14 rounded-xl bg-accent/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Award className="w-7 h-7 text-accent" />
              </div>
              <CardTitle className="group-hover:text-accent transition-colors">Points & Rewards</CardTitle>
              <CardDescription>
                Track your rewards and achievements
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="shadow-medium hover:shadow-hover transition-all duration-300 cursor-pointer border-border/50 hover:border-muted-foreground/50 group" onClick={() => navigate('/host/settings')}>
            <CardHeader className="space-y-3">
              <div className="w-14 h-14 rounded-xl bg-muted/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Settings className="w-7 h-7 text-muted-foreground" />
              </div>
              <CardTitle className="group-hover:text-muted-foreground transition-colors">Settings</CardTitle>
              <CardDescription>
                Manage your account preferences
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Today's Schedule */}
        <TodaySchedule />
      </div>

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

export default HostDashboard;
