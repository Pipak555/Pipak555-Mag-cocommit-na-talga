import { useEffect, useState, useCallback, useMemo } from 'react';
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
  Filter
} from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
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

type StatusFilter = 'all' | 'today' | 'upcoming' | 'successful' | 'pending' | 'cancelled';

const HostCalendar = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [bookings, setBookings] = useState<BookingWithListing[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedListing, setSelectedListing] = useState<string>('all');
  const [selectedBooking, setSelectedBooking] = useState<BookingWithListing | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [signOutDialogOpen, setSignOutDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  // Fetch listings - only show approved listings (exclude draft, pending, rejected)
  useEffect(() => {
    if (!user) return;

    const listingsQuery = query(
      collection(db, 'listing'),
      where('hostId', '==', user.uid),
      where('status', '==', 'approved')
    );

    const unsubscribe = onSnapshot(listingsQuery, (snapshot) => {
      const listingsData = snapshot.docs
        .map(doc => ({
        id: doc.id,
        ...doc.data()
        } as Listing))
        // Client-side safety filter: only include approved listings (exclude draft, pending, rejected)
        .filter(listing => {
          const status = listing.status?.toLowerCase();
          // Only show approved listings - explicitly exclude draft, pending, and rejected
          return status === 'approved';
        });
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
    // Completed bookings - always green
    if (booking.status === 'completed') {
      return 'bg-green-500'; // Successful/Completed
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkOut = new Date(booking.checkOut);
    checkOut.setHours(0, 0, 0, 0);

    // Confirmed bookings that have passed checkout date
    if (checkOut < today && booking.status === 'confirmed') {
      return 'bg-green-500'; // Successful
    }

    // Upcoming confirmed bookings (including today)
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
    // Completed bookings
    if (booking.status === 'completed') {
      return 'Completed';
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkOut = new Date(booking.checkOut);
    checkOut.setHours(0, 0, 0, 0);

    // Confirmed bookings that have passed checkout date
    if (checkOut < today && booking.status === 'confirmed') {
      return 'Successful';
    }

    // Upcoming confirmed bookings (including today)
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

  // Get bookings for a specific date - strictly uses database checkIn/checkOut dates
  const getBookingsForDate = (date: Date | null) => {
    if (!date) return [];

    const filteredBookings = getFilteredBookingsForCalendar();
    
    // Get the calendar date string in YYYY-MM-DD format (use local date to match calendar display)
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    return filteredBookings.filter(booking => {
      // Extract date strings from ISO dates (UTC dates from database)
      // The date part of an ISO string represents the UTC date
      const checkInStr = booking.checkIn.split('T')[0];
      const checkOutStr = booking.checkOut.split('T')[0];

      // Compare calendar date (local) with booking dates (UTC date strings)
      // This ensures we're comparing the actual calendar day with the booking date range
      return dateStr >= checkInStr && dateStr <= checkOutStr;
    });
  };

  // Get bookings based on status filter
  const getFilteredBookingsForCalendar = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let filtered = bookings;
    
    // Filter by status
    if (statusFilter === 'today') {
      filtered = bookings.filter(booking => {
        const checkIn = new Date(booking.checkIn);
        checkIn.setHours(0, 0, 0, 0);
        return checkIn.getTime() === today.getTime() && booking.status !== 'cancelled';
      });
    } else if (statusFilter === 'upcoming') {
      filtered = bookings.filter(booking => {
      const checkIn = new Date(booking.checkIn);
        checkIn.setHours(0, 0, 0, 0);
        return checkIn > today && booking.status === 'confirmed';
      });
    } else if (statusFilter === 'successful') {
      filtered = bookings.filter(booking => {
        // Include completed bookings
        if (booking.status === 'completed') {
          return true;
        }
        // Include confirmed bookings that have passed checkout
      const checkOut = new Date(booking.checkOut);
      checkOut.setHours(0, 0, 0, 0);
        return checkOut < today && booking.status === 'confirmed';
    });
    } else if (statusFilter === 'pending') {
      filtered = bookings.filter(booking => booking.status === 'pending');
    } else if (statusFilter === 'cancelled') {
      filtered = bookings.filter(booking => booking.status === 'cancelled');
    } else {
      // 'all' - show all non-cancelled bookings
      filtered = bookings.filter(booking => booking.status !== 'cancelled');
    }

    // Filter by selected listing
    if (selectedListing !== 'all') {
      filtered = filtered.filter(b => b.listingId === selectedListing);
    }

    return filtered;
  };

  // Get confirmed bookings for calendar display
  const getConfirmedBookings = () => {
    return getFilteredBookingsForCalendar().filter(booking => booking.status === 'confirmed');
  };

  // Check if a date has bookings (based on current filter) - strictly uses database dates
  const isDateBooked = useCallback((date: Date): boolean => {
    const filteredBookings = getFilteredBookingsForCalendar();
    if (!filteredBookings.length) return false;
    
    // Get the calendar date string in YYYY-MM-DD format (use local date to match calendar display)
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    
    return filteredBookings.some(booking => {
      // Extract date strings from ISO dates (UTC dates from database)
      const checkInStr = booking.checkIn.split('T')[0];
      const checkOutStr = booking.checkOut.split('T')[0];
      
      // Compare calendar date (local) with booking dates (UTC date strings)
      return dateStr >= checkInStr && dateStr <= checkOutStr;
    });
  }, [bookings, statusFilter, selectedListing]);

  // Get booking status for a date (for styling) - strictly uses database status
  const getDateBookingStatus = useCallback((date: Date): 'today' | 'upcoming' | 'successful' | 'pending' | 'cancelled' | null => {
    const dateBookings = getBookingsForDate(date);
    if (dateBookings.length === 0) return null;
    
    // Get date strings using local dates to match calendar display
    const today = new Date();
    const todayYear = today.getFullYear();
    const todayMonth = String(today.getMonth() + 1).padStart(2, '0');
    const todayDay = String(today.getDate()).padStart(2, '0');
    const todayStr = `${todayYear}-${todayMonth}-${todayDay}`;
    
    const dateYear = date.getFullYear();
    const dateMonth = String(date.getMonth() + 1).padStart(2, '0');
    const dateDay = String(date.getDate()).padStart(2, '0');
    const dateStr = `${dateYear}-${dateMonth}-${dateDay}`;
    
    // Check if today
    if (dateStr === todayStr) {
      return 'today';
    }
    
    // Use the booking status directly from the database
    // Priority: completed > cancelled > pending > confirmed
    const booking = dateBookings[0]; // Use first booking if multiple
    
    // Map database status to calendar status
    if (booking.status === 'completed') {
      return 'successful'; // Green
    }
    if (booking.status === 'cancelled') {
      return 'cancelled'; // Gray
    }
    if (booking.status === 'pending') {
      return 'pending'; // Orange
    }
    if (booking.status === 'confirmed') {
      // For confirmed bookings, check if checkout has passed
      // Compare booking checkout date (UTC string) with today's date (local string)
      const checkOutStr = booking.checkOut.split('T')[0];
      if (checkOutStr < todayStr) {
        return 'successful'; // Past confirmed booking = successful (green)
      }
      return 'upcoming'; // Future confirmed booking = upcoming (blue)
    }
    
    return null;
  }, [bookings, statusFilter, selectedListing]);

  // Check if a date is blocked (for selected listing)
  const isDateBlocked = useCallback((date: Date): boolean => {
    if (selectedListing === 'all') return false;
    
    const listing = listings.find(l => l.id === selectedListing);
    if (!listing?.blockedDates || listing.blockedDates.length === 0) {
      return false;
    }
    
    const dateStr = date.toISOString().split('T')[0];
    return listing.blockedDates.includes(dateStr);
  }, [listings, selectedListing]);

  // Check if a date should be disabled
  const isDateDisabled = (date: Date): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dateOnly = new Date(date);
    dateOnly.setHours(0, 0, 0, 0);
    
    // Disable past dates and today (including today)
    if (dateOnly <= today) return true;
    
    // Disable if blocked by host (for selected listing)
    if (isDateBlocked(dateOnly)) return true;
    
    // Don't disable booked dates (we want to show them as "booked")
    return false;
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

  // Memoize modifiers to ensure they re-evaluate when bookings or filters change
  const modifiers = useMemo(() => ({
    booked: (date: Date) => isDateBooked(date),
    blocked: (date: Date) => isDateBlocked(date),
    today: (date: Date) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dateCopy = new Date(date);
      dateCopy.setHours(0, 0, 0, 0);
      return dateCopy.getTime() === today.getTime();
    },
    upcoming: (date: Date) => getDateBookingStatus(date) === 'upcoming',
    successful: (date: Date) => getDateBookingStatus(date) === 'successful',
    pending: (date: Date) => getDateBookingStatus(date) === 'pending',
    cancelled: (date: Date) => getDateBookingStatus(date) === 'cancelled',
  }), [isDateBooked, isDateBlocked, getDateBookingStatus]);

  const calendarDays = generateCalendarDays();
  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const monthNumber = String(currentDate.getMonth() + 1).padStart(2, '0');

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60 shadow-soft">
        <div className="container mx-auto px-3 sm:px-4 md:px-6 py-3 sm:py-4 flex justify-between items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <BackButton to="/host/dashboard" />
            <Logo size="sm" />
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            <NotificationBell />
            <ThemeToggle />
            <Button variant="outline" onClick={() => setSignOutDialogOpen(true)} className="h-9 sm:h-auto text-xs sm:text-sm px-2 sm:px-4 touch-manipulation hover:bg-role-host/10 hover:text-role-host hover:border-role-host/30">
              <span className="hidden sm:inline">Sign Out</span>
              <span className="sm:hidden">Out</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8">
        {/* Back Button */}
        <BackButton to="/host/dashboard" className="mb-4 sm:mb-6" />
        
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
                <Button variant="outline" size="icon" onClick={previousMonth} className="hover:bg-role-host/10 hover:text-role-host hover:border-role-host/30">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <h2 className="text-xl font-semibold min-w-[200px] text-center">
                  {monthName}
                </h2>
                <Button variant="outline" size="icon" onClick={nextMonth} className="hover:bg-role-host/10 hover:text-role-host hover:border-role-host/30">
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button variant="outline" onClick={goToToday} className="hover:bg-role-host/10 hover:text-role-host hover:border-role-host/30">
                  Today
                </Button>
              </div>

              {/* Listing Filter */}
              <div className="flex items-center gap-4">
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
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Status Filter Buttons */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-wrap items-center gap-2">
              {/* Today */}
              <button
                onClick={() => setStatusFilter('today')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                  statusFilter === 'today'
                    ? 'bg-orange-500/10 border-orange-500/30 text-orange-600 dark:text-orange-400'
                    : 'bg-orange-500/5 border-orange-500/20 text-muted-foreground hover:bg-orange-500/10'
                }`}
              >
                <CalendarIcon className="h-4 w-4 text-orange-500" />
                <span className="text-sm font-medium">Today</span>
              </button>
              
              <div className="h-6 w-px bg-border"></div>
              
              {/* Upcoming */}
              <button
                onClick={() => setStatusFilter('upcoming')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                  statusFilter === 'upcoming'
                    ? 'bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400'
                    : 'bg-blue-500/5 border-blue-500/20 text-muted-foreground hover:bg-blue-500/10'
                }`}
              >
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span className="text-sm font-medium">Upcoming</span>
              </button>
              
              {/* Successful */}
              <button
                onClick={() => setStatusFilter('successful')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                  statusFilter === 'successful'
                    ? 'bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-400'
                    : 'bg-green-500/5 border-green-500/20 text-muted-foreground hover:bg-green-500/10'
                }`}
              >
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-sm font-medium">Successful</span>
              </button>
              
              {/* Pending */}
              <button
                onClick={() => setStatusFilter('pending')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                  statusFilter === 'pending'
                    ? 'bg-orange-500/10 border-orange-500/30 text-orange-600 dark:text-orange-400'
                    : 'bg-orange-500/5 border-orange-500/20 text-muted-foreground hover:bg-orange-500/10'
                }`}
              >
                <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                <span className="text-sm font-medium">Pending</span>
              </button>
              
              {/* Cancelled */}
              <button
                onClick={() => setStatusFilter('cancelled')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                  statusFilter === 'cancelled'
                    ? 'bg-gray-500/10 border-gray-500/30 text-gray-600 dark:text-gray-400'
                    : 'bg-gray-500/5 border-gray-500/20 text-muted-foreground hover:bg-gray-500/10'
                }`}
              >
                <div className="w-3 h-3 rounded-full bg-gray-400 dark:bg-gray-500"></div>
                <span className="text-sm font-medium">Cancelled</span>
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Calendar View - Single Month */}
          <Card className="shadow-lg">
            <CardHeader className="pb-4 sm:pb-6 px-4 sm:px-6">
              <CardTitle className="text-lg sm:text-xl font-bold flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                Select Dates
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm text-muted-foreground mt-1">
                View booking availability calendar
              </CardDescription>
            </CardHeader>
            <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
            <div className="w-full flex justify-center">
                <Calendar
                key={`calendar-${currentDate.getFullYear()}-${currentDate.getMonth()}-${bookings.length}-${statusFilter}-${selectedListing}`}
                mode="single"
                month={currentDate}
                onMonthChange={setCurrentDate}
                  disabled={isDateDisabled}
                modifiers={modifiers}
                  modifiersClassNames={{
                  booked: "bg-blue-500/20 text-blue-600 dark:text-blue-400",
                    blocked: "bg-red-500/20 text-red-600 dark:text-red-400",
                  today: "bg-orange-500/20 text-orange-600 dark:text-orange-400 font-semibold",
                  upcoming: "bg-blue-500/20 text-blue-600 dark:text-blue-400",
                  successful: "bg-green-500/20 text-green-600 dark:text-green-400",
                  pending: "bg-orange-500/20 text-orange-600 dark:text-orange-400",
                  cancelled: "bg-gray-500/20 text-gray-600 dark:text-gray-400",
                  }}
                  classNames={{
                  months: "flex flex-col",
                    month: "space-y-4",
                  caption: "flex justify-center pt-1 relative items-center mb-4",
                  caption_label: "text-lg font-bold uppercase tracking-wide",
                    nav: "space-x-1 flex items-center",
                    nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
                    nav_button_previous: "absolute left-1",
                    nav_button_next: "absolute right-1",
                    table: "w-full border-collapse space-y-1",
                    head_row: "flex",
                  head_cell: "text-muted-foreground rounded-md w-12 font-semibold text-sm uppercase tracking-wide",
                    row: "flex w-full mt-2",
                  cell: "h-12 w-12 text-center text-sm p-0 relative",
                  day: "h-12 w-12 p-0 font-normal aria-selected:opacity-100 rounded-md hover:bg-accent transition-colors",
                  day_selected: "bg-role-host text-role-host-foreground hover:bg-role-host hover:text-role-host-foreground focus:bg-role-host focus:text-role-host-foreground rounded-md",
                  day_today: "bg-accent text-accent-foreground font-semibold",
                  day_outside: "day-outside text-muted-foreground opacity-50",
                    day_disabled: "text-muted-foreground opacity-50 cursor-not-allowed",
                    day_hidden: "invisible",
                  }}
                onDayClick={(date) => {
                  const bookings = getBookingsForDate(date);
                  if (bookings.length > 0) {
                    setSelectedBooking(bookings[0]);
                    setDialogOpen(true);
                  }
                }}
                numberOfMonths={1}
                />
              </div>
            </CardContent>
          </Card>
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

