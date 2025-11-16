import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, Heart } from "lucide-react";
import { toast } from "sonner";
import { ListingCard } from "@/components/listings/ListingCard";
import { EmptyState } from "@/components/ui/empty-state";
import { toggleFavorite, toggleWishlist } from "@/lib/firestore";
import type { UserProfile, Listing } from "@/types";
import LoadingScreen from "@/components/ui/loading-screen";
import { BackButton } from "@/components/shared/BackButton";

const Favorites = () => {
  const navigate = useNavigate();
  const { user, hasRole } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [favoriteListings, setFavoriteListings] = useState<Listing[]>([]);
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
      loadFavoriteListings();
      loadWishlist();
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

  const loadWishlist = async () => {
    if (!user) return;
    try {
      const docSnap = await getDoc(doc(db, 'users', user.uid));
      if (docSnap.exists()) {
        const data = docSnap.data() as UserProfile;
        setWishlist(data.wishlist || []);
      }
    } catch (error) {
      console.error('Error loading wishlist:', error);
    }
  };

  const loadFavoriteListings = async () => {
    if (!user || !profile?.favorites?.length) {
      setFavoriteListings([]);
      return;
    }
    try {
      const { getListing } = await import('@/lib/firestore');
      const favoriteDetails = await Promise.all(
        profile.favorites.map(id => getListing(id, user?.uid))
      );
      setFavoriteListings(favoriteDetails.filter((l): l is Listing => l !== null));
    } catch (error) {
      console.error('Error loading favorite listings:', error);
      setFavoriteListings([]);
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
      loadFavoriteListings();
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
        <BackButton to="/guest/dashboard" className="mb-4 sm:mb-6" />

        <h1 className="text-3xl font-bold mb-6">Your Favorites</h1>

        <Card>
          <CardHeader>
            <CardTitle>Your Favorites</CardTitle>
            <CardDescription>Listings you've liked and saved</CardDescription>
          </CardHeader>
          <CardContent>
            {favoriteListings.length === 0 ? (
              <EmptyState
                icon={<Heart className="h-10 w-10" />}
                title="No favorites yet"
                description="Start exploring and add listings to your favorites!"
                action={
                  <Button onClick={() => navigate('/guest/browse')}>
                    Browse Listings
                  </Button>
                }
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {favoriteListings.map((listing) => (
                  <ListingCard
                    key={listing.id}
                    listing={listing}
                    onView={() => navigate(`/guest/listing/${listing.id}`)}
                    onFavorite={() => handleFavorite(listing.id)}
                    isFavorite={favorites.includes(listing.id)}
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

export default Favorites;

