import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { getBookings, updateBooking } from "@/lib/firestore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar } from "lucide-react";
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

const HostBookings = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [declineDialogOpen, setDeclineDialogOpen] = useState(false);
  const [bookingToUpdate, setBookingToUpdate] = useState<{ id: string; action: 'confirmed' | 'cancelled' } | null>(null);

  useEffect(() => {
    if (user) {
      loadBookings();
    }
  }, [user]);

  const loadBookings = async () => {
    if (!user) return;
    try {
      const data = await getBookings({ hostId: user.uid });
      setBookings(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = (id: string, status: 'confirmed' | 'cancelled') => {
    setBookingToUpdate({ id, action: status });
    if (status === 'confirmed') {
      setConfirmDialogOpen(true);
    } else {
      setDeclineDialogOpen(true);
    }
  };

  const confirmStatusUpdate = async () => {
    if (!bookingToUpdate) return;
    try {
      await updateBooking(bookingToUpdate.id, { status: bookingToUpdate.action });
      toast.success(`Booking ${bookingToUpdate.action}`);
      loadBookings();
      setBookingToUpdate(null);
    } catch (error) {
      toast.error("Failed to update booking");
    } finally {
      setConfirmDialogOpen(false);
      setDeclineDialogOpen(false);
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
          <ThemeToggle />
        </div>
      </header>
      
      <div className="max-w-6xl mx-auto p-6">

        {loading ? (
          <p>Loading...</p>
        ) : bookings.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <p>No booking requests</p>
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
                  <div className="flex items-center justify-between">
                    <div className="grid grid-cols-3 gap-4 flex-1">
                      <div>
                        <p className="text-sm text-muted-foreground">Check-in</p>
                        <p className="font-medium">{new Date(booking.checkIn).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Check-out</p>
                        <p className="font-medium">{new Date(booking.checkOut).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Total</p>
                        <p className="font-medium">${booking.totalPrice}</p>
                      </div>
                    </div>
                    
                    {booking.status === 'pending' && (
                      <div className="flex gap-2">
                        <Button 
                          size="sm"
                          onClick={() => handleUpdateStatus(booking.id, 'confirmed')}
                        >
                          Confirm
                        </Button>
                        <Button 
                          size="sm"
                          variant="destructive"
                          onClick={() => handleUpdateStatus(booking.id, 'cancelled')}
                        >
                          Decline
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
    </div>
  );
};

export default HostBookings;
