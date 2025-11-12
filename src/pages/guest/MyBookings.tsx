import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { getBookings, updateBooking, getListing, getUserProfile, getBookingReview, toggleWishlist, updateWishlistRecommendations } from "@/lib/firestore";
import { processBookingRefund } from "@/lib/paymentService";
import { collection, query, where, onSnapshot, doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar as CalendarIcon, X, MessageSquare, Home, MapPin, DollarSign, Users, Bed, Bath, ChevronLeft, ChevronRight, ZoomIn, Star, Bookmark, Sparkles } from "lucide-react";
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { PayPalButton } from "@/components/payments/PayPalButton";
import type { Booking, Review } from "@/types";
import { formatPHP } from "@/lib/currency";
import { BookingListSkeleton } from "@/components/ui/booking-skeleton";
import { toast } from "sonner";
import { BackButton } from "@/components/shared/BackButton";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import type { Listing } from "@/types";
import { ReviewForm } from "@/components/reviews/ReviewForm";

const MyBookings = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [bookingToCancel, setBookingToCancel] = useState<Booking | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [listingDialogOpen, setListingDialogOpen] = useState(false);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [loadingListing, setLoadingListing] = useState(false);
  const [hostInfo, setHostInfo] = useState<{ fullName?: string; email?: string } | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImageIndex, setLightboxImageIndex] = useState(0);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [bookingToReview, setBookingToReview] = useState<Booking | null>(null);
  const [bookingReviews, setBookingReviews] = useState<Record<string, Review | null>>({});
  const [loadingReviews, setLoadingReviews] = useState<Record<string, boolean>>({});
  const [wishlist, setWishlist] = useState<string[] | any[]>([]);
  const [wishlistDialogOpen, setWishlistDialogOpen] = useState(false);
  const [bookingForWishlist, setBookingForWishlist] = useState<Booking | null>(null);
  const [recommendations, setRecommendations] = useState("");
  const [propertyRequirements, setPropertyRequirements] = useState({
    beds: '',
    bedrooms: '',
    bathrooms: '',
    guests: ''
  });
  const [desiredAmenities, setDesiredAmenities] = useState<string[]>([]);
  const filter = searchParams.get('filter'); // 'upcoming', 'past', or null

  const availableAmenities = ['WiFi', 'Kitchen', 'Air Conditioning', 'Parking', 'Pool', 'Gym', 'TV', 'Washer', 'Dryer', 'Heating', 'Pet Friendly', 'Balcony'];

  useEffect(() => {
    if (!user) return;

    // Load wallet balance and wishlist
    const loadUserData = async () => {
      if (!user) return;
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setWalletBalance(userData.walletBalance || 0);
        setWishlist(userData.wishlist || []);
      }
    };
    loadUserData();

    setLoading(true);
    
    // Only log in development
    if (import.meta.env.DEV) {
      console.log('🔍 MyBookings: Setting up listener for guest:', user.uid);
    }
    
    // Use real-time listener for guest bookings
    const bookingsQuery = query(
      collection(db, 'bookings'),
      where('guestId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(
      bookingsQuery,
      (snapshot) => {
        const bookingsData = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data
          } as Booking;
        });
        
        // Sort manually by createdAt (descending)
        bookingsData.sort((a, b) => {
          const dateA = new Date(a.createdAt || 0).getTime();
          const dateB = new Date(b.createdAt || 0).getTime();
          return dateB - dateA; // Descending
        });
        
        // Only log in development
        if (import.meta.env.DEV) {
          console.log('📊 Real-time guest bookings update:', {
            guestUid: user.uid,
            count: bookingsData.length,
            filter,
            allBookings: snapshot.docs.map(doc => ({
              id: doc.id,
              hostId: doc.data().hostId,
              guestId: doc.data().guestId,
              status: doc.data().status,
              listingId: doc.data().listingId,
              createdAt: doc.data().createdAt
            }))
          });
        }
        
        // Apply filter if specified
        let filteredBookings = bookingsData;
        if (filter === 'upcoming') {
          const now = new Date();
          filteredBookings = bookingsData.filter(b => {
            const checkIn = new Date(b.checkIn);
            return checkIn >= now && b.status === 'confirmed';
          });
        } else if (filter === 'past') {
          const now = new Date();
          filteredBookings = bookingsData.filter(b => {
            const checkOut = new Date(b.checkOut);
            // Past bookings: check-out date has passed, or status is completed/cancelled
            return checkOut < now || b.status === 'completed' || b.status === 'cancelled';
          });
        }
        
        setBookings(filteredBookings);
        setLoading(false);
      },
      (error: any) => {
        console.error('❌ Error in guest bookings listener:', error);
        setLoading(false);
        // Fallback to getBookings
        loadBookingsFallback();
      }
    );

    return () => unsubscribe();
  }, [user, filter]);

  // Load reviews for past bookings
  useEffect(() => {
    if (!user || bookings.length === 0) return;

    const loadReviews = async () => {
      // Only load reviews for past bookings (check-out date has passed or status is completed/cancelled)
      const pastBookings = bookings.filter(b => {
        const checkOut = new Date(b.checkOut);
        const now = new Date();
        return checkOut < now || b.status === 'completed' || b.status === 'cancelled';
      });

      for (const booking of pastBookings) {
        if (booking.id && bookingReviews[booking.id] === undefined && !loadingReviews[booking.id]) {
          setLoadingReviews(prev => ({ ...prev, [booking.id]: true }));
          try {
            const review = await getBookingReview(booking.id, user.uid);
            setBookingReviews(prev => ({ ...prev, [booking.id]: review }));
          } catch (error) {
            console.error(`Error loading review for booking ${booking.id}:`, error);
            setBookingReviews(prev => ({ ...prev, [booking.id]: null }));
          } finally {
            setLoadingReviews(prev => ({ ...prev, [booking.id]: false }));
          }
        }
      }
    };

    loadReviews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookings, user]);

  const loadBookingsFallback = async () => {
    if (!user) return;
    try {
      const data = await getBookings({ guestId: user.uid });
      setBookings(data);
      console.log('📊 Bookings loaded (fallback):', data.length, 'bookings');
    } catch (error: any) {
      console.error('❌ Error in fallback load:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'default';
      case 'pending': return 'secondary';
      case 'cancelled': return 'destructive';
      case 'completed': return 'outline';
      default: return 'secondary';
    }
  };

  const handleCancelBooking = (booking: Booking) => {
    // Validate booking can be cancelled
    if (!booking || !booking.id) {
      toast.error('Invalid booking');
      return;
    }

    // Don't allow cancellation of already cancelled or completed bookings
    if (booking.status === 'cancelled') {
      toast.error('This booking is already cancelled');
      return;
    }

    if (booking.status === 'completed') {
      toast.error('Cannot cancel completed bookings');
      return;
    }

    // Only allow cancellation of pending or confirmed bookings
    if (booking.status !== 'pending' && booking.status !== 'confirmed') {
      toast.error('This booking cannot be cancelled');
      return;
    }
    
    // Check if check-in date has passed
    const checkIn = new Date(booking.checkIn);
    const now = new Date();
    if (checkIn < now) {
      toast.error('Cannot cancel bookings with check-in dates in the past');
      return;
    }
    
    setBookingToCancel(booking);
    setCancelDialogOpen(true);
  };

  const handleViewListing = async (booking: Booking) => {
    if (!booking.listingId) {
      toast.error('Listing information not available');
      return;
    }

    setLoadingListing(true);
    setListingDialogOpen(true);
    setCurrentImageIndex(0);
    
    try {
      // Fetch listing details
      const listing = await getListing(booking.listingId);
      if (listing) {
        setSelectedListing(listing);
        
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
          } catch (error) {
            console.error('Error fetching host info:', error);
            setHostInfo({ fullName: 'N/A', email: 'N/A' });
          }
        } else {
          setHostInfo({ fullName: 'N/A', email: 'N/A' });
        }
      } else {
        toast.error('Listing not found');
        setListingDialogOpen(false);
      }
    } catch (error: any) {
      console.error('Error loading listing:', error);
      toast.error(`Failed to load listing: ${error.message || 'Unknown error'}`);
      setListingDialogOpen(false);
    } finally {
      setLoadingListing(false);
    }
  };

  const handleMessageHost = (booking: Booking) => {
    if (booking.hostId) {
      navigate(`/guest/messages?userId=${booking.hostId}`);
    } else {
      toast.error('Host information not available');
    }
  };

  const handleLeaveReview = (booking: Booking) => {
    setBookingToReview(booking);
    setReviewDialogOpen(true);
  };

  const handleAddToWishlist = (booking: Booking) => {
    if (!user || !booking.listingId) {
      toast.error("Unable to add to wishlist");
      return;
    }
    
    // Check if already in wishlist
    const isInWishlist = wishlist.some(item => 
      (typeof item === 'string' ? item === booking.listingId : item.listingId === booking.listingId)
    );
    
    if (isInWishlist) {
      // Remove from wishlist
      handleRemoveFromWishlist(booking.listingId!);
    } else {
      // Open dialog to add recommendations
      setBookingForWishlist(booking);
      setRecommendations("");
      setWishlistDialogOpen(true);
    }
  };

  const handleRemoveFromWishlist = async (listingId: string) => {
    if (!user) return;
    
    try {
      const newWishlist = await toggleWishlist(user.uid, listingId, wishlist);
      setWishlist(newWishlist);
      toast.success("Removed from wishlist");
    } catch (error) {
      toast.error("Failed to remove from wishlist");
    }
  };

  const handleSaveWishlistWithRecommendations = async () => {
    if (!user || !bookingForWishlist?.listingId) {
      toast.error("Unable to add to wishlist");
      return;
    }
    
    try {
      // Prepare property requirements object (only include fields with values)
      const requirements: any = {};
      if (propertyRequirements.beds) requirements.beds = parseInt(propertyRequirements.beds) || 0;
      if (propertyRequirements.bedrooms) requirements.bedrooms = parseInt(propertyRequirements.bedrooms) || 0;
      if (propertyRequirements.bathrooms) requirements.bathrooms = parseInt(propertyRequirements.bathrooms) || 0;
      if (propertyRequirements.guests) requirements.guests = parseInt(propertyRequirements.guests) || 0;

      const hasRequirements = Object.keys(requirements).length > 0;
      const hasAmenities = desiredAmenities.length > 0;
      const hasRecommendations = recommendations.trim().length > 0;

      const newWishlist = await toggleWishlist(
        user.uid, 
        bookingForWishlist.listingId, 
        wishlist,
        hasRecommendations ? recommendations.trim() : undefined,
        bookingForWishlist.id,
        hasRequirements ? requirements : undefined,
        hasAmenities ? desiredAmenities : undefined
      );
      setWishlist(newWishlist);
      setWishlistDialogOpen(false);
      setBookingForWishlist(null);
      setRecommendations("");
      setPropertyRequirements({ beds: '', bedrooms: '', bathrooms: '', guests: '' });
      setDesiredAmenities([]);
      toast.success("Added to wishlist with your requirements!");
    } catch (error) {
      toast.error("Failed to add to wishlist");
    }
  };

  const toggleAmenity = (amenity: string) => {
    setDesiredAmenities(prev => 
      prev.includes(amenity) 
        ? prev.filter(a => a !== amenity)
        : [...prev, amenity]
    );
  };

  const isInWishlist = (listingId: string) => {
    return wishlist.some(item => 
      (typeof item === 'string' ? item === listingId : item.listingId === listingId)
    );
  };

  const getWishlistItem = (listingId: string) => {
    return wishlist.find(item => 
      (typeof item === 'string' ? item === listingId : item.listingId === listingId)
    );
  };

  const handleReviewSuccess = () => {
    if (bookingToReview && user) {
      // Reload the review for this booking
      getBookingReview(bookingToReview.id, user.uid).then(review => {
        setBookingReviews(prev => ({ ...prev, [bookingToReview.id]: review }));
      });
    }
    setReviewDialogOpen(false);
    setBookingToReview(null);
  };

  const confirmCancel = async () => {
    if (!bookingToCancel || !user) {
      toast.error('Invalid booking or user');
      return;
    }

    // Double-check validation before proceeding
    if (bookingToCancel.status === 'cancelled' || bookingToCancel.status === 'completed') {
      toast.error('This booking cannot be cancelled');
      setCancelDialogOpen(false);
      setBookingToCancel(null);
      return;
    }

    const checkIn = new Date(bookingToCancel.checkIn);
    const now = new Date();
    if (checkIn < now) {
      toast.error('Cannot cancel bookings with check-in dates in the past');
      setCancelDialogOpen(false);
      setBookingToCancel(null);
      return;
    }
    
    setCancelling(true);
    try {
      // Update booking status to cancelled
      await updateBooking(bookingToCancel.id, { status: 'cancelled' });
      
      // Process refund using payment service (if booking was confirmed)
      if (bookingToCancel.status === 'confirmed' || bookingToCancel.status === 'pending') {
        try {
          // Use payment service to process refund
          const refundResult = await processBookingRefund(bookingToCancel, 'guest');
          
          if (refundResult.success) {
            console.log('✅ Refund processed successfully:', refundResult);
            const refundMessage = refundResult.refundAmount && refundResult.refundAmount > 0
              ? `${formatPHP(refundResult.refundAmount)} has been refunded to your wallet.`
              : 'No refund was processed for this booking.';
            toast.success(`Booking cancelled successfully. ${refundMessage}`);
          } else {
            throw new Error('Refund processing failed');
          }
        } catch (refundError: any) {
          console.error('Error processing refund:', refundError);
          // Don't fail the cancellation if refund fails, but log it
          toast.error(`Booking cancelled, but refund failed. Please contact support. Error: ${refundError.message}`);
        }
      } else {
        toast.success('Booking cancelled successfully.');
      }
      setCancelDialogOpen(false);
      setBookingToCancel(null);
    } catch (error: any) {
      console.error('Error cancelling booking:', error);
      const errorMessage = error.message || 'Unknown error occurred';
      toast.error(`Failed to cancel booking: ${errorMessage}`);
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60 shadow-soft">
        <div className="container mx-auto px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <Button variant="ghost" size="icon" onClick={() => navigate('/guest/dashboard')} className="h-9 w-9 sm:h-10 sm:w-10 touch-manipulation">
              <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
            <div className="hidden sm:block p-2 rounded-lg bg-secondary/10">
              <CalendarIcon className="w-5 h-5 text-secondary" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-base sm:text-lg font-bold truncate">
                {filter === 'upcoming' ? 'Upcoming Trips' : filter === 'past' ? 'Past Bookings' : 'My Bookings'}
              </h1>
              <p className="text-xs text-muted-foreground">
                {filter === 'upcoming' 
                  ? 'Your confirmed upcoming trips' 
                  : filter === 'past' 
                  ? 'Your completed and past trips'
                  : 'View your trips'}
              </p>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>
      
      <div className="max-w-4xl mx-auto p-4 sm:p-6">

        {loading ? (
          <BookingListSkeleton count={5} />
        ) : bookings.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <CalendarIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>
                {filter === 'upcoming' 
                  ? 'No upcoming trips' 
                  : filter === 'past' 
                  ? 'No past bookings yet'
                  : 'No bookings yet'}
              </p>
              {filter === 'past' && (
                <p className="text-xs mt-2">Your past bookings will appear here once trips are completed.</p>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => {
              // Check if booking can be cancelled (pending or confirmed, and check-in hasn't passed)
              const canCancel = (booking.status === 'pending' || booking.status === 'confirmed') && 
                                new Date(booking.checkIn) >= new Date();
              
              // Check if this is a past booking
              const checkOut = new Date(booking.checkOut);
              const now = new Date();
              const isPastBooking = filter === 'past' || checkOut < now || booking.status === 'completed' || booking.status === 'cancelled';
              
              // Check if booking has been reviewed
              const hasReview = bookingReviews[booking.id] !== undefined;
              const review = bookingReviews[booking.id];
              
              return (
                <Card key={booking.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Booking #{booking.id.slice(0, 8)}</CardTitle>
                      <Badge variant={getStatusColor(booking.status)}>
                        {booking.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Message Host Button */}
                      {booking.hostId && (
                        <div className="flex flex-col sm:flex-row gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleMessageHost(booking)}
                            className="flex items-center justify-center gap-2 flex-1 h-11 sm:h-auto touch-manipulation"
                          >
                            <MessageSquare className="h-4 w-4" />
                            <span className="text-sm sm:text-base">Message Host</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewListing(booking)}
                            className="flex items-center justify-center gap-2 flex-1 h-11 sm:h-auto touch-manipulation"
                          >
                            <Home className="h-4 w-4" />
                            <span className="text-sm sm:text-base">View Listing</span>
                          </Button>
                        </div>
                      )}
                      
                      {/* Booking Details */}
                      <div className="grid grid-cols-2 gap-3 sm:gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Check-in</p>
                          <p className="font-medium">{new Date(booking.checkIn).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Check-out</p>
                          <p className="font-medium">{new Date(booking.checkOut).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Guests</p>
                          <p className="font-medium">{booking.guests}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Total</p>
                          <p className="font-medium">{formatPHP(booking.totalPrice || 0)}</p>
                        </div>
                      </div>
                    </div>
                    
                    {/* PayPal Payment Option for Pending Bookings with Insufficient Balance */}
                    {booking.status === 'pending' && user && walletBalance < (booking.totalPrice || 0) && (
                      <div className="pt-4 border-t space-y-2">
                        <div className="p-3 bg-muted rounded-md">
                          <p className="text-sm font-medium mb-1">Payment Required</p>
                          <p className="text-xs text-muted-foreground mb-3">
                            Your wallet balance ({formatPHP(walletBalance)}) is insufficient. 
                            Please pay via PayPal to complete your booking.
                          </p>
                          <PayPalButton
                            amount={booking.totalPrice || 0}
                            userId={user.uid}
                            description={`Booking payment for booking #${booking.id.slice(0, 8)}`}
                            bookingId={booking.id}
                            onSuccess={() => {
                              toast.success("Payment successful! Your booking will be confirmed once the host approves.");
                              // Reload wallet balance
                              const userDoc = getDoc(doc(db, 'users', user.uid));
                              userDoc.then(doc => {
                                if (doc.exists()) {
                                  setWalletBalance(doc.data().walletBalance || 0);
                                }
                              });
                            }}
                            redirectUrl={window.location.origin + '/guest/bookings'}
                          />
                        </div>
                      </div>
                    )}
                    
                    {/* Actions for Past Bookings */}
                    {isPastBooking && booking.status !== 'cancelled' && (
                      <div className="pt-4 border-t space-y-2">
                        {/* Add to Wishlist Button */}
                        {booking.listingId && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAddToWishlist(booking)}
                            className="w-full"
                          >
                            <Bookmark className={`h-4 w-4 mr-2 ${isInWishlist(booking.listingId) ? 'fill-blue-500 text-blue-500' : ''}`} />
                            {isInWishlist(booking.listingId) ? 'Remove from Wishlist' : 'Add to Wishlist with Recommendations'}
                          </Button>
                        )}
                        {isInWishlist(booking.listingId) && (() => {
                          const wishlistItem = getWishlistItem(booking.listingId);
                          if (typeof wishlistItem !== 'object') return null;
                          
                          const recommendations = wishlistItem?.recommendations;
                          const requirements = wishlistItem?.propertyRequirements;
                          const amenities = wishlistItem?.desiredAmenities;
                          
                          const hasData = recommendations || (requirements && Object.keys(requirements).length > 0) || (amenities && amenities.length > 0);
                          
                          return hasData ? (
                            <div className="p-3 bg-muted rounded-md space-y-2">
                              {requirements && Object.keys(requirements).length > 0 && (
                                <div>
                                  <p className="text-xs font-semibold text-muted-foreground mb-1">Requirements:</p>
                                  <div className="text-xs space-y-1">
                                    {requirements.beds && <p>• Beds: {requirements.beds}</p>}
                                    {requirements.bedrooms && <p>• Bedrooms: {requirements.bedrooms}</p>}
                                    {requirements.bathrooms && <p>• Bathrooms: {requirements.bathrooms}</p>}
                                    {requirements.guests && <p>• Guests: {requirements.guests}</p>}
                                  </div>
                                </div>
                              )}
                              {amenities && amenities.length > 0 && (
                                <div>
                                  <p className="text-xs font-semibold text-muted-foreground mb-1">Desired Amenities:</p>
                                  <p className="text-xs">{amenities.join(', ')}</p>
                                </div>
                              )}
                              {recommendations && (
                                <div>
                                  <p className="text-xs font-semibold text-muted-foreground mb-1">Recommendations:</p>
                                  <p className="text-sm">{recommendations}</p>
                                </div>
                              )}
                            </div>
                          ) : null;
                        })()}
                        
                        {/* Review Button */}
                        {loadingReviews[booking.id] ? (
                          <Button variant="outline" size="sm" disabled className="w-full">
                            Checking review status...
                          </Button>
                        ) : hasReview && review ? (
                          <div className="p-3 bg-muted rounded-md">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">Your Review:</span>
                                <div className="flex items-center gap-1">
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <Star
                                      key={star}
                                      className={`h-4 w-4 ${
                                        star <= review.rating
                                          ? 'fill-yellow-400 text-yellow-400'
                                          : 'text-muted'
                                      }`}
                                    />
                                  ))}
                                </div>
                              </div>
                              <Badge variant="outline">Reviewed</Badge>
                            </div>
                            {review.comment && (
                              <p className="text-sm text-muted-foreground mt-2">{review.comment}</p>
                            )}
                          </div>
                        ) : (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleLeaveReview(booking)}
                            className="w-full"
                          >
                            <Star className="h-4 w-4 mr-2" />
                            Leave a Review
                          </Button>
                        )}
                      </div>
                    )}
                    
                    {/* Cancel Button for Pending or Confirmed Upcoming Bookings */}
                    {canCancel && (
                      <div className="pt-4 border-t">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleCancelBooking(booking)}
                          className="w-full"
                        >
                          <X className="h-4 w-4 mr-2" />
                          Cancel Booking
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Cancel Booking Dialog */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Booking</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this booking?
              {bookingToCancel && (
                <div className="mt-3 space-y-2">
                  <div className="p-3 bg-muted rounded-md">
                    <p className="text-sm font-medium">Booking Details:</p>
                    <p className="text-sm text-muted-foreground">
                      Status: <span className="font-medium capitalize">{bookingToCancel.status}</span>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Check-in: {new Date(bookingToCancel.checkIn).toLocaleDateString()}
                    </p>
                  </div>
                  {bookingToCancel.totalPrice > 0 && (
                    <div className="p-3 bg-primary/10 rounded-md border border-primary/20">
                      <p className="text-sm font-medium text-primary">Refund Information:</p>
                      <p className="text-sm text-muted-foreground">
                        A refund of {formatPHP(bookingToCancel.totalPrice)} will be credited to your wallet balance.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelling}>Keep Booking</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmCancel}
              disabled={cancelling}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {cancelling ? 'Cancelling...' : 'Cancel Booking'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Listing Details Dialog */}
      <Dialog open={listingDialogOpen} onOpenChange={setListingDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">{selectedListing?.title || 'Listing Details'}</DialogTitle>
            <DialogDescription>
              View full listing information and host details
            </DialogDescription>
          </DialogHeader>

          {loadingListing ? (
            <div className="py-8 text-center text-muted-foreground">Loading listing details...</div>
          ) : selectedListing ? (
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
              {hostInfo && (
                <div className="bg-muted/50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Host Information
                  </h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Name:</span>
                      <span>{hostInfo.fullName || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Email:</span>
                      <a 
                        href={`mailto:${hostInfo.email || ''}`}
                        className="text-primary hover:underline"
                      >
                        {hostInfo.email || 'N/A'}
                      </a>
                    </div>
                    {selectedListing.hostId && (
                      <div className="pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setListingDialogOpen(false);
                            navigate(`/guest/messages?userId=${selectedListing.hostId}`);
                          }}
                          className="flex items-center gap-2"
                        >
                          <MessageSquare className="h-4 w-4" />
                          Message Host
                        </Button>
                      </div>
                    )}
                  </div>
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
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">Listing not found</div>
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

      {/* Wishlist Recommendations Dialog */}
      <Dialog open={wishlistDialogOpen} onOpenChange={setWishlistDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Property Requirements</DialogTitle>
            <DialogDescription>
              Desired Amenities/Features
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Property Requirements Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Property Requirements</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="beds" className="flex items-center gap-2">
                    <Bed className="h-4 w-4" />
                    Number of Beds
                  </Label>
                  <Input
                    id="beds"
                    type="number"
                    placeholder="e.g., 4"
                    value={propertyRequirements.beds}
                    onChange={(e) => setPropertyRequirements(prev => ({ ...prev, beds: e.target.value }))}
                    min="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bedrooms" className="flex items-center gap-2">
                    <Home className="h-4 w-4" />
                    Number of Bedrooms
                  </Label>
                  <Input
                    id="bedrooms"
                    type="number"
                    placeholder="e.g., 2"
                    value={propertyRequirements.bedrooms}
                    onChange={(e) => setPropertyRequirements(prev => ({ ...prev, bedrooms: e.target.value }))}
                    min="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bathrooms" className="flex items-center gap-2">
                    <Bath className="h-4 w-4" />
                    Number of Bathrooms
                  </Label>
                  <Input
                    id="bathrooms"
                    type="number"
                    placeholder="e.g., 2"
                    value={propertyRequirements.bathrooms}
                    onChange={(e) => setPropertyRequirements(prev => ({ ...prev, bathrooms: e.target.value }))}
                    min="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="guests" className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Number of Guests
                  </Label>
                  <Input
                    id="guests"
                    type="number"
                    placeholder="e.g., 6"
                    value={propertyRequirements.guests}
                    onChange={(e) => setPropertyRequirements(prev => ({ ...prev, guests: e.target.value }))}
                    min="0"
                  />
                </div>
              </div>
            </div>

            {/* Desired Amenities Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                Desired Amenities/Features
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {availableAmenities.map((amenity) => (
                  <Button
                    key={amenity}
                    type="button"
                    variant={desiredAmenities.includes(amenity) ? "default" : "outline"}
                    className={`justify-start ${
                      desiredAmenities.includes(amenity)
                        ? "bg-primary text-primary-foreground"
                        : "bg-yellow-50 dark:bg-yellow-950/20 text-gray-700 dark:text-gray-300 hover:bg-yellow-100 dark:hover:bg-yellow-950/30"
                    }`}
                    onClick={() => toggleAmenity(amenity)}
                  >
                    {amenity}
                  </Button>
                ))}
              </div>
            </div>

            {/* Additional Recommendations (Optional) */}
            <div className="space-y-2">
              <Label htmlFor="recommendations">
                Additional Recommendations (Optional)
              </Label>
              <Textarea
                id="recommendations"
                placeholder="Any other wishes or recommendations..."
                value={recommendations}
                onChange={(e) => setRecommendations(e.target.value)}
                className="min-h-[80px] resize-none"
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground">
                {recommendations.length}/500 characters
              </p>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setWishlistDialogOpen(false);
                  setBookingForWishlist(null);
                  setRecommendations("");
                  setPropertyRequirements({ beds: '', bedrooms: '', bathrooms: '', guests: '' });
                  setDesiredAmenities([]);
                }}
                className="bg-yellow-50 dark:bg-yellow-950/20 text-gray-700 dark:text-gray-300 hover:bg-yellow-100 dark:hover:bg-yellow-950/30"
              >
                Cancel
              </Button>
              <Button onClick={handleSaveWishlistWithRecommendations} className="bg-primary hover:bg-primary/90">
                Add to Wishlist
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Review Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Leave a Review</DialogTitle>
            <DialogDescription>
              Share your experience with this booking
            </DialogDescription>
          </DialogHeader>
          {bookingToReview && bookingToReview.listingId && (
            <ReviewForm
              listingId={bookingToReview.listingId}
              bookingId={bookingToReview.id}
              onSuccess={handleReviewSuccess}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MyBookings;
