import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { getBookings, updateBooking } from "@/lib/firestore";
import { processBookingRefund } from "@/lib/paymentService";
import { collection, query, where, onSnapshot, doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar as CalendarIcon, X } from "lucide-react";
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { PayPalButton } from "@/components/payments/PayPalButton";
import type { Booking } from "@/types";
import { formatPHP } from "@/lib/currency";
import { BookingListSkeleton } from "@/components/ui/booking-skeleton";
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
  const filter = searchParams.get('filter'); // 'upcoming', 'past', or null

  useEffect(() => {
    if (!user) return;

    // Load wallet balance
    const loadWalletBalance = async () => {
      if (!user) return;
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        setWalletBalance(userDoc.data().walletBalance || 0);
      }
    };
    loadWalletBalance();

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
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/guest/dashboard')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="p-2 rounded-lg bg-secondary/10">
              <CalendarIcon className="w-5 h-5 text-secondary" />
            </div>
            <div>
              <h1 className="text-lg font-bold">
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
      
      <div className="max-w-4xl mx-auto p-6">

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
                    <div className="grid grid-cols-2 gap-4 mb-4">
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
    </div>
  );
};

export default MyBookings;
