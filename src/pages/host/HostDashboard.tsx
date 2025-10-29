import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Home, Calendar, MessageSquare, DollarSign, Settings, Award } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import Logo from '@/components/shared/Logo';

const HostDashboard = () => {
  const { user, userRole, userProfile, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user || userRole !== 'host') {
      navigate('/host/login');
    }
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
            <ThemeToggle />
            <Button variant="outline" onClick={handleSignOut}>Sign Out</Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        {/* Welcome Section */}
        <div className="mb-8 p-6 rounded-xl bg-gradient-hero text-white">
          <h2 className="text-3xl font-bold mb-2">Welcome back, {userProfile?.fullName || 'Host'}!</h2>
          <p className="text-white/90">{user?.email}</p>
        </div>

        {/* Quick Stats */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card className="shadow-soft hover:shadow-medium transition-all border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Listings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold bg-gradient-to-br from-primary to-primary-glow bg-clip-text text-transparent">0</div>
            </CardContent>
          </Card>

          <Card className="shadow-soft hover:shadow-medium transition-all border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Upcoming Bookings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold bg-gradient-to-br from-secondary to-secondary/80 bg-clip-text text-transparent">0</div>
            </CardContent>
          </Card>

          <Card className="shadow-soft hover:shadow-medium transition-all border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Earnings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">$0</div>
            </CardContent>
          </Card>

          <Card className="shadow-soft hover:shadow-medium transition-all border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Reward Points</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold bg-gradient-accent bg-clip-text text-transparent">0</div>
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

          <Card className="shadow-medium hover:shadow-hover transition-all duration-300 cursor-pointer border-border/50 hover:border-accent/50 group" onClick={() => navigate('/settings')}>
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

          <Card className="shadow-medium hover:shadow-hover transition-all duration-300 cursor-pointer border-border/50 hover:border-accent/50 group">
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
        </div>

        {/* Today's Schedule */}
        <Card className="shadow-medium">
          <CardHeader>
            <CardTitle>Today's Schedule</CardTitle>
            <CardDescription>No bookings scheduled for today</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>You're all set! No check-ins or check-outs today.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default HostDashboard;
