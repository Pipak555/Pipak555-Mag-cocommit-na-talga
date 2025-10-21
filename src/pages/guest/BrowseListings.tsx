import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { getListings, toggleFavorite } from "@/lib/firestore";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ListingCard } from "@/components/listings/ListingCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Search } from "lucide-react";
import { toast } from "sonner";
import type { Listing } from "@/types";

const BrowseListings = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadListings();
    if (user) loadFavorites();
  }, [category, user]);

  const loadListings = async () => {
    try {
      const filters = category !== 'all' ? { category, status: 'approved' } : { status: 'approved' };
      const data = await getListings(filters);
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
    try {
      const newFavorites = await toggleFavorite(user.uid, listingId, favorites);
      setFavorites(newFavorites);
      toast.success(newFavorites.includes(listingId) ? "Added to favorites" : "Removed from favorites");
    } catch (error) {
      toast.error("Failed to update favorites");
    }
  };

  const filteredListings = listings.filter(listing =>
    listing.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    listing.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

        <div className="flex gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search by title or location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="home">Homes</SelectItem>
              <SelectItem value="experience">Experiences</SelectItem>
              <SelectItem value="service">Services</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <p>Loading...</p>
        ) : filteredListings.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No listings found</p>
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
