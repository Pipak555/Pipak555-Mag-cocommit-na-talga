import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { getListings, deleteListing } from "@/lib/firestore";
import { Badge } from "@/components/ui/badge";
import { ListingCard } from "@/components/listings/ListingCard";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, Home } from "lucide-react";
import { toast } from "sonner";
import { ThemeToggle } from '@/components/ui/theme-toggle';
import type { Listing } from "@/types";

const ManageListings = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadListings();
    }
  }, [user]);

  const loadListings = async () => {
    if (!user) return;
    try {
      const data = await getListings({ hostId: user.uid });
      setListings(data);
    } catch (error) {
      toast.error("Failed to load listings");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this listing?")) {
      try {
        await deleteListing(id);
        toast.success("Listing deleted");
        loadListings();
      } catch (error) {
        toast.error("Failed to delete listing");
      }
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60 shadow-soft">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/host/dashboard')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="p-2 rounded-lg bg-primary/10">
              <Home className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold">My Listings</h1>
              <p className="text-xs text-muted-foreground">Manage your properties</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button onClick={() => navigate('/host/create-listing')}>
              <Plus className="h-4 w-4 mr-2" />
              Create Listing
            </Button>
          </div>
        </div>
      </header>
      
      <div className="max-w-7xl mx-auto p-6">

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : listings.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Home className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No listings yet</h3>
            <p className="text-muted-foreground mb-6">Create your first listing to start hosting</p>
            <Button size="lg" onClick={() => navigate('/host/create-listing')}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Listing
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {listings.map((listing) => (
              <div key={listing.id} className="group">
                <ListingCard listing={listing} />
                <div className="mt-2 flex items-center justify-between">
                  <Badge variant={listing.status === 'draft' ? 'secondary' : 'default'}>
                    {listing.status.charAt(0).toUpperCase() + listing.status.slice(1)}
                  </Badge>
                  <span className="text-sm text-muted-foreground">{listing.category}</span>
                </div>
                <div className="mt-3 flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1 hover:bg-primary hover:text-primary-foreground"
                    onClick={() => navigate(`/host/create-listing?edit=${listing.id}`)}
                  >
                    {listing.status === 'draft' ? 'Resume' : 'Edit'}
                  </Button>
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => handleDelete(listing.id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ManageListings;
