import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CategoryCardVideo } from '@/components/ui/category-card-video';
import { VideoBackground } from '@/components/ui/video-background';
import { Heart, MapPin, Calendar, CalendarDays, Wallet, Settings, User, Sparkles, Bookmark, Home, Compass, Wrench, Building2, MessageSquare } from 'lucide-react';
import { formatPHP } from '@/lib/currency';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import Logo from '@/components/shared/Logo';
import { ListingCard } from '@/components/listings/ListingCard';
import { getRecommendations } from '@/lib/recommendations';
import { getBookings, toggleFavorite, getListingsRatings } from '@/lib/firestore';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from 'sonner';
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
import homeIcon from '@/assets/category-home.png';
import experienceIcon from '@/assets/category-experience.png';
import serviceIcon from '@/assets/category-service.png';
import heroImage from '@/assets/hero-home.jpg';
import type { Listing, Booking } from '@/types';

const landingVideo = '/videos/landing-hero.mp4';

const GuestDashboard = () => {
  const { user, userRole, userProfile, signOut, hasRole, addRole } = useAuth();
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
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);

  useEffect(() => {
    if (!user || !hasRole('guest')) {
      navigate('/guest/login');
      return;
    }

    loadDashboardData();

    // Real-time listener for favorites and wishlist
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
        setWishlist(userData.wishlist || []);
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
        return checkIn >= now && b.status === 'confirmed';
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
      
      // Fetch ratings for recommendations
      if (recs.length > 0) {
        const listingIds = recs.map(listing => listing.id);
        const ratingsMap = await getListingsRatings(listingIds);
        
        // Attach ratings to recommendations
        const recsWithRatings = recs.map(listing => {
          const rating = ratingsMap.get(listing.id);
          return {
            ...listing,
            averageRating: rating?.averageRating || 0,
            reviewCount: rating?.reviewCount || 0
          };
        });
        
        setRecommendations(recsWithRatings);
      } else {
        setRecommendations(recs);
      }
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
      setWishlist(newWishlist);
      toast.success(newWishlist.includes(listingId) ? "Added to wishlist" : "Removed from wishlist");
    } catch (error) {
      toast.error("Failed to update wishlist");
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const handleBecomeHost = async () => {
    if (hasRole('host')) {
      // Already a host, navigate to host dashboard
      navigate('/host/dashboard');
      return;
    }
    
    // Navigate to policies page first
    navigate('/host/policies');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60 shadow-soft">
        <div className="container mx-auto px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <Logo size="sm" />
            <div className="hidden sm:block p-2 rounded-lg bg-secondary/10">
              <User className="w-5 h-5 text-secondary" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-base sm:text-lg font-bold truncate">
                Welcome, {userProfile?.fullName || 'Guest'}!
              </h1>
              <p className="text-xs text-muted-foreground hidden sm:block">Discover your next adventure</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            <NotificationBell />
            <ThemeToggle />
            <Button variant="outline" onClick={() => setLogoutDialogOpen(true)} className="h-9 sm:h-auto text-xs sm:text-sm px-2 sm:px-4 touch-manipulation">
              <span className="hidden sm:inline">Sign Out</span>
              <span className="sm:hidden">Out</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Video Section */}
        <div className="relative mb-8 rounded-xl overflow-hidden h-64 md:h-80 lg:h-96 shadow-lg">
          <VideoBackground 
            src={landingVideo} 
            overlay={true}
            fallbackImage={heroImage}
          />
          
          {/* Enhanced Overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-black/60 via-black/40 to-black/60 z-10" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent z-10" />
          
          {/* Content */}
          <div className="relative z-20 h-full flex flex-col items-center justify-center text-center px-6">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 text-white drop-shadow-2xl">
              Discover Your Next Adventure
            </h2>
            <p className="text-lg md:text-xl text-white/90 mb-6 max-w-2xl drop-shadow-lg">
              Welcome back, {userProfile?.fullName || 'Guest'}! Ready to explore amazing places?
            </p>
            <Button 
              size="lg" 
              className="h-12 px-8 text-lg bg-primary hover:bg-primary/90 shadow-2xl hover:shadow-2xl hover:scale-105 transition-all"
              onClick={() => navigate('/guest/browse')}
            >
              Browse All Listings
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className={`grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 md:gap-4 lg:gap-6 mb-4 sm:mb-6 md:mb-8 ${hasRole('host') ? 'lg:grid-cols-5' : 'lg:grid-cols-6'}`}>
          <Card 
            className="relative overflow-hidden border-0 shadow-md hover:shadow-xl transition-all duration-300 group cursor-pointer hover:scale-105 active:scale-100"
            onClick={() => navigate('/guest/favorites')}
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-secondary to-accent" />
            <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6 pt-3 sm:pt-6">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                <Heart className="h-3 w-3 sm:h-4 sm:w-4" />
                Favorites
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
              <div className="text-2xl sm:text-3xl font-bold bg-gradient-to-br from-primary to-primary-glow bg-clip-text text-transparent">
                {stats.favorites}
              </div>
            </CardContent>
          </Card>

          <Card 
            className="relative overflow-hidden border-0 shadow-md hover:shadow-xl transition-all duration-300 group cursor-pointer hover:scale-105 active:scale-100"
            onClick={() => navigate('/guest/wishlist')}
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-blue-400 to-blue-300" />
            <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6 pt-3 sm:pt-6">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                <Bookmark className="h-3 w-3 sm:h-4 sm:w-4" />
                Wishlist
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
              <div className="text-2xl sm:text-3xl font-bold bg-gradient-to-br from-blue-500 to-blue-600 bg-clip-text text-transparent">
                {stats.wishlist}
              </div>
            </CardContent>
          </Card>

          <Card 
            className="relative overflow-hidden border-0 shadow-md hover:shadow-xl transition-all duration-300 group cursor-pointer"
            onClick={() => navigate('/guest/bookings?filter=upcoming')}
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-secondary via-primary to-accent" />
            <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6 pt-3 sm:pt-6">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
                Upcoming Trips
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
              <div className="text-2xl sm:text-3xl font-bold bg-gradient-to-br from-secondary to-secondary/80 bg-clip-text text-transparent">
                {stats.upcomingTrips}
              </div>
            </CardContent>
          </Card>

          <Card 
            className="relative overflow-hidden border-0 shadow-md hover:shadow-xl transition-all duration-300 group cursor-pointer"
            onClick={() => navigate('/guest/bookings?filter=past')}
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-accent via-primary to-secondary" />
            <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6 pt-3 sm:pt-6">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                <CalendarDays className="h-3 w-3 sm:h-4 sm:w-4" />
                Past Bookings
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
              <div className="text-2xl sm:text-3xl font-bold">{stats.pastBookings}</div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-0 shadow-md hover:shadow-xl transition-all duration-300 group">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-accent via-green-500 to-green-600" />
            <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6 pt-3 sm:pt-6">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                <Wallet className="h-3 w-3 sm:h-4 sm:w-4" />
                Wallet Balance
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
              <div className="text-xl sm:text-2xl md:text-3xl font-bold text-accent">{formatPHP(stats.walletBalance)}</div>
            </CardContent>
          </Card>

          {/* Become a Host Card */}
          {!hasRole('host') && (
            <Card 
              className="relative overflow-hidden border-2 border-secondary/30 shadow-lg hover:shadow-xl transition-all duration-300 group cursor-pointer bg-gradient-to-br from-secondary/5 to-secondary/10"
              onClick={handleBecomeHost}
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-secondary via-secondary/80 to-secondary/60" />
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-secondary" />
                  <CardTitle className="text-sm font-medium text-secondary uppercase tracking-wide">
                    Become a Host
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  Start earning by hosting your property
                </p>
                <Button 
                  variant="secondary" 
                  className="w-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleBecomeHost();
                  }}
                >
                  Get Started
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Browse Categories */}
        <div className="mb-8">
          <h3 className="text-2xl font-bold mb-6">Browse Categories</h3>
          <div className="grid md:grid-cols-3 gap-6">
            <CategoryCardVideo
              videoSrc="/videos/category-home.mp4"
              fallbackImage={homeIcon}
              icon={Home}
              title="Homes"
              description="Find your perfect stay"
              href="/guest/browse?category=home"
              colorClass="primary"
            />

            <CategoryCardVideo
              videoSrc="/videos/category-experience.mp4"
              fallbackImage={experienceIcon}
              icon={Compass}
              title="Experiences"
              description="Discover unique activities"
              href="/guest/browse?category=experience"
              colorClass="secondary"
            />

            <CategoryCardVideo
              videoSrc="/videos/category-service.mp4"
              fallbackImage={serviceIcon}
              icon={Wrench}
              title="Services"
              description="Professional assistance"
              href="/guest/browse?category=service"
              colorClass="accent"
            />
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
              {recommendations.slice(0, 3).map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                onView={() => navigate(`/guest/listing/${listing.id}`)}
                onFavorite={() => handleFavorite(listing.id)}
                isFavorite={favorites.includes(listing.id)}
              />
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-6">
          <Card className="shadow-medium hover:shadow-hover transition-smooth cursor-pointer" onClick={() => navigate('/guest/favorites')}>
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

          <Card className="shadow-medium hover:shadow-hover transition-smooth cursor-pointer" onClick={() => navigate('/guest/messages')}>
            <CardHeader>
              <MessageSquare className="w-8 h-8 text-primary mb-2" />
              <CardTitle>Messages</CardTitle>
              <CardDescription>View your conversations</CardDescription>
            </CardHeader>
          </Card>

          <Card className="shadow-medium hover:shadow-hover transition-smooth cursor-pointer" onClick={() => navigate('/guest/wallet')}>
            <CardHeader>
              <Wallet className="w-8 h-8 text-accent mb-2" />
              <CardTitle>E-Wallet</CardTitle>
              <CardDescription>Manage your balance</CardDescription>
            </CardHeader>
          </Card>

          <Card className="shadow-medium hover:shadow-hover transition-smooth cursor-pointer" onClick={() => navigate('/guest/settings')}>
            <CardHeader>
              <Settings className="w-8 h-8 text-muted-foreground mb-2" />
              <CardTitle>Settings</CardTitle>
              <CardDescription>Account preferences</CardDescription>
            </CardHeader>
          </Card>
        </div>
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

export default GuestDashboard;
