import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, TrendingUp, Calendar, Loader2, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import { getBookings } from "@/lib/firestore";
import type { Booking } from "@/types";
import { formatPHP } from "@/lib/currency";
import LoadingScreen from "@/components/ui/loading-screen";
import { BackButton } from "@/components/shared/BackButton";

const HostEarnings = () => {
  const navigate = useNavigate();
  const { user, userRole, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [earnings, setEarnings] = useState({
    totalEarnings: 0,
    pendingEarnings: 0,
    completedEarnings: 0,
    thisMonth: 0,
    lastMonth: 0,
  });
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filter, setFilter] = useState<'all' | 'completed' | 'pending'>('all');

  useEffect(() => {
    if (!authLoading && (!user || userRole !== 'host')) {
      navigate('/host/login');
    } else if (!authLoading && user && userRole === 'host') {
      loadEarningsData();
    }
  }, [user, userRole, navigate, authLoading]);

  const loadEarningsData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Load bookings to calculate earnings
      const bookingsData = await getBookings({ hostId: user.uid });
      setBookings(bookingsData);

      // Calculate earnings
      const confirmedBookings = bookingsData.filter(
        b => b.status === 'confirmed' || b.status === 'completed'
      );
      const pendingBookings = bookingsData.filter(b => b.status === 'pending');
      
      const totalEarnings = confirmedBookings.reduce((sum, b) => sum + (b.totalPrice || 0), 0);
      const pendingEarnings = pendingBookings.reduce((sum, b) => sum + (b.totalPrice || 0), 0);
      const completedEarnings = totalEarnings;

      // Calculate monthly earnings
      const now = new Date();
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

      const thisMonthBookings = confirmedBookings.filter(b => {
        const bookingDate = new Date(b.createdAt || b.checkIn);
        return bookingDate >= thisMonthStart;
      });

      const lastMonthBookings = confirmedBookings.filter(b => {
        const bookingDate = new Date(b.createdAt || b.checkIn);
        return bookingDate >= lastMonthStart && bookingDate <= lastMonthEnd;
      });

      const thisMonth = thisMonthBookings.reduce((sum, b) => sum + (b.totalPrice || 0), 0);
      const lastMonth = lastMonthBookings.reduce((sum, b) => sum + (b.totalPrice || 0), 0);

      setEarnings({
        totalEarnings,
        pendingEarnings,
        completedEarnings,
        thisMonth,
        lastMonth,
      });
    } catch (error: any) {
      console.error('Error loading earnings data:', error);
      toast.error(`Failed to load earnings: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const filteredBookings = bookings.filter(booking => {
    if (filter === 'completed') {
      return booking.status === 'confirmed' || booking.status === 'completed';
    } else if (filter === 'pending') {
      return booking.status === 'pending';
    }
    return true;
  });

  const monthChange = earnings.lastMonth > 0 
    ? ((earnings.thisMonth - earnings.lastMonth) / earnings.lastMonth * 100).toFixed(1)
    : earnings.thisMonth > 0 ? '100' : '0';

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto">
          <LoadingScreen />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <BackButton to="/host/dashboard" />
          <div>
            <h1 className="text-3xl font-bold">Total Earnings</h1>
            <p className="text-muted-foreground">Track your earnings and booking revenue</p>
          </div>
        </div>

        {/* Earnings Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="relative overflow-hidden border-0 shadow-md">
            <div className="absolute top-0 left-0 right-0 h-1 bg-green-500" />
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Total Earnings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                {formatPHP(earnings.totalEarnings)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">All time earnings</p>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-0 shadow-md">
            <div className="absolute top-0 left-0 right-0 h-1 bg-blue-500" />
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Completed Earnings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">
                {formatPHP(earnings.completedEarnings)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">From confirmed bookings</p>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-0 shadow-md">
            <div className="absolute top-0 left-0 right-0 h-1 bg-yellow-500" />
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Pending Earnings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-yellow-600">
                {formatPHP(earnings.pendingEarnings)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Awaiting confirmation</p>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-0 shadow-md">
            <div className="absolute top-0 left-0 right-0 h-1 bg-purple-500" />
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                This Month
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-600">
                {formatPHP(earnings.thisMonth)}
              </div>
              <div className="flex items-center gap-1 mt-1">
                <TrendingUp className={`h-3 w-3 ${parseFloat(monthChange) >= 0 ? 'text-green-500' : 'text-red-500'}`} />
                <p className={`text-xs ${parseFloat(monthChange) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {parseFloat(monthChange) >= 0 ? '+' : ''}{monthChange}% vs last month
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Earnings Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Earnings Breakdown</CardTitle>
                  <CardDescription>Your earnings by booking status</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={filter === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilter('all')}
                  >
                    All
                  </Button>
                  <Button
                    variant={filter === 'completed' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilter('completed')}
                  >
                    Completed
                  </Button>
                  <Button
                    variant={filter === 'pending' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilter('pending')}
                  >
                    Pending
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredBookings.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No bookings found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredBookings
                    .sort((a, b) => {
                      const dateA = new Date(a.createdAt || a.checkIn).getTime();
                      const dateB = new Date(b.createdAt || b.checkIn).getTime();
                      return dateB - dateA;
                    })
                    .map((booking) => (
                      <div
                        key={booking.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-4 flex-1">
                          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Calendar className="h-6 w-6 text-primary" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">Booking #{booking.id.slice(0, 8)}</p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(booking.checkIn).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })} - {new Date(booking.checkOut).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {booking.guests} guest{booking.guests > 1 ? 's' : ''} • 
                              Created: {new Date(booking.createdAt || booking.checkIn).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold text-green-600">
                            {formatPHP(booking.totalPrice || 0)}
                          </p>
                          <Badge
                            className={
                              booking.status === 'confirmed' || booking.status === 'completed'
                                ? 'bg-green-500'
                                : booking.status === 'pending'
                                ? 'bg-yellow-500'
                                : 'bg-red-500'
                            }
                          >
                            {booking.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Stats</CardTitle>
              <CardDescription>Earnings summary</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total Bookings</span>
                  <span className="font-semibold">{bookings.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Completed</span>
                  <span className="font-semibold text-green-600">
                    {bookings.filter(b => b.status === 'confirmed' || b.status === 'completed').length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Pending</span>
                  <span className="font-semibold text-yellow-600">
                    {bookings.filter(b => b.status === 'pending').length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Average Booking</span>
                  <span className="font-semibold">
                    {bookings.length > 0
                      ? formatPHP(earnings.totalEarnings / bookings.length)
                      : formatPHP(0)}
                  </span>
                </div>
              </div>
              <div className="pt-4 border-t">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate('/host/payments')}
                >
                  <DollarSign className="h-4 w-4 mr-2" />
                  Manage Payments
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default HostEarnings;

