import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Download, FileText, Users, BookOpen, DollarSign, Home, Loader2 } from "lucide-react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { toast } from "sonner";
import { formatPHP } from "@/lib/currency";
import type { Booking, Listing, UserProfile } from "@/types";

type ReportType = 'summary' | 'users' | 'bookings' | 'revenue' | 'listings';
type ExportFormat = 'csv' | 'json' | 'txt';

const Reports = () => {
  const navigate = useNavigate();
  const { user, hasRole } = useAuth();
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [reportType, setReportType] = useState<ReportType>('summary');
  const [exportFormat, setExportFormat] = useState<ExportFormat>('csv');
  const [dateRange, setDateRange] = useState({
    start: '',
    end: ''
  });
  
  const [reportData, setReportData] = useState({
    totalBookings: 0,
    confirmedBookings: 0,
    cancelledBookings: 0,
    completedBookings: 0,
    pendingBookings: 0,
    totalRevenue: 0,
    totalServiceFees: 0,
    totalUsers: 0,
    totalListings: 0,
    activeHosts: 0,
    activeGuests: 0,
    approvedListings: 0,
    pendingListings: 0,
    rejectedListings: 0
  });
  
  const [detailedData, setDetailedData] = useState<{
    bookings: Booking[];
    users: (UserProfile & { id: string })[];
    listings: Listing[];
  }>({
    bookings: [],
    users: [],
    listings: []
  });

  useEffect(() => {
    if (!user || !hasRole('admin')) {
      navigate('/admin/login');
      return;
    }
    loadReportData();
  }, [user, hasRole, navigate]);

  const loadReportData = async () => {
    setLoading(true);
    try {
      const [bookingsSnap, usersSnap, listingsSnap] = await Promise.all([
        getDocs(collection(db, 'bookings')),
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'listing'))
      ]);

      const bookings = bookingsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));
      const users = usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserProfile & { id: string }));
      const listings = listingsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Listing));
      
      // Filter by date range if provided
      let filteredBookings = bookings;
      if (dateRange.start || dateRange.end) {
        filteredBookings = bookings.filter(booking => {
          const bookingDate = new Date(booking.createdAt);
          if (dateRange.start && bookingDate < new Date(dateRange.start)) return false;
          if (dateRange.end && bookingDate > new Date(dateRange.end)) return false;
          return true;
        });
      }
      
      // Calculate booking stats
      const confirmedBookings = filteredBookings.filter(b => b.status === 'confirmed').length;
      const cancelledBookings = filteredBookings.filter(b => b.status === 'cancelled').length;
      const completedBookings = filteredBookings.filter(b => b.status === 'completed').length;
      const pendingBookings = filteredBookings.filter(b => b.status === 'pending').length;
      
      // Calculate revenue (only from confirmed and completed bookings)
      const revenueBookings = filteredBookings.filter(b => 
        b.status === 'confirmed' || b.status === 'completed'
      );
      const totalRevenue = revenueBookings.reduce((sum, b) => sum + (b.totalPrice || 0), 0);
      const serviceFeeRate = 0.15; // 15% service fee
      
      // Count users with multiple roles
      const hosts = users.filter(u => {
        const roles = u.roles || [u.role];
        return roles.includes('host');
      }).length;
      const guests = users.filter(u => {
        const roles = u.roles || [u.role];
        return roles.includes('guest');
      }).length;
      
      // Listing stats
      const approvedListings = listings.filter(l => l.status === 'approved').length;
      const pendingListings = listings.filter(l => l.status === 'pending').length;
      const rejectedListings = listings.filter(l => l.status === 'rejected').length;
      
      setReportData({
        totalBookings: filteredBookings.length,
        confirmedBookings,
        cancelledBookings,
        completedBookings,
        pendingBookings,
        totalRevenue,
        totalServiceFees: totalRevenue * serviceFeeRate,
        totalUsers: users.length,
        totalListings: listings.length,
        activeHosts: hosts,
        activeGuests: guests,
        approvedListings,
        pendingListings,
        rejectedListings
      });
      
      // Store detailed data for detailed reports
      setDetailedData({
        bookings: filteredBookings,
        users,
        listings
      });
    } catch (error) {
      console.error('Error loading report data:', error);
      toast.error("Failed to load report data");
    } finally {
      setLoading(false);
    }
  };
  
  // Reload when date range changes (debounced to prevent too many requests)
  useEffect(() => {
    if (!user || !hasRole('admin')) return;
    
    const timeoutId = setTimeout(() => {
      loadReportData();
    }, 300); // Debounce by 300ms
    
    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange.start, dateRange.end]);

  const generateSummaryReport = (format: ExportFormat): string => {
    const timestamp = new Date().toLocaleString();
    const dateRangeText = dateRange.start || dateRange.end 
      ? `Date Range: ${dateRange.start || 'All'} to ${dateRange.end || 'All'}\n`
      : '';
    
    if (format === 'csv') {
      return `Platform Analytics Report
Generated: ${timestamp}
${dateRangeText}
Metric,Value
Total Bookings,${reportData.totalBookings}
Confirmed Bookings,${reportData.confirmedBookings}
Cancelled Bookings,${reportData.cancelledBookings}
Completed Bookings,${reportData.completedBookings}
Pending Bookings,${reportData.pendingBookings}
Total Revenue,₱${reportData.totalRevenue.toFixed(2)}
Service Fees Collected (15%),₱${reportData.totalServiceFees.toFixed(2)}
Net to Hosts,₱${(reportData.totalRevenue - reportData.totalServiceFees).toFixed(2)}
Total Users,${reportData.totalUsers}
Active Hosts,${reportData.activeHosts}
Active Guests,${reportData.activeGuests}
Total Listings,${reportData.totalListings}
Approved Listings,${reportData.approvedListings}
Pending Listings,${reportData.pendingListings}
Rejected Listings,${reportData.rejectedListings}
`;
    } else if (format === 'json') {
      return JSON.stringify({
        reportType: 'summary',
        generated: timestamp,
        dateRange: dateRange.start || dateRange.end ? { start: dateRange.start || null, end: dateRange.end || null } : null,
        metrics: {
          bookings: {
            total: reportData.totalBookings,
            confirmed: reportData.confirmedBookings,
            cancelled: reportData.cancelledBookings,
            completed: reportData.completedBookings,
            pending: reportData.pendingBookings
          },
          revenue: {
            total: reportData.totalRevenue,
            serviceFees: reportData.totalServiceFees,
            netToHosts: reportData.totalRevenue - reportData.totalServiceFees,
            currency: 'PHP'
          },
          users: {
            total: reportData.totalUsers,
            hosts: reportData.activeHosts,
            guests: reportData.activeGuests
          },
          listings: {
            total: reportData.totalListings,
            approved: reportData.approvedListings,
            pending: reportData.pendingListings,
            rejected: reportData.rejectedListings
          }
        }
      }, null, 2);
    } else {
      return `PLATFORM ANALYTICS REPORT
Generated: ${timestamp}
${dateRangeText}
═══════════════════════════════════════════════════════════

BOOKINGS
───────────────────────────────────────────────────────────
Total Bookings:           ${reportData.totalBookings}
Confirmed:                ${reportData.confirmedBookings}
Cancelled:                ${reportData.cancelledBookings}
Completed:                ${reportData.completedBookings}
Pending:                  ${reportData.pendingBookings}

REVENUE
───────────────────────────────────────────────────────────
Total Revenue:            ${formatPHP(reportData.totalRevenue)}
Service Fees (15%):       ${formatPHP(reportData.totalServiceFees)}
Net to Hosts:             ${formatPHP(reportData.totalRevenue - reportData.totalServiceFees)}

USERS
───────────────────────────────────────────────────────────
Total Users:              ${reportData.totalUsers}
Active Hosts:             ${reportData.activeHosts}
Active Guests:            ${reportData.activeGuests}

LISTINGS
───────────────────────────────────────────────────────────
Total Listings:           ${reportData.totalListings}
Approved:                 ${reportData.approvedListings}
Pending:                  ${reportData.pendingListings}
Rejected:                 ${reportData.rejectedListings}

═══════════════════════════════════════════════════════════
`;
    }
  };

  const generateUsersReport = (format: ExportFormat): string => {
    const timestamp = new Date().toLocaleString();
    
    if (format === 'csv') {
      const headers = 'ID,Email,Full Name,Role(s),Created At,Wallet Balance,Points\n';
      const rows = detailedData.users.map(user => {
        const roles = user.roles || [user.role];
        return `${user.id},${user.email},${user.fullName},"${roles.join(', ')}",${user.createdAt},${user.walletBalance || 0},${user.points || 0}`;
      }).join('\n');
      return `Users Report\nGenerated: ${timestamp}\n\n${headers}${rows}`;
    } else if (format === 'json') {
      return JSON.stringify({
        reportType: 'users',
        generated: timestamp,
        totalUsers: detailedData.users.length,
        users: detailedData.users.map(user => ({
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          roles: user.roles || [user.role],
          createdAt: user.createdAt,
          walletBalance: user.walletBalance || 0,
          points: user.points || 0
        }))
      }, null, 2);
    } else {
      let text = `USERS REPORT\nGenerated: ${timestamp}\n═══════════════════════════════════════════════════════════\n\n`;
      detailedData.users.forEach((user, index) => {
        const roles = user.roles || [user.role];
        text += `${index + 1}. ${user.fullName} (${user.email})\n`;
        text += `   ID: ${user.id}\n`;
        text += `   Roles: ${roles.join(', ')}\n`;
        text += `   Created: ${new Date(user.createdAt).toLocaleDateString()}\n`;
        text += `   Wallet: ${formatPHP(user.walletBalance || 0)}\n`;
        text += `   Points: ${user.points || 0}\n\n`;
      });
      return text;
    }
  };

  const generateBookingsReport = (format: ExportFormat): string => {
    const timestamp = new Date().toLocaleString();
    
    if (format === 'csv') {
      const headers = 'ID,Guest ID,Host ID,Listing ID,Check In,Check Out,Guests,Total Price,Status,Created At\n';
      const rows = detailedData.bookings.map(booking => {
        return `${booking.id},${booking.guestId},${booking.hostId},${booking.listingId},${booking.checkIn},${booking.checkOut},${booking.guests},${booking.totalPrice || 0},${booking.status},${booking.createdAt}`;
      }).join('\n');
      return `Bookings Report\nGenerated: ${timestamp}\n\n${headers}${rows}`;
    } else if (format === 'json') {
      return JSON.stringify({
        reportType: 'bookings',
        generated: timestamp,
        totalBookings: detailedData.bookings.length,
        bookings: detailedData.bookings
      }, null, 2);
    } else {
      let text = `BOOKINGS REPORT\nGenerated: ${timestamp}\n═══════════════════════════════════════════════════════════\n\n`;
      detailedData.bookings.forEach((booking, index) => {
        text += `${index + 1}. Booking #${booking.id.slice(0, 8)}\n`;
        text += `   Guest ID: ${booking.guestId}\n`;
        text += `   Host ID: ${booking.hostId}\n`;
        text += `   Check In: ${new Date(booking.checkIn).toLocaleDateString()}\n`;
        text += `   Check Out: ${new Date(booking.checkOut).toLocaleDateString()}\n`;
        text += `   Guests: ${booking.guests}\n`;
        text += `   Total Price: ${formatPHP(booking.totalPrice || 0)}\n`;
        text += `   Status: ${booking.status.toUpperCase()}\n`;
        text += `   Created: ${new Date(booking.createdAt).toLocaleDateString()}\n\n`;
      });
      return text;
    }
  };

  const generateRevenueReport = (format: ExportFormat): string => {
    const timestamp = new Date().toLocaleString();
    const revenueBookings = detailedData.bookings.filter(b => 
      b.status === 'confirmed' || b.status === 'completed'
    );
    const serviceFeeRate = 0.15;
    
    if (format === 'csv') {
      const headers = 'Booking ID,Guest ID,Host ID,Total Price,Service Fee (15%),Net to Host,Status,Check In Date\n';
      const rows = revenueBookings.map(booking => {
        const serviceFee = (booking.totalPrice || 0) * serviceFeeRate;
        const netToHost = (booking.totalPrice || 0) - serviceFee;
        return `${booking.id},${booking.guestId},${booking.hostId},${booking.totalPrice || 0},${serviceFee.toFixed(2)},${netToHost.toFixed(2)},${booking.status},${booking.checkIn}`;
      }).join('\n');
      const summary = `Total Revenue,${reportData.totalRevenue.toFixed(2)}\nTotal Service Fees,${reportData.totalServiceFees.toFixed(2)}\nNet to Hosts,${(reportData.totalRevenue - reportData.totalServiceFees).toFixed(2)}\n`;
      return `Revenue Report\nGenerated: ${timestamp}\n\n${summary}\n${headers}${rows}`;
    } else if (format === 'json') {
      return JSON.stringify({
        reportType: 'revenue',
        generated: timestamp,
        summary: {
          totalRevenue: reportData.totalRevenue,
          totalServiceFees: reportData.totalServiceFees,
          netToHosts: reportData.totalRevenue - reportData.totalServiceFees
        },
        bookings: revenueBookings.map(booking => {
          const serviceFee = (booking.totalPrice || 0) * serviceFeeRate;
          const netToHost = (booking.totalPrice || 0) - serviceFee;
          return {
            bookingId: booking.id,
            guestId: booking.guestId,
            hostId: booking.hostId,
            totalPrice: booking.totalPrice || 0,
            serviceFee,
            netToHost,
            status: booking.status,
            checkIn: booking.checkIn
          };
        })
      }, null, 2);
    } else {
      let text = `REVENUE REPORT\nGenerated: ${timestamp}\n═══════════════════════════════════════════════════════════\n\n`;
      text += `SUMMARY\n───────────────────────────────────────────────────────────\n`;
      text += `Total Revenue:            ${formatPHP(reportData.totalRevenue)}\n`;
      text += `Service Fees (15%):      ${formatPHP(reportData.totalServiceFees)}\n`;
      text += `Net to Hosts:            ${formatPHP(reportData.totalRevenue - reportData.totalServiceFees)}\n\n`;
      text += `DETAILED BREAKDOWN\n───────────────────────────────────────────────────────────\n\n`;
      revenueBookings.forEach((booking, index) => {
        const serviceFee = (booking.totalPrice || 0) * serviceFeeRate;
        const netToHost = (booking.totalPrice || 0) - serviceFee;
        text += `${index + 1}. Booking #${booking.id.slice(0, 8)}\n`;
        text += `   Total Price: ${formatPHP(booking.totalPrice || 0)}\n`;
        text += `   Service Fee: ${formatPHP(serviceFee)}\n`;
        text += `   Net to Host: ${formatPHP(netToHost)}\n`;
        text += `   Check In: ${new Date(booking.checkIn).toLocaleDateString()}\n\n`;
      });
      return text;
    }
  };

  const generateListingsReport = (format: ExportFormat): string => {
    const timestamp = new Date().toLocaleString();
    
    if (format === 'csv') {
      const headers = 'ID,Title,Host ID,Category,Price,Status,Location,Created At\n';
      const rows = detailedData.listings.map(listing => {
        return `${listing.id},${listing.title},${listing.hostId},${listing.category},${listing.price},${listing.status},${listing.location},${listing.createdAt}`;
      }).join('\n');
      return `Listings Report\nGenerated: ${timestamp}\n\n${headers}${rows}`;
    } else if (format === 'json') {
      return JSON.stringify({
        reportType: 'listings',
        generated: timestamp,
        totalListings: detailedData.listings.length,
        listings: detailedData.listings
      }, null, 2);
    } else {
      let text = `LISTINGS REPORT\nGenerated: ${timestamp}\n═══════════════════════════════════════════════════════════\n\n`;
      detailedData.listings.forEach((listing, index) => {
        text += `${index + 1}. ${listing.title}\n`;
        text += `   ID: ${listing.id}\n`;
        text += `   Host ID: ${listing.hostId}\n`;
        text += `   Category: ${listing.category.toUpperCase()}\n`;
        text += `   Price: ${formatPHP(listing.price)}\n`;
        text += `   Status: ${listing.status.toUpperCase()}\n`;
        text += `   Location: ${listing.location}\n`;
        text += `   Created: ${new Date(listing.createdAt).toLocaleDateString()}\n\n`;
      });
      return text;
    }
  };

  const generateReport = () => {
    setGenerating(true);
    try {
      let content = '';
      let filename = '';
      let mimeType = '';
      
      switch (reportType) {
        case 'summary':
          content = generateSummaryReport(exportFormat);
          filename = `platform-summary-report-${Date.now()}`;
          break;
        case 'users':
          content = generateUsersReport(exportFormat);
          filename = `users-report-${Date.now()}`;
          break;
        case 'bookings':
          content = generateBookingsReport(exportFormat);
          filename = `bookings-report-${Date.now()}`;
          break;
        case 'revenue':
          content = generateRevenueReport(exportFormat);
          filename = `revenue-report-${Date.now()}`;
          break;
        case 'listings':
          content = generateListingsReport(exportFormat);
          filename = `listings-report-${Date.now()}`;
          break;
      }
      
      // Set MIME type and file extension
      if (exportFormat === 'csv') {
        mimeType = 'text/csv';
        filename += '.csv';
      } else if (exportFormat === 'json') {
        mimeType = 'application/json';
        filename += '.json';
      } else {
        mimeType = 'text/plain';
        filename += '.txt';
      }
      
      // Create and download file
      const blob = new Blob([content], { type: mimeType });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast.success(`Report downloaded successfully as ${exportFormat.toUpperCase()}`);
    } catch (error: any) {
      console.error('Error generating report:', error);
      toast.error(`Failed to generate report: ${error.message}`);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate('/admin/dashboard')}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>

        <div className="mb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold">Platform Reports</h1>
              <p className="text-muted-foreground">
                Generate and download comprehensive platform analytics
              </p>
            </div>
          </div>
          
          {/* Report Configuration */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Report Configuration</CardTitle>
              <CardDescription>Select report type, format, and date range</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Report Type</Label>
                  <Select value={reportType} onValueChange={(value) => setReportType(value as ReportType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="summary">Summary Report</SelectItem>
                      <SelectItem value="users">Users Report</SelectItem>
                      <SelectItem value="bookings">Bookings Report</SelectItem>
                      <SelectItem value="revenue">Revenue Report</SelectItem>
                      <SelectItem value="listings">Listings Report</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Export Format</Label>
                  <Select value={exportFormat} onValueChange={(value) => setExportFormat(value as ExportFormat)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="csv">CSV</SelectItem>
                      <SelectItem value="json">JSON</SelectItem>
                      <SelectItem value="txt">TXT</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Date Range (Optional)</Label>
                  <div className="flex gap-2">
                    <Input
                      type="date"
                      value={dateRange.start}
                      onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                      placeholder="Start Date"
                    />
                    <Input
                      type="date"
                      value={dateRange.end}
                      onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                      placeholder="End Date"
                    />
                  </div>
                </div>
              </div>
              
              <Button 
                onClick={generateReport} 
                disabled={generating || loading}
                className="w-full"
              >
                {generating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating Report...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Generate & Download {reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report ({exportFormat.toUpperCase()})
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-3 text-muted-foreground">Loading report data...</span>
          </div>
        ) : (
          <Tabs defaultValue="summary" className="w-full">
            <TabsList className="grid w-full grid-cols-5 mb-6">
              <TabsTrigger value="summary">Summary</TabsTrigger>
              <TabsTrigger value="bookings">Bookings</TabsTrigger>
              <TabsTrigger value="revenue">Revenue</TabsTrigger>
              <TabsTrigger value="users">Users</TabsTrigger>
              <TabsTrigger value="listings">Listings</TabsTrigger>
            </TabsList>
            
            <TabsContent value="summary" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Summary Statistics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-primary">
                        {reportData.totalBookings}
                      </div>
                      <div className="text-sm text-muted-foreground">Total Bookings</div>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        {formatPHP(reportData.totalRevenue)}
                      </div>
                      <div className="text-sm text-muted-foreground">Total Revenue</div>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">
                        {formatPHP(reportData.totalServiceFees)}
                      </div>
                      <div className="text-sm text-muted-foreground">Service Fees (15%)</div>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <div className="text-2xl font-bold">{reportData.totalUsers}</div>
                      <div className="text-sm text-muted-foreground">Total Users</div>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <div className="text-2xl font-bold">{reportData.activeHosts}</div>
                      <div className="text-sm text-muted-foreground">Active Hosts</div>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <div className="text-2xl font-bold">{reportData.activeGuests}</div>
                      <div className="text-sm text-muted-foreground">Active Guests</div>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <div className="text-2xl font-bold">{reportData.totalListings}</div>
                      <div className="text-sm text-muted-foreground">Total Listings</div>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        {formatPHP(reportData.totalRevenue - reportData.totalServiceFees)}
                      </div>
                      <div className="text-sm text-muted-foreground">Net to Hosts</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BookOpen className="h-5 w-5" />
                      Booking Status Breakdown
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/20 rounded">
                        <span>Confirmed</span>
                        <span className="font-bold text-green-600">{reportData.confirmedBookings}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded">
                        <span>Completed</span>
                        <span className="font-bold text-blue-600">{reportData.completedBookings}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded">
                        <span>Pending</span>
                        <span className="font-bold text-yellow-600">{reportData.pendingBookings}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-red-50 dark:bg-red-900/20 rounded">
                        <span>Cancelled</span>
                        <span className="font-bold text-red-600">{reportData.cancelledBookings}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5" />
                      Service Fee Breakdown
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-3 bg-muted rounded">
                        <span>Gross Revenue</span>
                        <span className="font-bold">{formatPHP(reportData.totalRevenue)}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-muted rounded">
                        <span>Platform Fee (15%)</span>
                        <span className="font-bold text-blue-600">
                          {formatPHP(reportData.totalServiceFees)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-primary/10 rounded">
                        <span className="font-semibold">Net to Hosts</span>
                        <span className="font-bold">
                          {formatPHP(reportData.totalRevenue - reportData.totalServiceFees)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Home className="h-5 w-5" />
                      Listing Status Breakdown
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/20 rounded">
                        <span>Approved</span>
                        <span className="font-bold text-green-600">{reportData.approvedListings}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded">
                        <span>Pending</span>
                        <span className="font-bold text-yellow-600">{reportData.pendingListings}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-red-50 dark:bg-red-900/20 rounded">
                        <span>Rejected</span>
                        <span className="font-bold text-red-600">{reportData.rejectedListings}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            <TabsContent value="bookings" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    Bookings Overview
                  </CardTitle>
                  <CardDescription>
                    Total: {detailedData.bookings.length} bookings
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-4 gap-4">
                    <div className="p-4 border rounded-lg">
                      <div className="text-2xl font-bold">{reportData.totalBookings}</div>
                      <div className="text-sm text-muted-foreground">Total</div>
                    </div>
                    <div className="p-4 border rounded-lg bg-green-50 dark:bg-green-900/20">
                      <div className="text-2xl font-bold text-green-600">{reportData.confirmedBookings}</div>
                      <div className="text-sm text-muted-foreground">Confirmed</div>
                    </div>
                    <div className="p-4 border rounded-lg bg-blue-50 dark:bg-blue-900/20">
                      <div className="text-2xl font-bold text-blue-600">{reportData.completedBookings}</div>
                      <div className="text-sm text-muted-foreground">Completed</div>
                    </div>
                    <div className="p-4 border rounded-lg bg-red-50 dark:bg-red-900/20">
                      <div className="text-2xl font-bold text-red-600">{reportData.cancelledBookings}</div>
                      <div className="text-sm text-muted-foreground">Cancelled</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="revenue" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Revenue Overview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        {formatPHP(reportData.totalRevenue)}
                      </div>
                      <div className="text-sm text-muted-foreground">Total Revenue</div>
                    </div>
                    <div className="p-4 border rounded-lg bg-blue-50 dark:bg-blue-900/20">
                      <div className="text-2xl font-bold text-blue-600">
                        {formatPHP(reportData.totalServiceFees)}
                      </div>
                      <div className="text-sm text-muted-foreground">Service Fees (15%)</div>
                    </div>
                    <div className="p-4 border rounded-lg bg-primary/10">
                      <div className="text-2xl font-bold">
                        {formatPHP(reportData.totalRevenue - reportData.totalServiceFees)}
                      </div>
                      <div className="text-sm text-muted-foreground">Net to Hosts</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="users" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Users Overview
                  </CardTitle>
                  <CardDescription>
                    Total: {detailedData.users.length} users
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="p-4 border rounded-lg">
                      <div className="text-2xl font-bold">{reportData.totalUsers}</div>
                      <div className="text-sm text-muted-foreground">Total Users</div>
                    </div>
                    <div className="p-4 border rounded-lg bg-secondary/10">
                      <div className="text-2xl font-bold text-secondary">{reportData.activeHosts}</div>
                      <div className="text-sm text-muted-foreground">Active Hosts</div>
                    </div>
                    <div className="p-4 border rounded-lg bg-primary/10">
                      <div className="text-2xl font-bold text-primary">{reportData.activeGuests}</div>
                      <div className="text-sm text-muted-foreground">Active Guests</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="listings" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Home className="h-5 w-5" />
                    Listings Overview
                  </CardTitle>
                  <CardDescription>
                    Total: {detailedData.listings.length} listings
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-4 gap-4">
                    <div className="p-4 border rounded-lg">
                      <div className="text-2xl font-bold">{reportData.totalListings}</div>
                      <div className="text-sm text-muted-foreground">Total</div>
                    </div>
                    <div className="p-4 border rounded-lg bg-green-50 dark:bg-green-900/20">
                      <div className="text-2xl font-bold text-green-600">{reportData.approvedListings}</div>
                      <div className="text-sm text-muted-foreground">Approved</div>
                    </div>
                    <div className="p-4 border rounded-lg bg-yellow-50 dark:bg-yellow-900/20">
                      <div className="text-2xl font-bold text-yellow-600">{reportData.pendingListings}</div>
                      <div className="text-sm text-muted-foreground">Pending</div>
                    </div>
                    <div className="p-4 border rounded-lg bg-red-50 dark:bg-red-900/20">
                      <div className="text-2xl font-bold text-red-600">{reportData.rejectedListings}</div>
                      <div className="text-sm text-muted-foreground">Rejected</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
};

export default Reports;
