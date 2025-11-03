import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, User, Bell, CreditCard, Shield, Heart, Calendar, Ticket } from "lucide-react";
import { toast } from "sonner";
import { ListingCard } from "@/components/listings/ListingCard";
import { EmptyState } from "@/components/ui/empty-state";
import { getListings, getBookings, toggleFavorite } from "@/lib/firestore";
import { CouponManager } from "@/components/coupons/CouponManager";
import type { UserProfile, Listing, Booking, Coupon } from "@/types";

const AccountSettings = () => {
  const navigate = useNavigate();
  const { user, userRole } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [favoriteListings, setFavoriteListings] = useState<Listing[]>([]);
  const [userBookings, setUserBookings] = useState<Booking[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user, userRole]);

  useEffect(() => {
    if (user && profile && userRole === 'guest') {
      loadFavoriteListings();
      loadBookings();
    } else if (user && userRole === 'host') {
      loadBookings();
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
        setCoupons(data.coupons || []);
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
      // Fetch each favorite listing individually
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

  const loadBookings = async () => {
    if (!user) return;
    try {
      const bookings = await getBookings(
        userRole === 'guest' ? { guestId: user.uid } : { hostId: user.uid }
      );
      setUserBookings(bookings);
    } catch (error) {
      console.error('Error loading bookings:', error);
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
      // Update profile
      setProfile(prev => prev ? { ...prev, favorites: newFavorites } : null);
      // Reload favorite listings
      if (userRole === 'guest') {
        loadFavoriteListings();
      }
      toast.success(newFavorites.includes(listingId) ? "Added to favorites" : "Removed from favorites");
    } catch (error) {
      toast.error("Failed to update favorites");
    }
  };

  const handleSaveProfile = async () => {
    if (!user || !profile) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        email: profile.email,
        fullName: profile.fullName,
      });
      toast.success("Profile updated successfully!");
    } catch (error) {
      toast.error("Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (userRole === 'host') navigate('/host/dashboard');
    else if (userRole === 'guest') navigate('/guest/dashboard');
    else navigate('/admin/dashboard');
  };

  if (!profile) return <div className="p-6">Loading...</div>;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-4xl">
        <Button variant="ghost" onClick={handleBack} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>

        <h1 className="text-3xl font-bold mb-6">Account Settings</h1>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className={`grid w-full ${userRole === 'guest' ? 'grid-cols-5' : userRole === 'host' ? 'grid-cols-5' : 'grid-cols-4'}`}>
            <TabsTrigger value="profile">
              <User className="h-4 w-4 mr-2" />
              Profile
            </TabsTrigger>
            {userRole === 'guest' && (
              <TabsTrigger value="wishlist">
                <Heart className="h-4 w-4 mr-2" />
                Wishlist
              </TabsTrigger>
            )}
            <TabsTrigger value="bookings">
              <Calendar className="h-4 w-4 mr-2" />
              Bookings
            </TabsTrigger>
            {userRole === 'host' && (
              <TabsTrigger value="coupons">
                <Ticket className="h-4 w-4 mr-2" />
                Coupons
              </TabsTrigger>
            )}
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
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
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
                  <Input id="balance" value={`$${profile.walletBalance}`} disabled />
                </div>
                <Button onClick={handleSaveProfile} disabled={loading}>
                  {loading ? "Saving..." : "Save Changes"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Wishlist Tab (Guest only) */}
          {userRole === 'guest' && (
            <TabsContent value="wishlist">
              <Card>
                <CardHeader>
                  <CardTitle>Your Wishlist</CardTitle>
                  <CardDescription>Your saved favorite listings</CardDescription>
                </CardHeader>
                <CardContent>
                  {favoriteListings.length === 0 ? (
                    <EmptyState
                      icon={<Heart className="h-10 w-10" />}
                      title="No favorites yet"
                      description="Start exploring and add listings to your wishlist!"
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
                          isFavorite={favorites.includes(listing.id)}
                        />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Bookings Tab */}
          <TabsContent value="bookings">
            <Card>
              <CardHeader>
                <CardTitle>
                  {userRole === 'guest' ? 'My Bookings' : 'Host Bookings'}
                </CardTitle>
                <CardDescription>
                  {userRole === 'guest' 
                    ? 'View your booking history' 
                    : 'Manage your property bookings'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {userBookings.length === 0 ? (
                  <EmptyState
                    icon={<Calendar className="h-10 w-10" />}
                    title="No bookings yet"
                    description={userRole === 'guest' ? 'Start exploring amazing places to stay!' : 'No booking requests at this time.'}
                    action={userRole === 'guest' ? (
                      <Button onClick={() => navigate('/guest/browse')}>
                        Browse Listings
                      </Button>
                    ) : undefined}
                  />
                ) : (
                  <div className="space-y-4">
                    {userBookings.map((booking) => (
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
                          <p className="font-semibold">${booking.totalPrice}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Coupons Tab (Host only) */}
          {userRole === 'host' && (
            <TabsContent value="coupons">
              <Card>
                <CardHeader>
                  <CardTitle>Coupons</CardTitle>
                  <CardDescription>Manage your promotional coupons</CardDescription>
                </CardHeader>
                <CardContent>
                  <CouponManager 
                    coupons={coupons} 
                    onApplyCoupon={(code) => toast.info(`Coupon ${code} applied`)} 
                  />
                </CardContent>
              </Card>
            </TabsContent>
          )}

          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>Manage how you receive updates</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Notification settings coming soon</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payments">
            <Card>
              <CardHeader>
                <CardTitle>Payment Methods</CardTitle>
                <CardDescription>Manage your payment options</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Payment method management coming soon</p>
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
    </div>
  );
};

export default AccountSettings;
