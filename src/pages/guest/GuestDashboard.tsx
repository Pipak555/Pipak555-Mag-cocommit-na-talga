import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search, Heart, MapPin, Calendar, Wallet, Settings, User } from 'lucide-react';
import homeIcon from '@/assets/category-home.png';
import experienceIcon from '@/assets/category-experience.png';
import serviceIcon from '@/assets/category-service.png';

const GuestDashboard = () => {
  const { user, userRole, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user || userRole !== 'guest') {
      navigate('/guest/login');
    }
  }, [user, userRole, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card shadow-soft">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <User className="w-6 h-6 text-secondary" />
            <h1 className="text-xl font-bold">Guest Dashboard</h1>
          </div>
          <Button variant="outline" onClick={handleSignOut}>Sign Out</Button>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Discover Your Next Adventure</h2>
          <p className="text-muted-foreground">{user?.email}</p>
        </div>

        {/* Search Bar */}
        <Card className="shadow-medium mb-8">
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input 
                  placeholder="Search destinations, experiences, services..." 
                  className="pl-10"
                />
              </div>
              <Button>Search</Button>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card className="shadow-soft">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Favorites</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Upcoming Trips</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Past Bookings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Wallet Balance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-accent">$0</div>
            </CardContent>
          </Card>
        </div>

        {/* Browse Categories */}
        <div className="mb-8">
          <h3 className="text-2xl font-bold mb-6">Browse Categories</h3>
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="shadow-medium hover:shadow-hover transition-smooth cursor-pointer" onClick={() => navigate('/guest/browse')}>
              <CardHeader className="text-center">
                <img src={homeIcon} alt="Homes" className="w-20 h-20 mx-auto mb-4" />
                <CardTitle>Homes</CardTitle>
                <CardDescription>Find your perfect stay</CardDescription>
              </CardHeader>
            </Card>

            <Card className="shadow-medium hover:shadow-hover transition-smooth cursor-pointer">
              <CardHeader className="text-center">
                <img src={experienceIcon} alt="Experiences" className="w-20 h-20 mx-auto mb-4" />
                <CardTitle>Experiences</CardTitle>
                <CardDescription>Discover unique activities</CardDescription>
              </CardHeader>
            </Card>

            <Card className="shadow-medium hover:shadow-hover transition-smooth cursor-pointer">
              <CardHeader className="text-center">
                <img src={serviceIcon} alt="Services" className="w-20 h-20 mx-auto mb-4" />
                <CardTitle>Services</CardTitle>
                <CardDescription>Professional assistance</CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="shadow-medium hover:shadow-hover transition-smooth cursor-pointer">
            <CardHeader>
              <Heart className="w-8 h-8 text-primary mb-2" />
              <CardTitle>Favorites</CardTitle>
              <CardDescription>Your saved listings</CardDescription>
            </CardHeader>
          </Card>

          <Card className="shadow-medium hover:shadow-hover transition-smooth cursor-pointer" onClick={() => navigate('/guest/bookings')}>
            <CardHeader>
              <Calendar className="w-8 h-8 text-secondary mb-2" />
              <CardTitle>My Bookings</CardTitle>
              <CardDescription>View your trips</CardDescription>
            </CardHeader>
          </Card>

          <Card className="shadow-medium hover:shadow-hover transition-smooth cursor-pointer" onClick={() => navigate('/guest/wallet')}>
            <CardHeader>
              <Wallet className="w-8 h-8 text-accent mb-2" />
              <CardTitle>E-Wallet</CardTitle>
              <CardDescription>Manage your balance</CardDescription>
            </CardHeader>
          </Card>

          <Card className="shadow-medium hover:shadow-hover transition-smooth cursor-pointer" onClick={() => navigate('/settings')}>
            <CardHeader>
              <Settings className="w-8 h-8 text-muted-foreground mb-2" />
              <CardTitle>Settings</CardTitle>
              <CardDescription>Account preferences</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default GuestDashboard;
