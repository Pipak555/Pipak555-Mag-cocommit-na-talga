import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { getListings, toggleFavorite, toggleWishlist, getListingsRatings } from "@/lib/firestore";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ListingCard } from "@/components/listings/ListingCard";
import { ListingSkeleton } from "@/components/ui/listing-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { SearchAutocomplete } from "@/components/search/SearchAutocomplete";
import { AdvancedFilter, FilterValues } from "@/components/filters/AdvancedFilter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Search } from "lucide-react";
import { toast } from "sonner";
import type { Listing } from "@/types";

const BrowseListings = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  // Initialize filters - check URL params first for category
  const getInitialCategory = () => {
    const params = new URLSearchParams(location.search);
    const category = params.get('category');
    if (category && ['home', 'experience', 'service'].includes(category)) {
      return category as 'home' | 'experience' | 'service';
    }
    return 'all';
  };

  const [filters, setFilters] = useState<FilterValues>({
    location: '',
    guests: 1,
    category: getInitialCategory()
  });

  useEffect(() => {
    loadListings();
    if (user) {
      loadFavorites();
      loadWishlist();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, filters.category]);

  useEffect(() => {
    // Get search query and category from URL params if present
    const params = new URLSearchParams(location.search);
    const query = params.get('q');
    const category = params.get('category');
    
    if (query) {
      setSearchQuery(query);
    }
    
    // Auto-filter by category if provided in URL
    if (category && ['home', 'experience', 'service'].includes(category)) {
      const categoryValue = category as 'home' | 'experience' | 'service';
      // Only update if different to avoid unnecessary re-renders
      setFilters(prev => {
        if (prev.category !== categoryValue) {
          return { ...prev, category: categoryValue };
        }
        return prev;
      });
    } else if (!category) {
      // If no category in URL, reset to 'all' if it was set
      setFilters(prev => {
        if (prev.category !== 'all') {
          return { ...prev, category: 'all' };
        }
        return prev;
      });
    }
  }, [location.search]);

  const loadListings = async () => {
    try {
      const listingFilters = filters.category !== 'all' 
        ? { category: filters.category, status: 'approved' } 
        : { status: 'approved' };
      const data = await getListings(listingFilters);
      
      // Fetch ratings for all listings
      if (data.length > 0) {
        const listingIds = data.map(listing => listing.id);
        const ratingsMap = await getListingsRatings(listingIds);
        
        // Attach ratings to listings
        const listingsWithRatings = data.map(listing => {
          const rating = ratingsMap.get(listing.id);
          return {
            ...listing,
            averageRating: rating?.averageRating || 0,
            reviewCount: rating?.reviewCount || 0
          };
        });
        
        setListings(listingsWithRatings);
      } else {
        setListings(data);
      }
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

  const loadWishlist = async () => {
    if (!user) return;
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (userDoc.exists()) {
      setWishlist(userDoc.data().wishlist || []);
    }
  };

  const handleFavorite = useCallback(async (listingId: string) => {
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
  }, [user, favorites]);

  const handleWishlist = useCallback(async (listingId: string) => {
    if (!user) {
      toast.error("Please login to add to wishlist");
      return;
    }
    // Optimistic update
    const wasInWishlist = wishlist.includes(listingId);
    const optimistic = wasInWishlist
      ? wishlist.filter(id => id !== listingId)
      : [...wishlist, listingId];
    setWishlist(optimistic);
    try {
      const newWishlist = await toggleWishlist(user.uid, listingId, wishlist);
      setWishlist(newWishlist);
      toast.success(newWishlist.includes(listingId) ? "Added to wishlist" : "Removed from wishlist");
    } catch (error) {
      // Revert on error
      setWishlist(wishlist);
      toast.error("Failed to update wishlist");
    }
  }, [user, wishlist]);

  // Memoize filtered listings to avoid recalculating on every render
  const filteredListings = useMemo(() => {
    return listings.filter(listing => {
      // Search query filter
      if (searchQuery.trim()) {
        const lowerQuery = searchQuery.toLowerCase();
        const matchesTitle = listing.title.toLowerCase().includes(lowerQuery);
        const matchesLocation = listing.location.toLowerCase().includes(lowerQuery);
        const matchesDescription = listing.description.toLowerCase().includes(lowerQuery);
        const matchesCategory = listing.category.toLowerCase().includes(lowerQuery);
        
        if (!matchesTitle && !matchesLocation && !matchesDescription && !matchesCategory) {
          return false;
        }
      }
      
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
  }, [listings, searchQuery, filters]);

  const handleFilterChange = (newFilters: FilterValues) => {
    setFilters(newFilters);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        <Button
          variant="ghost"
          onClick={() => navigate('/guest/dashboard')}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>

        <h1 className="text-3xl md:text-4xl font-bold mb-6">Browse Listings</h1>

        {/* Search Bar with Autocomplete */}
        <Card className="mb-6 shadow-md">
          <CardContent className="pt-6">
            <SearchAutocomplete
              onSearch={(query) => {
                setSearchQuery(query);
                navigate(`/guest/browse?q=${encodeURIComponent(query)}`);
              }}
              placeholder="Search destinations, experiences, services..."
            />
          </CardContent>
        </Card>

        {/* Category Chips/Tabs */}
        <div className="mb-6 flex flex-wrap gap-2">
          {['all','home','experience','service'].map((cat) => (
            <button
              key={cat}
              className={`px-4 py-2 rounded-full text-sm font-medium border-2 transition-all ${
                (filters.category === cat)
                  ? 'bg-primary text-primary-foreground border-primary shadow-md'
                  : 'bg-background border-border text-foreground hover:bg-muted hover:border-primary/50'
              }`}
              onClick={() => setFilters({ ...filters, category: cat as any })}
            >
              {cat === 'all' ? 'All' : cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </div>

        <div className="mb-8">
          <AdvancedFilter 
            onFilterChange={handleFilterChange} 
            initialFilters={filters} // Pass current filters
          />
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <ListingSkeleton key={i} />
            ))}
          </div>
        ) : filteredListings.length === 0 ? (
          <EmptyState
            icon={<Search className="h-10 w-10" />}
            title="No listings found"
            description="Try adjusting your filters or browse a different category to find what you're looking for."
            action={
              <Button onClick={() => setFilters({ ...filters, category: 'all', location: '', guests: 1 })}>
                Clear Filters
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-stretch">
            {filteredListings.map((listing) => (
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
      </div>
    </div>
  );
};

export default BrowseListings;
