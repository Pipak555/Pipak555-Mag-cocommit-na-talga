import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { getBookings, updateBooking, getUserProfile } from "@/lib/firestore";
import { processBookingPayment, processBookingRefund } from "@/lib/paymentService";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, RefreshCw, X, User, Mail, MessageSquare } from "lucide-react";
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
import type { Booking } from "@/types";
import { sendBookingConfirmationEmail } from "@/lib/emailjs";
import { formatPHP } from "@/lib/currency";
import { getDoc, doc, updateDoc, collection, query, where, orderBy, onSnapshot, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import LoadingScreen from "@/components/ui/loading-screen";

const HostBookings = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [declineDialogOpen, setDeclineDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [bookingToUpdate, setBookingToUpdate] = useState<{ id: string; action: 'confirmed' | 'cancelled' } | null>(null);
  const [guestInfoMap, setGuestInfoMap] = useState<Record<string, { fullName?: string; email?: string }>>({});

  useEffect(() => {
    if (!user) return;

    setLoading(true);
    
    // Only log in development
    if (import.meta.env.DEV) {
      console.log('🔍 HostBookings: Setting up listener for host:', user.uid);
    }
    
    // Start with simple query (no orderBy) to avoid index requirement
    // This will work immediately without needing indexes
    const bookingsQuery = query(
      collection(db, 'bookings'),
      where('hostId', '==', user.uid)
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
        
        console.log('📊 Real-time bookings update:', {
          hostUid: user.uid,
          count: bookingsData.length,
          allBookings: snapshot.docs.map(doc => ({
            id: doc.id,
            hostId: doc.data().hostId,
            hostIdType: typeof doc.data().hostId,
            guestId: doc.data().guestId,
            status: doc.data().status,
            listingId: doc.data().listingId,
            createdAt: doc.data().createdAt
          })),
          matchingBookings: bookingsData.filter(b => String(b.hostId) === String(user.uid)).length
        });
        
        // Filter to ensure only bookings with matching hostId (double-check with string conversion)
        const filteredBookings = bookingsData.filter(b => {
          const matches = String(b.hostId) === String(user.uid);
          if (!matches && b.hostId) {
            console.warn('⚠️ Booking hostId mismatch:', {
              bookingId: b.id,
              bookingHostId: b.hostId,
              bookingHostIdType: typeof b.hostId,
              currentHostUid: user.uid,
              currentHostUidType: typeof user.uid,
              match: matches
            });
          }
          return matches;
        });
        
        setBookings(filteredBookings);
        setLoading(false);
        
        // Load guest information for all bookings
        loadGuestInfo(filteredBookings);
        
        if (filteredBookings.length === 0 && bookingsData.length > 0) {
          console.warn('⚠️ Found bookings but none match hostId:', {
            hostUid: user.uid,
            bookingHostIds: bookingsData.map(b => ({
              id: b.id,
              hostId: b.hostId,
              hostIdType: typeof b.hostId
            }))
          });
        }
        
        // Also fetch all bookings for debugging if no matches found
        if (filteredBookings.length === 0) {
          console.log('🔍 Debug: No bookings found for host. Checking all bookings...');
          getAllBookingsForDebug(user.uid);
          
          // Also try a direct query to verify the issue
          checkDirectQuery(user.uid);
        }
      },
      (error: any) => {
        console.error('❌ Error in bookings listener:', error);
        setLoading(false);
        toast.error(`Failed to load bookings: ${error.message || 'Unknown error'}`);
        // Fallback to getBookings
        loadBookingsFallback();
      }
    );

    return () => unsubscribe();
  }, [user]);
  
  // Debug function to fetch all bookings
  const getAllBookingsForDebug = async (hostUid: string) => {
    try {
      const allBookingsQuery = query(collection(db, 'bookings'));
      const snapshot = await getDocs(allBookingsQuery);
      const allBookings = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      const matchingBookings = allBookings.filter((b: any) => String(b.hostId) === String(hostUid));
      
      console.log('🔍 DEBUG: All bookings in Firestore:', {
        total: allBookings.length,
        bookings: allBookings.map((b: any) => ({
          id: b.id,
          hostId: b.hostId,
          hostIdType: typeof b.hostId,
          guestId: b.guestId,
          status: b.status,
          listingId: b.listingId,
          createdAt: b.createdAt
        })),
        hostUidLookingFor: hostUid,
        matchingBookings: matchingBookings.length,
        matchingBookingDetails: matchingBookings.map((b: any) => ({
          id: b.id,
          hostId: b.hostId,
          guestId: b.guestId,
          status: b.status
        }))
      });
      
      if (matchingBookings.length > 0) {
        console.warn('⚠️ Found bookings with matching hostId in all bookings:', {
          hostUid,
          matchingBookingsCount: matchingBookings.length,
          possibleCauses: [
            'Firestore security rules may be blocking the where query',
            'Index not deployed yet for where clause',
            'Data type mismatch in query',
            'Query timing issue - booking may not be indexed yet'
          ]
        });
      }
    } catch (error: any) {
      console.error('❌ Error fetching all bookings for debug:', error);
      if (error.code === 'permission-denied') {
        console.error('🔒 Permission denied - check Firestore security rules for bookings collection');
      }
    }
  };
  
  // Direct query check
  const checkDirectQuery = async (hostUid: string) => {
    try {
      console.log('🔍 Testing direct query with hostId:', hostUid);
      const directQuery = query(
        collection(db, 'bookings'),
        where('hostId', '==', hostUid)
      );
      const snapshot = await getDocs(directQuery);
      const directBookings = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      console.log('📊 Direct query result:', {
        hostUid,
        count: directBookings.length,
        bookings: directBookings.map((b: any) => ({
          id: b.id,
          hostId: b.hostId,
          guestId: b.guestId,
          status: b.status
        }))
      });
    } catch (error: any) {
      console.error('❌ Direct query failed:', error);
      if (error.code === 'permission-denied') {
        console.error('🔒 Permission denied - Firestore rules may be blocking the query');
      }
    }
  };

  const loadBookingsFallback = async () => {
    if (!user) return;
    try {
      const data = await getBookings({ hostId: user.uid });
      setBookings(data);
      console.log('📊 Bookings loaded (fallback):', data.length, 'bookings');
      loadGuestInfo(data);
    } catch (error: any) {
      console.error('❌ Error in fallback load:', error);
      toast.error(`Failed to load bookings: ${error.message || 'Unknown error'}`);
    }
  };

  const loadGuestInfo = async (bookingsList: Booking[]) => {
    const guestIds = [...new Set(bookingsList.map(b => b.guestId).filter(Boolean))];
    const infoMap: Record<string, { fullName?: string; email?: string }> = {};
    
    await Promise.all(
      guestIds.map(async (guestId) => {
        try {
          const profile = await getUserProfile(guestId);
          if (profile) {
            infoMap[guestId] = {
              fullName: profile.fullName,
              email: profile.email
            };
          }
        } catch (error) {
          console.error(`Error loading guest info for ${guestId}:`, error);
        }
      })
    );
    
    setGuestInfoMap(infoMap);
  };

  const handleUpdateStatus = (id: string, status: 'confirmed' | 'cancelled') => {
    setBookingToUpdate({ id, action: status });
    if (status === 'confirmed') {
      setConfirmDialogOpen(true);
    } else {
      // Check if this is a confirmed booking being cancelled (needs refund) or a pending booking being declined
      const booking = bookings.find(b => b.id === id);
      if (booking?.status === 'confirmed') {
        setCancelDialogOpen(true);
      } else {
        setDeclineDialogOpen(true);
      }
    }
  };

  const confirmStatusUpdate = async () => {
    if (!bookingToUpdate) return;
    try {
      // Get booking details before updating
      const bookingDoc = await getDoc(doc(db, 'bookings', bookingToUpdate.id));
      if (!bookingDoc.exists()) {
        toast.error('Booking not found');
        return;
      }
      
      const booking = { id: bookingDoc.id, ...bookingDoc.data() } as Booking;
      const previousStatus = booking.status;
      
      // Update booking status
      await updateBooking(bookingToUpdate.id, { status: bookingToUpdate.action });
      
      // If booking is confirmed, process payment
      if (bookingToUpdate.action === 'confirmed' && previousStatus !== 'confirmed') {
        try {
          // Try wallet payment first
          let paymentResult;
          try {
            paymentResult = await processBookingPayment(booking, 'wallet');
          } catch (walletError: any) {
            // If wallet payment fails due to insufficient balance, try PayPal
            if (walletError.message?.includes('Insufficient wallet balance')) {
              console.log('⚠️ Wallet payment failed, checking for PayPal payment...');
              try {
                paymentResult = await processBookingPayment(booking, 'paypal');
              } catch (paypalError: any) {
                // Revert booking status if both payment methods fail
                await updateBooking(bookingToUpdate.id, { status: previousStatus });
                toast.error(`Payment failed: Guest has insufficient wallet balance. They need to complete PayPal payment first.`);
                return;
              }
            } else {
              throw walletError;
            }
          }
          
          if (paymentResult.success) {
            console.log('✅ Payment processed successfully:', paymentResult);
            toast.success(`Booking confirmed! Payment of ${formatPHP(booking.totalPrice || 0)} processed.`);
          } else {
            throw new Error('Payment processing failed');
          }
        } catch (paymentError: any) {
          console.error('Error processing payment:', paymentError);
          // Revert booking status if payment failed
          await updateBooking(bookingToUpdate.id, { status: previousStatus });
          toast.error(`Payment failed: ${paymentError.message || 'Insufficient balance or processing error'}`);
          return;
        }
      }
      
      // If booking is cancelled and was confirmed, process refund
      if (bookingToUpdate.action === 'cancelled' && previousStatus === 'confirmed') {
        try {
          // Process refund using payment service
          const refundResult = await processBookingRefund(booking, 'host');
          
          if (refundResult.success) {
            console.log('✅ Refund processed successfully:', refundResult);
            toast.success(`Booking cancelled. ${formatPHP(refundResult.refundAmount || 0)} has been refunded to guest's wallet.`);
          } else {
            throw new Error('Refund processing failed');
          }
        } catch (refundError: any) {
          console.error('Error processing refund:', refundError);
          toast.warning('Booking cancelled, but refund could not be processed. Please contact support.');
        }
      } else if (bookingToUpdate.action === 'cancelled') {
        toast.success('Booking cancelled');
      }
      
      // If booking is confirmed, send confirmation email to guest
      if (bookingToUpdate.action === 'confirmed') {
        try {
          // Get booking details
          const bookingDoc = await getDoc(doc(db, 'bookings', bookingToUpdate.id));
          if (bookingDoc.exists()) {
            const booking = bookingDoc.data();
            
            // Get listing details
            const listingDoc = await getDoc(doc(db, 'listing', booking.listingId));
            if (listingDoc.exists()) {
              const listing = listingDoc.data();
              
              // Get guest details
              try {
                const guestDoc = await getDoc(doc(db, 'users', booking.guestId));
                if (guestDoc.exists()) {
                  const guestData = guestDoc.data();
                  
                  console.log('📧 Preparing to send confirmation email to guest:', {
                    guestId: booking.guestId,
                    guestEmail: guestData.email,
                    guestName: guestData.fullName
                  });
                  
                  // Send confirmation email to guest
                  const emailSent = await sendBookingConfirmationEmail(
                    guestData.email || booking.guestId,
                    guestData.fullName || 'Guest',
                    listing.title || 'Your Booking',
                    listing.location || '',
                    booking.checkIn,
                    booking.checkOut,
                    booking.guests || 1,
                    booking.totalPrice || 0,
                    bookingToUpdate.id
                  );
                  
                  if (emailSent) {
                    toast.success('Booking confirmed and confirmation email sent to guest!');
                  } else {
                    toast.warning('Booking confirmed, but email could not be sent. Please check EmailJS configuration.');
                  }
                } else {
                  console.warn('Guest document not found for booking:', booking.guestId);
                  toast.warning('Booking confirmed, but guest email not found.');
                }
              } catch (guestError: any) {
                console.error('❌ Error fetching guest document:', guestError);
                if (guestError.code === 'permission-denied') {
                  toast.error('Permission denied: Cannot access guest information. Please check Firestore rules.');
                } else {
                  toast.warning('Booking confirmed, but could not fetch guest information for email.');
                }
              }
            } else {
              console.warn('Listing document not found for booking:', booking.listingId);
              toast.success('Booking confirmed, but listing details not found.');
            }
          } else {
            console.warn('Booking document not found:', bookingToUpdate.id);
            toast.success('Booking confirmed, but details not found for email.');
          }
        } catch (emailError) {
          console.error('Failed to send confirmation email:', emailError);
          toast.success('Booking confirmed, but email could not be sent.');
          // Don't fail the booking update if email fails
        }
      } else if (bookingToUpdate.action === 'cancelled') {
        // Already handled refund above, just show success message
        if (booking?.status !== 'confirmed') {
          toast.success('Booking declined');
        }
      }
      
      // Bookings will update automatically via real-time listener
      setBookingToUpdate(null);
    } catch (error) {
      console.error('Error updating booking:', error);
      toast.error("Failed to update booking");
    } finally {
      setConfirmDialogOpen(false);
      setDeclineDialogOpen(false);
      setCancelDialogOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60 shadow-soft">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/host/dashboard')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="p-2 rounded-lg bg-secondary/10">
              <Calendar className="w-5 h-5 text-secondary" />
            </div>
            <div>
              <h1 className="text-lg font-bold">Booking Requests</h1>
              <p className="text-xs text-muted-foreground">Manage reservations</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => {
                console.log('🔄 Manual refresh triggered for host:', user?.uid);
                loadBookingsFallback();
              }}
              title="Refresh bookings"
            >
              <RefreshCw className="h-5 w-5" />
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </header>
      
      <div className="max-w-6xl mx-auto p-6">

        {loading ? (
          <LoadingScreen />
        ) : bookings.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">No booking requests</p>
              <p className="text-xs text-muted-foreground">
                Bookings will appear here when guests make reservation requests for your listings.
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Current host ID: {user?.uid}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {bookings.map((booking) => (
              <Card key={booking.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Booking #{booking.id.slice(0, 8)}</CardTitle>
                    <Badge>{booking.status}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Guest Information */}
                    {booking.guestId && guestInfoMap[booking.guestId] && (
                      <div className="bg-muted/50 p-3 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-1">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <div className="flex-1">
                              <p className="text-sm font-medium">
                                {guestInfoMap[booking.guestId].fullName || 'Guest'}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <Mail className="h-3 w-3 text-muted-foreground" />
                                <a 
                                  href={`mailto:${guestInfoMap[booking.guestId].email}`}
                                  className="text-xs text-primary hover:underline"
                                >
                                  {guestInfoMap[booking.guestId].email}
                                </a>
                              </div>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/host/messages?userId=${booking.guestId}`)}
                            className="flex items-center gap-2"
                          >
                            <MessageSquare className="h-4 w-4" />
                            Message
                          </Button>
                        </div>
                      </div>
                    )}
                    
                    {/* Booking Details */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
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
                        <p className="font-medium">{booking.guests || 1} guest{(booking.guests || 1) > 1 ? 's' : ''}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Total</p>
                        <p className="font-medium">{formatPHP(booking.totalPrice || 0)}</p>
                      </div>
                    </div>
                    
                    {/* Action buttons for pending bookings */}
                    {booking.status === 'pending' && (
                      <div className="flex gap-2 pt-2">
                        <Button 
                          size="sm"
                          onClick={() => handleUpdateStatus(booking.id, 'confirmed')}
                          className="flex-1"
                        >
                          Confirm
                        </Button>
                        <Button 
                          size="sm"
                          variant="destructive"
                          onClick={() => handleUpdateStatus(booking.id, 'cancelled')}
                          className="flex-1"
                        >
                          Decline
                        </Button>
                      </div>
                    )}
                    
                    {/* Cancel button for confirmed upcoming bookings */}
                    {booking.status === 'confirmed' && new Date(booking.checkIn) >= new Date() && (
                      <div className="pt-2 border-t">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleUpdateStatus(booking.id, 'cancelled')}
                          className="w-full"
                        >
                          <X className="h-4 w-4 mr-2" />
                          Cancel Booking
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Confirm Booking Dialog */}
      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Booking?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to confirm this booking? The guest will be notified and the booking will be finalized.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setBookingToUpdate(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmStatusUpdate}>Confirm Booking</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Decline Booking Dialog */}
      <AlertDialog open={declineDialogOpen} onOpenChange={setDeclineDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Decline Booking?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to decline this booking request? The guest will be notified and this action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setBookingToUpdate(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmStatusUpdate} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Decline Booking
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel Confirmed Booking Dialog */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Booking?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this confirmed booking?
              {bookingToUpdate && (() => {
                const booking = bookings.find(b => b.id === bookingToUpdate.id);
                return booking && booking.totalPrice > 0 ? (
                  <div className="mt-2 p-3 bg-muted rounded-md">
                    <p className="text-sm font-medium">Refund Information:</p>
                    <p className="text-sm text-muted-foreground">
                      A refund of {formatPHP(booking.totalPrice)} will be credited to the guest's wallet balance.
                    </p>
                  </div>
                ) : null;
              })()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setBookingToUpdate(null)}>Keep Booking</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmStatusUpdate} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Cancel Booking
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default HostBookings;
