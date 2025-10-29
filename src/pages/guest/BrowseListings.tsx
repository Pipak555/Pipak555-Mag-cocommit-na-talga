import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { getListings, toggleFavorite } from "@/lib/firestore";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ListingCard } from "@/components/listings/ListingCard";
import { AdvancedFilter, FilterValues } from "@/components/filters/AdvancedFilter";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import type { Listing } from "@/types";

const BrowseListings = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FilterValues>({
    location: '',
    guests: 1,
    category: 'all'
  });

  useEffect(() => {
    loadListings();
    if (user) loadFavorites();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, filters.category]);

  const loadListings = async () => {
    try {
      const listingFilters = filters.category !== 'all' 
        ? { category: filters.category, status: 'approved' } 
        : { status: 'approved' };
      const data = await getListings(listingFilters);
      setListings(data);
    } catch (error) {
      toast.error("Failed to load listings");
    } finally {
      setLoading(false);
    }
  };

  const loadFavorites = async () => {
    if (!user) return;
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (userDoc.exists()) {
      setFavorites(userDoc.data().favorites || []);
    }
  };

  const handleFavorite = async (listingId: string) => {
    if (!user) {
      toast.error("Please login to add favorites");
      return;
    }
    // Optimistic update
    const wasFavorite = favorites.includes(listingId);
    const optimistic = wasFavorite
      ? favorites.filter(id => id !== listingId)
      : [...favorites, listingId];
    setFavorites(optimistic);
    try {
      const newFavorites = await toggleFavorite(user.uid, listingId, favorites);
      setFavorites(newFavorites);
      toast.success(newFavorites.includes(listingId) ? "Added to favorites" : "Removed from favorites");
    } catch (error) {
      // Revert on error
      setFavorites(favorites);
      toast.error("Failed to update favorites");
    }
  };

  const filteredListings = listings.filter(listing => {
    // Location filter
    if (filters.location && !listing.location.toLowerCase().includes(filters.location.toLowerCase())) {
      return false;
    }
    
    // Guest capacity filter
    if (filters.guests > listing.maxGuests) {
      return false;
    }
    
    // Price range filter
    if (filters.minPrice && listing.price < filters.minPrice) {
      return false;
    }
    if (filters.maxPrice && listing.price > filters.maxPrice) {
      return false;
    }
    
    return true;
  });

  const handleFilterChange = (newFilters: FilterValues) => {
    setFilters(newFilters);
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate('/guest/dashboard')}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>

        <h1 className="text-3xl font-bold mb-6">Browse Listings</h1>

        {/* Category Chips/Tabs */}
        <div className="mb-4 flex flex-wrap gap-2">
          {['all','home','experience','service'].map((cat) => (
            <button
              key={cat}
              className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                (filters.category === cat)
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background border-border text-foreground hover:bg-muted'
              }`}
              onClick={() => setFilters({ ...filters, category: cat as any })}
            >
              {cat === 'all' ? 'All' : cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </div>

        <div className="mb-6">
          <AdvancedFilter onFilterChange={handleFilterChange} />
        </div>

        {loading ? (
          <p>Loading...</p>
        ) : filteredListings.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-2">No listings found</p>
            <p className="text-sm text-muted-foreground">Try a different category or adjust filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredListings.map((listing) => (
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
      </div>
    </div>
  );
};

export default BrowseListings;
