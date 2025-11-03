import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getListings, updateListing } from "@/lib/firestore";
import { ListingCard } from "@/components/listings/ListingCard";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Listing } from "@/types";

const ReviewListings = () => {
  const navigate = useNavigate();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [listingToReview, setListingToReview] = useState<string | null>(null);

  useEffect(() => {
    loadPendingListings();
  }, []);

  const loadPendingListings = async () => {
    try {
      setLoading(true);
      console.log('ReviewListings: Loading pending listings...');
      const data = await getListings({ status: 'pending' });
      console.log(`ReviewListings: Found ${data.length} pending listings:`, data);
      console.log('ReviewListings: Listing details:', data.map(l => ({ 
        id: l.id, 
        title: l.title, 
        status: l.status,
        hostId: l.hostId 
      })));
      setListings(data);
      if (data.length === 0) {
        console.log('ReviewListings: No pending listings found. Check if listings exist with status "pending" in Firestore.');
      }
    } catch (error: any) {
      console.error('ReviewListings: Error loading pending listings:', error);
      console.error('ReviewListings: Error details:', {
        message: error.message,
        code: error.code,
        stack: error.stack
      });
      toast.error(`Failed to load listings: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = (id: string) => {
    setListingToReview(id);
    setApproveDialogOpen(true);
  };

  const handleReject = (id: string) => {
    setListingToReview(id);
    setRejectDialogOpen(true);
  };

  const confirmApprove = async () => {
    if (!listingToReview) return;
    try {
      await updateListing(listingToReview, { status: 'approved' });
      toast.success("Listing approved");
      loadPendingListings();
      setListingToReview(null);
    } catch (error) {
      toast.error("Failed to approve listing");
    } finally {
      setApproveDialogOpen(false);
    }
  };

  const confirmReject = async () => {
    if (!listingToReview) return;
    try {
      await updateListing(listingToReview, { status: 'rejected' });
      toast.success("Listing rejected");
      loadPendingListings();
      setListingToReview(null);
    } catch (error) {
      toast.error("Failed to reject listing");
    } finally {
      setRejectDialogOpen(false);
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

      {/* Approve Listing Dialog */}
      <AlertDialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve Listing?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to approve this listing? It will be published and visible to all users.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setListingToReview(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmApprove}>Approve</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Listing Dialog */}
      <AlertDialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Listing?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to reject this listing? The host will be notified and the listing will not be published.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setListingToReview(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmReject} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Reject
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ReviewListings;
