import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { getBookings, updateBooking, createTransaction } from "@/lib/firestore";
import { collection, query, where, onSnapshot, doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar as CalendarIcon, X } from "lucide-react";
import { ThemeToggle } from '@/components/ui/theme-toggle';
import type { Booking } from "@/types";
import { formatPHP } from "@/lib/currency";
import LoadingScreen from "@/components/ui/loading-screen";
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
  const filter = searchParams.get('filter'); // 'upcoming' or null

  useEffect(() => {
    if (!user) return;

    setLoading(true);
    
    console.log('🔍 MyBookings: Setting up listener for guest:', user.uid);
    
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
        
        // Apply filter if specified
        let filteredBookings = bookingsData;
        if (filter === 'upcoming') {
          const now = new Date();
          filteredBookings = bookingsData.filter(b => {
            const checkIn = new Date(b.checkIn);
            return checkIn >= now && b.status === 'confirmed';
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
      
      // Process refund if there's a total price
      const refundAmount = bookingToCancel.totalPrice || 0;
      
      if (refundAmount > 0) {
        try {
          // Get current wallet balance
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (!userDoc.exists()) {
            throw new Error('User document not found');
          }

          const currentBalance = userDoc.data().walletBalance || 0;
          const newBalance = currentBalance + refundAmount;
          
          // Update wallet balance
          await updateDoc(doc(db, 'users', user.uid), {
            walletBalance: newBalance
          });
          
          // Create refund transaction
          await createTransaction({
            userId: user.uid,
            type: 'refund',
            amount: refundAmount,
            description: `Refund for cancelled ${bookingToCancel.status} booking #${bookingToCancel.id.slice(0, 8)}`,
            status: 'completed'
          });
          
          console.log('✅ Refund processed:', {
            bookingId: bookingToCancel.id,
            bookingStatus: bookingToCancel.status,
            refundAmount,
            previousBalance: currentBalance,
            newBalance
          });
        } catch (refundError: any) {
          console.error('Error processing refund:', refundError);
          // Don't fail the cancellation if refund fails, but log it
          toast.error(`Booking cancelled, but refund failed. Please contact support. Error: ${refundError.message}`);
        }
      }
      
      const refundMessage = refundAmount > 0 
        ? `${formatPHP(refundAmount)} has been refunded to your wallet.`
        : 'No refund was processed for this booking.';
      
      toast.success(`Booking cancelled successfully. ${refundMessage}`);
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
                {filter === 'upcoming' ? 'Upcoming Trips' : 'My Bookings'}
              </h1>
              <p className="text-xs text-muted-foreground">
                {filter === 'upcoming' ? 'Your confirmed upcoming trips' : 'View your trips'}
              </p>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>
      
      <div className="max-w-4xl mx-auto p-6">

        {loading ? (
          <LoadingScreen />
        ) : bookings.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <CalendarIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No bookings yet</p>
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
