import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { EmailVerificationBanner } from '@/components/guest/EmailVerificationBanner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CategoryCardVideo } from '@/components/ui/category-card-video';
import { VideoBackground } from '@/components/ui/video-background';
import { Heart, MapPin, Calendar, CalendarDays, Wallet, Settings, User, Sparkles, Home, Compass, Wrench, Building2, MessageSquare } from 'lucide-react';
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
    upcomingTrips: 0,
    pastBookings: 0,
    walletBalance: 0,
  });
  const [recommendations, setRecommendations] = useState<Listing[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
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
            <div className="hidden sm:block p-2 rounded-lg bg-role-guest/10">
              <User className="w-5 h-5 text-role-guest" />
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
            <Button variant="outline" onClick={() => setLogoutDialogOpen(true)} className="h-9 sm:h-auto text-xs sm:text-sm px-2 sm:px-4 touch-manipulation hover:bg-role-guest/10 hover:text-role-guest hover:border-role-guest/30">
              <span className="hidden sm:inline">Sign Out</span>
              <span className="sm:hidden">Out</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Email Verification Banner */}
        <EmailVerificationBanner />

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
              className="h-12 px-8 text-lg bg-role-guest hover:bg-role-guest/90 shadow-2xl hover:shadow-2xl hover:scale-105 transition-all"
              onClick={() => navigate('/guest/browse')}
            >
              Browse All Listings
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 md:gap-6 mb-6 sm:mb-8">
          <Card 
            className="relative overflow-hidden border-0 shadow-md hover:shadow-xl hover:border-role-guest/30 hover:bg-role-guest/5 transition-all duration-300 group cursor-pointer hover:scale-105 active:scale-100"
            onClick={() => navigate('/guest/favorites')}
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-role-guest" />
            <CardHeader className="pb-2 px-3 pt-3">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5 min-w-0">
                <Heart className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="truncate">Favorites</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <div className="text-2xl font-bold text-role-guest truncate">
                {stats.favorites}
              </div>
            </CardContent>
          </Card>

          <Card 
            className="relative overflow-hidden border-0 shadow-md hover:shadow-xl hover:border-role-guest/30 hover:bg-role-guest/5 transition-all duration-300 group cursor-pointer"
            onClick={() => navigate('/guest/bookings?filter=upcoming')}
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-role-guest" />
            <CardHeader className="pb-2 px-3 pt-3">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5 min-w-0">
                <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="truncate">Upcoming Trips</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <div className="text-2xl font-bold text-role-guest truncate">
                {stats.upcomingTrips}
              </div>
            </CardContent>
          </Card>

          <Card 
            className="relative overflow-hidden border-0 shadow-md hover:shadow-xl hover:border-role-guest/30 hover:bg-role-guest/5 transition-all duration-300 group cursor-pointer"
            onClick={() => navigate('/guest/bookings?filter=past')}
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-role-guest" />
            <CardHeader className="pb-2 px-3 pt-3">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5 min-w-0">
                <CalendarDays className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="truncate">Past Bookings</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <div className="text-2xl font-bold text-role-guest truncate">{stats.pastBookings}</div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-0 shadow-md hover:shadow-xl hover:border-role-guest/30 hover:bg-role-guest/5 transition-all duration-300 group">
            <div className="absolute top-0 left-0 right-0 h-1 bg-role-guest" />
            <CardHeader className="pb-2 px-3 pt-3">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5 min-w-0">
                <Wallet className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="truncate">Wallet Balance</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <div className="text-xl font-bold text-role-guest truncate">{formatPHP(stats.walletBalance)}</div>
            </CardContent>
          </Card>

          {/* Become a Host Card */}
          {!hasRole('host') && (
            <Card 
              className="relative overflow-hidden border-2 border-role-host/30 shadow-lg hover:shadow-xl transition-all duration-300 group cursor-pointer bg-gradient-to-br from-role-host/5 to-role-host/10"
              onClick={handleBecomeHost}
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-role-host" />
              <CardHeader className="pb-2 px-3 pt-3">
                <div className="flex items-center gap-1.5 min-w-0">
                  <Building2 className="w-3.5 h-3.5 text-role-host flex-shrink-0" />
                  <CardTitle className="text-xs font-medium text-role-host uppercase tracking-wide truncate">
                    Become a Host
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                  Start earning by hosting your property
                </p>
                <Button 
                  variant="role-host" 
                  size="sm"
                  className="w-full text-xs h-8"
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
              colorClass="primary"
            />

            <CategoryCardVideo
              videoSrc="/videos/category-service.mp4"
              fallbackImage={serviceIcon}
              icon={Wrench}
              title="Services"
              description="Professional assistance"
              href="/guest/browse?category=service"
              colorClass="primary"
            />
          </div>
        </div>

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-role-guest" />
                <h3 className="text-2xl font-bold">Recommended for You</h3>
              </div>
              <Button variant="outline" onClick={() => navigate('/guest/browse')} className="hover:bg-role-guest/10 hover:text-role-guest hover:border-role-guest/30">
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
          <Card className="shadow-medium hover:shadow-hover hover:border-role-guest/50 hover:bg-role-guest/5 transition-smooth cursor-pointer" onClick={() => navigate('/guest/favorites')}>
            <CardHeader>
              <Heart className="w-8 h-8 text-role-guest mb-2" />
              <CardTitle>Favorites</CardTitle>
              <CardDescription>Your saved listings</CardDescription>
            </CardHeader>
          </Card>

          <Card className="shadow-medium hover:shadow-hover hover:border-role-guest/50 hover:bg-role-guest/5 transition-smooth cursor-pointer" onClick={() => navigate('/guest/bookings')}>
            <CardHeader>
              <Calendar className="w-8 h-8 text-role-guest mb-2" />
              <CardTitle>My Bookings</CardTitle>
              <CardDescription>View your trips</CardDescription>
            </CardHeader>
          </Card>

          <Card className="shadow-medium hover:shadow-hover hover:border-role-guest/50 hover:bg-role-guest/5 transition-smooth cursor-pointer" onClick={() => navigate('/guest/messages')}>
            <CardHeader>
              <MessageSquare className="w-8 h-8 text-role-guest mb-2" />
              <CardTitle>Messages</CardTitle>
              <CardDescription>View your conversations</CardDescription>
            </CardHeader>
          </Card>

          <Card className="shadow-medium hover:shadow-hover hover:border-role-guest/50 hover:bg-role-guest/5 transition-smooth cursor-pointer" onClick={() => navigate('/guest/wallet')}>
            <CardHeader>
              <Wallet className="w-8 h-8 text-role-guest mb-2" />
              <CardTitle>E-Wallet</CardTitle>
              <CardDescription>Manage your balance</CardDescription>
            </CardHeader>
          </Card>

          <Card className="shadow-medium hover:shadow-hover hover:border-role-guest/50 hover:bg-role-guest/5 transition-smooth cursor-pointer" onClick={() => navigate('/guest/settings')}>
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
