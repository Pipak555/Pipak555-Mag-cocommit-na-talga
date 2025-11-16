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
import { BackButton } from "@/components/shared/BackButton";

const Wishlist = () => {
  const navigate = useNavigate();
  const { user, hasRole } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [wishlistListings, setWishlistListings] = useState<Listing[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [wishlist, setWishlist] = useState<string[] | any[]>([]);
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
      // Handle both old format (string[]) and new format (WishlistItem[])
      const listingIds = profile.wishlist.map(item => 
        typeof item === 'string' ? item : item.listingId
      );
      const wishlistDetails = await Promise.all(
        listingIds.map(id => getListing(id, user?.uid))
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
        <BackButton to="/guest/dashboard" className="mb-4 sm:mb-6" />

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
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {wishlistListings.map((listing) => {
                  const wishlistItem = wishlist.find(item => 
                    (typeof item === 'string' ? item === listing.id : item.listingId === listing.id)
                  );
                  const recommendations = typeof wishlistItem === 'object' && wishlistItem?.recommendations;
                  const isInWishlist = wishlist.some(item => 
                    (typeof item === 'string' ? item === listing.id : item.listingId === listing.id)
                  );
                  
                  return (
                    <div key={listing.id} className="space-y-2">
                      <ListingCard
                        listing={listing}
                        onView={() => navigate(`/guest/listing/${listing.id}`)}
                        onFavorite={() => handleFavorite(listing.id)}
                        isFavorite={favorites.includes(listing.id)}
                      />
                      {(recommendations || (typeof wishlistItem === 'object' && wishlistItem?.propertyRequirements) || (typeof wishlistItem === 'object' && wishlistItem?.desiredAmenities)) && (
                        <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
                          <CardContent className="p-3 space-y-2">
                            {typeof wishlistItem === 'object' && wishlistItem?.propertyRequirements && Object.keys(wishlistItem.propertyRequirements).length > 0 && (
                              <div>
                                <p className="text-xs font-semibold text-blue-900 dark:text-blue-100 mb-1">Requirements:</p>
                                <div className="text-xs text-blue-800 dark:text-blue-200 space-y-1">
                                  {wishlistItem.propertyRequirements.beds && <p>• Beds: {wishlistItem.propertyRequirements.beds}</p>}
                                  {wishlistItem.propertyRequirements.bedrooms && <p>• Bedrooms: {wishlistItem.propertyRequirements.bedrooms}</p>}
                                  {wishlistItem.propertyRequirements.bathrooms && <p>• Bathrooms: {wishlistItem.propertyRequirements.bathrooms}</p>}
                                  {wishlistItem.propertyRequirements.guests && <p>• Guests: {wishlistItem.propertyRequirements.guests}</p>}
                                </div>
                              </div>
                            )}
                            {typeof wishlistItem === 'object' && wishlistItem?.desiredAmenities && wishlistItem.desiredAmenities.length > 0 && (
                              <div>
                                <p className="text-xs font-semibold text-blue-900 dark:text-blue-100 mb-1">Desired Amenities:</p>
                                <p className="text-xs text-blue-800 dark:text-blue-200">{wishlistItem.desiredAmenities.join(', ')}</p>
                              </div>
                            )}
                            {recommendations && (
                              <div>
                                <p className="text-xs font-semibold text-blue-900 dark:text-blue-100 mb-1">Recommendations:</p>
                                <p className="text-sm text-blue-800 dark:text-blue-200">{recommendations}</p>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Wishlist;

