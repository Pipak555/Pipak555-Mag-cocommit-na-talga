import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { SubscriptionGuard } from '@/components/host/SubscriptionGuard';
import { HostEmailVerificationBanner } from '@/components/host/EmailVerificationBanner';
import { hasActiveSubscription, getUserSubscription } from '@/lib/billingService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { VideoBackground } from '@/components/ui/video-background';
import { Plus, Home, Calendar, MessageSquare, DollarSign, Settings, Award, CalendarDays, CreditCard, AlertCircle, Clock, User, Mail, MapPin, Loader2 } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import Logo from '@/components/shared/Logo';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getBookings, getListing, getUserProfile } from '@/lib/firestore';
import type { Booking, HostSubscription, Listing } from '@/types';
import { formatPHP } from '@/lib/currency';
import { toast } from 'sonner';
import heroImage from '@/assets/hero-home.jpg';
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

const landingVideo = '/videos/landing-hero.mp4';

// Today's Schedule Component
const TodaySchedule = () => {
  const { user } = useAuth();
  const [todayBookings, setTodayBookings] = useState<Booking[]>([]);
  const navigate = useNavigate();
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [guestInfo, setGuestInfo] = useState<{ fullName?: string; email?: string } | null>(null);
  const [loadingBookingDetails, setLoadingBookingDetails] = useState(false);

  useEffect(() => {
    if (!user) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const unsubscribe = onSnapshot(
      query(collection(db, 'bookings'), where('hostId', '==', user.uid)),
      (snapshot) => {
        const bookings = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as Booking))
          .filter(booking => {
            const checkIn = new Date(booking.checkIn);
            checkIn.setHours(0, 0, 0, 0);
            const checkOut = new Date(booking.checkOut);
            checkOut.setHours(0, 0, 0, 0);
            
            // Include bookings that:
            // 1. Have check-in today, OR
            // 2. Have check-out today, OR
            // 3. Are currently in progress (check-in < today < check-out)
            const isCheckInToday = checkIn.getTime() === today.getTime();
            const isCheckOutToday = checkOut.getTime() === today.getTime();
            const isCurrentlyInProgress = checkIn.getTime() < today.getTime() && checkOut.getTime() > today.getTime();
            
            return (isCheckInToday || isCheckOutToday || isCurrentlyInProgress) &&
                   (booking.status === 'confirmed' || booking.status === 'pending');
          })
          .sort((a, b) => new Date(a.checkIn).getTime() - new Date(b.checkIn).getTime());
        
        setTodayBookings(bookings);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const handleBookingClick = async (booking: Booking) => {
    setSelectedBooking(booking);
    setBookingDialogOpen(true);
    setLoadingBookingDetails(true);
    setSelectedListing(null);
    setGuestInfo(null);

    try {
      // Load listing and guest information in parallel
      const [listing, guest] = await Promise.all([
        booking.listingId ? getListing(booking.listingId, user?.uid).catch(() => null) : Promise.resolve(null),
        booking.guestId ? getUserProfile(booking.guestId).catch(() => null) : Promise.resolve(null),
      ]);

      if (listing) {
        setSelectedListing(listing);
      }

      if (guest) {
        setGuestInfo({
          fullName: guest.fullName || 'Guest',
          email: guest.email || 'N/A',
        });
      }
    } catch (error) {
      console.error('Error loading booking details:', error);
      toast.error('Failed to load booking details');
    } finally {
      setLoadingBookingDetails(false);
    }
  };

  return (
    <>
    <Card className="shadow-medium">
      <CardHeader>
        <CardTitle>Today's Schedule</CardTitle>
        <CardDescription>
          {todayBookings.length > 0 
            ? `${todayBookings.length} booking${todayBookings.length > 1 ? 's' : ''} today or in progress`
            : 'No bookings scheduled for today'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {todayBookings.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>You're all set! No bookings happening today.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {todayBookings.map((booking) => {
              const checkIn = new Date(booking.checkIn);
              const checkOut = new Date(booking.checkOut);
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              checkIn.setHours(0, 0, 0, 0);
              checkOut.setHours(0, 0, 0, 0);
              
              const isCheckIn = checkIn.getTime() === today.getTime();
              const isCheckOut = checkOut.getTime() === today.getTime();
              const isInProgress = checkIn.getTime() < today.getTime() && checkOut.getTime() > today.getTime();

              return (
                <div
                  key={booking.id}
                  className="p-4 border rounded-lg hover:bg-role-host/10 hover:border-role-host/30 cursor-pointer transition-colors"
                    onClick={() => handleBookingClick(booking)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">
                        {isCheckIn && isCheckOut
                          ? 'Check-in & Check-out'
                          : isCheckIn
                          ? 'Check-in'
                          : isCheckOut
                          ? 'Check-out'
                          : isInProgress
                          ? 'Currently in progress'
                          : 'Booking'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {checkIn.toLocaleDateString()} - {checkOut.toLocaleDateString()}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {booking.guests} guest{booking.guests > 1 ? 's' : ''} • {formatPHP(booking.totalPrice || 0)}
                      </p>
                    </div>
                    <Badge>{booking.status}</Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>

      {/* Booking Details Dialog */}
      <Dialog open={bookingDialogOpen} onOpenChange={setBookingDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Booking Details</DialogTitle>
            <DialogDescription>
              View detailed information about this booking
            </DialogDescription>
          </DialogHeader>
          {loadingBookingDetails ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-role-host" />
              <p className="ml-3 text-muted-foreground">Loading booking details...</p>
            </div>
          ) : selectedBooking ? (
            <div className="space-y-4">
              {/* Booking Status */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Booking ID</p>
                  <p className="font-mono text-sm">{selectedBooking.id.slice(0, 8)}</p>
                </div>
                <Badge variant={selectedBooking.status === 'confirmed' ? 'default' : 'secondary'}>
                  {selectedBooking.status}
                </Badge>
              </div>

              <Separator />

              {/* Listing Information */}
              {selectedListing && (
                <>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-2">
                      <Home className="h-4 w-4" />
                      Listing
                    </p>
                    <p className="font-semibold text-lg">{selectedListing.title}</p>
                    {selectedListing.location && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                        <MapPin className="h-3 w-3" />
                        {selectedListing.location}
                      </p>
                    )}
                  </div>
                  <Separator />
                </>
              )}

              {/* Guest Information */}
              {guestInfo && (
                <>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Guest Information
                    </p>
                    <div className="bg-muted/50 p-3 rounded-lg space-y-2">
                      <div>
                        <p className="text-sm text-muted-foreground">Name</p>
                        <p className="font-medium">{guestInfo.fullName}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Email</p>
                        <a
                          href={`mailto:${guestInfo.email}`}
                          className="text-sm text-primary hover:underline flex items-center gap-1"
                        >
                          <Mail className="h-3 w-3" />
                          {guestInfo.email}
                        </a>
                      </div>
                      {selectedBooking.guestId && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setBookingDialogOpen(false);
                            navigate(`/host/messages?userId=${selectedBooking.guestId}`);
                          }}
                          className="w-full mt-2"
                        >
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Message Guest
                        </Button>
                      )}
                    </div>
                  </div>
                  <Separator />
                </>
              )}

              {/* Booking Details */}
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Booking Details</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Check-in</p>
                    <p className="font-medium">{new Date(selectedBooking.checkIn).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Check-out</p>
                    <p className="font-medium">{new Date(selectedBooking.checkOut).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Number of Guests</p>
                    <p className="font-medium">{selectedBooking.guests} guest{selectedBooking.guests > 1 ? 's' : ''}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Price</p>
                    <p className="font-medium text-lg text-role-host">{formatPHP(selectedBooking.totalPrice || 0)}</p>
                  </div>
                </div>
              </div>

              {/* Discount Information */}
              {(selectedBooking.discountAmount || selectedBooking.couponCode) && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Discount Information</p>
                    <div className="space-y-1 text-sm">
                      {selectedBooking.couponCode && (
                        <p>
                          <span className="text-muted-foreground">Coupon Code: </span>
                          <span className="font-mono font-semibold">{selectedBooking.couponCode}</span>
                        </p>
                      )}
                      {selectedBooking.discountAmount && (
                        <p>
                          <span className="text-muted-foreground">Discount: </span>
                          <span className="font-semibold text-green-600">{formatPHP(selectedBooking.discountAmount)}</span>
                        </p>
                      )}
                      {selectedBooking.originalPrice && (
                        <p>
                          <span className="text-muted-foreground">Original Price: </span>
                          <span className="line-through">{formatPHP(selectedBooking.originalPrice)}</span>
                        </p>
                      )}
                    </div>
                  </div>
                </>
              )}

              <Separator />

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  variant="default"
                  className="flex-1"
                  onClick={() => {
                    setBookingDialogOpen(false);
                    navigate('/host/bookings');
                  }}
                >
                  View in Bookings
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setBookingDialogOpen(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <p>No booking selected</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

// Upcoming Bookings Component
const UpcomingBookings = () => {
  const { user } = useAuth();
  const [upcomingBookings, setUpcomingBookings] = useState<Booking[]>([]);
  const navigate = useNavigate();
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [guestInfo, setGuestInfo] = useState<{ fullName?: string; email?: string } | null>(null);
  const [loadingBookingDetails, setLoadingBookingDetails] = useState(false);

  useEffect(() => {
    if (!user) return;

    const unsubscribe = onSnapshot(
      query(collection(db, 'bookings'), where('hostId', '==', user.uid)),
      (snapshot) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const bookings = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as Booking))
          .filter(booking => {
            const checkIn = new Date(booking.checkIn);
            checkIn.setHours(0, 0, 0, 0);
            
            // Include bookings with check-in date after today
            // Exclude bookings that are already happening today (those go in Today's Schedule)
            const isAfterToday = checkIn.getTime() > today.getTime();
            
            // Only show confirmed or pending bookings
            const isValidStatus = booking.status === 'confirmed' || booking.status === 'pending';
            
            return isAfterToday && isValidStatus;
          })
          .sort((a, b) => new Date(a.checkIn).getTime() - new Date(b.checkIn).getTime());
        
        setUpcomingBookings(bookings);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const handleBookingClick = async (booking: Booking) => {
    setSelectedBooking(booking);
    setBookingDialogOpen(true);
    setLoadingBookingDetails(true);
    setSelectedListing(null);
    setGuestInfo(null);

    try {
      // Load listing and guest information in parallel
      const [listing, guest] = await Promise.all([
        booking.listingId ? getListing(booking.listingId, user?.uid).catch(() => null) : Promise.resolve(null),
        booking.guestId ? getUserProfile(booking.guestId).catch(() => null) : Promise.resolve(null),
      ]);

      if (listing) {
        setSelectedListing(listing);
      }

      if (guest) {
        setGuestInfo({
          fullName: guest.fullName || 'Guest',
          email: guest.email || 'N/A',
        });
      }
    } catch (error) {
      console.error('Error loading booking details:', error);
      toast.error('Failed to load booking details');
    } finally {
      setLoadingBookingDetails(false);
    }
  };

  return (
    <>
    <Card className="shadow-medium">
      <CardHeader>
        <CardTitle>Upcoming Bookings</CardTitle>
        <CardDescription>
          {upcomingBookings.length > 0 
            ? `${upcomingBookings.length} upcoming booking${upcomingBookings.length > 1 ? 's' : ''}`
            : 'No upcoming bookings'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {upcomingBookings.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No upcoming bookings scheduled.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {upcomingBookings.slice(0, 5).map((booking) => {
              const checkIn = new Date(booking.checkIn);
              const checkOut = new Date(booking.checkOut);
              
              // Calculate days until check-in
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const daysUntil = Math.ceil((checkIn.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

              return (
                <div
                  key={booking.id}
                  className="p-4 border rounded-lg hover:bg-role-host/10 hover:border-role-host/30 cursor-pointer transition-colors"
                    onClick={() => handleBookingClick(booking)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium">Check-in in {daysUntil} day{daysUntil !== 1 ? 's' : ''}</p>
                        <Badge variant={booking.status === 'confirmed' ? 'default' : 'secondary'}>
                          {booking.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {checkIn.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })} - {checkOut.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {booking.guests} guest{booking.guests > 1 ? 's' : ''} • {formatPHP(booking.totalPrice || 0)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
            {upcomingBookings.length > 5 && (
              <div className="pt-2 text-center">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => navigate('/host/bookings?filter=upcoming')}
                  className="text-primary"
                >
                  View all {upcomingBookings.length} upcoming bookings
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>

      {/* Booking Details Dialog */}
      <Dialog open={bookingDialogOpen} onOpenChange={setBookingDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Booking Details</DialogTitle>
            <DialogDescription>
              View detailed information about this booking
            </DialogDescription>
          </DialogHeader>
          {loadingBookingDetails ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-role-host" />
              <p className="ml-3 text-muted-foreground">Loading booking details...</p>
            </div>
          ) : selectedBooking ? (
            <div className="space-y-4">
              {/* Booking Status */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Booking ID</p>
                  <p className="font-mono text-sm">{selectedBooking.id.slice(0, 8)}</p>
                </div>
                <Badge variant={selectedBooking.status === 'confirmed' ? 'default' : 'secondary'}>
                  {selectedBooking.status}
                </Badge>
              </div>

              <Separator />

              {/* Listing Information */}
              {selectedListing && (
                <>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-2">
                      <Home className="h-4 w-4" />
                      Listing
                    </p>
                    <p className="font-semibold text-lg">{selectedListing.title}</p>
                    {selectedListing.location && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                        <MapPin className="h-3 w-3" />
                        {selectedListing.location}
                      </p>
                    )}
                  </div>
                  <Separator />
                </>
              )}

              {/* Guest Information */}
              {guestInfo && (
                <>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Guest Information
                    </p>
                    <div className="bg-muted/50 p-3 rounded-lg space-y-2">
                      <div>
                        <p className="text-sm text-muted-foreground">Name</p>
                        <p className="font-medium">{guestInfo.fullName}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Email</p>
                        <a
                          href={`mailto:${guestInfo.email}`}
                          className="text-sm text-primary hover:underline flex items-center gap-1"
                        >
                          <Mail className="h-3 w-3" />
                          {guestInfo.email}
                        </a>
                      </div>
                      {selectedBooking.guestId && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setBookingDialogOpen(false);
                            navigate(`/host/messages?userId=${selectedBooking.guestId}`);
                          }}
                          className="w-full mt-2"
                        >
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Message Guest
                        </Button>
                      )}
                    </div>
                  </div>
                  <Separator />
                </>
              )}

              {/* Booking Details */}
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Booking Details</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Check-in</p>
                    <p className="font-medium">{new Date(selectedBooking.checkIn).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Check-out</p>
                    <p className="font-medium">{new Date(selectedBooking.checkOut).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Number of Guests</p>
                    <p className="font-medium">{selectedBooking.guests} guest{selectedBooking.guests > 1 ? 's' : ''}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Price</p>
                    <p className="font-medium text-lg text-role-host">{formatPHP(selectedBooking.totalPrice || 0)}</p>
                  </div>
                </div>
              </div>

              {/* Discount Information */}
              {(selectedBooking.discountAmount || selectedBooking.couponCode) && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Discount Information</p>
                    <div className="space-y-1 text-sm">
                      {selectedBooking.couponCode && (
                        <p>
                          <span className="text-muted-foreground">Coupon Code: </span>
                          <span className="font-mono font-semibold">{selectedBooking.couponCode}</span>
                        </p>
                      )}
                      {selectedBooking.discountAmount && (
                        <p>
                          <span className="text-muted-foreground">Discount: </span>
                          <span className="font-semibold text-green-600">{formatPHP(selectedBooking.discountAmount)}</span>
                        </p>
                      )}
                      {selectedBooking.originalPrice && (
                        <p>
                          <span className="text-muted-foreground">Original Price: </span>
                          <span className="line-through">{formatPHP(selectedBooking.originalPrice)}</span>
                        </p>
                      )}
                    </div>
                  </div>
                </>
              )}

              <Separator />

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  variant="default"
                  className="flex-1"
                  onClick={() => {
                    setBookingDialogOpen(false);
                    navigate('/host/bookings');
                  }}
                >
                  View in Bookings
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setBookingDialogOpen(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <p>No booking selected</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

const HostDashboard = () => {
  const { user, userRole, userProfile, signOut, hasRole } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    activeListings: 0,
    upcomingBookings: 0,
    totalEarnings: 0,
  });
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [hasSubscription, setHasSubscription] = useState<boolean | null>(null);
  const [subscription, setSubscription] = useState<HostSubscription | null>(null);

  useEffect(() => {
    if (!user || !hasRole('host')) {
      navigate('/host/login');
      return;
    }

    // Check subscription status
    const checkSubscription = async () => {
      try {
        // Get subscription first (includes cancelled but not expired)
        const sub = await getUserSubscription(user.uid);
        if (sub) {
          setSubscription(sub);
          // Check if subscription hasn't expired (regardless of cancelled status)
          const hasActive = sub.endDate ? new Date(sub.endDate) > new Date() : sub.status === 'active';
          setHasSubscription(hasActive);
        } else {
          setHasSubscription(false);
          setSubscription(null);
        }
      } catch (error) {
        console.error('Error checking subscription:', error);
        setHasSubscription(false);
        setSubscription(null);
      }
    };

    checkSubscription();
    // Load real-time data
    loadDashboardData();

    // Set up real-time listeners
    const listingsUnsubscribe = onSnapshot(
      query(collection(db, 'listing'), where('hostId', '==', user.uid)),
      (snapshot) => {
        const activeListings = snapshot.docs.filter(
          doc => doc.data().status === 'approved'
        ).length;
        setStats(prev => ({ ...prev, activeListings }));
      }
    );

    const bookingsUnsubscribe = onSnapshot(
      query(collection(db, 'bookings'), where('hostId', '==', user.uid)),
      (snapshot) => {
        const now = new Date();
        const upcomingBookings = snapshot.docs.filter(doc => {
          const booking = doc.data();
          const checkIn = new Date(booking.checkIn);
          return checkIn >= now && booking.status === 'confirmed';
        }).length;

        const totalEarnings = snapshot.docs
          .filter(doc => doc.data().status === 'confirmed' || doc.data().status === 'completed')
          .reduce((sum, doc) => sum + (doc.data().totalPrice || 0), 0);

        setStats(prev => ({
          ...prev,
          upcomingBookings,
          totalEarnings,
        }));
      }
    );

    return () => {
      listingsUnsubscribe();
      bookingsUnsubscribe();
    };
  }, [user, userRole, navigate]);

  const loadDashboardData = async () => {
    if (!user) return;

    try {
      // Load bookings for today's schedule
      const bookings = await getBookings({ hostId: user.uid });
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const todayBookings = bookings.filter(booking => {
        const checkIn = new Date(booking.checkIn);
        checkIn.setHours(0, 0, 0, 0);
        return checkIn.getTime() === today.getTime();
      });

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60 shadow-soft">
        <div className="container mx-auto px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <Logo size="sm" />
            <div className="hidden sm:block p-2 rounded-lg bg-role-host/10">
              <Home className="w-5 h-5 text-role-host" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-base sm:text-lg font-bold truncate">
                Welcome, {userProfile?.fullName || 'Host'}!
              </h1>
              <p className="text-xs text-muted-foreground hidden sm:block">Manage your properties</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            <NotificationBell />
            <ThemeToggle />
            <Button variant="outline" onClick={() => setLogoutDialogOpen(true)} className="h-9 sm:h-auto text-xs sm:text-sm px-2 sm:px-4 touch-manipulation hover:bg-role-host/10 hover:text-role-host hover:border-role-host/30">
              <span className="hidden sm:inline">Sign Out</span>
              <span className="sm:hidden">Out</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Email Verification Banner */}
        <HostEmailVerificationBanner />

        {/* Subscription Status Banner - Only show if no subscription */}
        {hasSubscription === false && (
          <Card className="mb-6 border-yellow-500/50 bg-yellow-500/10">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold mb-1">Subscription Required</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    You need an active subscription to create and manage listings. Subscribe now to unlock all features.
                  </p>
                  <Button 
                    size="sm"
                    onClick={() => navigate('/host/register', { state: { from: 'dashboard' } })}
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    Subscribe Now
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-6 sm:mb-8">
          <Card 
            className="relative overflow-hidden border-0 shadow-md hover:shadow-xl hover:border-role-host/30 hover:bg-role-host/5 transition-all duration-300 group cursor-pointer hover:scale-105 active:scale-100"
            onClick={() => navigate('/host/listings')}
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-role-host" />
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Active Listings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-role-host">
                {stats.activeListings}
              </div>
            </CardContent>
          </Card>

          <Card 
            className="relative overflow-hidden border-0 shadow-md hover:shadow-xl hover:border-role-host/30 hover:bg-role-host/5 transition-all duration-300 group cursor-pointer hover:scale-105 active:scale-100"
            onClick={() => navigate('/host/bookings?filter=upcoming')}
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-role-host" />
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Upcoming Bookings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-role-host">
                {stats.upcomingBookings}
              </div>
            </CardContent>
          </Card>

          <Card 
            className="relative overflow-hidden border-0 shadow-md hover:shadow-xl hover:border-role-host/30 hover:bg-role-host/5 transition-all duration-300 group cursor-pointer"
            onClick={() => navigate('/host/earnings')}
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-role-host" />
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Total Earnings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-role-host">
                {formatPHP(stats.totalEarnings)}
              </div>
            </CardContent>
          </Card>

          <Card 
            className="relative overflow-hidden border-0 shadow-md hover:shadow-xl hover:border-role-host/30 hover:bg-role-host/5 transition-all duration-300 group cursor-pointer"
            onClick={() => navigate('/host/rewards')}
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-role-host" />
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                <Award className="h-4 w-4 text-role-host" />
                Points
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-role-host">
                {userProfile?.hostPoints || 0}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Hero Video Section */}
        <div className="relative mb-8 rounded-xl overflow-hidden h-64 md:h-80 lg:h-96 shadow-lg">
          <VideoBackground 
            src={landingVideo} 
            overlay={true}
            fallbackImage={heroImage}
          />
          
          {/* Enhanced Overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-black/60 via-black/40 to-black/60 z-10" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent z-10" />
          
          {/* Content */}
          <div className="relative z-20 h-full flex flex-col items-center justify-center text-center px-6">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 text-white drop-shadow-2xl">
              Welcome back, {userProfile?.fullName || 'Host'}!
            </h2>
            <p className="text-lg md:text-xl text-white/90 mb-6 max-w-2xl drop-shadow-lg">
              Manage your properties and track your performance
            </p>
            <Button 
              size="lg" 
              className="h-12 px-8 text-lg bg-role-host hover:bg-role-host/90 shadow-2xl hover:shadow-2xl hover:scale-105 transition-all"
              onClick={() => {
                if (!hasSubscription) {
                  toast.error('Subscription required to create listings');
                  navigate('/host/register');
                } else {
                  navigate('/host/create-listing');
                }
              }}
            >
              Create New Listing
            </Button>
          </div>
        </div>

        {/* Main Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-6 sm:mb-8">
          <Card 
            className={`shadow-medium hover:shadow-hover transition-smooth cursor-pointer ${
              !hasSubscription ? 'opacity-60' : ''
            }`} 
            onClick={() => {
              if (!hasSubscription) {
                toast.error('Subscription required to create listings');
                navigate('/host/register', { state: { from: 'dashboard' } });
              } else if (!userProfile?.emailVerified) {
                toast.error('Please verify your email address to create listings. Check your inbox for a verification code.');
              } else {
                navigate('/host/create-listing');
              }
            }}
          >
            <CardHeader>
              <Plus className="w-8 h-8 text-role-host mb-2" />
              <CardTitle>Create New Listing</CardTitle>
              <CardDescription>
                {!hasSubscription ? 'Subscribe to create listings' : 'Add a new property, experience, or service'}
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="shadow-medium hover:shadow-hover hover:border-role-host/50 hover:bg-role-host/5 transition-smooth cursor-pointer" onClick={() => navigate('/host/listings')}>
            <CardHeader>
              <Home className="w-8 h-8 text-role-host mb-2" />
              <CardTitle>My Listings</CardTitle>
              <CardDescription>View and manage your active listings</CardDescription>
            </CardHeader>
          </Card>

          <Card className="shadow-medium hover:shadow-hover hover:border-role-host/50 hover:bg-role-host/5 transition-smooth cursor-pointer" onClick={() => navigate('/host/bookings')}>
            <CardHeader>
              <Calendar className="w-8 h-8 text-role-host mb-2" />
              <CardTitle>Bookings</CardTitle>
              <CardDescription>Manage booking requests</CardDescription>
            </CardHeader>
          </Card>

          <Card className="shadow-medium hover:shadow-hover hover:border-role-host/50 hover:bg-role-host/5 transition-smooth cursor-pointer" onClick={() => navigate('/host/calendar')}>
            <CardHeader>
              <CalendarDays className="w-8 h-8 text-role-host mb-2" />
              <CardTitle>Calendar</CardTitle>
              <CardDescription>View bookings schedule</CardDescription>
            </CardHeader>
          </Card>

          <Card className="shadow-medium hover:shadow-hover hover:border-role-host/50 hover:bg-role-host/5 transition-smooth cursor-pointer" onClick={() => navigate('/host/messages')}>
            <CardHeader>
              <MessageSquare className="w-8 h-8 text-role-host mb-2" />
              <CardTitle>Messages</CardTitle>
              <CardDescription>Chat with guests and respond to inquiries</CardDescription>
            </CardHeader>
          </Card>

          <Card className="shadow-medium hover:shadow-hover hover:border-role-host/50 hover:bg-role-host/5 transition-smooth cursor-pointer" onClick={() => navigate('/host/payments')}>
            <CardHeader>
              <DollarSign className="w-8 h-8 text-role-host mb-2" />
              <CardTitle>Payments</CardTitle>
              <CardDescription>View earnings and payment methods</CardDescription>
            </CardHeader>
          </Card>

          <Card className="shadow-medium hover:shadow-hover hover:border-role-host/50 hover:bg-role-host/5 transition-smooth cursor-pointer" onClick={() => navigate('/host/settings?tab=subscription')}>
            <CardHeader>
              <Settings className="w-8 h-8 text-muted-foreground mb-2" />
              <CardTitle>Settings</CardTitle>
              <CardDescription>Manage your account and subscription</CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Today's Schedule and Upcoming Bookings */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6 sm:mb-8">
          <TodaySchedule />
          <UpcomingBookings />
        </div>
      </div>

      {/* Logout Confirmation Dialog */}
      <AlertDialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign Out</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to sign out? You'll need to sign in again to access your account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSignOut} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Sign Out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default HostDashboard;
