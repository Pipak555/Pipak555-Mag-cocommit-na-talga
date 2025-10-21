import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getListings, updateListing } from "@/lib/firestore";
import { ListingCard } from "@/components/listings/ListingCard";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import type { Listing } from "@/types";

const ReviewListings = () => {
  const navigate = useNavigate();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPendingListings();
  }, []);

  const loadPendingListings = async () => {
    try {
      const data = await getListings({ status: 'pending' });
      setListings(data);
    } catch (error) {
      toast.error("Failed to load listings");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await updateListing(id, { status: 'approved' });
      toast.success("Listing approved");
      loadPendingListings();
    } catch (error) {
      toast.error("Failed to approve listing");
    }
  };

  const handleReject = async (id: string) => {
    try {
      await updateListing(id, { status: 'rejected' });
      toast.success("Listing rejected");
      loadPendingListings();
    } catch (error) {
      toast.error("Failed to reject listing");
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate('/admin/dashboard')}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>

        <h1 className="text-3xl font-bold mb-6">Review Pending Listings</h1>

        {loading ? (
          <p>Loading...</p>
        ) : listings.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No pending listings</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {listings.map((listing) => (
              <div key={listing.id}>
                <ListingCard listing={listing} />
                <div className="mt-2 flex gap-2">
                  <Button 
                    variant="default" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => handleApprove(listing.id)}
                  >
                    Approve
                  </Button>
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => handleReject(listing.id)}
                  >
                    Reject
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

export default ReviewListings;
