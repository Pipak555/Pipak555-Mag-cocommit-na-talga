import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getListings, updateListing, getUserProfile, getListing } from "@/lib/firestore";
import { notifyListingApproved } from "@/lib/notifications";
import { ListingCard } from "@/components/listings/ListingCard";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Mail, User, MapPin, DollarSign, Users, Home, Bed, Bath, X, ChevronLeft, ChevronRight, ZoomIn } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { Listing } from "@/types";
import LoadingScreen from "@/components/ui/loading-screen";
import { formatPHP } from "@/lib/currency";

const ReviewListings = () => {
  const navigate = useNavigate();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [listingToReview, setListingToReview] = useState<string | null>(null);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [hostInfo, setHostInfo] = useState<{ fullName?: string; email?: string } | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [loadingHostInfo, setLoadingHostInfo] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImageIndex, setLightboxImageIndex] = useState(0);

  useEffect(() => {
    loadPendingListings();
  }, []);

  const loadPendingListings = async () => {
    try {
      setLoading(true);
      console.log('ReviewListings: Loading pending listings...');
      const data = await getListings({ status: 'pending' });
      console.log(`ReviewListings: Found ${data.length} pending listings:`, data);
      setListings(data);
    } catch (error: any) {
      console.error('ReviewListings: Error loading pending listings:', error);
      toast.error(`Failed to load pending listings: ${error.message || 'Unknown error'}`);
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

  const handleViewListing = async (listing: Listing) => {
    setSelectedListing(listing);
    setDetailDialogOpen(true);
    setCurrentImageIndex(0);
    setLoadingHostInfo(true);
    
    // Fetch host information
    if (listing.hostId) {
      try {
        const hostProfile = await getUserProfile(listing.hostId);
        if (hostProfile) {
          setHostInfo({
            fullName: hostProfile.fullName || 'N/A',
            email: hostProfile.email || 'N/A'
          });
        } else {
          setHostInfo({ fullName: 'N/A', email: 'N/A' });
        }
      } catch (error: any) {
        console.error('Error fetching host info:', error);
        setHostInfo({ fullName: 'Error loading', email: 'Error loading' });
      } finally {
        setLoadingHostInfo(false);
      }
    } else {
      setHostInfo({ fullName: 'N/A', email: 'N/A' });
      setLoadingHostInfo(false);
    }
  };

  const confirmApprove = async () => {
    if (!listingToReview) return;
    try {
      // Get listing details before updating
      const listing = await getListing(listingToReview);
      if (!listing) {
        toast.error('Listing not found');
        return;
      }

      // Update listing status
      await updateListing(listingToReview, { status: 'approved' });
      
      // Award host points for listing approval
      if (listing.hostId) {
        try {
          const { awardHostPointsForListingApproval } = await import('@/lib/hostPointsService');
          await awardHostPointsForListingApproval(listing.hostId, listingToReview);
        } catch (pointsError) {
          console.error('Error awarding host points for listing approval:', pointsError);
          // Don't fail the approval if points award fails
        }
      }
      
      // Send notification to host
      if (listing.hostId) {
        try {
          await notifyListingApproved(listing.hostId, listingToReview, listing.title);
        } catch (notificationError) {
          console.error('Error sending listing approval notification:', notificationError);
          // Don't fail the approval if notification fails
        }
      }
      
      toast.success("Listing approved");
      loadPendingListings();
      setListingToReview(null);
    } catch (error: any) {
      console.error('Error approving listing:', error);
      toast.error(`Failed to approve listing: ${error.message || 'Unknown error'}`);
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
    } catch (error: any) {
      console.error('Error rejecting listing:', error);
      toast.error(`Failed to reject listing: ${error.message || 'Unknown error'}`);
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
          <LoadingScreen />
        ) : listings.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No pending listings</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {listings.map((listing) => (
              <div key={listing.id} className="cursor-pointer" onClick={() => handleViewListing(listing)}>
                <ListingCard listing={listing} />
                <div className="mt-2 flex gap-2" onClick={(e) => e.stopPropagation()}>
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

      {/* Listing Details Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">{selectedListing?.title}</DialogTitle>
            <DialogDescription>
              Review full listing details and host information
            </DialogDescription>
          </DialogHeader>

          {selectedListing && (
            <div className="space-y-6">
              {/* Images */}
              {selectedListing.images && selectedListing.images.length > 0 && (
                <div className="space-y-3">
                  {/* Main Image Carousel/Slider */}
                  <div className="relative w-full h-[400px] rounded-lg overflow-hidden group bg-muted cursor-pointer" onClick={() => {
                    setLightboxImageIndex(currentImageIndex);
                    setLightboxOpen(true);
                  }}>
                    {/* Slider Container */}
                    <div 
                      className="flex transition-transform duration-500 ease-in-out h-full"
                      style={{ transform: `translateX(-${currentImageIndex * 100}%)` }}
                    >
                      {selectedListing.images.map((img, index) => (
                        <div 
                          key={index}
                          className="min-w-full h-full flex-shrink-0 relative"
                        >
                          <img 
                            src={img || '/placeholder.svg'} 
                            alt={`${selectedListing.title} - Image ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                    
                    {selectedListing.images.length > 1 && (
                      <>
                        {/* Previous Button */}
                        <Button
                          variant="secondary"
                          size="icon"
                          className="absolute left-4 top-1/2 -translate-y-1/2 opacity-80 hover:opacity-100 transition-opacity bg-black/70 hover:bg-black/90 text-white border-none z-10 shadow-lg backdrop-blur-sm h-10 w-10"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCurrentImageIndex((prev) => 
                              prev === 0 ? selectedListing.images.length - 1 : prev - 1
                            );
                          }}
                          aria-label="Previous image"
                        >
                          <ChevronLeft className="h-5 w-5" />
                        </Button>
                        {/* Next Button */}
                        <Button
                          variant="secondary"
                          size="icon"
                          className="absolute right-4 top-1/2 -translate-y-1/2 opacity-80 hover:opacity-100 transition-opacity bg-black/70 hover:bg-black/90 text-white border-none z-10 shadow-lg backdrop-blur-sm h-10 w-10"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCurrentImageIndex((prev) => 
                              prev === selectedListing.images.length - 1 ? 0 : prev + 1
                            );
                          }}
                          aria-label="Next image"
                        >
                          <ChevronRight className="h-5 w-5" />
                        </Button>
                        {/* Click to zoom hint */}
                        <div className="absolute top-4 right-4 bg-black/70 text-white px-3 py-1.5 rounded-full text-xs font-medium backdrop-blur-sm z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                          <ZoomIn className="h-3 w-3 inline mr-1" />
                          Click to zoom
                        </div>
                        {/* Image Counter */}
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 text-white px-4 py-1.5 rounded-full text-sm font-medium backdrop-blur-sm z-10">
                          {currentImageIndex + 1} / {selectedListing.images.length}
                        </div>
                      </>
                    )}
                  </div>
                  
                  {/* Horizontal Thumbnail Slider */}
                  {selectedListing.images.length > 1 && (
                    <div className="relative">
                      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 snap-x snap-mandatory">
                        {selectedListing.images.map((img, i) => (
                          <button
                            key={i}
                            onClick={() => setCurrentImageIndex(i)}
                            className={`relative flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all snap-start ${
                              currentImageIndex === i 
                                ? 'border-primary ring-2 ring-primary/50 scale-105' 
                                : 'border-transparent hover:border-border opacity-70 hover:opacity-100'
                            }`}
                          >
                            <img 
                              src={img} 
                              alt={`Thumbnail ${i + 1}`}
                              className="w-full h-full object-cover"
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Host Information */}
              <div className="bg-muted/50 p-4 rounded-lg">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Host Information
                </h3>
                {loadingHostInfo ? (
                  <p className="text-muted-foreground">Loading host information...</p>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Name:</span>
                      <span>{hostInfo?.fullName || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Email:</span>
                      <a 
                        href={`mailto:${hostInfo?.email || ''}`}
                        className="text-primary hover:underline"
                      >
                        {hostInfo?.email || 'N/A'}
                      </a>
                    </div>
                  </div>
                )}
              </div>

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
                  variant="destructive"
                  onClick={() => {
                    setDetailDialogOpen(false);
                    handleReject(selectedListing.id);
                  }}
                >
                  Reject
                </Button>
                <Button
                  onClick={() => {
                    setDetailDialogOpen(false);
                    handleApprove(selectedListing.id);
                  }}
                >
                  Approve
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Lightbox/Modal for Full-Size Image Viewing */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-w-[98vw] max-h-[98vh] w-auto h-auto p-0 bg-black/95 border-none m-1">
          <DialogTitle className="sr-only">View Full Size Image</DialogTitle>
          <DialogDescription className="sr-only">
            Viewing image {lightboxImageIndex + 1} of {selectedListing?.images?.length || 0} for {selectedListing?.title}
          </DialogDescription>
          <div className="relative w-full h-full flex items-center justify-center min-h-[400px]">
            {selectedListing?.images && selectedListing.images.length > 0 && (
              <>
                {/* Close Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 z-50 bg-black/70 hover:bg-black/90 text-white border-none h-8 w-8 sm:h-10 sm:w-10"
                  onClick={() => setLightboxOpen(false)}
                >
                  <X className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>

                {/* Image Counter */}
                <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-black/70 text-white px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium backdrop-blur-sm z-50">
                  {lightboxImageIndex + 1} / {selectedListing.images.length}
                </div>

                {/* Main Image */}
                <div className="w-full h-full flex items-center justify-center p-2 sm:p-4 pt-12 pb-20 sm:pb-24">
                  <img 
                    src={selectedListing.images[lightboxImageIndex] || '/placeholder.svg'} 
                    alt={`${selectedListing.title} - Image ${lightboxImageIndex + 1}`}
                    className="max-w-full max-h-[calc(98vh-160px)] object-contain"
                  />
                </div>

                {/* Navigation Buttons */}
                {selectedListing.images.length > 1 && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-50 bg-black/70 hover:bg-black/90 text-white border-none h-8 w-8 sm:h-12 sm:w-12"
                      onClick={() => setLightboxImageIndex((prev) => 
                        prev === 0 ? selectedListing.images.length - 1 : prev - 1
                      )}
                    >
                      <ChevronLeft className="h-4 w-4 sm:h-6 sm:w-6" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-50 bg-black/70 hover:bg-black/90 text-white border-none h-8 w-8 sm:h-12 sm:w-12"
                      onClick={() => setLightboxImageIndex((prev) => 
                        prev === selectedListing.images.length - 1 ? 0 : prev + 1
                      )}
                    >
                      <ChevronRight className="h-4 w-4 sm:h-6 sm:w-6" />
                    </Button>
                  </>
                )}

                {/* Thumbnail Strip at Bottom for Navigation */}
                {selectedListing.images.length > 1 && (
                  <div className="absolute bottom-2 sm:bottom-4 left-1/2 -translate-x-1/2 bg-black/70 backdrop-blur-sm rounded-lg p-2 sm:p-3 z-50 max-w-[calc(98vw-32px)]">
                    <div className="flex gap-2 sm:gap-3 overflow-x-auto scrollbar-hide px-1">
                      {selectedListing.images.map((img, i) => (
                        <button
                          key={i}
                          onClick={() => setLightboxImageIndex(i)}
                          className={`relative flex-shrink-0 w-12 h-12 sm:w-16 sm:h-16 rounded transition-all ${
                            lightboxImageIndex === i 
                              ? 'scale-110 shadow-lg shadow-primary/50' 
                              : 'opacity-70 hover:opacity-100'
                          }`}
                        >
                          <div className={`absolute inset-0 rounded overflow-hidden border-2 ${
                            lightboxImageIndex === i 
                              ? 'border-primary ring-2 ring-primary/50 ring-offset-2 ring-offset-black/70' 
                              : 'border-transparent hover:border-white/50'
                          }`}>
                            <img 
                              src={img} 
                              alt={`Thumbnail ${i + 1}`}
                              className={`w-full h-full object-cover transition-opacity ${
                                lightboxImageIndex === i ? 'opacity-100' : 'opacity-70'
                              }`}
                            />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ReviewListings;
