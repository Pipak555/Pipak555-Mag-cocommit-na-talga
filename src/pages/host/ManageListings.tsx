import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { getListings, deleteListing } from "@/lib/firestore";
import { ListingCard } from "@/components/listings/ListingCard";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus } from "lucide-react";
import { toast } from "sonner";
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
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/host/dashboard')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          
          <Button onClick={() => navigate('/host/create-listing')}>
            <Plus className="h-4 w-4 mr-2" />
            Create Listing
          </Button>
        </div>

        <h1 className="text-3xl font-bold mb-6">My Listings</h1>

        {loading ? (
          <p>Loading...</p>
        ) : listings.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">No listings yet</p>
            <Button onClick={() => navigate('/host/create-listing')}>
              Create Your First Listing
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {listings.map((listing) => (
              <div key={listing.id}>
                <ListingCard listing={listing} />
                <div className="mt-2 flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1">Edit</Button>
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
