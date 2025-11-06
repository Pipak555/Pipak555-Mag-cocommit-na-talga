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
import { ArrowLeft, User, Bell, Shield, Calendar, Ticket, Mail, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/ui/empty-state";
import { getBookings } from "@/lib/firestore";
import { CouponManager } from "@/components/coupons/CouponManager";
import type { UserProfile, Booking, Coupon, NotificationPreferences } from "@/types";
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

const HostAccountSettings = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, userRole, refreshUserProfile, signOut, hasRole } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [userBookings, setUserBookings] = useState<Booking[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'profile');
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
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
    if (user && !hasRole('host')) {
      navigate('/host/login');
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
    if (user && hasRole('host')) {
      loadBookings();
      // Load notification preferences
      if (profile?.notifications) {
        setNotificationPrefs(profile.notifications);
      }
    }
  }, [user, userRole, profile]);

  const loadProfile = async () => {
    if (!user) return;
    try {
      const docSnap = await getDoc(doc(db, 'users', user.uid));
      if (docSnap.exists()) {
        const data = docSnap.data() as UserProfile;
        setProfile(data);
        setCoupons(data.coupons || []);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const loadBookings = async () => {
    if (!user) return;
    try {
      const bookings = await getBookings({ hostId: user.uid });
      setUserBookings(bookings);
    } catch (error) {
      console.error('Error loading bookings:', error);
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
    navigate('/host/dashboard');
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
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="profile">
              <User className="h-4 w-4 mr-2" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="bookings">
              <Calendar className="h-4 w-4 mr-2" />
              Bookings
            </TabsTrigger>
            <TabsTrigger value="coupons">
              <Ticket className="h-4 w-4 mr-2" />
              Coupons
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

          <TabsContent value="bookings">
            <Card>
              <CardHeader>
                <CardTitle>Host Bookings</CardTitle>
                <CardDescription>Manage your property bookings</CardDescription>
              </CardHeader>
              <CardContent>
                {userBookings.length === 0 ? (
                  <EmptyState
                    icon={<Calendar className="h-10 w-10" />}
                    title="No bookings yet"
                    description="No booking requests at this time."
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
                          <Badge variant={
                            booking.status === 'confirmed' ? 'default' :
                            booking.status === 'pending' ? 'secondary' :
                            booking.status === 'cancelled' ? 'destructive' :
                            booking.status === 'completed' ? 'outline' : 'secondary'
                          }>
                            {booking.status}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <p className="text-sm text-muted-foreground">
                            {booking.guests} guest{booking.guests > 1 ? 's' : ''}
                          </p>
                          <p className="font-semibold">{formatPHP(booking.totalPrice || 0)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

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

export default HostAccountSettings;

