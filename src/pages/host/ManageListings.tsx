import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { getListings, deleteListing, getListing } from "@/lib/firestore";
import { Badge } from "@/components/ui/badge";
import { ListingCard } from "@/components/listings/ListingCard";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, Home, Edit, MapPin, DollarSign, Users, Bed, Bath, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ThemeToggle } from '@/components/ui/theme-toggle';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { formatPHP } from "@/lib/currency";
import type { Listing } from "@/types";

const ManageListings = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [listingToDelete, setListingToDelete] = useState<string | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [loadingListing, setLoadingListing] = useState(false);

  useEffect(() => {
    if (user) {
      loadListings();
    }
  }, [user]);

  const loadListings = async () => {
    if (!user) return;
    try {
      setLoading(true);
      console.log("Loading listings for hostId:", user.uid);
      const data = await getListings({ hostId: user.uid });
      console.log("Loaded listings:", data);
      // Filter out drafts - drafts should not appear in the listings management
      const publishedListings = data.filter(listing => listing.status !== 'draft');
      setListings(publishedListings);
    } catch (error: any) {
      console.error("Failed to load listings:", error);
      toast.error(`Failed to load listings: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id: string) => {
    setListingToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!listingToDelete) return;
    try {
      await deleteListing(listingToDelete);
      toast.success("Listing deleted");
      loadListings();
      setListingToDelete(null);
      if (selectedListing?.id === listingToDelete) {
        setDetailDialogOpen(false);
        setSelectedListing(null);
      }
    } catch (error) {
      toast.error("Failed to delete listing");
    } finally {
      setDeleteConfirmOpen(false);
    }
  };

  const handleViewListing = async (listingId: string) => {
    setLoadingListing(true);
    setDetailDialogOpen(true);
    try {
      const listing = await getListing(listingId);
      if (listing) {
        setSelectedListing(listing);
      } else {
        toast.error("Listing not found");
        setDetailDialogOpen(false);
      }
    } catch (error: any) {
      console.error("Error loading listing:", error);
      toast.error(`Failed to load listing: ${error.message || 'Unknown error'}`);
      setDetailDialogOpen(false);
    } finally {
      setLoadingListing(false);
    }
  };

  const handleEditListing = (listingId: string) => {
    setDetailDialogOpen(false);
    navigate(`/host/create-listing?edit=${listingId}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60 shadow-soft">
        <div className="container mx-auto px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <Button variant="ghost" size="icon" onClick={() => navigate('/host/dashboard')} className="h-9 w-9 sm:h-10 sm:w-10 touch-manipulation">
              <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
            <div className="hidden sm:block p-2 rounded-lg bg-primary/10">
              <Home className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-base sm:text-lg font-bold truncate">My Listings</h1>
              <p className="text-xs text-muted-foreground hidden sm:block">Manage your properties</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            <ThemeToggle />
            <Button onClick={() => navigate('/host/create-listing')} className="h-9 sm:h-auto text-xs sm:text-sm px-3 sm:px-4 touch-manipulation">
              <Plus className="h-4 w-4 mr-1.5 sm:mr-2" />
              <span className="hidden sm:inline">Create Listing</span>
              <span className="sm:hidden">Create</span>
            </Button>
          </div>
        </div>
      </header>
      
      <div className="max-w-7xl mx-auto p-4 sm:p-6">

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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {listings.map((listing) => (
              <div key={listing.id} className="group">
                <div 
                  className="cursor-pointer"
                  onClick={() => handleViewListing(listing.id)}
                >
                  <ListingCard listing={listing} />
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <Badge variant={listing.status === 'draft' ? 'secondary' : 'default'}>
                    {listing.status.charAt(0).toUpperCase() + listing.status.slice(1)}
                  </Badge>
                  <span className="text-sm text-muted-foreground">{listing.category}</span>
                </div>
                <div className="mt-3 flex flex-col sm:flex-row gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1 h-11 sm:h-auto text-sm sm:text-base hover:bg-primary hover:text-primary-foreground touch-manipulation"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditListing(listing.id);
                    }}
                  >
                    {listing.status === 'draft' ? 'Resume' : 'Edit'}
                  </Button>
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    className="flex-1 h-11 sm:h-auto text-sm sm:text-base touch-manipulation"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(listing.id);
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Listing?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this listing? This action cannot be undone. 
              Any associated bookings and reviews will be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setListingToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Listing Details Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">{selectedListing?.title || 'Listing Details'}</DialogTitle>
            <DialogDescription>
              View and manage your listing details
            </DialogDescription>
          </DialogHeader>

          {loadingListing ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-3 text-muted-foreground">Loading listing details...</p>
            </div>
          ) : selectedListing ? (
            <div className="space-y-6">
              {/* Images */}
              {selectedListing.images && selectedListing.images.length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  {selectedListing.images.slice(0, 4).map((image, index) => (
                    <img
                      key={index}
                      src={image}
                      alt={`${selectedListing.title} - Image ${index + 1}`}
                      className="w-full h-48 object-cover rounded-lg"
                    />
                  ))}
                </div>
              )}

              <Separator />

              {/* Listing Details */}
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Location
                  </h3>
                  <p className="text-muted-foreground">{selectedListing.location}</p>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Description</h3>
                  <p className="text-muted-foreground whitespace-pre-wrap">{selectedListing.description}</p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Price</p>
                      <p className="font-semibold">{formatPHP(selectedListing.price)}/night</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Max Guests</p>
                      <p className="font-semibold">{selectedListing.maxGuests}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Bed className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Bedrooms</p>
                      <p className="font-semibold">{selectedListing.bedrooms || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Bath className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Bathrooms</p>
                      <p className="font-semibold">{selectedListing.bathrooms !== undefined ? selectedListing.bathrooms : 'N/A'}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Home className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Category</p>
                    <Badge variant="secondary">{selectedListing.category}</Badge>
                  </div>
                </div>

                {selectedListing.amenities && selectedListing.amenities.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2">Amenities</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedListing.amenities.map((amenity, index) => (
                        <Badge key={index} variant="outline">{amenity}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <p className="text-sm text-muted-foreground">Status:</p>
                  <Badge variant={selectedListing.status === 'approved' ? 'default' : selectedListing.status === 'pending' ? 'secondary' : 'outline'}>
                    {selectedListing.status.charAt(0).toUpperCase() + selectedListing.status.slice(1)}
                  </Badge>
                </div>
              </div>

              <Separator />

              {/* Action Buttons */}
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setDetailDialogOpen(false)}
                >
                  Close
                </Button>
                <Button
                  onClick={() => handleEditListing(selectedListing.id)}
                  className="gap-2"
                >
                  <Edit className="h-4 w-4" />
                  Edit Listing
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No listing selected</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ManageListings;
