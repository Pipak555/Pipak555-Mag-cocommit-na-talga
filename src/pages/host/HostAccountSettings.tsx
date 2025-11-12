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
import { ArrowLeft, User, Bell, CreditCard, Calendar, Ticket, Mail, Smartphone, Info, AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/ui/empty-state";
import { getBookings } from "@/lib/firestore";
import { CouponManager } from "@/components/coupons/CouponManager";
import { getUserSubscription, hasActiveSubscription, getPlanById, cancelSubscription } from "@/lib/billingService";
import type { UserProfile, Booking, Coupon, NotificationPreferences, HostSubscription } from "@/types";
import { formatPHP } from "@/lib/currency";
import LoadingScreen from "@/components/ui/loading-screen";
import PayPalIdentity from "@/components/payments/PayPalIdentity";
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
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [subscription, setSubscription] = useState<HostSubscription | null>(null);
  const [hasSubscription, setHasSubscription] = useState<boolean | null>(null);
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
      loadSubscription();
      // Load notification preferences
      if (profile?.notifications) {
        setNotificationPrefs(profile.notifications);
      }
    }
  }, [user, userRole, profile]);

  const loadSubscription = async () => {
    if (!user) return;
    try {
      const active = await hasActiveSubscription(user.uid);
      setHasSubscription(active);
      if (active) {
        const sub = await getUserSubscription(user.uid);
        setSubscription(sub);
      }
    } catch (error) {
      console.error('Error loading subscription:', error);
      setHasSubscription(false);
    }
  };

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

  const handleCancelSubscription = async () => {
    if (!subscription || !user) {
      toast.error('Subscription information not available');
      return;
    }

    setCancelling(true);
    try {
      await cancelSubscription(subscription.id);
      toast.success('Subscription cancelled successfully. Your plan will remain active until the end of the billing period.');
      
      // Reload subscription to reflect cancelled status
      await loadSubscription();
      
      setCancelDialogOpen(false);
    } catch (error: any) {
      console.error('Error cancelling subscription:', error);
      toast.error(error.message || 'Failed to cancel subscription. Please try again or contact support.');
    } finally {
      setCancelling(false);
    }
  };

  if (!profile) return <LoadingScreen />;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4" />
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
            <TabsTrigger value="subscription">
              <CreditCard className="h-4 w-4 mr-2" />
              Subscription
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
                
                {/* PayPal Account Linking */}
                <div className="pt-4 border-t">
                  <Label className="text-base font-semibold mb-2 block">PayPal Account</Label>
                  <p className="text-sm text-muted-foreground mb-4">
                    Link your PayPal account to receive payouts from your bookings. Payments will be sent to your PayPal account.
                  </p>
                  {user && (
                    <PayPalIdentity
                      userId={user.uid}
                      paypalEmail={profile.paypalEmail}
                      paypalVerified={profile.paypalEmailVerified}
                      onVerified={async (email: string) => {
                        // Update profile state
                        setProfile(prev => prev ? {
                          ...prev,
                          paypalEmail: email,
                          paypalEmailVerified: true
                        } : null);
                        // Reload profile to get latest data
                        await loadProfile();
                        toast.success('PayPal account linked successfully!');
                      }}
                    />
                  )}
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

          <TabsContent value="subscription">
            <Card>
              <CardHeader>
                <CardTitle>Subscription Management</CardTitle>
                <CardDescription>View and manage your host subscription</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {hasSubscription === null ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading subscription...</p>
                  </div>
                ) : hasSubscription === false || !subscription ? (
                  <div className="text-center py-8 space-y-4">
                    <CreditCard className="h-16 w-16 text-muted-foreground mx-auto opacity-50" />
                    <div>
                      <h3 className="text-lg font-semibold mb-2">No Active Subscription</h3>
                      <p className="text-muted-foreground mb-4">
                        You need an active subscription to create and manage listings.
                      </p>
                      <Button onClick={() => navigate('/host/register')}>
                        <CreditCard className="h-4 w-4 mr-2" />
                        Subscribe Now
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Current Subscription */}
                    <div className="border rounded-lg p-6 bg-green-500/10 border-green-500/50">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                            <CreditCard className="h-6 w-6 text-green-600 dark:text-green-400" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold">{subscription.planName}</h3>
                            <p className="text-sm text-muted-foreground capitalize">
                              {subscription.billingCycle} billing
                            </p>
                          </div>
                        </div>
                        <Badge 
                          variant="outline" 
                          className={
                            subscription.status === 'cancelled'
                              ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/50'
                              : 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/50'
                          }
                        >
                          {subscription.status === 'cancelled' ? 'Cancelled (Active Until End)' : 'Active'}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Amount</p>
                          <p className="text-lg font-semibold">
                            {formatPHP(subscription.amount)}/{subscription.billingCycle}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Payment Method</p>
                          <p className="text-lg font-semibold capitalize">
                            {subscription.paymentMethod}
                          </p>
                        </div>
                        {subscription.startDate && (
                          <div>
                            <p className="text-sm text-muted-foreground">Start Date</p>
                            <p className="text-lg font-semibold">
                              {new Date(subscription.startDate).toLocaleDateString()}
                            </p>
                          </div>
                        )}
                        {subscription.endDate && (
                          <div>
                            <p className="text-sm text-muted-foreground">Expires</p>
                            <p className="text-lg font-semibold">
                              {new Date(subscription.endDate).toLocaleDateString()}
                            </p>
                          </div>
                        )}
                        {subscription.nextBillingDate && (
                          <div>
                            <p className="text-sm text-muted-foreground">Next Billing</p>
                            <p className="text-lg font-semibold">
                              {new Date(subscription.nextBillingDate).toLocaleDateString()}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Plan Features */}
                      {(() => {
                        const plan = getPlanById(subscription.planId);
                        if (plan && plan.features) {
                          return (
                            <div className="mt-6 pt-6 border-t">
                              <h4 className="font-semibold mb-3">Plan Features</h4>
                              <ul className="space-y-2">
                                {plan.features.map((feature, index) => (
                                  <li key={index} className="flex items-center gap-2 text-sm">
                                    <div className="w-1.5 h-1.5 rounded-full bg-green-600 dark:bg-green-400"></div>
                                    {feature}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>

                    {/* Cancellation Status Notice */}
                    {subscription.status === 'cancelled' && (
                      <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/30 dark:to-orange-900/30 border-2 border-yellow-300 dark:border-yellow-700 rounded-lg p-4 mb-4">
                        <div className="flex items-start gap-3">
                          <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                          <div>
                            <h4 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-1">
                              Subscription Cancelled
                            </h4>
                            <p className="text-sm text-yellow-800 dark:text-yellow-200">
                              Your subscription has been cancelled. You'll continue to have full access to all features until{' '}
                              <strong>
                                {subscription.endDate 
                                  ? new Date(subscription.endDate).toLocaleDateString('en-US', { 
                                      weekday: 'long', 
                                      year: 'numeric', 
                                      month: 'long', 
                                      day: 'numeric' 
                                    })
                                  : 'the end of your billing period'}
                              </strong>.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Cancellation Policy Notice */}
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 border-2 border-blue-300 dark:border-blue-700 rounded-lg p-5 shadow-md">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-0.5">
                          <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                            <Info className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                          </div>
                        </div>
                        <div className="flex-1">
                          <h4 className="text-base font-bold text-blue-900 dark:text-blue-100 mb-3">
                            Cancellation & Refund Policy
                          </h4>
                          <div className="space-y-2.5 text-sm text-blue-800 dark:text-blue-200">
                            <div className="flex items-start gap-2">
                              <span className="font-bold text-blue-600 dark:text-blue-400">•</span>
                              <span>
                                <strong className="font-bold">Non-Refundable:</strong> Subscriptions are non-refundable. 
                                Once payment is processed, refunds will not be available under any circumstances.
                              </span>
                            </div>
                            <div className="flex items-start gap-2">
                              <span className="font-bold text-blue-600 dark:text-blue-400">•</span>
                              <span>
                                <strong className="font-bold">Active Until End Date:</strong> If you cancel your subscription, 
                                your plan will remain <strong>fully active</strong> until{' '}
                                <strong className="font-bold text-blue-900 dark:text-blue-100">
                                  {subscription.endDate ? new Date(subscription.endDate).toLocaleDateString('en-US', { 
                                    weekday: 'long', 
                                    year: 'numeric', 
                                    month: 'long', 
                                    day: 'numeric' 
                                  }) : 'the end of your billing period'}
                                </strong>.
                              </span>
                            </div>
                            <div className="flex items-start gap-2">
                              <span className="font-bold text-blue-600 dark:text-blue-400">•</span>
                              <span>
                                <strong className="font-bold">Full Access:</strong> You'll continue to have access to all features, 
                                can create and manage listings, and receive bookings until your subscription expires.
                              </span>
                            </div>
                            <div className="flex items-start gap-2">
                              <span className="font-bold text-blue-600 dark:text-blue-400">•</span>
                              <span>
                                <strong className="font-bold">After Expiration:</strong> Once your subscription ends, 
                                you'll need to resubscribe to continue using host features and managing your listings.
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Button 
                        variant="outline" 
                        onClick={() => navigate('/host/register')}
                        className="flex-1"
                      >
                        <CreditCard className="h-4 w-4 mr-2" />
                        Change Plan
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => setCancelDialogOpen(true)}
                        disabled={subscription.status === 'cancelled'}
                        className="flex-1"
                      >
                        {subscription.status === 'cancelled' ? 'Already Cancelled' : 'Cancel Subscription'}
                      </Button>
                    </div>
                  </div>
                )}
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

      {/* Cancel Subscription Confirmation Dialog */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <AlertDialogTitle className="text-xl">Cancel Subscription</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-base pt-2">
              Are you sure you want to cancel your subscription?
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="my-6 space-y-4">
            {/* Policy Warning Box */}
            <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-lg p-4">
              <h4 className="font-bold text-red-900 dark:text-red-100 mb-3 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Important: Non-Refundable Subscription Policy
              </h4>
              <div className="space-y-2.5 text-sm text-red-800 dark:text-red-200">
                <div className="flex items-start gap-2">
                  <span className="font-bold mt-0.5">•</span>
                  <span>
                    <strong className="font-bold">NON-REFUNDABLE:</strong> This subscription is non-refundable. 
                    Once payment is processed, refunds will not be available under any circumstances.
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-bold mt-0.5">•</span>
                  <span>
                    <strong className="font-bold">Active Until End Date:</strong> If you cancel, your plan will remain{' '}
                    <strong className="font-bold">fully active</strong> until{' '}
                    <strong className="font-bold text-red-900 dark:text-red-100">
                      {subscription?.endDate 
                        ? new Date(subscription.endDate).toLocaleDateString('en-US', { 
                            weekday: 'long', 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })
                        : 'the end of your billing period'}
                    </strong>.
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-bold mt-0.5">•</span>
                  <span>
                    <strong className="font-bold">Full Access:</strong> You'll continue to have access to all features, 
                    can create and manage listings, and receive bookings until your subscription expires.
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-bold mt-0.5">•</span>
                  <span>
                    <strong className="font-bold">After Expiration:</strong> Once your subscription ends, 
                    you'll lose access to host features and will need to resubscribe to continue.
                  </span>
                </div>
              </div>
            </div>

            {/* Current Subscription Info */}
            {subscription && (
              <div className="bg-muted/50 border border-border rounded-lg p-4">
                <h5 className="font-semibold mb-2">Current Subscription Details:</h5>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Plan:</span>
                    <p className="font-medium">{subscription.planName}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Billing Cycle:</span>
                    <p className="font-medium capitalize">{subscription.billingCycle}</p>
                  </div>
                  {subscription.endDate && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Expires:</span>
                      <p className="font-medium">
                        {new Date(subscription.endDate).toLocaleDateString('en-US', { 
                          weekday: 'long', 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel 
              className="w-full sm:w-auto"
              disabled={cancelling}
            >
              Keep Subscription
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelSubscription}
              disabled={cancelling}
              className="w-full sm:w-auto bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
            >
              {cancelling ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Cancelling...
                </>
              ) : (
                'Yes, Cancel Subscription'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default HostAccountSettings;

