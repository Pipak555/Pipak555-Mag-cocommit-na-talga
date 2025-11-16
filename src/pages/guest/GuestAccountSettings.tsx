import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, User, Bell, Calendar, Mail, Smartphone, X, Gift, Bookmark } from "lucide-react";
import { PointsDisplay } from "@/components/rewards/PointsDisplay";
import { redeemPointsForCoupon } from "@/lib/pointsService";
import { toast } from "sonner";
import { EmptyState } from "@/components/ui/empty-state";
import { getBookings, updateBooking, toggleWishlist, toggleFavorite, getListing } from "@/lib/firestore";
import { createCancellationRequest } from "@/lib/cancellationRequestService";
import { ListingCard } from "@/components/listings/ListingCard";
import type { UserProfile, Booking, NotificationPreferences, Listing } from "@/types";
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
  const [userBookings, setUserBookings] = useState<Booking[]>([]);
  const [wishlistListings, setWishlistListings] = useState<Listing[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [wishlist, setWishlist] = useState<string[] | any[]>([]);
  const [activeTab, setActiveTab] = useState(() => {
    const tab = searchParams.get('tab');
    // If security tab is requested, default to profile instead
    if (tab === 'security') return 'profile';
    return tab || 'profile';
  });
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [bookingToCancel, setBookingToCancel] = useState<Booking | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('');
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
      // If security tab is requested, default to profile instead
      if (tab === 'security') {
        setActiveTab('profile');
      } else {
        setActiveTab(tab);
      }
    }
  }, [searchParams]);

  useEffect(() => {
    if (user && profile && userRole === 'guest') {
      loadBookings();
      loadWishlistListings();
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

  const loadBookings = async () => {
    if (!user) return;
    try {
      const bookings = await getBookings({ guestId: user.uid });
      setUserBookings(bookings);
    } catch (error) {
      console.error('Error loading bookings:', error);
    }
  };

  const loadWishlistListings = async () => {
    if (!user || !profile?.wishlist?.length) {
      setWishlistListings([]);
      return;
    }
    try {
      // Handle both old format (string[]) and new format (WishlistItem[])
      const listingIds = profile.wishlist.map(item => 
        typeof item === 'string' ? item : item.listingId
      );
      const wishlistDetails = await Promise.all(
        listingIds.map(id => getListing(id, user?.uid))
      );
      setWishlistListings(wishlistDetails.filter((l): l is Listing => l !== null));
    } catch (error) {
      console.error('Error loading wishlist listings:', error);
      setWishlistListings([]);
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
      toast.success(newWishlist.some(item => (typeof item === 'string' ? item === listingId : item.listingId === listingId)) ? "Added to wishlist" : "Removed from wishlist");
    } catch (error) {
      toast.error("Failed to update wishlist");
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
      setCancellationReason('');
      return;
    }

    const checkIn = new Date(bookingToCancel.checkIn);
    const now = new Date();
    if (checkIn < now) {
      toast.error('Cannot cancel bookings with check-in dates in the past');
      setCancelDialogOpen(false);
      setBookingToCancel(null);
      setCancellationReason('');
      return;
    }
    
    setCancelling(true);
    try {
      // Create cancellation request instead of immediate cancellation
      await createCancellationRequest(bookingToCancel.id, cancellationReason.trim() || undefined);
      
      toast.success('Cancellation request submitted successfully. An admin will review your request and process the refund if approved.');
      setCancelDialogOpen(false);
      setBookingToCancel(null);
      setCancellationReason('');
      // Reload bookings to reflect the cancellation request
      loadBookings();
    } catch (error: any) {
      console.error('Error creating cancellation request:', error);
      const errorMessage = error.message || 'Unknown error occurred';
      toast.error(`Failed to submit cancellation request: ${errorMessage}`);
    } finally {
      setCancelling(false);
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
      <div className="container mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-3 sm:py-4 md:py-6 lg:py-8 max-w-4xl">
        <div className="flex items-center justify-between mb-4 sm:mb-6 gap-2 sm:gap-4">
          <Button variant="ghost" size="icon" onClick={handleBack} className="touch-manipulation">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={() => setLogoutDialogOpen(true)} className="h-9 sm:h-auto text-xs sm:text-sm px-2 sm:px-4 touch-manipulation">
            <span className="hidden sm:inline">Sign Out</span>
            <span className="sm:hidden">Out</span>
          </Button>
        </div>

        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-4 sm:mb-6">Account Settings</h1>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
          <TabsList className="grid w-full grid-cols-5 relative overflow-x-auto">
            <TabsTrigger value="profile" className="text-xs sm:text-sm touch-manipulation min-h-[44px] sm:min-h-0">
              <User className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Profile</span>
            </TabsTrigger>
            <TabsTrigger value="wishlist" className="text-xs sm:text-sm touch-manipulation min-h-[44px] sm:min-h-0">
              <Bookmark className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Wishlist</span>
            </TabsTrigger>
            <TabsTrigger value="bookings" className="text-xs sm:text-sm touch-manipulation min-h-[44px] sm:min-h-0">
              <Calendar className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Bookings</span>
            </TabsTrigger>
            <TabsTrigger value="rewards" className="text-xs sm:text-sm touch-manipulation min-h-[44px] sm:min-h-0">
              <Gift className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Rewards</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="text-xs sm:text-sm touch-manipulation min-h-[44px] sm:min-h-0">
              <Bell className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Notifications</span>
            </TabsTrigger>
          </TabsList>

          <div className="h-[500px] sm:h-[600px] relative">
            <TabsContent value="profile" className="mt-0 absolute inset-0 w-full overflow-y-auto px-1 sm:px-0">
              <Card className="h-full flex flex-col">
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

            <TabsContent value="wishlist" className="mt-0 absolute inset-0 w-full overflow-y-auto">
              <Card className="h-full flex flex-col">
                <CardHeader>
                  <CardTitle>Your Wishlist</CardTitle>
                  <CardDescription>Save property requirements and amenities from your past bookings to find similar properties in the future</CardDescription>
                </CardHeader>
                <CardContent>
                  {wishlistListings.length === 0 ? (
                    <EmptyState
                      icon={<Bookmark className="h-10 w-10" />}
                      title="No wishlist items yet"
                      description="Add past bookings to your wishlist with their property requirements and amenities to find similar properties for future trips!"
                      action={
                        <Button onClick={() => navigate('/guest/bookings?filter=past')}>
                          View Past Bookings
                        </Button>
                      }
                    />
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {wishlistListings.map((listing) => {
                        const wishlistItem = wishlist.find(item => 
                          (typeof item === 'string' ? item === listing.id : item.listingId === listing.id)
                        );
                        const recommendations = typeof wishlistItem === 'object' && wishlistItem?.recommendations;
                        const isInWishlist = wishlist.some(item => 
                          (typeof item === 'string' ? item === listing.id : item.listingId === listing.id)
                        );
                        
                        return (
                          <div key={listing.id} className="space-y-2">
                            <ListingCard
                              listing={listing}
                              onView={() => navigate(`/guest/listing/${listing.id}`)}
                              onFavorite={() => handleFavorite(listing.id)}
                              isFavorite={favorites.includes(listing.id)}
                            />
                            {(recommendations || (typeof wishlistItem === 'object' && wishlistItem?.propertyRequirements) || (typeof wishlistItem === 'object' && wishlistItem?.desiredAmenities)) && (
                              <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
                                <CardContent className="p-3 space-y-2">
                                  {typeof wishlistItem === 'object' && wishlistItem?.propertyRequirements && Object.keys(wishlistItem.propertyRequirements).length > 0 && (
                                    <div>
                                      <p className="text-xs font-semibold text-blue-900 dark:text-blue-100 mb-1">Requirements:</p>
                                      <div className="text-xs text-blue-800 dark:text-blue-200 space-y-1">
                                        {wishlistItem.propertyRequirements.beds && <p>• Beds: {wishlistItem.propertyRequirements.beds}</p>}
                                        {wishlistItem.propertyRequirements.bedrooms && <p>• Bedrooms: {wishlistItem.propertyRequirements.bedrooms}</p>}
                                        {wishlistItem.propertyRequirements.bathrooms && <p>• Bathrooms: {wishlistItem.propertyRequirements.bathrooms}</p>}
                                        {wishlistItem.propertyRequirements.guests && <p>• Guests: {wishlistItem.propertyRequirements.guests}</p>}
                                      </div>
                                    </div>
                                  )}
                                  {typeof wishlistItem === 'object' && wishlistItem?.desiredAmenities && wishlistItem.desiredAmenities.length > 0 && (
                                    <div>
                                      <p className="text-xs font-semibold text-blue-900 dark:text-blue-100 mb-1">Desired Amenities:</p>
                                      <p className="text-xs text-blue-800 dark:text-blue-200">{wishlistItem.desiredAmenities.join(', ')}</p>
                                    </div>
                                  )}
                                  {recommendations && (
                                    <div>
                                      <p className="text-xs font-semibold text-blue-900 dark:text-blue-100 mb-1">Recommendations:</p>
                                      <p className="text-sm text-blue-800 dark:text-blue-200">{recommendations}</p>
                                    </div>
                                  )}
                                </CardContent>
                              </Card>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
              </CardContent>
            </Card>
          </TabsContent>

            <TabsContent value="bookings" className="mt-0 absolute inset-0 w-full overflow-y-auto">
              <Card className="h-full flex flex-col">
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
                      // Check if booking can be cancelled (pending or confirmed, and check-in hasn't passed, and no pending cancellation request)
                      const canCancel = (booking.status === 'pending' || booking.status === 'confirmed') && 
                                        new Date(booking.checkIn) >= new Date() &&
                                        !booking.cancellationRequestId;
                      
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
                                Request Cancellation
                              </Button>
                            </div>
                          )}
                          {booking.cancellationRequestId && (
                            <div className="pt-4 mt-4 border-t">
                              <div className="p-3 bg-yellow-500/10 border border-yellow-500/50 rounded-md">
                                <p className="text-sm font-medium text-yellow-700 dark:text-yellow-400">
                                  Cancellation Request Pending
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  Your cancellation request is being reviewed by an admin. You will be notified once a decision is made.
                                </p>
                              </div>
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

          <TabsContent value="rewards" className="mt-6">
            <PointsDisplay
              points={profile?.points || 0}
              onRedeem={async (pointsToRedeem) => {
                if (!user) {
                  toast.error("You must be logged in to redeem points");
                  return;
                }

                try {
                  const { couponCode, discountAmount } = await redeemPointsForCoupon(
                    user.uid,
                    pointsToRedeem
                  );
                  
                  toast.success(
                    `Successfully redeemed ${pointsToRedeem} points! ` +
                    `Coupon code: ${couponCode} (${formatPHP(discountAmount)} discount). ` +
                    `You can use this coupon when booking a listing.`
                  );
                  
                  // Refresh profile to update points
                  await loadProfile();
                } catch (error: any) {
                  toast.error(`Failed to redeem points: ${error.message || 'Unknown error'}`);
                }
              }}
            />
          </TabsContent>

            <TabsContent value="notifications" className="mt-6">
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
          </div>
        </Tabs>
      </div>

      {/* Cancel Booking Dialog */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={(open) => {
        setCancelDialogOpen(open);
        if (!open) {
          setCancellationReason('');
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Request Booking Cancellation</AlertDialogTitle>
            <AlertDialogDescription>
              Submit a cancellation request for admin review. If approved, a refund will be processed automatically.
              {bookingToCancel && (
                <div className="mt-3 space-y-3">
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
                        If approved, a refund of {formatPHP(bookingToCancel.totalPrice)} will be credited to your wallet balance.
                      </p>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="cancellation-reason">Reason for Cancellation (Optional)</Label>
                    <Textarea
                      id="cancellation-reason"
                      placeholder="Please provide a reason for cancelling this booking..."
                      value={cancellationReason}
                      onChange={(e) => setCancellationReason(e.target.value)}
                      className="min-h-[80px] resize-none"
                      maxLength={500}
                    />
                    <p className="text-xs text-muted-foreground">
                      {cancellationReason.length}/500 characters
                    </p>
                  </div>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelling} onClick={() => setCancellationReason('')}>Keep Booking</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmCancel}
              disabled={cancelling}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {cancelling ? 'Submitting Request...' : 'Submit Cancellation Request'}
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

