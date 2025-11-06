import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, User, Bell, Shield, Heart, Calendar, Bookmark, Mail, Smartphone, X } from "lucide-react";
import { toast } from "sonner";
import { ListingCard } from "@/components/listings/ListingCard";
import { EmptyState } from "@/components/ui/empty-state";
import { getListings, getBookings, toggleFavorite, toggleWishlist, updateBooking } from "@/lib/firestore";
import { processBookingRefund } from "@/lib/paymentService";
import type { UserProfile, Listing, Booking, NotificationPreferences } from "@/types";
import { formatPHP } from "@/lib/currency";
import LoadingScreen from "@/components/ui/loading-screen";
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

const GuestAccountSettings = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, userRole, refreshUserProfile, signOut, hasRole } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [favoriteListings, setFavoriteListings] = useState<Listing[]>([]);
  const [wishlistListings, setWishlistListings] = useState<Listing[]>([]);
  const [userBookings, setUserBookings] = useState<Booking[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'profile');
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [bookingToCancel, setBookingToCancel] = useState<Booking | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPreferences>({
    email: {
      bookingConfirmations: true,
      bookingCancellations: true,
      bookingReminders: true,
      newMessages: true,
      paymentUpdates: true,
      promotionalOffers: true,
    },
    inApp: {
      bookingUpdates: true,
      newMessages: true,
      paymentNotifications: true,
      systemAlerts: true,
    },
  });

  useEffect(() => {
    if (user && !hasRole('guest')) {
      navigate('/guest/login');
      return;
    }
    if (user) {
      loadProfile();
    }
  }, [user, userRole, navigate]);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  useEffect(() => {
    if (user && profile && userRole === 'guest') {
      loadFavoriteListings();
      loadWishlistListings();
      loadBookings();
      // Load notification preferences
      if (profile.notifications) {
        setNotificationPrefs(profile.notifications);
      }
    }
  }, [user, profile, userRole]);

  const loadProfile = async () => {
    if (!user) return;
    try {
      const docSnap = await getDoc(doc(db, 'users', user.uid));
      if (docSnap.exists()) {
        const data = docSnap.data() as UserProfile;
        setProfile(data);
        setFavorites(data.favorites || []);
        setWishlist(data.wishlist || []);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const loadFavoriteListings = async () => {
    if (!user || !profile?.favorites?.length) {
      setFavoriteListings([]);
      return;
    }
    try {
      const { getListing } = await import('@/lib/firestore');
      const favoriteDetails = await Promise.all(
        profile.favorites.map(id => getListing(id))
      );
      setFavoriteListings(favoriteDetails.filter((l): l is Listing => l !== null));
    } catch (error) {
      console.error('Error loading favorite listings:', error);
      setFavoriteListings([]);
    }
  };

  const loadWishlistListings = async () => {
    if (!user || !profile?.wishlist?.length) {
      setWishlistListings([]);
      return;
    }
    try {
      const { getListing } = await import('@/lib/firestore');
      const wishlistDetails = await Promise.all(
        profile.wishlist.map(id => getListing(id))
      );
      setWishlistListings(wishlistDetails.filter((l): l is Listing => l !== null));
    } catch (error) {
      console.error('Error loading wishlist listings:', error);
      setWishlistListings([]);
    }
  };

  const loadBookings = async () => {
    if (!user) return;
    try {
      const bookings = await getBookings({ guestId: user.uid });
      setUserBookings(bookings);
    } catch (error) {
      console.error('Error loading bookings:', error);
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
      
      // Process refund using payment service (if booking was confirmed or pending)
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
      // Reload bookings to reflect the cancellation
      loadBookings();
    } catch (error: any) {
      console.error('Error cancelling booking:', error);
      const errorMessage = error.message || 'Unknown error occurred';
      toast.error(`Failed to cancel booking: ${errorMessage}`);
    } finally {
      setCancelling(false);
    }
  };

  const handleFavorite = async (listingId: string) => {
    if (!user) {
      toast.error("Please login to manage favorites");
      return;
    }
    try {
      const newFavorites = await toggleFavorite(user.uid, listingId, favorites);
      setFavorites(newFavorites);
      setProfile(prev => prev ? { ...prev, favorites: newFavorites } : null);
      loadFavoriteListings();
      toast.success(newFavorites.includes(listingId) ? "Added to favorites" : "Removed from favorites");
    } catch (error) {
      toast.error("Failed to update favorites");
    }
  };

  const handleWishlist = async (listingId: string) => {
    if (!user) {
      toast.error("Please login to manage wishlist");
      return;
    }
    try {
      const newWishlist = await toggleWishlist(user.uid, listingId, wishlist);
      setWishlist(newWishlist);
      setProfile(prev => prev ? { ...prev, wishlist: newWishlist } : null);
      loadWishlistListings();
      toast.success(newWishlist.includes(listingId) ? "Added to wishlist" : "Removed from wishlist");
    } catch (error) {
      toast.error("Failed to update wishlist");
    }
  };

  const handleSaveProfile = async () => {
    if (!user || !profile) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        fullName: profile.fullName,
      });
      
      // Reload profile from Firestore to update current page
      await loadProfile();
      
      // Refresh AuthContext so other pages (like dashboard) update
      await refreshUserProfile();
      
      toast.success("Profile updated successfully!");
    } catch (error) {
      toast.error("Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate('/guest/dashboard');
  };

  const handleSaveNotifications = async () => {
    if (!user) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        notifications: notificationPrefs
      });
      await refreshUserProfile();
      toast.success('Notification preferences saved!');
    } catch (error) {
      console.error('Error saving notification preferences:', error);
      toast.error('Failed to save notification preferences');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  if (!profile) return <LoadingScreen />;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <Button variant="outline" onClick={() => setLogoutDialogOpen(true)}>
            Sign Out
          </Button>
        </div>

        <h1 className="text-3xl font-bold mb-6">Account Settings</h1>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="profile">
              <User className="h-4 w-4 mr-2" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="favorites">
              <Heart className="h-4 w-4 mr-2" />
              Favorites
            </TabsTrigger>
            <TabsTrigger value="wishlist">
              <Bookmark className="h-4 w-4 mr-2" />
              Wishlist
            </TabsTrigger>
            <TabsTrigger value="bookings">
              <Calendar className="h-4 w-4 mr-2" />
              Bookings
            </TabsTrigger>
            <TabsTrigger value="notifications">
              <Bell className="h-4 w-4 mr-2" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="security">
              <Shield className="h-4 w-4 mr-2" />
              Security
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>Update your account details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    type="text"
                    value={profile.fullName}
                    onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                    placeholder="Enter your full name"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profile.email}
                    disabled
                  />
                </div>
                <div>
                  <Label htmlFor="role">Role</Label>
                  <Input id="role" value={profile.role} disabled />
                </div>
                <div>
                  <Label htmlFor="points">Reward Points</Label>
                  <Input id="points" value={profile.points} disabled />
                </div>
                <div>
                  <Label htmlFor="balance">Wallet Balance</Label>
                  <Input id="balance" value={formatPHP(profile.walletBalance)} disabled />
                </div>
                <Button onClick={handleSaveProfile} disabled={loading}>
                  {loading ? "Saving..." : "Save Changes"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="favorites">
            <Card>
              <CardHeader>
                <CardTitle>Your Favorites</CardTitle>
                <CardDescription>Listings you've liked and saved</CardDescription>
              </CardHeader>
              <CardContent>
                {favoriteListings.length === 0 ? (
                  <EmptyState
                    icon={<Heart className="h-10 w-10" />}
                    title="No favorites yet"
                    description="Start exploring and add listings to your favorites!"
                    action={
                      <Button onClick={() => navigate('/guest/browse')}>
                        Browse Listings
                      </Button>
                    }
                  />
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {favoriteListings.map((listing) => (
                      <ListingCard
                        key={listing.id}
                        listing={listing}
                        onView={() => navigate(`/guest/listing/${listing.id}`)}
                        onFavorite={() => handleFavorite(listing.id)}
                        onWishlist={() => handleWishlist(listing.id)}
                        isFavorite={favorites.includes(listing.id)}
                        isInWishlist={wishlist.includes(listing.id)}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="wishlist">
            <Card>
              <CardHeader>
                <CardTitle>Your Wishlist</CardTitle>
                <CardDescription>Listings you're planning to book in the future</CardDescription>
              </CardHeader>
              <CardContent>
                {wishlistListings.length === 0 ? (
                  <EmptyState
                    icon={<Bookmark className="h-10 w-10" />}
                    title="No wishlist items yet"
                    description="Add listings to your wishlist for future trips!"
                    action={
                      <Button onClick={() => navigate('/guest/browse')}>
                        Browse Listings
                      </Button>
                    }
                  />
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {wishlistListings.map((listing) => (
                      <ListingCard
                        key={listing.id}
                        listing={listing}
                        onView={() => navigate(`/guest/listing/${listing.id}`)}
                        onFavorite={() => handleFavorite(listing.id)}
                        onWishlist={() => handleWishlist(listing.id)}
                        isFavorite={favorites.includes(listing.id)}
                        isInWishlist={wishlist.includes(listing.id)}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bookings">
            <Card>
              <CardHeader>
                <CardTitle>My Bookings</CardTitle>
                <CardDescription>View your booking history</CardDescription>
              </CardHeader>
              <CardContent>
                {userBookings.length === 0 ? (
                  <EmptyState
                    icon={<Calendar className="h-10 w-10" />}
                    title="No bookings yet"
                    description="Start exploring amazing places to stay!"
                    action={
                      <Button onClick={() => navigate('/guest/browse')}>
                        Browse Listings
                      </Button>
                    }
                  />
                ) : (
                  <div className="space-y-4">
                    {userBookings.map((booking) => {
                      // Check if booking can be cancelled (pending or confirmed, and check-in hasn't passed)
                      const canCancel = (booking.status === 'pending' || booking.status === 'confirmed') && 
                                        new Date(booking.checkIn) >= new Date();
                      
                      return (
                        <div key={booking.id} className="p-4 border rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <p className="font-medium">Booking #{booking.id.slice(0, 8)}</p>
                              <p className="text-sm text-muted-foreground">
                                {new Date(booking.checkIn).toLocaleDateString()} - {new Date(booking.checkOut).toLocaleDateString()}
                              </p>
                            </div>
                            <Badge>{booking.status}</Badge>
                          </div>
                          <div className="flex items-center justify-between mt-2">
                            <p className="text-sm text-muted-foreground">
                              {booking.guests} guest{booking.guests > 1 ? 's' : ''}
                            </p>
                            <p className="font-semibold">{formatPHP(booking.totalPrice || 0)}</p>
                          </div>
                          
                          {/* Cancel Button for Pending or Confirmed Upcoming Bookings */}
                          {canCancel && (
                            <div className="pt-4 mt-4 border-t">
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
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>Manage how you receive updates</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Email Notifications */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b">
                    <Mail className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold">Email Notifications</h3>
                  </div>
                  <div className="space-y-3 pl-7">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="email-booking-confirmations">Booking Confirmations</Label>
                        <p className="text-xs text-muted-foreground">Receive emails when bookings are confirmed</p>
                      </div>
                      <Switch
                        id="email-booking-confirmations"
                        checked={notificationPrefs.email.bookingConfirmations}
                        onCheckedChange={(checked) =>
                          setNotificationPrefs(prev => ({
                            ...prev,
                            email: { ...prev.email, bookingConfirmations: checked }
                          }))
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="email-booking-cancellations">Booking Cancellations</Label>
                        <p className="text-xs text-muted-foreground">Receive emails when bookings are cancelled</p>
                      </div>
                      <Switch
                        id="email-booking-cancellations"
                        checked={notificationPrefs.email.bookingCancellations}
                        onCheckedChange={(checked) =>
                          setNotificationPrefs(prev => ({
                            ...prev,
                            email: { ...prev.email, bookingCancellations: checked }
                          }))
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="email-booking-reminders">Booking Reminders</Label>
                        <p className="text-xs text-muted-foreground">Receive reminders about upcoming bookings</p>
                      </div>
                      <Switch
                        id="email-booking-reminders"
                        checked={notificationPrefs.email.bookingReminders}
                        onCheckedChange={(checked) =>
                          setNotificationPrefs(prev => ({
                            ...prev,
                            email: { ...prev.email, bookingReminders: checked }
                          }))
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="email-new-messages">New Messages</Label>
                        <p className="text-xs text-muted-foreground">Receive emails for new messages</p>
                      </div>
                      <Switch
                        id="email-new-messages"
                        checked={notificationPrefs.email.newMessages}
                        onCheckedChange={(checked) =>
                          setNotificationPrefs(prev => ({
                            ...prev,
                            email: { ...prev.email, newMessages: checked }
                          }))
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="email-payment-updates">Payment Updates</Label>
                        <p className="text-xs text-muted-foreground">Receive emails about payment transactions</p>
                      </div>
                      <Switch
                        id="email-payment-updates"
                        checked={notificationPrefs.email.paymentUpdates}
                        onCheckedChange={(checked) =>
                          setNotificationPrefs(prev => ({
                            ...prev,
                            email: { ...prev.email, paymentUpdates: checked }
                          }))
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="email-promotional-offers">Promotional Offers</Label>
                        <p className="text-xs text-muted-foreground">Receive promotional emails and special offers</p>
                      </div>
                      <Switch
                        id="email-promotional-offers"
                        checked={notificationPrefs.email.promotionalOffers}
                        onCheckedChange={(checked) =>
                          setNotificationPrefs(prev => ({
                            ...prev,
                            email: { ...prev.email, promotionalOffers: checked }
                          }))
                        }
                      />
                    </div>
                  </div>
                </div>

                {/* In-App Notifications */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b">
                    <Smartphone className="h-5 w-5 text-secondary" />
                    <h3 className="text-lg font-semibold">In-App Notifications</h3>
                  </div>
                  <div className="space-y-3 pl-7">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="inapp-booking-updates">Booking Updates</Label>
                        <p className="text-xs text-muted-foreground">Get notified about booking status changes</p>
                      </div>
                      <Switch
                        id="inapp-booking-updates"
                        checked={notificationPrefs.inApp.bookingUpdates}
                        onCheckedChange={(checked) =>
                          setNotificationPrefs(prev => ({
                            ...prev,
                            inApp: { ...prev.inApp, bookingUpdates: checked }
                          }))
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="inapp-new-messages">New Messages</Label>
                        <p className="text-xs text-muted-foreground">Get notified about new messages</p>
                      </div>
                      <Switch
                        id="inapp-new-messages"
                        checked={notificationPrefs.inApp.newMessages}
                        onCheckedChange={(checked) =>
                          setNotificationPrefs(prev => ({
                            ...prev,
                            inApp: { ...prev.inApp, newMessages: checked }
                          }))
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="inapp-payment-notifications">Payment Notifications</Label>
                        <p className="text-xs text-muted-foreground">Get notified about payment activities</p>
                      </div>
                      <Switch
                        id="inapp-payment-notifications"
                        checked={notificationPrefs.inApp.paymentNotifications}
                        onCheckedChange={(checked) =>
                          setNotificationPrefs(prev => ({
                            ...prev,
                            inApp: { ...prev.inApp, paymentNotifications: checked }
                          }))
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="inapp-system-alerts">System Alerts</Label>
                        <p className="text-xs text-muted-foreground">Receive important system notifications</p>
                      </div>
                      <Switch
                        id="inapp-system-alerts"
                        checked={notificationPrefs.inApp.systemAlerts}
                        onCheckedChange={(checked) =>
                          setNotificationPrefs(prev => ({
                            ...prev,
                            inApp: { ...prev.inApp, systemAlerts: checked }
                          }))
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <Button onClick={handleSaveNotifications} disabled={loading}>
                    {loading ? 'Saving...' : 'Save Preferences'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle>Security Settings</CardTitle>
                <CardDescription>Manage your account security</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Security settings coming soon</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
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
            <AlertDialogAction onClick={handleLogout} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Sign Out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default GuestAccountSettings;

