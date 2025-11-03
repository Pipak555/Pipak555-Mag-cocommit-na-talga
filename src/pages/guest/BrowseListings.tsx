import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { getListings, toggleFavorite } from "@/lib/firestore";
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
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
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

  useEffect(() => {
    // Get search query from URL params if present
    const params = new URLSearchParams(location.search);
    const query = params.get('q');
    if (query) {
      setSearchQuery(query);
    }
  }, [location.search]);

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
          <AdvancedFilter onFilterChange={handleFilterChange} />
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
