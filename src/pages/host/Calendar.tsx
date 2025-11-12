import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  X,
  Filter,
  Grid3x3,
  List
} from 'lucide-react';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import Logo from '@/components/shared/Logo';
import { BackButton } from '@/components/shared/BackButton';
import { collection, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Booking, Listing } from '@/types';
import { formatPHP } from '@/lib/currency';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

interface BookingWithListing extends Booking {
  listingTitle?: string;
  listingLocation?: string;
  guestName?: string;
}

type ViewMode = 'month' | 'week' | 'list';

const HostCalendar = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [bookings, setBookings] = useState<BookingWithListing[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [selectedListing, setSelectedListing] = useState<string>('all');
  const [selectedBooking, setSelectedBooking] = useState<BookingWithListing | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [signOutDialogOpen, setSignOutDialogOpen] = useState(false);

  // Fetch listings
  useEffect(() => {
    if (!user) return;

    const listingsQuery = query(
      collection(db, 'listing'),
      where('hostId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(listingsQuery, (snapshot) => {
      const listingsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Listing));
      setListings(listingsData);
    });

    return () => unsubscribe();
  }, [user]);

  // Fetch bookings with real-time updates
  useEffect(() => {
    if (!user) return;

    setLoading(true);

    const bookingsQuery = query(
      collection(db, 'bookings'),
      where('hostId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(bookingsQuery, async (snapshot) => {
      const bookingsData = await Promise.all(
        snapshot.docs.map(async (bookingDoc) => {
          const booking = { id: bookingDoc.id, ...bookingDoc.data() } as BookingWithListing;

          // Fetch listing details
          if (booking.listingId) {
            const listingDocRef = doc(db, 'listing', booking.listingId);
            const listingDoc = await getDoc(listingDocRef);
            if (listingDoc.exists()) {
              const listingData = listingDoc.data();
              booking.listingTitle = listingData?.title;
              booking.listingLocation = listingData?.location;
            }
          }

          // Fetch guest details
          if (booking.guestId) {
            const userDocRef = doc(db, 'users', booking.guestId);
            const userDoc = await getDoc(userDocRef);
            if (userDoc.exists()) {
              booking.guestName = userDoc.data()?.fullName;
            }
          }

          return booking;
        })
      );

      setBookings(bookingsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Get status color
  const getStatusColor = (booking: BookingWithListing) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkOut = new Date(booking.checkOut);
    checkOut.setHours(0, 0, 0, 0);

    // Completed bookings
    if (checkOut < today && booking.status === 'confirmed') {
      return 'bg-green-500'; // Successful
    }

    // Upcoming bookings (including today)
    if (booking.status === 'confirmed') {
      return 'bg-blue-500'; // Upcoming
    }

    // Pending
    if (booking.status === 'pending') {
      return 'bg-orange-500';
    }

    // Cancelled
    if (booking.status === 'cancelled') {
      return 'bg-gray-400';
    }

    return 'bg-gray-400';
  };

  // Get status label
  const getStatusLabel = (booking: BookingWithListing) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkOut = new Date(booking.checkOut);
    checkOut.setHours(0, 0, 0, 0);

    // Completed bookings
    if (checkOut < today && booking.status === 'confirmed') {
      return 'Successful';
    }

    // Upcoming bookings (including today)
    if (booking.status === 'confirmed') {
      return 'Upcoming';
    }

    if (booking.status === 'pending') {
      return 'Pending';
    }

    if (booking.status === 'cancelled') {
      return 'Cancelled';
    }

    return booking.status;
  };

  // Generate calendar days
  const generateCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: (Date | null)[] = [];

    // Add empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  };

  // Get bookings for a specific date
  const getBookingsForDate = (date: Date | null) => {
    if (!date) return [];

    const dateStr = date.toISOString().split('T')[0];

    let filtered = bookings.filter(booking => {
      // Exclude cancelled bookings from calendar display
      if (booking.status === 'cancelled') {
        return false;
      }

      const checkIn = new Date(booking.checkIn);
      const checkOut = new Date(booking.checkOut);
      checkIn.setHours(0, 0, 0, 0);
      checkOut.setHours(0, 0, 0, 0);
      date.setHours(0, 0, 0, 0);

      return date >= checkIn && date <= checkOut;
    });

    // Filter by selected listing
    if (selectedListing !== 'all') {
      filtered = filtered.filter(b => b.listingId === selectedListing);
    }

    return filtered;
  };

  // Navigate months
  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Handle booking click
  const handleBookingClick = (booking: BookingWithListing) => {
    setSelectedBooking(booking);
    setDialogOpen(true);
  };

  // Handle sign out
  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const calendarDays = generateCalendarDays();
  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Filter bookings for list view
  const getFilteredBookings = () => {
    // Exclude cancelled bookings from list view
    let filtered = bookings.filter(booking => booking.status !== 'cancelled');

    if (selectedListing !== 'all') {
      filtered = filtered.filter(b => b.listingId === selectedListing);
    }

    // Sort by check-in date
    filtered.sort((a, b) => new Date(a.checkIn).getTime() - new Date(b.checkIn).getTime());

    return filtered;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60 shadow-soft">
        <div className="container mx-auto px-3 sm:px-4 md:px-6 py-3 sm:py-4 flex justify-between items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <BackButton to="/host/dashboard" label="Back to Dashboard" />
            <Logo size="sm" />
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            <NotificationBell />
            <ThemeToggle />
            <Button variant="outline" onClick={() => setSignOutDialogOpen(true)} className="h-9 sm:h-auto text-xs sm:text-sm px-2 sm:px-4 touch-manipulation">
              <span className="hidden sm:inline">Sign Out</span>
              <span className="sm:hidden">Out</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8">
        {/* Back Button */}
        <BackButton to="/host/dashboard" label="Back to Dashboard" className="mb-4 sm:mb-6" />
        
        {/* Page Header */}
        <div className="mb-4 sm:mb-6 md:mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2">Booking Calendar</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Manage your bookings and availability
          </p>
        </div>

        {/* Controls */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              {/* Date Navigation */}
              <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" onClick={previousMonth}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <h2 className="text-xl font-semibold min-w-[200px] text-center">
                  {monthName}
                </h2>
                <Button variant="outline" size="icon" onClick={nextMonth}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button variant="outline" onClick={goToToday}>
                  Today
                </Button>
              </div>

              {/* Filters and View Mode */}
              <div className="flex items-center gap-4">
                {/* Listing Filter */}
                <Select value={selectedListing} onValueChange={setSelectedListing}>
                  <SelectTrigger className="w-[200px]">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="All Properties" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Properties</SelectItem>
                    {listings.map(listing => (
                      <SelectItem key={listing.id} value={listing.id}>
                        {listing.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* View Mode Toggle */}
                <div className="flex items-center gap-2 border rounded-md p-1">
                  <Button
                    variant={viewMode === 'month' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('month')}
                  >
                    <Grid3x3 className="h-4 w-4 mr-2" />
                    Month
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                  >
                    <List className="h-4 w-4 mr-2" />
                    List
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Legend */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-wrap items-center gap-4 sm:gap-6">
              {/* Today */}
              <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-primary/5 border border-primary/20 hover:bg-primary/10 transition-colors">
                <div className="w-5 h-5 rounded-md border-2 border-primary bg-primary/10 flex items-center justify-center shadow-sm">
                  <CalendarIcon className="h-3 w-3 text-primary" />
                </div>
                <span className="text-sm font-semibold text-primary">Today</span>
              </div>
              
              <div className="h-6 w-px bg-border hidden sm:block"></div>
              
              {/* Upcoming */}
              <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-blue-500/5 border border-blue-500/20 hover:bg-blue-500/10 transition-colors">
                <div className="w-4 h-4 rounded-md bg-blue-500 shadow-sm ring-2 ring-blue-500/20"></div>
                <span className="text-sm font-medium">Upcoming</span>
              </div>
              
              {/* Successful */}
              <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-green-500/5 border border-green-500/20 hover:bg-green-500/10 transition-colors">
                <div className="w-4 h-4 rounded-md bg-green-500 shadow-sm ring-2 ring-green-500/20"></div>
                <span className="text-sm font-medium">Successful</span>
              </div>
              
              {/* Pending */}
              <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-orange-500/5 border border-orange-500/20 hover:bg-orange-500/10 transition-colors">
                <div className="w-4 h-4 rounded-md bg-orange-500 shadow-sm ring-2 ring-orange-500/20"></div>
                <span className="text-sm font-medium">Pending</span>
              </div>
              
              {/* Cancelled */}
              <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-gray-500/5 border border-gray-500/20 hover:bg-gray-500/10 transition-colors">
                <div className="w-4 h-4 rounded-md bg-gray-400 dark:bg-gray-500 shadow-sm ring-2 ring-gray-400/20 dark:ring-gray-500/20"></div>
                <span className="text-sm font-medium">Cancelled</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Calendar View */}
        {viewMode === 'month' && (
          <Card>
            <CardContent className="p-6">
              {/* Weekday Headers */}
              <div className="grid grid-cols-7 gap-2 mb-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="text-center font-semibold text-sm py-2">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-2">
                {calendarDays.map((date, index) => {
                  const dayBookings = date ? getBookingsForDate(date) : [];
                  const isToday = date && date.toDateString() === new Date().toDateString();

                  return (
                    <div
                      key={index}
                      className={`
                        min-h-[120px] border rounded-lg p-2 relative
                        ${date ? 'bg-card hover:bg-muted/50 cursor-pointer' : 'bg-muted/20'}
                        ${isToday ? 'border-primary border-2 bg-primary/5' : ''}
                        transition-colors
                      `}
                    >
                      {date && (
                        <>
                          <div className={`text-sm font-medium mb-2 flex items-center gap-1.5 ${isToday ? 'text-primary font-bold' : ''}`}>
                            <span className={isToday ? 'text-base' : ''}>{date.getDate()}</span>
                            {isToday && (
                              <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-md font-medium shadow-sm">
                                Today
                              </span>
                            )}
                          </div>
                          <div className="space-y-1.5">
                            {dayBookings.slice(0, 3).map((booking, i) => {
                              const today = new Date();
                              today.setHours(0, 0, 0, 0);
                              const checkOut = new Date(booking.checkOut);
                              checkOut.setHours(0, 0, 0, 0);
                              
                              // Determine status
                              const isSuccessful = booking.status === 'completed' || (checkOut < today && booking.status === 'confirmed');
                              const isUpcoming = booking.status === 'confirmed' && checkOut >= today;
                              const isPending = booking.status === 'pending';
                              const isCancelled = booking.status === 'cancelled';
                              
                              return (
                                <div
                                  key={i}
                                  className={`
                                    text-xs px-2.5 py-1.5 rounded-md cursor-pointer 
                                    transition-all duration-200 hover:scale-[1.02] hover:shadow-md active:scale-[0.98]
                                    truncate font-medium shadow-sm
                                    ${
                                      isSuccessful
                                        ? 'bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700 border border-green-400/30' 
                                        : isUpcoming
                                        ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 border border-blue-400/30'
                                        : isPending
                                        ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700 border border-orange-400/30'
                                        : isCancelled
                                        ? 'bg-gradient-to-r from-gray-400 to-gray-500 dark:from-gray-500 dark:to-gray-600 text-white hover:from-gray-500 hover:to-gray-600 dark:hover:from-gray-600 dark:hover:to-gray-700 border border-gray-300/30 dark:border-gray-400/30'
                                        : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 border border-blue-400/30'
                                    }
                                  `}
                                  onClick={() => handleBookingClick(booking)}
                                  title={`${booking.listingTitle} - ${getStatusLabel(booking)}`}
                                >
                                  <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                      isSuccessful ? 'bg-green-200 ring-2 ring-green-300/50' 
                                      : isUpcoming ? 'bg-blue-200 ring-2 ring-blue-300/50'
                                      : isPending ? 'bg-orange-200 ring-2 ring-orange-300/50'
                                      : isCancelled ? 'bg-gray-200 ring-2 ring-gray-300/50'
                                      : 'bg-blue-200 ring-2 ring-blue-300/50'
                                    }`}></div>
                                    <span className="truncate flex-1 leading-tight">{booking.listingTitle}</span>
                                  </div>
                                </div>
                              );
                            })}
                            {dayBookings.length > 3 && (
                              <div className="text-xs text-muted-foreground font-medium px-2.5 py-1.5 bg-muted/60 dark:bg-muted/40 rounded-md text-center border border-border/50 hover:bg-muted/80 transition-colors">
                                +{dayBookings.length - 3} more
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* List View */}
        {viewMode === 'list' && (
          <Card>
            <CardHeader>
              <CardTitle>All Bookings</CardTitle>
              <CardDescription>
                {getFilteredBookings().length} booking{getFilteredBookings().length !== 1 ? 's' : ''}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading bookings...
                </div>
              ) : getFilteredBookings().length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CalendarIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No bookings found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {getFilteredBookings().map(booking => (
                    <div
                      key={booking.id}
                      className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => handleBookingClick(booking)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold">{booking.listingTitle}</h3>
                            <Badge className={getStatusColor(booking)}>
                              {getStatusLabel(booking)}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-1">
                            📍 {booking.listingLocation}
                          </p>
                          <p className="text-sm text-muted-foreground mb-1">
                            👤 {booking.guestName || 'Guest'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            📅 {new Date(booking.checkIn).toLocaleDateString()} - {new Date(booking.checkOut).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-lg">{formatPHP(booking.totalPrice || 0)}</p>
                          <p className="text-sm text-muted-foreground">
                            {booking.guests} guest{booking.guests !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </main>

      {/* Booking Details Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Booking Details</DialogTitle>
            <DialogDescription>
              View booking information
            </DialogDescription>
          </DialogHeader>
          {selectedBooking && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">{selectedBooking.listingTitle}</h3>
                <Badge className={getStatusColor(selectedBooking)}>
                  {getStatusLabel(selectedBooking)}
                </Badge>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Check-in</p>
                  <p className="font-medium">{new Date(selectedBooking.checkIn).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Check-out</p>
                  <p className="font-medium">{new Date(selectedBooking.checkOut).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Guest</p>
                  <p className="font-medium">{selectedBooking.guestName || 'Guest'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Guests</p>
                  <p className="font-medium">{selectedBooking.guests}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Price</p>
                  <p className="font-medium text-lg">{formatPHP(selectedBooking.totalPrice || 0)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Booking ID</p>
                  <p className="font-medium text-sm">{selectedBooking.id.slice(0, 8)}...</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-1">Location</p>
                <p className="font-medium">{selectedBooking.listingLocation}</p>
              </div>

              <div className="flex gap-2">
                <Button 
                  variant="default" 
                  className="flex-1"
                  onClick={() => {
                    navigate('/host/bookings');
                    setDialogOpen(false);
                  }}
                >
                  View in Bookings
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Sign Out Confirmation */}
      <AlertDialog open={signOutDialogOpen} onOpenChange={setSignOutDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign Out?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to sign out?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSignOut}>Sign Out</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default HostCalendar;

