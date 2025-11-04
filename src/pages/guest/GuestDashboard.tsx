import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SearchAutocomplete } from '@/components/search/SearchAutocomplete';
import { Heart, MapPin, Calendar, Wallet, Settings, User, Sparkles, Bookmark } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import Logo from '@/components/shared/Logo';
import { ListingCard } from '@/components/listings/ListingCard';
import { getRecommendations } from '@/lib/recommendations';
import { getBookings, toggleFavorite } from '@/lib/firestore';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from 'sonner';
import homeIcon from '@/assets/category-home.png';
import experienceIcon from '@/assets/category-experience.png';
import serviceIcon from '@/assets/category-service.png';
import type { Listing, Booking } from '@/types';

const GuestDashboard = () => {
  const { user, userRole, userProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    favorites: 0,
    wishlist: 0,
    upcomingTrips: 0,
    pastBookings: 0,
    walletBalance: 0,
  });
  const [recommendations, setRecommendations] = useState<Listing[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || userRole !== 'guest') {
      navigate('/guest/login');
      return;
    }

    loadDashboardData();

    // Real-time listener for favorites
    const userUnsubscribe = onSnapshot(doc(db, 'users', user.uid), (docSnap) => {
      if (docSnap.exists()) {
        const userData = docSnap.data();
        setStats(prev => ({
          ...prev,
          favorites: userData.favorites?.length || 0,
          wishlist: userData.wishlist?.length || 0,
          walletBalance: userData.walletBalance || 0,
        }));
        setFavorites(userData.favorites || []);
      }
    });

    return () => {
      userUnsubscribe();
    };
  }, [user, userRole, navigate]);

  const loadDashboardData = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Load bookings
      const bookings = await getBookings({ guestId: user.uid });
      const now = new Date();
      
      const upcomingTrips = bookings.filter(b => {
        const checkIn = new Date(b.checkIn);
        return checkIn >= now && (b.status === 'confirmed' || b.status === 'pending');
      }).length;

      const pastBookings = bookings.filter(b => {
        const checkOut = new Date(b.checkOut);
        return checkOut < now || b.status === 'completed';
      }).length;

      setStats(prev => ({
        ...prev,
        upcomingTrips,
        pastBookings,
      }));

      // Load recommendations
      const recs = await getRecommendations(user.uid, 6);
      setRecommendations(recs);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFavorite = async (listingId: string) => {
    if (!user) {
      toast.error("Please login to add favorites");
      return;
    }
    
    try {
      const newFavorites = await toggleFavorite(user.uid, listingId, favorites);
      setFavorites(newFavorites);
      toast.success(newFavorites.includes(listingId) ? "Added to favorites" : "Removed from favorites");
    } catch (error) {
      toast.error("Failed to update favorites");
    }
  };

  const handleWishlist = async (listingId: string) => {
    if (!user) {
      toast.error("Please login to add to wishlist");
      return;
    }
    
    try {
      const { toggleWishlist } = await import('@/lib/firestore');
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const currentWishlist = userDoc.exists() ? (userDoc.data().wishlist || []) : [];
      const newWishlist = await toggleWishlist(user.uid, listingId, currentWishlist);
      toast.success(newWishlist.includes(listingId) ? "Added to wishlist" : "Removed from wishlist");
    } catch (error) {
      toast.error("Failed to update wishlist");
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
            <div className="p-2 rounded-lg bg-secondary/10">
              <User className="w-5 h-5 text-secondary" />
            </div>
            <div>
              <h1 className="text-lg font-bold">
                Welcome, {userProfile?.fullName || 'Guest'}!
              </h1>
              <p className="text-xs text-muted-foreground">Discover your next adventure</p>
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
        <div className="mb-8 p-6 rounded-xl bg-gradient-to-r from-secondary to-secondary/80 text-white">
          <h2 className="text-3xl font-bold mb-2">Discover Your Next Adventure</h2>
          <p className="text-white/90">{userProfile?.fullName || 'Guest'}</p>
        </div>

        {/* Search Bar with Autocomplete */}
        <Card className="shadow-medium mb-8 border-border/50">
          <CardContent className="pt-6">
            <SearchAutocomplete
              onSearch={(query) => navigate('/guest/browse')}
              placeholder="Search destinations, experiences, services..."
            />
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <Card className="relative overflow-hidden border-0 shadow-md hover:shadow-xl transition-all duration-300 group">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-secondary to-accent" />
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Favorites
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold bg-gradient-to-br from-primary to-primary-glow bg-clip-text text-transparent">
                {stats.favorites}
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-0 shadow-md hover:shadow-xl transition-all duration-300 group">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-blue-400 to-blue-300" />
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Wishlist
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold bg-gradient-to-br from-blue-500 to-blue-600 bg-clip-text text-transparent">
                {stats.wishlist}
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-0 shadow-md hover:shadow-xl transition-all duration-300 group">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-secondary via-primary to-accent" />
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Upcoming Trips
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold bg-gradient-to-br from-secondary to-secondary/80 bg-clip-text text-transparent">
                {stats.upcomingTrips}
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-0 shadow-md hover:shadow-xl transition-all duration-300 group">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-accent via-primary to-secondary" />
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Past Bookings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.pastBookings}</div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-0 shadow-md hover:shadow-xl transition-all duration-300 group">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-accent via-green-500 to-green-600" />
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Wallet Balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-accent">${stats.walletBalance.toFixed(2)}</div>
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

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-primary" />
                <h3 className="text-2xl font-bold">Recommended for You</h3>
              </div>
              <Button variant="outline" onClick={() => navigate('/guest/browse')}>
                View All
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {recommendations.slice(0, 3).map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                onView={() => navigate(`/guest/listing/${listing.id}`)}
                onFavorite={() => handleFavorite(listing.id)}
                onWishlist={() => handleWishlist(listing.id)}
                isFavorite={favorites.includes(listing.id)}
              />
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="shadow-medium hover:shadow-hover transition-smooth cursor-pointer" onClick={() => navigate('/settings')}>
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
