import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, Bookmark } from "lucide-react";
import { toast } from "sonner";
import { ListingCard } from "@/components/listings/ListingCard";
import { EmptyState } from "@/components/ui/empty-state";
import { toggleFavorite, toggleWishlist } from "@/lib/firestore";
import type { UserProfile, Listing } from "@/types";
import LoadingScreen from "@/components/ui/loading-screen";

const Wishlist = () => {
  const navigate = useNavigate();
  const { user, hasRole } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [wishlistListings, setWishlistListings] = useState<Listing[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && !hasRole('guest')) {
      navigate('/guest/login');
      return;
    }
    if (user) {
      loadProfile();
    } else {
      setLoading(false);
    }
  }, [user, navigate]);

  useEffect(() => {
    if (user && profile) {
      loadWishlistListings();
      loadFavorites();
    }
  }, [user, profile]);

  const loadProfile = async () => {
    if (!user) return;
    try {
      const docSnap = await getDoc(doc(db, 'users', user.uid));
      if (docSnap.exists()) {
        const data = docSnap.data() as UserProfile;
        setProfile(data);
        setFavorites(data.favorites || []);
        setWishlist(data.wishlist || []);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const loadFavorites = async () => {
    if (!user) return;
    try {
      const docSnap = await getDoc(doc(db, 'users', user.uid));
      if (docSnap.exists()) {
        const data = docSnap.data() as UserProfile;
        setFavorites(data.favorites || []);
      }
    } catch (error) {
      console.error('Error loading favorites:', error);
    }
  };

  const loadWishlistListings = async () => {
    if (!user || !profile?.wishlist?.length) {
      setWishlistListings([]);
      return;
    }
    try {
      const { getListing } = await import('@/lib/firestore');
      const wishlistDetails = await Promise.all(
        profile.wishlist.map(id => getListing(id))
      );
      setWishlistListings(wishlistDetails.filter((l): l is Listing => l !== null));
    } catch (error) {
      console.error('Error loading wishlist listings:', error);
      setWishlistListings([]);
    }
  };

  const handleFavorite = async (listingId: string) => {
    if (!user) {
      toast.error("Please login to manage favorites");
      return;
    }
    try {
      const newFavorites = await toggleFavorite(user.uid, listingId, favorites);
      setFavorites(newFavorites);
      setProfile(prev => prev ? { ...prev, favorites: newFavorites } : null);
      toast.success(newFavorites.includes(listingId) ? "Added to favorites" : "Removed from favorites");
    } catch (error) {
      toast.error("Failed to update favorites");
    }
  };

  const handleWishlist = async (listingId: string) => {
    if (!user) {
      toast.error("Please login to manage wishlist");
      return;
    }
    try {
      const newWishlist = await toggleWishlist(user.uid, listingId, wishlist);
      setWishlist(newWishlist);
      setProfile(prev => prev ? { ...prev, wishlist: newWishlist } : null);
      loadWishlistListings();
      toast.success(newWishlist.includes(listingId) ? "Added to wishlist" : "Removed from wishlist");
    } catch (error) {
      toast.error("Failed to update wishlist");
    }
  };

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/guest/dashboard')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>

        <h1 className="text-3xl font-bold mb-6">Your Wishlist</h1>

        <Card>
          <CardHeader>
            <CardTitle>Your Wishlist</CardTitle>
            <CardDescription>Listings you're planning to book in the future</CardDescription>
          </CardHeader>
          <CardContent>
            {wishlistListings.length === 0 ? (
              <EmptyState
                icon={<Bookmark className="h-10 w-10" />}
                title="No wishlist items yet"
                description="Add listings to your wishlist for future trips!"
                action={
                  <Button onClick={() => navigate('/guest/browse')}>
                    Browse Listings
                  </Button>
                }
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {wishlistListings.map((listing) => (
                  <ListingCard
                    key={listing.id}
                    listing={listing}
                    onView={() => navigate(`/guest/listing/${listing.id}`)}
                    onFavorite={() => handleFavorite(listing.id)}
                    onWishlist={() => handleWishlist(listing.id)}
                    isFavorite={favorites.includes(listing.id)}
                    isInWishlist={wishlist.includes(listing.id)}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Wishlist;

