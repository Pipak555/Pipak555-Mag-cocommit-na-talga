import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Users, Home, DollarSign, TrendingUp, FileText, Settings, AlertCircle } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import Logo from '@/components/shared/Logo';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const AdminDashboard = () => {
  const { user, userRole, userProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalHosts: 0,
    totalGuests: 0,
    activeListings: 0,
    totalBookings: 0,
    serviceFees: 0,
  });

  useEffect(() => {
    if (!user || userRole !== 'admin') {
      navigate('/admin/login');
      return;
    }

    // Set up real-time listeners
    const usersUnsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
      const users = snapshot.docs.map(doc => doc.data());
      const hosts = users.filter(u => u.role === 'host').length;
      const guests = users.filter(u => u.role === 'guest').length;
      setStats(prev => ({
        ...prev,
        totalUsers: snapshot.size,
        totalHosts: hosts,
        totalGuests: guests,
      }));
    });

    const listingsUnsubscribe = onSnapshot(collection(db, 'listing'), (snapshot) => {
      const activeListings = snapshot.docs.filter(
        doc => doc.data().status === 'approved'
      ).length;
      setStats(prev => ({ ...prev, activeListings }));
    });

    const bookingsUnsubscribe = onSnapshot(collection(db, 'bookings'), (snapshot) => {
      const bookings = snapshot.docs.map(doc => doc.data());
      const totalRevenue = bookings.reduce((sum, b) => sum + (b.totalPrice || 0), 0);
      const serviceFees = totalRevenue * 0.1; // 10% commission
      
      setStats(prev => ({
        ...prev,
        totalBookings: snapshot.size,
        serviceFees,
      }));
    });

    return () => {
      usersUnsubscribe();
      listingsUnsubscribe();
      bookingsUnsubscribe();
    };
  }, [user, userRole, navigate]);

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
            <ThemeToggle />
            <Button variant="outline" onClick={handleSignOut}>Sign Out</Button>
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
                {stats.totalHosts} hosts, {stats.totalGuests} guests
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Listings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeListings}</div>
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

          <Card className="shadow-soft">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Service Fees</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-accent">${stats.serviceFees.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground mt-1">10% commission</p>
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

          <Card className="shadow-medium hover:shadow-hover transition-smooth cursor-pointer">
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
    </div>
  );
};

export default AdminDashboard;
