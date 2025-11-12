import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { getListing, createBooking, getListingRating, getBookings } from "@/lib/firestore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, MapPin, Users, Heart, Bookmark, User, Ticket, X, ChevronLeft, ChevronRight, Calendar as CalendarIcon, ZoomIn } from "lucide-react";
import { toast } from "sonner";
import { BackButton } from "@/components/shared/BackButton";
import { ReviewList } from "@/components/reviews/ReviewList";
import { SocialShare } from "@/components/shared/SocialShare";
import { ListingCard } from "@/components/listings/ListingCard";
import type { Listing, Coupon } from "@/types";
import { sendBookingConfirmationEmail } from '@/lib/emailjs';
import { getDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { formatPHP } from '@/lib/currency';
import LoadingScreen from "@/components/ui/loading-screen";

const ListingDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [listing, setListing] = useState<Listing | null>(null);
  const [checkIn, setCheckIn] = useState<Date>();
  const [checkOut, setCheckOut] = useState<Date>();
  const [guests, setGuests] = useState(1);
  const [loading, setLoading] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [hostInfo, setHostInfo] = useState<{ fullName?: string; email?: string } | null>(null);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponCode, setCouponCode] = useState("");
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImageIndex, setLightboxImageIndex] = useState(0);
  const [confirmedBookings, setConfirmedBookings] = useState<any[]>([]);
  const [reviewRefreshTrigger, setReviewRefreshTrigger] = useState(0);

  useEffect(() => {
    if (id) {
      loadListing();
      setCurrentImageIndex(0); // Reset image index when listing changes
      // Scroll to top when navigating to a new listing
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    if (user) {
      loadFavorites();
      loadWishlist();
      loadCoupons();
    }
  }, [id, user]);

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (!lightboxOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!listing?.images) return;
      
      if (e.key === 'ArrowLeft') {
        setLightboxImageIndex((prev) => 
          prev === 0 ? listing.images.length - 1 : prev - 1
        );
      } else if (e.key === 'ArrowRight') {
        setLightboxImageIndex((prev) => 
          prev === listing.images.length - 1 ? 0 : prev + 1
        );
      } else if (e.key === 'Escape') {
        setLightboxOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxOpen, listing?.images]);

  const loadListing = async () => {
    if (!id) return;
    const data = await getListing(id);
    
    if (data) {
      // Load rating for the listing
      const rating = await getListingRating(id);
      const listingWithRating = {
        ...data,
        averageRating: rating.averageRating,
        reviewCount: rating.reviewCount
      };
      
      setListing(listingWithRating);
      
      // Trigger review refresh when listing loads
      setReviewRefreshTrigger(prev => prev + 1);
      
      console.log('📋 Listing loaded:', {
        id: data.id,
        title: data.title,
        hostId: data.hostId,
        hasHostId: !!data.hostId,
        averageRating: rating.averageRating,
        reviewCount: rating.reviewCount
      });
      
      if (!data.hostId) {
        console.error('❌ Listing missing hostId!', data);
      } else {
        // Load host information
        await loadHostInfo(data.hostId);
      }
      
      // Load confirmed bookings for this listing
      await loadConfirmedBookings();
    }
  };
  
  const loadHostInfo = async (hostId: string) => {
    try {
      const hostDoc = await getDoc(doc(db, 'users', hostId));
      if (hostDoc.exists()) {
        const hostData = hostDoc.data();
        setHostInfo({
          fullName: hostData.fullName || 'Host',
          email: hostData.email || ''
        });
      } else {
        console.warn('Host user document not found:', hostId);
        setHostInfo({ fullName: 'Host', email: '' });
      }
    } catch (error) {
      console.error('Error loading host info:', error);
      setHostInfo({ fullName: 'Host', email: '' });
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

  const loadCoupons = async () => {
    if (!user) return;
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (userDoc.exists()) {
      const userData = userDoc.data();
      setCoupons(userData.coupons || []);
    }
  };

  const loadConfirmedBookings = async () => {
    if (!id) return;
    try {
      // Fetch all confirmed bookings for this listing
      const allBookings = await getBookings({ status: 'confirmed' });
      const listingBookings = allBookings.filter(booking => booking.listingId === id);
      setConfirmedBookings(listingBookings);
    } catch (error) {
      console.error('Error loading confirmed bookings:', error);
      setConfirmedBookings([]);
    }
  };

  // Check if a date is booked (confirmed by host)
  const isDateBooked = (date: Date): boolean => {
    if (!confirmedBookings.length) return false;
    
    const dateStr = date.toISOString().split('T')[0];
    const dateTime = date.getTime();
    
    return confirmedBookings.some(booking => {
      const checkIn = new Date(booking.checkIn);
      const checkOut = new Date(booking.checkOut);
      checkIn.setHours(0, 0, 0, 0);
      checkOut.setHours(0, 0, 0, 0);
      
      return dateTime >= checkIn.getTime() && dateTime <= checkOut.getTime();
    });
  };

  // Check if a date is in the listing's available dates
  const isDateAvailable = (date: Date): boolean => {
    if (!listing?.availableDates || listing.availableDates.length === 0) {
      // If no available dates specified, all dates are available (except booked ones)
      return true;
    }
    
    const dateStr = date.toISOString().split('T')[0];
    return listing.availableDates.includes(dateStr);
  };

  // Check if a date should be disabled
  const isDateDisabled = (date: Date): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dateOnly = new Date(date);
    dateOnly.setHours(0, 0, 0, 0);
    
    // Disable past dates (dates before today)
    if (dateOnly < today) return true;
    
    // Disable if not in available dates
    if (!isDateAvailable(dateOnly)) return true;
    
    // Disable if booked (but keep showing as "booked" via modifiers)
    if (isDateBooked(dateOnly)) return true;
    
    return false;
  };

  const handleFavorite = async () => {
    if (!user || !listing) {
      toast.error("Please login to add favorites");
      return;
    }
    try {
      const { toggleFavorite } = await import('@/lib/firestore');
      const newFavorites = await toggleFavorite(user.uid, listing.id, favorites);
      setFavorites(newFavorites);
      toast.success(newFavorites.includes(listing.id) ? "Added to favorites" : "Removed from favorites");
    } catch (error) {
      toast.error("Failed to update favorites");
    }
  };

  const handleWishlist = async () => {
    if (!user || !listing) {
      toast.error("Please login to add to wishlist");
      return;
    }
    try {
      const { toggleWishlist } = await import('@/lib/firestore');
      const newWishlist = await toggleWishlist(user.uid, listing.id, wishlist);
      setWishlist(newWishlist);
      toast.success(newWishlist.includes(listing.id) ? "Added to wishlist" : "Removed from wishlist");
    } catch (error) {
      toast.error("Failed to update wishlist");
    }
  };

  const calculateTotal = () => {
    if (!checkIn || !checkOut || !listing) return 0;
    const days = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
    const basePrice = days * listing.price;
    
    // Apply listing discount first (percentage discount)
    let priceAfterListingDiscount = basePrice;
    if (listing.discount && listing.discount > 0) {
      const discountAmount = (basePrice * listing.discount) / 100;
      priceAfterListingDiscount = Math.max(0, basePrice - discountAmount);
    }
    
    // Then apply coupon discount if available
    if (appliedCoupon && priceAfterListingDiscount >= (appliedCoupon.minSpend || 0)) {
      return Math.max(0, priceAfterListingDiscount - appliedCoupon.discount);
    }
    
    return priceAfterListingDiscount;
  };

  const calculateListingDiscountAmount = () => {
    if (!checkIn || !checkOut || !listing || !listing.discount || listing.discount <= 0) return 0;
    const days = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
    const basePrice = days * listing.price;
    return (basePrice * listing.discount) / 100;
  };

  const handleApplyCoupon = () => {
    if (!couponCode.trim()) {
      toast.error("Please enter a coupon code");
      return;
    }

    const coupon = coupons.find(
      c => c.code.toUpperCase() === couponCode.toUpperCase().trim() && 
      !c.used && 
      new Date(c.validUntil) > new Date()
    );

    if (!coupon) {
      toast.error("Invalid, expired, or already used coupon");
      return;
    }

    const basePrice = checkIn && checkOut && listing 
      ? Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)) * listing.price
      : 0;

    if (coupon.minSpend && basePrice < coupon.minSpend) {
      toast.error(`This coupon requires a minimum spend of ${formatPHP(coupon.minSpend)}`);
      return;
    }

    setAppliedCoupon(coupon);
    setCouponCode("");
    toast.success(`Coupon ${coupon.code} applied! ${formatPHP(coupon.discount)} discount`);
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    toast.info("Coupon removed");
  };

  const handleBooking = async () => {
    if (!user || !listing || !checkIn || !checkOut) {
      toast.error("Please select dates and sign in");
      return;
    }

    if (!guests || guests < 1) {
      toast.error("Please enter the number of guests (minimum 1)");
      return;
    }

    if (guests > listing.maxGuests) {
      toast.error(`Maximum ${listing.maxGuests} guest${listing.maxGuests > 1 ? 's' : ''} allowed for this listing`);
      return;
    }

    if (!listing.hostId) {
      toast.error("Listing error: Missing host information. Please contact support.");
      console.error('Listing missing hostId:', listing);
      return;
    }

    setLoading(true);
    try {
      const days = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
      const basePrice = days * listing.price;
      const listingDiscountAmount = listing.discount && listing.discount > 0 
        ? (basePrice * listing.discount) / 100 
        : 0;
      const priceAfterListingDiscount = basePrice - listingDiscountAmount;
      const couponDiscountAmount = appliedCoupon ? appliedCoupon.discount : 0;
      const finalPrice = calculateTotal();
      
      const bookingData: any = {
        listingId: listing.id,
        guestId: user.uid,
        hostId: listing.hostId,
        checkIn: checkIn.toISOString(),
        checkOut: checkOut.toISOString(),
        guests,
        totalPrice: finalPrice,
        originalPrice: basePrice,
        listingDiscount: listing.discount || 0,
        listingDiscountAmount: listingDiscountAmount,
        discountAmount: listingDiscountAmount + couponDiscountAmount,
        status: 'pending' as const, // Booking is pending host approval
      };

      // Only include couponCode if a coupon was applied
      if (appliedCoupon?.code) {
        bookingData.couponCode = appliedCoupon.code;
      }

      console.log('📝 Creating booking with data:', {
        ...bookingData,
        hostIdValue: listing.hostId,
        hostIdType: typeof listing.hostId,
        hostIdLength: listing.hostId?.length
      });

      // Create booking and get the booking ID
      const bookingId = await createBooking(bookingData);

      // Don't mark coupon as used yet - wait for payment to be processed
      // The coupon will be marked as used in the payment service after successful payment
      
      console.log('✅ Booking created successfully:', bookingId);
      console.log('📊 Booking details:', {
        bookingId,
        hostId: listing.hostId,
        guestId: user.uid,
        listingId: listing.id,
        status: 'pending',
        checkIn: bookingData.checkIn,
        checkOut: bookingData.checkOut,
        guests: bookingData.guests,
        totalPrice: bookingData.totalPrice
      });
      
      // Verify booking was created correctly
      try {
        const { getDoc, doc } = await import('firebase/firestore');
        const { db } = await import('@/lib/firebase');
        const createdBooking = await getDoc(doc(db, 'bookings', bookingId));
        if (createdBooking.exists()) {
          const bookingData = createdBooking.data();
          console.log('✅ Verified booking in Firestore:', {
            id: bookingId,
            hostId: bookingData.hostId,
            hostIdType: typeof bookingData.hostId,
            guestId: bookingData.guestId,
            guestIdType: typeof bookingData.guestId,
            status: bookingData.status,
            createdAt: bookingData.createdAt,
            listingId: bookingData.listingId
          });
          
          // Also check the listing's hostId for comparison
          if (listing.id) {
            const listingDoc = await getDoc(doc(db, 'listing', listing.id));
            if (listingDoc.exists()) {
              const listingData = listingDoc.data();
              console.log('📋 Listing hostId comparison:', {
                listingHostId: listingData.hostId,
                listingHostIdType: typeof listingData.hostId,
                bookingHostId: bookingData.hostId,
                bookingHostIdType: typeof bookingData.hostId,
                match: String(listingData.hostId) === String(bookingData.hostId)
              });
            }
          }
        }
      } catch (verifyError) {
        console.error('❌ Error verifying booking:', verifyError);
      }

      // DON'T send confirmation email here - wait for host to confirm
      // The confirmation email will be sent when host approves the booking
      
      toast.success("Booking request sent! The host will review your request.");
      navigate('/guest/dashboard');
    } catch (error) {
      console.error('❌ Error creating booking:', error);
      toast.error("Failed to create booking");
    } finally {
      setLoading(false);
    }
  };


  if (!listing) return <LoadingScreen />;

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        <BackButton to="/guest/browse" label="Back to Browse" className="mb-4" />

        <div className="grid lg:grid-cols-12 gap-4 sm:gap-6 lg:gap-8">
          <div className="lg:col-span-7 space-y-3">
            {/* Main Image Carousel/Slider */}
            <div className="relative w-full h-[300px] sm:h-[400px] md:h-[500px] rounded-lg overflow-hidden group bg-muted cursor-pointer touch-manipulation" onClick={() => {
              setLightboxImageIndex(currentImageIndex);
              setLightboxOpen(true);
            }}>
              {listing.images && listing.images.length > 0 ? (
                <>
                  {/* Slider Container */}
                  <div 
                    className="flex transition-transform duration-500 ease-in-out h-full"
                    style={{ transform: `translateX(-${currentImageIndex * 100}%)` }}
                  >
                    {listing.images.map((img, index) => (
                      <div 
                        key={index}
                        className="min-w-full h-full flex-shrink-0 relative"
                      >
                        <img 
                          src={img || '/placeholder.svg'} 
                          alt={`${listing.title} - Image ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                  
                  {listing.images.length > 1 && (
                    <>
                      {/* Previous Button */}
                      <Button
                        variant="secondary"
                        size="icon"
                        className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 opacity-80 hover:opacity-100 transition-opacity bg-black/70 hover:bg-black/90 text-white border-none z-10 shadow-lg backdrop-blur-sm h-9 w-9 sm:h-10 sm:w-10 touch-manipulation"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCurrentImageIndex((prev) => 
                            prev === 0 ? listing.images.length - 1 : prev - 1
                          );
                        }}
                        aria-label="Previous image"
                      >
                        <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
                      </Button>
                      {/* Next Button */}
                      <Button
                        variant="secondary"
                        size="icon"
                        className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 opacity-80 hover:opacity-100 transition-opacity bg-black/70 hover:bg-black/90 text-white border-none z-10 shadow-lg backdrop-blur-sm h-9 w-9 sm:h-10 sm:w-10 touch-manipulation"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCurrentImageIndex((prev) => 
                            prev === listing.images.length - 1 ? 0 : prev + 1
                          );
                        }}
                        aria-label="Next image"
                      >
                        <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
                      </Button>
                      {/* Click to zoom hint */}
                      <div className="absolute top-4 right-4 bg-black/70 text-white px-3 py-1.5 rounded-full text-xs font-medium backdrop-blur-sm z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                        <ZoomIn className="h-3 w-3 inline mr-1" />
                        Click to zoom
                      </div>
                      {/* Image Counter */}
                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 text-white px-4 py-1.5 rounded-full text-sm font-medium backdrop-blur-sm z-10">
                        {currentImageIndex + 1} / {listing.images.length}
                      </div>
                    </>
                  )}
                </>
              ) : (
                <img 
                  src="/placeholder.svg" 
                  alt={listing.title}
                  className="w-full h-full object-cover"
                />
              )}
            </div>
            
            {/* Horizontal Thumbnail Slider */}
            {listing.images && listing.images.length > 1 && (
              <div className="relative">
                <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 snap-x snap-mandatory touch-pan-x">
                  {listing.images.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentImageIndex(i)}
                      className={`relative flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden border-2 transition-all snap-start touch-manipulation ${
                        currentImageIndex === i 
                          ? 'border-primary ring-2 ring-primary/50 scale-105' 
                          : 'border-transparent hover:border-border opacity-70 hover:opacity-100 active:opacity-100'
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

          <div className="lg:col-span-5 flex flex-col relative">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 sm:mb-2 gap-2 sm:gap-0">
              <Badge className="text-xs sm:text-sm">{listing.category}</Badge>
              <div className="flex items-center gap-2 flex-wrap">
                {user && listing && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleWishlist}
                      className="flex items-center gap-1.5 sm:gap-2 h-9 sm:h-auto text-xs sm:text-sm touch-manipulation"
                      title={wishlist.includes(listing.id) ? "Remove from wishlist" : "Add to wishlist"}
                    >
                      <Bookmark className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${wishlist.includes(listing.id) ? "fill-blue-500 text-blue-500" : ""}`} />
                      <span className="hidden sm:inline">{wishlist.includes(listing.id) ? "In Wishlist" : "Wishlist"}</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleFavorite}
                      className="flex items-center gap-1.5 sm:gap-2 h-9 sm:h-auto text-xs sm:text-sm touch-manipulation"
                      title={favorites.includes(listing.id) ? "Remove from favorites" : "Add to favorites"}
                    >
                      <Heart className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${favorites.includes(listing.id) ? "fill-red-500 text-red-500" : ""}`} />
                      <span className="hidden sm:inline">{favorites.includes(listing.id) ? "Favorited" : "Favorite"}</span>
                    </Button>
                  </>
                )}
                {listing && (
                  <SocialShare
                    url={window.location.href}
                    title={listing.title}
                    description={listing.description}
                    variant="outline"
                    size="sm"
                  />
                )}
              </div>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">{listing.title}</h1>
            <div className="flex items-center text-muted-foreground mb-4">
              <MapPin className="h-4 w-4 mr-1" />
              <span>{listing.location}</span>
            </div>
            
            <div className="flex items-center gap-4 mb-4">
              <span className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                {listing.maxGuests} guests
              </span>
              {listing.bedrooms && <span>{listing.bedrooms} bedrooms</span>}
              {listing.bathrooms && <span>{listing.bathrooms} bathrooms</span>}
            </div>

            {/* Host Information */}
            {hostInfo && (
              <Card className="mb-6 border-primary/20 bg-primary/5">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Hosted by</p>
                      <p className="font-semibold text-lg">{hostInfo.fullName}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <p className="text-muted-foreground mb-6">{listing.description}</p>

            {listing.amenities.length > 0 && (
              <div className="mb-6">
                <h3 className="font-semibold mb-2">Amenities</h3>
                <div className="flex flex-wrap gap-2">
                  {listing.amenities.map((amenity, i) => (
                    <Badge key={i} variant="outline">{amenity}</Badge>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Calendars - Combined container */}
        <Card className="mt-6 sm:mt-8 shadow-lg">
          <CardHeader className="pb-4 sm:pb-6 px-4 sm:px-6">
            <CardTitle className="text-lg sm:text-xl font-bold flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              Select Dates
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm text-muted-foreground mt-1">
              Choose your check-in and check-out dates
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
            <div className="grid lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-12">
              <div className="flex flex-col">
                {/* Check-in Calendar */}
                <div className="flex flex-col">
                  <div className="mb-4 pb-3 border-b">
                    <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-primary"></div>
                      Check-in
                    </h3>
                    {checkIn && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {checkIn.toLocaleDateString('en-US', { 
                          weekday: 'long', 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </p>
                    )}
                  </div>
                  <div className="w-full">
                    <div className="w-full border rounded-md shadow-sm bg-card p-4">
                      <Calendar
                        mode="single"
                        selected={checkIn}
                        onSelect={setCheckIn}
                        disabled={isDateDisabled}
                        modifiers={{
                          booked: (date) => isDateBooked(date),
                        }}
                        modifiersClassNames={{
                          booked: "bg-orange-500/20 text-orange-600 dark:text-orange-400",
                        }}
                        className="w-full max-w-none [&_.rdp-day_booked]:bg-orange-500/20 [&_.rdp-day_booked]:text-orange-600 dark:[&_.rdp-day_booked]:text-orange-400 [&_.rdp-day_booked]:relative [&_.rdp-day_booked]:after:content-['booked'] [&_.rdp-day_booked]:after:absolute [&_.rdp-day_booked]:after:bottom-0 [&_.rdp-day_booked]:after:left-1/2 [&_.rdp-day_booked]:after:-translate-x-1/2 [&_.rdp-day_booked]:after:text-[7px] [&_.rdp-day_booked]:after:leading-tight [&_.rdp-day_booked]:after:opacity-80 [&_.rdp-day_booked]:after:whitespace-nowrap [&_.rdp-day_booked]:after:pointer-events-none"
                        classNames={{
                          months: "w-full",
                          month: "w-full space-y-3",
                          caption: "flex justify-center pt-1 relative items-center mb-4",
                          caption_label: "text-base font-semibold",
                          nav: "space-x-1 flex items-center",
                          nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 absolute",
                          nav_button_previous: "left-1",
                          nav_button_next: "right-1",
                          table: "w-full border-collapse",
                          head_row: "w-full flex justify-between mb-2",
                          head_cell: "flex-1 text-center text-sm font-medium text-muted-foreground",
                          row: "w-full flex justify-between my-1",
                          cell: "flex-1 text-center h-10",
                          day: "w-full h-full flex items-center justify-center text-sm font-medium rounded-md hover:bg-accent transition-colors",
                          day_disabled: "text-muted-foreground opacity-50 cursor-not-allowed pointer-events-none",
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col lg:border-l lg:pl-12 lg:border-border/50">
                {/* Check-out Calendar */}
                <div className="flex flex-col">
                  <div className="mb-4 pb-3 border-b">
                    <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-accent"></div>
                      Check-out
                    </h3>
                    {checkOut && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {checkOut.toLocaleDateString('en-US', { 
                          weekday: 'long', 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </p>
                    )}
                  </div>
                  <div className="w-full">
                    <div className="w-full border rounded-md shadow-sm bg-card p-4">
                      <Calendar
                        mode="single"
                        selected={checkOut}
                        onSelect={setCheckOut}
                        disabled={(date) => {
                          if (!checkIn) return true;
                          const checkInDate = new Date(checkIn);
                          checkInDate.setHours(0, 0, 0, 0);
                          const dateOnly = new Date(date);
                          dateOnly.setHours(0, 0, 0, 0);
                          return dateOnly <= checkInDate || isDateDisabled(date);
                        }}
                        modifiers={{
                          booked: (date) => isDateBooked(date),
                        }}
                        modifiersClassNames={{
                          booked: "bg-orange-500/20 text-orange-600 dark:text-orange-400",
                        }}
                        className="w-full max-w-none [&_.rdp-day_booked]:bg-orange-500/20 [&_.rdp-day_booked]:text-orange-600 dark:[&_.rdp-day_booked]:text-orange-400 [&_.rdp-day_booked]:relative [&_.rdp-day_booked]:after:content-['booked'] [&_.rdp-day_booked]:after:absolute [&_.rdp-day_booked]:after:bottom-0 [&_.rdp-day_booked]:after:left-1/2 [&_.rdp-day_booked]:after:-translate-x-1/2 [&_.rdp-day_booked]:after:text-[7px] [&_.rdp-day_booked]:after:leading-tight [&_.rdp-day_booked]:after:opacity-80 [&_.rdp-day_booked]:after:whitespace-nowrap [&_.rdp-day_booked]:after:pointer-events-none"
                        classNames={{
                          months: "w-full",
                          month: "w-full space-y-3",
                          caption: "flex justify-center pt-1 relative items-center mb-4",
                          caption_label: "text-base font-semibold",
                          nav: "space-x-1 flex items-center",
                          nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 absolute",
                          nav_button_previous: "left-1",
                          nav_button_next: "right-1",
                          table: "w-full border-collapse",
                          head_row: "w-full flex justify-between mb-2",
                          head_cell: "flex-1 text-center text-sm font-medium text-muted-foreground",
                          row: "w-full flex justify-between my-1",
                          cell: "flex-1 text-center h-10",
                          day: "w-full h-full flex items-center justify-center text-sm font-medium rounded-md hover:bg-accent transition-colors",
                          day_disabled: "text-muted-foreground opacity-50 cursor-not-allowed pointer-events-none",
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Booking Card */}
        <Card className="mt-6 sm:mt-8 shadow-lg bg-card">
                <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6">
                  <CardTitle className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 sm:gap-0">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        {listing.discount && listing.discount > 0 ? (
                          <>
                            <span className="text-xl sm:text-2xl line-through text-muted-foreground">
                              {formatPHP(listing.price)}
                            </span>
                            <span className="text-2xl sm:text-3xl text-primary font-bold">
                              {formatPHP(listing.price * (1 - listing.discount / 100))}
                            </span>
                            <Badge className="bg-red-500 text-white">
                              -{listing.discount}%
                            </Badge>
                          </>
                        ) : (
                    <span className="text-2xl sm:text-3xl">{formatPHP(listing.price)}</span>
                        )}
                      </div>
                      {listing.promo && (
                        <p className="text-xs sm:text-sm text-primary font-medium">{listing.promo}</p>
                      )}
                    </div>
                    <span className="text-xs sm:text-sm font-normal text-muted-foreground">per night</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 px-4 sm:px-6 pb-4 sm:pb-6">
                {/* Number of Guests */}
                <div className="space-y-2">
                  <Label htmlFor="guests" className="text-sm font-medium flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Number of Guests
                  </Label>
                  <Input
                    id="guests"
                    type="number"
                    min="1"
                    max={listing.maxGuests}
                    value={guests}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 1;
                      if (value >= 1 && value <= listing.maxGuests) {
                        setGuests(value);
                      } else if (value > listing.maxGuests) {
                        setGuests(listing.maxGuests);
                        toast.error(`Maximum ${listing.maxGuests} guest${listing.maxGuests > 1 ? 's' : ''} allowed`);
                      } else if (value < 1) {
                        setGuests(1);
                      }
                    }}
                    placeholder="Enter number of guests"
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    Maximum {listing.maxGuests} guest{listing.maxGuests > 1 ? 's' : ''} allowed
                  </p>
                </div>

                {/* Coupon Application */}
                <div className="pt-4 border-t">
                  {!appliedCoupon ? (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Have a coupon code?</label>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Enter coupon code"
                          value={couponCode}
                          onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                          onKeyDown={(e) => e.key === 'Enter' && handleApplyCoupon()}
                        />
                        <Button 
                          type="button"
                          variant="outline" 
                          onClick={handleApplyCoupon}
                          disabled={!couponCode.trim()}
                        >
                          <Ticket className="h-4 w-4 mr-2" />
                          Apply
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-primary/10 rounded-lg flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Ticket className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium">{appliedCoupon.code}</span>
                        <span className="text-xs text-muted-foreground">
                          -{formatPHP(appliedCoupon.discount)}
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleRemoveCoupon}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>

                {checkIn && checkOut && (
                  <div className="pt-4 border-t space-y-2">
                    {(() => {
                      const days = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
                      const basePrice = days * listing.price;
                      const listingDiscountAmount = calculateListingDiscountAmount();
                      const priceAfterListingDiscount = basePrice - listingDiscountAmount;
                      const showBreakdown = listingDiscountAmount > 0 || appliedCoupon;
                      
                      return (
                        <>
                          {showBreakdown && (
                      <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Subtotal ({days} {days === 1 ? 'night' : 'nights'})</span>
                              <span>{formatPHP(basePrice)}</span>
                            </div>
                          )}
                          {listingDiscountAmount > 0 && (
                            <div className="flex justify-between text-sm text-primary">
                              <span>Listing Discount ({listing.discount}%)</span>
                              <span>-{formatPHP(listingDiscountAmount)}</span>
                            </div>
                          )}
                          {listingDiscountAmount > 0 && (appliedCoupon || !showBreakdown) && (
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">After Discount</span>
                              <span>{formatPHP(priceAfterListingDiscount)}</span>
                      </div>
                    )}
                    {appliedCoupon && (
                      <div className="flex justify-between text-sm text-primary">
                              <span>Coupon Discount ({appliedCoupon.code})</span>
                        <span>-{formatPHP(appliedCoupon.discount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold pt-2 border-t">
                      <span>Total</span>
                      <span>{formatPHP(calculateTotal())}</span>
                    </div>
                        </>
                      );
                    })()}
                  </div>
                )}

                <Button 
                  className="w-full h-12 sm:h-auto text-base sm:text-sm touch-manipulation" 
                  onClick={handleBooking}
                  disabled={!checkIn || !checkOut || !guests || guests < 1 || guests > listing.maxGuests || loading}
                >
                  {loading ? "Booking..." : "Request to Book"}
                </Button>
              </CardContent>
            </Card>

        {/* Lightbox/Modal for Full-Size Image Viewing */}
        <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
          <DialogContent className="max-w-[98vw] max-h-[98vh] w-auto h-auto p-0 bg-black/95 border-none m-1">
            <DialogTitle className="sr-only">View Full Size Image</DialogTitle>
            <DialogDescription className="sr-only">
              Viewing image {lightboxImageIndex + 1} of {listing?.images?.length || 0} for {listing?.title}
            </DialogDescription>
            <div className="relative w-full h-full flex items-center justify-center min-h-[400px]">
              {listing?.images && listing.images.length > 0 && (
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
                    {lightboxImageIndex + 1} / {listing.images.length}
                  </div>

                  {/* Main Image */}
                  <div className="w-full h-full flex items-center justify-center p-2 sm:p-4 pt-12 pb-20 sm:pb-24">
                    <img 
                      src={listing.images[lightboxImageIndex] || '/placeholder.svg'} 
                      alt={`${listing.title} - Image ${lightboxImageIndex + 1}`}
                      className="max-w-full max-h-[calc(98vh-160px)] object-contain"
                    />
                  </div>

                  {/* Navigation Buttons */}
                  {listing.images.length > 1 && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-50 bg-black/70 hover:bg-black/90 text-white border-none h-8 w-8 sm:h-12 sm:w-12"
                        onClick={() => setLightboxImageIndex((prev) => 
                          prev === 0 ? listing.images.length - 1 : prev - 1
                        )}
                      >
                        <ChevronLeft className="h-4 w-4 sm:h-6 sm:w-6" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-50 bg-black/70 hover:bg-black/90 text-white border-none h-8 w-8 sm:h-12 sm:w-12"
                        onClick={() => setLightboxImageIndex((prev) => 
                          prev === listing.images.length - 1 ? 0 : prev + 1
                        )}
                      >
                        <ChevronRight className="h-4 w-4 sm:h-6 sm:w-6" />
                      </Button>
                    </>
                  )}

                  {/* Thumbnail Strip at Bottom for Navigation */}
                  {listing.images.length > 1 && (
                    <div className="absolute bottom-2 sm:bottom-4 left-1/2 -translate-x-1/2 bg-black/70 backdrop-blur-sm rounded-lg p-2 sm:p-3 z-50 max-w-[calc(98vw-32px)]">
                      <div className="flex gap-2 sm:gap-3 overflow-x-auto scrollbar-hide px-1">
                        {listing.images.map((img, i) => (
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

        {/* Reviews Section */}
        <div className="mt-12 relative z-0">
          <ReviewList listingId={listing.id} refreshTrigger={reviewRefreshTrigger} />
        </div>

        {/* Similar Listings Recommendations */}
        <div className="relative z-0">
          <SimilarListings listingId={listing.id} />
        </div>
      </div>
    </div>
  );
};

// Similar Listings Component
const SimilarListings = ({ listingId }: { listingId: string }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [similarListings, setSimilarListings] = useState<Listing[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSimilarListings();
    if (user) {
      loadFavorites();
      loadWishlist();
    }
  }, [listingId, user]);

  const loadSimilarListings = async () => {
    try {
      const { getSimilarListings } = await import('@/lib/recommendations');
      const { getListingsRatings } = await import('@/lib/firestore');
      const similar = await getSimilarListings(listingId, 4);
      
      // Fetch ratings for similar listings
      if (similar.length > 0) {
        const listingIds = similar.map(listing => listing.id);
        const ratingsMap = await getListingsRatings(listingIds);
        
        // Attach ratings to similar listings
        const similarWithRatings = similar.map(listing => {
          const rating = ratingsMap.get(listing.id);
          return {
            ...listing,
            averageRating: rating?.averageRating || 0,
            reviewCount: rating?.reviewCount || 0
          };
        });
        
        setSimilarListings(similarWithRatings);
      } else {
        setSimilarListings(similar);
      }
    } catch (error) {
      console.error('Error loading similar listings:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadFavorites = async () => {
    if (!user) return;
    const { doc, getDoc } = await import('firebase/firestore');
    const { db } = await import('@/lib/firebase');
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (userDoc.exists()) {
      setFavorites(userDoc.data().favorites || []);
    }
  };

  const loadWishlist = async () => {
    if (!user) return;
    const { doc, getDoc } = await import('firebase/firestore');
    const { db } = await import('@/lib/firebase');
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (userDoc.exists()) {
      setWishlist(userDoc.data().wishlist || []);
    }
  };

  const handleFavorite = async (id: string) => {
    if (!user) {
      toast.error("Please login to add favorites");
      return;
    }
    try {
      const { toggleFavorite } = await import('@/lib/firestore');
      const newFavorites = await toggleFavorite(user.uid, id, favorites);
      setFavorites(newFavorites);
      toast.success(newFavorites.includes(id) ? "Added to favorites" : "Removed from favorites");
    } catch (error) {
      toast.error("Failed to update favorites");
    }
  };

  const handleWishlist = async (id: string) => {
    if (!user) {
      toast.error("Please login to add to wishlist");
      return;
    }
    try {
      const { toggleWishlist } = await import('@/lib/firestore');
      const newWishlist = await toggleWishlist(user.uid, id, wishlist);
      setWishlist(newWishlist);
      toast.success(newWishlist.includes(id) ? "Added to wishlist" : "Removed from wishlist");
    } catch (error) {
      toast.error("Failed to update wishlist");
    }
  };

  if (loading || similarListings.length === 0) return null;

  return (
    <div className="mt-12">
      <h2 className="text-2xl font-bold mb-6">Similar Listings</h2>
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {similarListings.map((similarListing) => (
          <ListingCard
            key={similarListing.id}
            listing={similarListing}
            onView={() => {
              navigate(`/guest/listing/${similarListing.id}`);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onFavorite={() => handleFavorite(similarListing.id)}
            onWishlist={() => handleWishlist(similarListing.id)}
            isFavorite={favorites.includes(similarListing.id)}
            isInWishlist={wishlist.includes(similarListing.id)}
          />
        ))}
      </div>
    </div>
  );
};

export default ListingDetails;
