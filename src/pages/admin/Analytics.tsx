import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, TrendingUp, TrendingDown, Star, DollarSign } from "lucide-react";
import type { Listing, Review, Booking } from "@/types";
import { formatPHP } from "@/lib/currency";

interface TopRatedListing {
  id: string;
  title: string;
  rating: number;
  reviewCount: number;
  price: number;
}

interface WeeklyRevenue {
  week: string;
  revenue: number;
  percentage: number;
}

const Analytics = () => {
  const navigate = useNavigate();
  const { user, userRole } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalHosts: 0,
    totalGuests: 0,
    totalListings: 0,
    totalBookings: 0,
    totalRevenue: 0,
    avgRating: 0,
  });
  const [topRatedListings, setTopRatedListings] = useState<TopRatedListing[]>([]);
  const [lowestRatedListings, setLowestRatedListings] = useState<TopRatedListing[]>([]);
  const [revenueTrends, setRevenueTrends] = useState<WeeklyRevenue[]>([]);
  const [listingChange, setListingChange] = useState(0);
  const [bookingChange, setBookingChange] = useState(0);

  useEffect(() => {
    if (!user || userRole !== 'admin') {
      navigate('/admin/login');
    } else {
      loadAnalytics();
    }
  }, [user, userRole, navigate]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      // Fetch all data in parallel
      const [usersSnap, listingsSnap, bookingsSnap, reviewsSnap] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'listing')),
        getDocs(collection(db, 'bookings')),
        getDocs(collection(db, 'reviews'))
      ]);

      const users = usersSnap.docs.map(doc => doc.data());
      const hosts = users.filter(u => u.role === 'host').length;
      const guests = users.filter(u => u.role === 'guest').length;

      const listings = listingsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Listing));
      const bookings = bookingsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));
      const reviews = reviewsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Review));

      // Calculate revenue
      const confirmedBookings = bookings.filter(b => 
        b.status === 'confirmed' || b.status === 'completed'
      );
      const revenue = confirmedBookings.reduce((sum, b) => sum + (b.totalPrice || 0), 0);
      const serviceFee = revenue * 0.1;

      // Calculate average rating
      const avgRating = reviews.length > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        : 0;

      // Calculate top rated listings
      const listingRatings = new Map<string, { totalRating: number; count: number }>();
      
      reviews.forEach(review => {
        const existing = listingRatings.get(review.listingId) || { totalRating: 0, count: 0 };
        listingRatings.set(review.listingId, {
          totalRating: existing.totalRating + review.rating,
          count: existing.count + 1
        });
      });

      const topListings: TopRatedListing[] = Array.from(listingRatings.entries())
        .map(([listingId, data]) => {
          const listing = listings.find(l => l.id === listingId);
          if (!listing) return null;
          
          return {
            id: listingId,
            title: listing.title,
            rating: data.totalRating / data.count,
            reviewCount: data.count,
            price: listing.price
          };
        })
        .filter((listing): listing is TopRatedListing => listing !== null)
        .sort((a, b) => {
          // Sort by rating first, then by review count
          if (b.rating !== a.rating) return b.rating - a.rating;
          return b.reviewCount - a.reviewCount;
        })
        .slice(0, 3); // Top 3

      setTopRatedListings(topListings);

      // Calculate lowest rated listings
      const lowestListings: TopRatedListing[] = Array.from(listingRatings.entries())
        .map(([listingId, data]) => {
          const listing = listings.find(l => l.id === listingId);
          if (!listing) return null;
          
          return {
            id: listingId,
            title: listing.title,
            rating: data.totalRating / data.count,
            reviewCount: data.count,
            price: listing.price
          };
        })
        .filter((listing): listing is TopRatedListing => listing !== null)
        .sort((a, b) => {
          // Sort by rating ascending (lowest first), then by review count descending
          if (a.rating !== b.rating) return a.rating - b.rating;
          return b.reviewCount - a.reviewCount;
        })
        .slice(0, 3); // Bottom 3

      setLowestRatedListings(lowestListings);

      // Calculate revenue trends (last 30 days)
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      const weeklyRevenue: WeeklyRevenue[] = [];
      const maxRevenue = Math.max(...confirmedBookings.map(b => b.totalPrice || 0), 1);

      for (let week = 0; week < 4; week++) {
        const weekStart = new Date(thirtyDaysAgo);
        weekStart.setDate(weekStart.getDate() + week * 7);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 7);

        const weekBookings = confirmedBookings.filter(b => {
          const bookingDate = new Date(b.createdAt);
          return bookingDate >= weekStart && bookingDate < weekEnd;
        });

        const weekRev = weekBookings.reduce((sum, b) => sum + (b.totalPrice || 0), 0);
        const serviceFeeRev = weekRev * 0.1;
        const percentage = maxRevenue > 0 ? (weekRev / maxRevenue) * 100 : 0;

        weeklyRevenue.push({
          week: `Week ${week + 1}`,
          revenue: serviceFeeRev,
          percentage: Math.min(percentage, 100)
        });
      }

      setRevenueTrends(weeklyRevenue);

      // Calculate percentage changes (comparing first half vs second half of last 30 days)
      const firstHalfBookings = confirmedBookings.filter(b => {
        const bookingDate = new Date(b.createdAt);
        const daysAgo = (now.getTime() - bookingDate.getTime()) / (1000 * 60 * 60 * 24);
        return daysAgo <= 30 && daysAgo > 15;
      }).length;

      const secondHalfBookings = confirmedBookings.filter(b => {
        const bookingDate = new Date(b.createdAt);
        const daysAgo = (now.getTime() - bookingDate.getTime()) / (1000 * 60 * 60 * 24);
        return daysAgo <= 15;
      }).length;

      const bookingChangePercent = firstHalfBookings > 0
        ? ((secondHalfBookings - firstHalfBookings) / firstHalfBookings) * 100
        : 0;

      // Calculate listing changes (comparing first half vs second half)
      const firstHalfListings = listings.filter(l => {
        const listingDate = new Date(l.createdAt);
        const daysAgo = (now.getTime() - listingDate.getTime()) / (1000 * 60 * 60 * 24);
        return daysAgo <= 30 && daysAgo > 15;
      }).length;

      const secondHalfListings = listings.filter(l => {
        const listingDate = new Date(l.createdAt);
        const daysAgo = (now.getTime() - listingDate.getTime()) / (1000 * 60 * 60 * 24);
        return daysAgo <= 15;
      }).length;

      const listingChangePercent = firstHalfListings > 0
        ? ((secondHalfListings - firstHalfListings) / firstHalfListings) * 100
        : 0;

      setStats({
        totalUsers: usersSnap.size,
        totalHosts: hosts,
        totalGuests: guests,
        totalListings: listingsSnap.size,
        totalBookings: bookingsSnap.size,
        totalRevenue: serviceFee,
        avgRating: avgRating,
      });

      setListingChange(listingChangePercent);
      setBookingChange(bookingChangePercent);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatChange = (change: number) => {
    const sign = change >= 0 ? '+' : '';
    const color = change >= 0 ? 'text-green-600' : 'text-red-600';
    const Icon = change >= 0 ? TrendingUp : TrendingDown;
    return (
      <div className={`flex items-center text-xs ${color} mt-1`}>
        <Icon className="h-3 w-3 mr-1" />
        {sign}{change.toFixed(1)}% from last period
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <Button variant="ghost" onClick={() => navigate('/admin/dashboard')} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>

        <h1 className="text-3xl font-bold mb-6">Platform Analytics</h1>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">Total Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalUsers}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.totalHosts} hosts, {stats.totalGuests} guests
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">Total Listings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalListings}</div>
              {formatChange(listingChange)}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">Total Bookings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalBookings}</div>
              {formatChange(bookingChange)}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">Service Fees</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-accent">
                {formatPHP(stats.totalRevenue)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">10% commission</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Top Rated Listings</CardTitle>
              <CardDescription>Highest performing listings</CardDescription>
            </CardHeader>
            <CardContent>
              {topRatedListings.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Star className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No reviews yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {topRatedListings.map((listing, index) => (
                    <div key={listing.id} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{listing.title}</p>
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400 mr-1" />
                          {listing.rating.toFixed(1)} ({listing.reviewCount} reviews)
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {formatPHP(listing.price)}/night
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Lowest Rated Listings</CardTitle>
              <CardDescription>Listings needing attention</CardDescription>
            </CardHeader>
            <CardContent>
              {lowestRatedListings.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <TrendingDown className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No reviews yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {lowestRatedListings.map((listing) => (
                    <div key={listing.id} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{listing.title}</p>
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400 mr-1" />
                          {listing.rating.toFixed(1)} ({listing.reviewCount} reviews)
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {formatPHP(listing.price)}/night
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Revenue Trends</CardTitle>
              <CardDescription>Last 30 days performance</CardDescription>
            </CardHeader>
            <CardContent>
              {revenueTrends.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No revenue data yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {revenueTrends.map((week, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm">{week.week}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 bg-muted rounded-full h-2">
                          <div 
                            className="bg-primary h-2 rounded-full" 
                            style={{ width: `${week.percentage}%` }} 
                          />
                        </div>
                        <span className="text-sm font-medium">{formatPHP(week.revenue)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
