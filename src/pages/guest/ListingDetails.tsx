import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { EmailVerificationBanner } from "@/components/guest/EmailVerificationBanner";
import { getListing, createBooking, getListingRating, getBookings } from "@/lib/firestore";
import { isListingAvailableForDates } from "@/lib/availabilityUtils";
import { getPendingBookingForGuest, getOverlappingBookings } from "@/lib/bookingValidation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, MapPin, Users, Heart, User, Ticket, X, ChevronLeft, ChevronRight, Calendar as CalendarIcon, ZoomIn, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { BackButton } from "@/components/shared/BackButton";
import { ReviewList } from "@/components/reviews/ReviewList";
import { SocialShare } from "@/components/shared/SocialShare";
import { ListingCard } from "@/components/listings/ListingCard";
import type { Listing } from "@/types";
import { sendBookingConfirmationEmail } from '@/lib/emailjs';
import { getDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { formatPHP } from '@/lib/currency';
import LoadingScreen from "@/components/ui/loading-screen";
import { validatePromoCode, calculatePromoDiscountAmount } from '@/lib/promoCodeService';

const ListingDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();
  const [listing, setListing] = useState<Listing | null>(null);
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>();
  const [guests, setGuests] = useState(1);
  const [loading, setLoading] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [hostInfo, setHostInfo] = useState<{ fullName?: string; email?: string } | null>(null);
  const [promoCode, setPromoCode] = useState("");
  const [appliedPromoCode, setAppliedPromoCode] = useState<{ code: string; discount: number; description?: string } | null>(null);
  const [validatingPromoCode, setValidatingPromoCode] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImageIndex, setLightboxImageIndex] = useState(0);
  const [confirmedBookings, setConfirmedBookings] = useState<any[]>([]);
  const [pendingBookings, setPendingBookings] = useState<any[]>([]);
  const [reviewRefreshTrigger, setReviewRefreshTrigger] = useState(0);
  const [pendingBooking, setPendingBooking] = useState<{ id: string; checkIn: string; checkOut: string } | null>(null);
  const [hasOverlappingBookings, setHasOverlappingBookings] = useState(false);

  useEffect(() => {
    if (id) {
      loadListing();
      setCurrentImageIndex(0); // Reset image index when listing changes
      // Scroll to top when navigating to a new listing
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    if (user) {
      loadFavorites();
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
    const data = await getListing(id, user?.uid);
    
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
      
      // Check for pending booking from this guest
      if (user) {
        await loadPendingBooking();
      }
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


  const loadConfirmedBookings = async () => {
    if (!id) return;
    try {
      // Fetch confirmed bookings for this specific listing
      const listingBookings = await getBookings({ listingId: id, status: 'confirmed' });
      setConfirmedBookings(listingBookings);
      
      // Also fetch pending bookings to check for conflicts
      const pendingListingBookings = await getBookings({ listingId: id, status: 'pending' });
      setPendingBookings(pendingListingBookings);
    } catch (error) {
      console.error('Error loading bookings:', error);
      setConfirmedBookings([]);
      setPendingBookings([]);
    }
  };

  const loadPendingBooking = async () => {
    if (!id || !user) return;
    try {
      const pending = await getPendingBookingForGuest(user.uid, id);
      if (pending) {
        setPendingBooking({
          id: pending.id,
          checkIn: pending.checkIn,
          checkOut: pending.checkOut
        });
      } else {
        setPendingBooking(null);
      }
    } catch (error) {
      console.error('Error loading pending booking:', error);
      setPendingBooking(null);
    }
  };

  // Check for overlapping bookings when date range changes
  useEffect(() => {
    const checkOverlappingBookings = async () => {
      if (!id || !dateRange?.from || !dateRange?.to) {
        setHasOverlappingBookings(false);
        return;
      }
      
      try {
        const overlapping = await getOverlappingBookings(
          id,
          dateRange.from,
          dateRange.to
        );
        setHasOverlappingBookings(overlapping.length > 0);
      } catch (error) {
        console.error('Error checking overlapping bookings:', error);
        setHasOverlappingBookings(false);
      }
    };
    
    checkOverlappingBookings();
  }, [id, dateRange]);

  // Check if a date is booked (confirmed or pending)
  const isDateBooked = (date: Date): boolean => {
    const allBookings = [...confirmedBookings, ...pendingBookings];
    if (!allBookings.length) return false;
    
    const dateStr = date.toISOString().split('T')[0];
    const dateTime = date.getTime();
    
    return allBookings.some(booking => {
      const checkIn = new Date(booking.checkIn);
      const checkOut = new Date(booking.checkOut);
      checkIn.setHours(0, 0, 0, 0);
      checkOut.setHours(0, 0, 0, 0);
      
      return dateTime >= checkIn.getTime() && dateTime <= checkOut.getTime();
    });
  };

  // Check if a date is blocked by the host
  const isDateBlocked = (date: Date): boolean => {
    if (!listing?.blockedDates || listing.blockedDates.length === 0) {
      return false;
    }
    
    const dateStr = date.toISOString().split('T')[0];
    return listing.blockedDates.includes(dateStr);
  };

  // Check if a date is in the listing's available dates
  // This ensures guests can only select dates that are within the listing's available date range
  const isDateAvailable = (date: Date): boolean => {
    if (!listing?.availableDates || listing.availableDates.length === 0) {
      // If no available dates specified, all dates are available (except booked/blocked ones)
      return true;
    }
    
    // Convert date to ISO string format (YYYY-MM-DD) to match availableDates format
    const dateStr = date.toISOString().split('T')[0];
    // Only allow dates that are explicitly in the availableDates array
    return listing.availableDates.includes(dateStr);
  };

  // Check if a date should be disabled in the date picker
  // This prevents guests from selecting dates outside the listing's available range
  const isDateDisabled = (date: Date): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dateOnly = new Date(date);
    dateOnly.setHours(0, 0, 0, 0);
    
    // Disable past dates (dates before today)
    if (dateOnly < today) return true;
    
    // Disable if blocked by host
    if (isDateBlocked(dateOnly)) return true;
    
    // Disable if not in available dates (if availableDates is specified)
    // This is the key check: if listing has availableDates, only those dates can be selected
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


  const calculateTotal = () => {
    if (!listing) return 0;
    
    let basePrice = 0;
    
    // Category-specific pricing calculation
    if (listing.category === 'home') {
      // Home: price per night * number of nights
      if (!dateRange?.from || !dateRange?.to) return 0;
      const days = Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24));
      basePrice = days * listing.price;
    } else if (listing.category === 'experience') {
      // Experience: price per person * number of participants * number of days
      if (!dateRange?.from || !dateRange?.to) return 0;
      const days = Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24));
      const pricePerPerson = listing.pricePerPerson || listing.price;
      basePrice = days * pricePerPerson * guests;
    } else if (listing.category === 'service') {
      // Service: fixed price (date range optional, but if provided, use it)
      basePrice = listing.servicePrice || listing.price;
      // For services, date range might not be required, but if provided, it's still a fixed price
    }
    
    // Apply listing discount first (percentage discount)
    let priceAfterListingDiscount = basePrice;
    if (listing.discount && listing.discount > 0) {
      const discountAmount = (basePrice * listing.discount) / 100;
      priceAfterListingDiscount = Math.max(0, basePrice - discountAmount);
    }
    
    // Then apply promo code discount if available (percentage discount)
    let priceAfterPromoCode = priceAfterListingDiscount;
    if (appliedPromoCode && appliedPromoCode.discount > 0) {
      const promoDiscountAmount = calculatePromoDiscountAmount(priceAfterListingDiscount, appliedPromoCode.discount);
      priceAfterPromoCode = Math.max(0, priceAfterListingDiscount - promoDiscountAmount);
    }
    
    return priceAfterPromoCode;
  };

  const calculateListingDiscountAmount = () => {
    if (!listing || !listing.discount || listing.discount <= 0) return 0;
    
    let basePrice = 0;
    
    // Category-specific pricing calculation
    if (listing.category === 'home') {
      if (!dateRange?.from || !dateRange?.to) return 0;
      const days = Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24));
      basePrice = days * listing.price;
    } else if (listing.category === 'experience') {
      if (!dateRange?.from || !dateRange?.to) return 0;
      const days = Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24));
      const pricePerPerson = listing.pricePerPerson || listing.price;
      basePrice = days * pricePerPerson * guests;
    } else if (listing.category === 'service') {
      basePrice = listing.servicePrice || listing.price;
    }
    
    return (basePrice * listing.discount) / 100;
  };


  const handleApplyPromoCode = async () => {
    if (!promoCode.trim()) {
      toast.error("Please enter a promo code");
      return;
    }

    if (!listing || !id) {
      toast.error("Listing information is missing");
      return;
    }

    setValidatingPromoCode(true);
    try {
      const validation = await validatePromoCode(promoCode.trim(), id);
      
      if (!validation.valid) {
        toast.error(validation.error || "Invalid promo code");
        return;
      }

      setAppliedPromoCode({
        code: validation.promoCode!,
        discount: validation.discount || 0,
        description: validation.promoDescription
      });
      setPromoCode("");
      toast.success(`Promo code ${validation.promoCode} applied! ${validation.discount}% discount`);
    } catch (error: any) {
      console.error('Error applying promo code:', error);
      toast.error("Failed to validate promo code. Please try again.");
    } finally {
      setValidatingPromoCode(false);
    }
  };

  const handleRemovePromoCode = () => {
    setAppliedPromoCode(null);
    toast.info("Promo code removed");
  };

  const handleBooking = async () => {
    // Check if user is signed in
    if (!user) {
      toast.error("Please sign in to book this listing");
      return;
    }

    // Check if email is verified
    if (!userProfile?.emailVerified) {
      toast.error("Please verify your email address to enable booking features. Check your inbox for a verification link.");
      return;
    }

    // Check if listing exists
    if (!listing) {
      toast.error("Listing information is missing. Please refresh the page.");
      return;
    }

    // Category-specific validation
    if (listing.category === 'home' || listing.category === 'experience') {
      // Check if dates are selected (required for home and experience)
      if (!dateRange?.from || !dateRange?.to) {
        toast.error("Please select your dates");
        return;
      }

      // Check if number of guests/participants is entered
      if (!guests || guests < 1) {
        toast.error(`Please enter the number of ${listing.category === 'home' ? 'guests' : 'participants'} (minimum 1)`);
        return;
      }

      // Check if guests/participants exceed maximum
      const maxValue = listing.category === 'home' ? listing.maxGuests : listing.capacity;
      if (maxValue && guests > maxValue) {
        toast.error(`Maximum ${maxValue} ${listing.category === 'home' ? 'guest' : 'participant'}${maxValue > 1 ? 's' : ''} allowed for this listing`);
        return;
      }
    } else if (listing.category === 'service') {
      // For services, date range is optional but recommended
      // Still validate if dates are provided
    }

    // Check if host information exists
    if (!listing.hostId) {
      toast.error("Listing error: Missing host information. Please contact support.");
      console.error('Listing missing hostId:', listing);
      return;
    }

    // Check if guest has a pending booking for this listing
    if (pendingBooking) {
      toast.error("You already have a pending booking request for this listing. Please wait for the host to respond to your previous request before making a new one.");
      return;
    }

    // Validate that the selected dates are available (for home and experience)
    if ((listing.category === 'home' || listing.category === 'experience') && dateRange?.from && dateRange?.to) {
      // Check availability including both confirmed and pending bookings
      const isAvailable = isListingAvailableForDates(listing, dateRange.from, dateRange.to, confirmedBookings, pendingBookings);
      if (!isAvailable) {
        toast.error("The selected dates are not available. Please choose different dates.");
        return;
      }
      
      // Additional check for overlapping bookings (this is redundant but provides better error messages)
      if (hasOverlappingBookings) {
        toast.error("The selected dates have conflicting bookings. Please choose different dates.");
        return;
      }
    }

    // Calculate the total price (already handled in calculateTotal function)
    const totalPrice = calculateTotal();
    const listingDiscountAmount = calculateListingDiscountAmount();
    const finalPrice = totalPrice;

    // Check if user has sufficient wallet balance
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const { readWalletBalance } = await import('@/lib/financialUtils');
        const walletBalance = readWalletBalance(userData.walletBalance);
        
        if (walletBalance < finalPrice) {
          const shortfall = finalPrice - walletBalance;
          toast.error(
            `Insufficient wallet balance. You need ${formatPHP(finalPrice)} but only have ${formatPHP(walletBalance)}. Please add ${formatPHP(shortfall)} to your wallet to complete this booking.`,
            { duration: 6000 }
          );
          return;
        }
      } else {
        toast.error("Unable to verify wallet balance. Please try again.");
        return;
      }
    } catch (error) {
      console.error('Error checking wallet balance:', error);
      toast.error("Unable to verify wallet balance. Please try again.");
      return;
    }

    setLoading(true);
    try {
      // Calculate original price for booking record
      let originalPrice = 0;
      if (listing.category === 'home' && dateRange?.from && dateRange?.to) {
        const days = Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24));
        originalPrice = days * listing.price;
      } else if (listing.category === 'experience' && dateRange?.from && dateRange?.to) {
        const days = Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24));
        const pricePerPerson = listing.pricePerPerson || listing.price;
        originalPrice = days * pricePerPerson * guests;
      } else if (listing.category === 'service') {
        originalPrice = listing.servicePrice || listing.price;
      }
      
      const promoCodeDiscountAmount = appliedPromoCode && appliedPromoCode.discount > 0
        ? calculatePromoDiscountAmount(originalPrice - listingDiscountAmount, appliedPromoCode.discount)
        : 0;

      const bookingData: any = {
        listingId: listing.id,
        guestId: user.uid,
        hostId: listing.hostId,
        checkIn: dateRange?.from?.toISOString() || new Date().toISOString(),
        checkOut: dateRange?.to?.toISOString() || new Date().toISOString(),
        guests: listing.category === 'service' ? 1 : guests, // Services don't have guests, default to 1
        totalPrice: finalPrice,
        originalPrice: originalPrice,
        listingDiscount: listing.discount || 0,
        listingDiscountAmount: listingDiscountAmount,
        discountAmount: listingDiscountAmount + promoCodeDiscountAmount,
        status: 'pending' as const, // Booking is pending host approval
      };

      // Include promo code if applied
      if (appliedPromoCode?.code) {
        bookingData.promoCode = appliedPromoCode.code;
        bookingData.promoCodeDiscount = appliedPromoCode.discount;
        bookingData.promoCodeDiscountAmount = promoCodeDiscountAmount;
      }

      console.log('📝 Creating booking with data:', {
        ...bookingData,
        hostIdValue: listing.hostId,
        hostIdType: typeof listing.hostId,
        hostIdLength: listing.hostId?.length
      });

      // Create booking and get the booking ID
      const bookingId = await createBooking(bookingData);

      
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
        {/* Email Verification Banner */}
        <EmailVerificationBanner />
        <BackButton to="/guest/browse" className="mb-4" />

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
                    style={{ 
                      width: `${listing.images.length * 100}%`,
                      transform: `translateX(-${(currentImageIndex * 100) / listing.images.length}%)`
                    }}
                  >
                    {listing.images.map((img, index) => (
                      <div 
                        key={index}
                        className="relative flex-shrink-0"
                        style={{ 
                          width: `${100 / listing.images.length}%`,
                          height: '100%'
                        }}
                      >
                        <img 
                          src={img || '/placeholder.svg'} 
                          alt={`${listing.title} - Image ${index + 1}`}
                          className="w-full h-full object-cover"
                          loading={index === 0 ? "eager" : "lazy"}
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
            
            {/* Category-specific details */}
            {listing.category === 'home' && (
              <div className="flex items-center gap-4 mb-4">
                <span className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  {listing.maxGuests} guests
                </span>
                {listing.bedrooms && <span>{listing.bedrooms} bedrooms</span>}
                {listing.bathrooms && <span>{listing.bathrooms} bathrooms</span>}
                {listing.houseType && <Badge variant="outline">{listing.houseType}</Badge>}
              </div>
            )}
            {listing.category === 'experience' && (
              <div className="flex items-center gap-4 mb-4">
                <span className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  {listing.capacity} max participants
                </span>
                {listing.duration && <span>{listing.duration}</span>}
                {listing.schedule && <span className="text-sm text-muted-foreground">{listing.schedule}</span>}
              </div>
            )}
            {listing.category === 'service' && (
              <div className="flex items-center gap-4 mb-4">
                {listing.duration && (
                  <span className="flex items-center gap-1">
                    <CalendarIcon className="h-4 w-4" />
                    {listing.duration}
                  </span>
                )}
                {listing.serviceType && <Badge variant="outline">{listing.serviceType}</Badge>}
              </div>
            )}

            {/* Host Information */}
            {listing.hostId && (
              <Card className="mb-6 border-primary/20 bg-primary/5">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Hosted by</p>
                        <p className="font-semibold text-lg">{hostInfo?.fullName || 'Host'}</p>
                      </div>
                    </div>
                    {user && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/guest/messages?userId=${listing.hostId}`)}
                        className="flex items-center gap-2"
                      >
                        <MessageSquare className="h-4 w-4" />
                        Message Host
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            <p className="text-muted-foreground mb-6">{listing.description}</p>

            {/* House-specific: Amenities */}
            {listing.category === 'home' && listing.amenities && listing.amenities.length > 0 && (
              <div className="mb-6">
                <h3 className="font-semibold mb-2">Amenities</h3>
                <div className="flex flex-wrap gap-2">
                  {listing.amenities.map((amenity, i) => (
                    <Badge key={i} variant="outline">{amenity}</Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Service-specific: Requirements */}
            {listing.category === 'service' && listing.requirements && (
              <div className="mb-6">
                <h3 className="font-semibold mb-2">Requirements</h3>
                <p className="text-muted-foreground whitespace-pre-wrap">{listing.requirements}</p>
              </div>
            )}

            {/* Experience-specific: What's Included */}
            {listing.category === 'experience' && listing.whatsIncluded && listing.whatsIncluded.length > 0 && (
              <div className="mb-6">
                <h3 className="font-semibold mb-2">What's Included</h3>
                <div className="flex flex-wrap gap-2">
                  {listing.whatsIncluded.map((item, i) => (
                    <Badge key={i} variant="outline">{item}</Badge>
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
            <div className="w-full">
              <DateRangePicker
                value={dateRange}
                onChange={setDateRange}
                placeholder="Select check-in and check-out dates"
                disabled={isDateDisabled}
                modifiers={{
                  booked: (date) => isDateBooked(date),
                  blocked: (date) => isDateBlocked(date),
                }}
                modifiersClassNames={{
                  booked: "bg-orange-500/20 text-orange-600 dark:text-orange-400",
                  blocked: "bg-red-500/20 text-red-600 dark:text-red-400",
                }}
                classNames={{
                  month: "space-y-4",
                  caption: "flex justify-center pt-1 relative items-center mb-2",
                  caption_label: "text-sm font-semibold",
                  nav: "space-x-1 flex items-center",
                  nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 hover:bg-accent rounded-md transition-colors",
                  nav_button_previous: "absolute left-1",
                  nav_button_next: "absolute right-1",
                  table: "w-full border-collapse space-y-1",
                  head_row: "flex mb-1",
                  head_cell: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
                  row: "flex w-full mt-1",
                  cell: "h-9 w-9 text-center text-sm p-0 relative focus-within:relative focus-within:z-20 [&:has([aria-selected].day-range-start)]:rounded-l-md [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected])]:bg-role-guest/10 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md",
                  day: "h-9 w-9 p-0 font-normal rounded-md hover:bg-accent transition-all duration-200 relative z-10",
                  day_range_start: "bg-role-guest text-role-guest-foreground hover:bg-role-guest hover:text-role-guest-foreground rounded-l-md",
                  day_range_end: "bg-role-guest text-role-guest-foreground hover:bg-role-guest hover:text-role-guest-foreground rounded-r-md",
                  day_selected: "bg-role-guest text-role-guest-foreground hover:bg-role-guest hover:text-role-guest-foreground rounded-md",
                  day_today: "bg-accent/50 text-accent-foreground font-semibold",
                  day_outside: "day-outside text-muted-foreground opacity-50 aria-selected:bg-role-guest/50 aria-selected:text-role-guest-foreground aria-selected:opacity-100",
                  day_disabled: "text-muted-foreground opacity-30 cursor-not-allowed hover:bg-transparent",
                  day_range_middle: "bg-role-guest/10 text-role-guest hover:bg-role-guest/20 rounded-none",
                  day_hidden: "invisible",
                }}
                numberOfMonths={1}
              />
            </div>
          </CardContent>
        </Card>

        {/* Booking Card */}
        <Card className="mt-6 sm:mt-8 shadow-lg bg-card">
                <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6">
                  <CardTitle className="flex flex-col gap-1">
                    <div className="flex items-baseline gap-2 flex-wrap">
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
                    <span className="text-xs sm:text-sm font-normal text-muted-foreground">
                      {listing.category === 'home' && 'per night'}
                      {listing.category === 'experience' && 'per person'}
                      {listing.category === 'service' && ''}
                    </span>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 px-4 sm:px-6 pb-4 sm:pb-6">
                {/* Number of Guests/Participants (only for home and experience) */}
                {(listing.category === 'home' || listing.category === 'experience') && (
                  <div className="space-y-2">
                    <Label htmlFor="guests" className="text-sm font-medium flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      {listing.category === 'home' ? 'Number of Guests' : 'Number of Participants'}
                    </Label>
                    <Input
                      id="guests"
                      type="number"
                      min="1"
                      max={listing.category === 'home' ? listing.maxGuests : listing.capacity}
                      value={guests}
                      onChange={(e) => {
                        const value = parseInt(e.target.value) || 1;
                        const maxValue = listing.category === 'home' ? listing.maxGuests : listing.capacity;
                        if (value >= 1 && value <= maxValue) {
                          setGuests(value);
                        } else if (value > maxValue) {
                          setGuests(maxValue || 1);
                          toast.error(`Maximum ${maxValue} ${listing.category === 'home' ? 'guest' : 'participant'}${maxValue && maxValue > 1 ? 's' : ''} allowed`);
                        } else if (value < 1) {
                          setGuests(1);
                        }
                      }}
                      placeholder={`Enter number of ${listing.category === 'home' ? 'guests' : 'participants'}`}
                      className="w-full"
                    />
                    <p className="text-xs text-muted-foreground">
                      Maximum {listing.category === 'home' ? listing.maxGuests : listing.capacity} {listing.category === 'home' ? 'guest' : 'participant'}{(listing.category === 'home' ? listing.maxGuests : listing.capacity) && ((listing.category === 'home' ? listing.maxGuests : listing.capacity) > 1) ? 's' : ''} allowed
                    </p>
                  </div>
                )}

                {/* Promo Code Application */}
                <div className="pt-4 border-t">
                  {!appliedPromoCode ? (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Have a promo code?</label>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Enter promo code"
                          value={promoCode}
                          onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                          onKeyDown={(e) => e.key === 'Enter' && handleApplyPromoCode()}
                          disabled={validatingPromoCode}
                        />
                        <Button 
                          type="button"
                          variant="outline" 
                          onClick={handleApplyPromoCode}
                          disabled={!promoCode.trim() || validatingPromoCode}
                        >
                          <Ticket className="h-4 w-4 mr-2" />
                          {validatingPromoCode ? "Validating..." : "Apply"}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-primary/10 rounded-lg flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Ticket className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium">{appliedPromoCode.code}</span>
                        <span className="text-xs text-muted-foreground">
                          -{appliedPromoCode.discount}%
                        </span>
                        {appliedPromoCode.description && (
                          <span className="text-xs text-muted-foreground">
                            ({appliedPromoCode.description})
                          </span>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleRemovePromoCode}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>

                {(((listing.category === 'home' || listing.category === 'experience') && dateRange?.from && dateRange?.to) || listing.category === 'service') && (
                  <div className="pt-4 border-t space-y-2">
                    {(() => {
                      let basePrice = 0;
                      let subtitle = '';
                      
                      if (listing.category === 'home' && dateRange?.from && dateRange?.to) {
                        const days = Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24));
                        basePrice = days * listing.price;
                        subtitle = `Subtotal (${days} ${days === 1 ? 'night' : 'nights'})`;
                      } else if (listing.category === 'experience' && dateRange?.from && dateRange?.to) {
                        const days = Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24));
                        const pricePerPerson = listing.pricePerPerson || listing.price;
                        basePrice = days * pricePerPerson * guests;
                        subtitle = `Subtotal (${days} ${days === 1 ? 'day' : 'days'} × ${guests} ${guests === 1 ? 'person' : 'people'})`;
                      } else if (listing.category === 'service') {
                        basePrice = listing.servicePrice || listing.price;
                        subtitle = 'Service Price';
                      }
                      
                      const listingDiscountAmount = calculateListingDiscountAmount();
                      const priceAfterListingDiscount = basePrice - listingDiscountAmount;
                      const promoCodeDiscountAmount = appliedPromoCode && appliedPromoCode.discount > 0
                        ? calculatePromoDiscountAmount(priceAfterListingDiscount, appliedPromoCode.discount)
                        : 0;
                      const priceAfterPromoCode = priceAfterListingDiscount - promoCodeDiscountAmount;
                      const showBreakdown = listingDiscountAmount > 0 || appliedPromoCode;
                      
                      return (
                        <>
                          {showBreakdown && (
                      <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">{subtitle}</span>
                              <span>{formatPHP(basePrice)}</span>
                            </div>
                          )}
                          {listingDiscountAmount > 0 && (
                            <div className="flex justify-between text-sm text-primary">
                              <span>Listing Discount ({listing.discount}%)</span>
                              <span>-{formatPHP(listingDiscountAmount)}</span>
                            </div>
                          )}
                          {listingDiscountAmount > 0 && (appliedPromoCode || !showBreakdown) && (
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">After Listing Discount</span>
                              <span>{formatPHP(priceAfterListingDiscount)}</span>
                      </div>
                    )}
                    {appliedPromoCode && (
                      <div className="flex justify-between text-sm text-primary">
                              <span>Promo Code Discount ({appliedPromoCode.code}) - {appliedPromoCode.discount}%</span>
                        <span>-{formatPHP(promoCodeDiscountAmount)}</span>
                      </div>
                    )}
                    {appliedPromoCode && !showBreakdown && (
                      <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">After Promo Code</span>
                              <span>{formatPHP(priceAfterPromoCode)}</span>
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

                {pendingBooking ? (
                  <div className="space-y-2">
                    <Button 
                      className="w-full h-12 sm:h-auto text-base sm:text-sm touch-manipulation" 
                      disabled={true}
                      variant="outline"
                    >
                      Booking Request Pending
                    </Button>
                    <p className="text-xs text-muted-foreground text-center">
                      You have a pending booking request for this listing (Check-in: {new Date(pendingBooking.checkIn).toLocaleDateString()}, Check-out: {new Date(pendingBooking.checkOut).toLocaleDateString()}). 
                      Please wait for the host to respond before making a new request.
                    </p>
                  </div>
                ) : (
                  <Button 
                    className="w-full h-12 sm:h-auto text-base sm:text-sm touch-manipulation" 
                    onClick={handleBooking}
                    disabled={
                      !dateRange?.from || 
                      !dateRange?.to || 
                      !guests || 
                      guests < 1 || 
                      guests > (listing.category === 'home' ? listing.maxGuests : listing.capacity || 1) || 
                      loading ||
                      hasOverlappingBookings
                    }
                  >
                    {loading ? "Booking..." : hasOverlappingBookings ? "Dates Not Available" : "Request to Book"}
                  </Button>
                )}
              </CardContent>
            </Card>

        {/* Lightbox/Modal for Full-Size Image Viewing */}
        <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
          <DialogContent className="w-[1600px] h-[1000px] max-w-[95vw] max-h-[95vh] p-0 bg-black/95 border-none m-0 rounded-lg">
            <DialogTitle className="sr-only">View Full Size Image</DialogTitle>
            <DialogDescription className="sr-only">
              Viewing image {lightboxImageIndex + 1} of {listing?.images?.length || 0} for {listing?.title}
            </DialogDescription>
            <div className="relative w-full h-full">
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
                  <div className="absolute inset-0" style={{ paddingTop: '40px', paddingBottom: '80px' }}>
                    <img 
                      key={lightboxImageIndex}
                      src={listing.images[lightboxImageIndex] || '/placeholder.svg'} 
                      alt={`${listing.title} - Image ${lightboxImageIndex + 1}`}
                      className="w-full h-full object-cover"
                      loading="eager"
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
                    <div className="absolute bottom-2 sm:bottom-4 left-1/2 -translate-x-1/2 bg-black/70 backdrop-blur-sm rounded-lg p-2 sm:p-3 z-50 max-w-[calc(80vw-32px)]">
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSimilarListings();
    if (user) {
      loadFavorites();
    }
  }, [listingId, user]);

  const loadSimilarListings = async () => {
    try {
      const { getSimilarListings } = await import('@/lib/recommendations');
      const { getListingsRatings } = await import('@/lib/firestore');
      const similar = await getSimilarListings(listingId, 4, user?.uid);
      
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
            isFavorite={favorites.includes(similarListing.id)}
          />
        ))}
      </div>
    </div>
  );
};

export default ListingDetails;
