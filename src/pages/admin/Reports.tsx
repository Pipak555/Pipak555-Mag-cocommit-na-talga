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
import { BackButton } from "@/components/shared/BackButton";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

type ReportType = 'summary' | 'users' | 'bookings' | 'revenue' | 'listings';
type ExportFormat = 'csv' | 'pdf' | 'xlsx';

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
      
      // Only count confirmed and completed bookings (not pending)
      const totalConfirmedBookings = filteredBookings.filter(b => 
        b.status === 'confirmed' || b.status === 'completed'
      ).length;
      
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
        totalBookings: totalConfirmedBookings,
        confirmedBookings,
        cancelledBookings,
        completedBookings,
        pendingBookings,
        totalRevenue,
        totalServiceFees: 0, // No service fees - hosts get 100%
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

  const generateSummaryReport = (format: ExportFormat): string | Blob => {
    const timestamp = new Date().toLocaleString();
    const dateRangeText = dateRange.start || dateRange.end 
      ? `Date Range: ${dateRange.start || 'All'} to ${dateRange.end || 'All'}`
      : 'All Time';
    
    if (format === 'csv') {
      // Improved CSV with better structure
      return `PLATFORM ANALYTICS REPORT
Generated: ${timestamp}
${dateRangeText}

BOOKINGS
Metric,Value
Total Bookings,${reportData.totalBookings}
Confirmed Bookings,${reportData.confirmedBookings}
Cancelled Bookings,${reportData.cancelledBookings}
Completed Bookings,${reportData.completedBookings}
Pending Bookings,${reportData.pendingBookings}

REVENUE
Metric,Value (PHP)
Total Revenue,${reportData.totalRevenue.toFixed(2)}
Net to Hosts,${reportData.totalRevenue.toFixed(2)}

USERS
Metric,Value
Total Users,${reportData.totalUsers}
Active Hosts,${reportData.activeHosts}
Active Guests,${reportData.activeGuests}

LISTINGS
Metric,Value
Total Listings,${reportData.totalListings}
Approved Listings,${reportData.approvedListings}
Pending Listings,${reportData.pendingListings}
Rejected Listings,${reportData.rejectedListings}
`;
    } else if (format === 'pdf') {
      const doc = new jsPDF();
      let yPos = 20;
      
      // Header
      doc.setFontSize(20);
      doc.setFont(undefined, 'bold');
      doc.text('Platform Analytics Report', 14, yPos);
      yPos += 10;
      
      doc.setFontSize(11);
      doc.setFont(undefined, 'normal');
      doc.text(`Generated: ${timestamp}`, 14, yPos);
      yPos += 6;
      doc.text(`Date Range: ${dateRangeText}`, 14, yPos);
      yPos += 15;
      
      // Bookings Section
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text('Bookings', 14, yPos);
      yPos += 8;
      
      autoTable(doc, {
        startY: yPos,
        head: [['Metric', 'Value']],
        body: [
          ['Total Bookings', reportData.totalBookings.toString()],
          ['Confirmed Bookings', reportData.confirmedBookings.toString()],
          ['Cancelled Bookings', reportData.cancelledBookings.toString()],
          ['Completed Bookings', reportData.completedBookings.toString()],
          ['Pending Bookings', reportData.pendingBookings.toString()],
        ],
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 10, cellPadding: 5 },
        margin: { left: 14, right: 14 },
      });
      yPos = (doc as any).lastAutoTable.finalY + 15;
      
      // Revenue Section
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text('Revenue', 14, yPos);
      yPos += 8;
      
      autoTable(doc, {
        startY: yPos,
        head: [['Metric', 'Value (PHP)']],
        body: [
          ['Total Revenue', formatPHP(reportData.totalRevenue)],
          ['Net to Hosts', formatPHP(reportData.totalRevenue)],
        ],
        theme: 'striped',
        headStyles: { fillColor: [34, 197, 94], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 10, cellPadding: 5 },
        margin: { left: 14, right: 14 },
      });
      yPos = (doc as any).lastAutoTable.finalY + 15;
      
      // Users Section
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text('Users', 14, yPos);
      yPos += 8;
      
      autoTable(doc, {
        startY: yPos,
        head: [['Metric', 'Value']],
        body: [
          ['Total Users', reportData.totalUsers.toString()],
          ['Active Hosts', reportData.activeHosts.toString()],
          ['Active Guests', reportData.activeGuests.toString()],
        ],
        theme: 'striped',
        headStyles: { fillColor: [168, 85, 247], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 10, cellPadding: 5 },
        margin: { left: 14, right: 14 },
      });
      yPos = (doc as any).lastAutoTable.finalY + 15;
      
      // Listings Section
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text('Listings', 14, yPos);
      yPos += 8;
      
      autoTable(doc, {
        startY: yPos,
        head: [['Metric', 'Value']],
        body: [
          ['Total Listings', reportData.totalListings.toString()],
          ['Approved Listings', reportData.approvedListings.toString()],
          ['Pending Listings', reportData.pendingListings.toString()],
          ['Rejected Listings', reportData.rejectedListings.toString()],
        ],
        theme: 'striped',
        headStyles: { fillColor: [236, 72, 153], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 10, cellPadding: 5 },
        margin: { left: 14, right: 14 },
      });
      
      return doc.output('blob');
    } else if (format === 'xlsx') {
      const wb = XLSX.utils.book_new();
      
      // Summary Sheet
      const summaryData = [
        ['PLATFORM ANALYTICS REPORT'],
        ['Generated:', timestamp],
        ['Date Range:', dateRangeText],
        [],
        ['BOOKINGS'],
        ['Metric', 'Value'],
        ['Total Bookings', reportData.totalBookings],
        ['Confirmed Bookings', reportData.confirmedBookings],
        ['Cancelled Bookings', reportData.cancelledBookings],
        ['Completed Bookings', reportData.completedBookings],
        ['Pending Bookings', reportData.pendingBookings],
        [],
        ['REVENUE'],
        ['Metric', 'Value (PHP)'],
        ['Total Revenue', reportData.totalRevenue],
        ['Net to Hosts', reportData.totalRevenue],
        [],
        ['USERS'],
        ['Metric', 'Value'],
        ['Total Users', reportData.totalUsers],
        ['Active Hosts', reportData.activeHosts],
        ['Active Guests', reportData.activeGuests],
        [],
        ['LISTINGS'],
        ['Metric', 'Value'],
        ['Total Listings', reportData.totalListings],
        ['Approved Listings', reportData.approvedListings],
        ['Pending Listings', reportData.pendingListings],
        ['Rejected Listings', reportData.rejectedListings],
      ];
      
      const ws = XLSX.utils.aoa_to_sheet(summaryData);
      
      // Set column widths
      ws['!cols'] = [
        { wch: 25 },
        { wch: 20 },
      ];
      
      XLSX.utils.book_append_sheet(wb, ws, 'Summary');
      
      return XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
    }
    
    return '';
  };

  const generateUsersReport = (format: ExportFormat): string | Blob => {
    const timestamp = new Date().toLocaleString();
    
    if (format === 'csv') {
      const headers = 'ID,Email,Full Name,Role(s),Created At,Wallet Balance (PHP),Points\n';
      const rows = detailedData.users.map(user => {
        const roles = user.roles || [user.role];
        const createdAt = new Date(user.createdAt).toLocaleDateString();
        return `${user.id},"${user.email}","${user.fullName}","${roles.join(', ')}","${createdAt}",${(user.walletBalance || 0).toFixed(2)},${user.points || 0}`;
      }).join('\n');
      return `USERS REPORT
Generated: ${timestamp}
Total Users: ${detailedData.users.length}

${headers}${rows}`;
    } else if (format === 'pdf') {
      const doc = new jsPDF('landscape');
      let yPos = 20;
      
      // Header
      doc.setFontSize(20);
      doc.setFont(undefined, 'bold');
      doc.text('Users Report', 14, yPos);
      yPos += 10;
      
      doc.setFontSize(11);
      doc.setFont(undefined, 'normal');
      doc.text(`Generated: ${timestamp}`, 14, yPos);
      yPos += 6;
      doc.text(`Total Users: ${detailedData.users.length}`, 14, yPos);
      yPos += 15;
      
      // Table
      const tableData = detailedData.users.map(user => {
        const roles = user.roles || [user.role];
        return [
          user.id.substring(0, 8) + '...',
          user.email,
          user.fullName,
          roles.join(', '),
          new Date(user.createdAt).toLocaleDateString(),
          formatPHP(user.walletBalance || 0),
          (user.points || 0).toString(),
        ];
      });
      
      autoTable(doc, {
        startY: yPos,
        head: [['ID', 'Email', 'Full Name', 'Role(s)', 'Created At', 'Wallet Balance', 'Points']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 8, cellPadding: 3 },
        margin: { left: 14, right: 14 },
      });
      
      return doc.output('blob');
    } else if (format === 'xlsx') {
      const wb = XLSX.utils.book_new();
      
      const usersData = [
        ['USERS REPORT'],
        ['Generated:', timestamp],
        ['Total Users:', detailedData.users.length],
        [],
        ['ID', 'Email', 'Full Name', 'Role(s)', 'Created At', 'Wallet Balance (PHP)', 'Points'],
        ...detailedData.users.map(user => {
          const roles = user.roles || [user.role];
          return [
            user.id,
            user.email,
            user.fullName,
            roles.join(', '),
            new Date(user.createdAt).toLocaleDateString(),
            user.walletBalance || 0,
            user.points || 0,
          ];
        }),
      ];
      
      const ws = XLSX.utils.aoa_to_sheet(usersData);
      
      // Set column widths
      ws['!cols'] = [
        { wch: 25 },
        { wch: 30 },
        { wch: 25 },
        { wch: 15 },
        { wch: 15 },
        { wch: 20 },
        { wch: 10 },
      ];
      
      XLSX.utils.book_append_sheet(wb, ws, 'Users');
      
      return XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
    }
    
    return '';
  };

  const generateBookingsReport = (format: ExportFormat): string | Blob => {
    const timestamp = new Date().toLocaleString();
    
    if (format === 'csv') {
      const headers = 'ID,Guest ID,Host ID,Listing ID,Check In,Check Out,Guests,Total Price (PHP),Status,Created At\n';
      const rows = detailedData.bookings.map(booking => {
        return `${booking.id},"${booking.guestId}","${booking.hostId}","${booking.listingId}","${new Date(booking.checkIn).toLocaleDateString()}","${new Date(booking.checkOut).toLocaleDateString()}",${booking.guests},${(booking.totalPrice || 0).toFixed(2)},${booking.status.toUpperCase()},"${new Date(booking.createdAt).toLocaleDateString()}"`;
      }).join('\n');
      return `BOOKINGS REPORT
Generated: ${timestamp}
Total Bookings: ${detailedData.bookings.length}

${headers}${rows}`;
    } else if (format === 'pdf') {
      const doc = new jsPDF('landscape');
      let yPos = 20;
      
      // Header
      doc.setFontSize(20);
      doc.setFont(undefined, 'bold');
      doc.text('Bookings Report', 14, yPos);
      yPos += 10;
      
      doc.setFontSize(11);
      doc.setFont(undefined, 'normal');
      doc.text(`Generated: ${timestamp}`, 14, yPos);
      yPos += 6;
      doc.text(`Total Bookings: ${detailedData.bookings.length}`, 14, yPos);
      yPos += 15;
      
      // Table
      const tableData = detailedData.bookings.map(booking => [
        booking.id.substring(0, 8) + '...',
        booking.guestId.substring(0, 8) + '...',
        booking.hostId.substring(0, 8) + '...',
        booking.listingId.substring(0, 8) + '...',
        new Date(booking.checkIn).toLocaleDateString(),
        new Date(booking.checkOut).toLocaleDateString(),
        booking.guests.toString(),
        formatPHP(booking.totalPrice || 0),
        booking.status.toUpperCase(),
        new Date(booking.createdAt).toLocaleDateString(),
      ]);
      
      autoTable(doc, {
        startY: yPos,
        head: [['ID', 'Guest ID', 'Host ID', 'Listing ID', 'Check In', 'Check Out', 'Guests', 'Total Price', 'Status', 'Created At']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 7, cellPadding: 2 },
        margin: { left: 14, right: 14 },
      });
      
      return doc.output('blob');
    } else if (format === 'xlsx') {
      const wb = XLSX.utils.book_new();
      
      const bookingsData = [
        ['BOOKINGS REPORT'],
        ['Generated:', timestamp],
        ['Total Bookings:', detailedData.bookings.length],
        [],
        ['ID', 'Guest ID', 'Host ID', 'Listing ID', 'Check In', 'Check Out', 'Guests', 'Total Price (PHP)', 'Status', 'Created At'],
        ...detailedData.bookings.map(booking => [
          booking.id,
          booking.guestId,
          booking.hostId,
          booking.listingId,
          new Date(booking.checkIn).toLocaleDateString(),
          new Date(booking.checkOut).toLocaleDateString(),
          booking.guests,
          booking.totalPrice || 0,
          booking.status.toUpperCase(),
          new Date(booking.createdAt).toLocaleDateString(),
        ]),
      ];
      
      const ws = XLSX.utils.aoa_to_sheet(bookingsData);
      
      // Set column widths
      ws['!cols'] = [
        { wch: 25 },
        { wch: 25 },
        { wch: 25 },
        { wch: 25 },
        { wch: 15 },
        { wch: 15 },
        { wch: 10 },
        { wch: 18 },
        { wch: 12 },
        { wch: 15 },
      ];
      
      XLSX.utils.book_append_sheet(wb, ws, 'Bookings');
      
      return XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
    }
    
    return '';
  };

  const generateRevenueReport = (format: ExportFormat): string | Blob => {
    const timestamp = new Date().toLocaleString();
    const revenueBookings = detailedData.bookings.filter(b => 
      b.status === 'confirmed' || b.status === 'completed'
    );
    
    if (format === 'csv') {
      const summary = `SUMMARY
Total Revenue (PHP),${reportData.totalRevenue.toFixed(2)}
Net to Hosts (PHP),${reportData.totalRevenue.toFixed(2)}

DETAILED BREAKDOWN
`;
      const headers = 'Booking ID,Guest ID,Host ID,Total Price (PHP),Net to Host (PHP),Status,Check In Date\n';
      const rows = revenueBookings.map(booking => {
        const netToHost = booking.totalPrice || 0; // Hosts get 100%
        return `${booking.id},"${booking.guestId}","${booking.hostId}",${(booking.totalPrice || 0).toFixed(2)},${netToHost.toFixed(2)},${booking.status.toUpperCase()},"${new Date(booking.checkIn).toLocaleDateString()}"`;
      }).join('\n');
      return `REVENUE REPORT
Generated: ${timestamp}
Total Transactions: ${revenueBookings.length}

${summary}${headers}${rows}`;
    } else if (format === 'pdf') {
      const doc = new jsPDF();
      let yPos = 20;
      
      // Header
      doc.setFontSize(20);
      doc.setFont(undefined, 'bold');
      doc.text('Revenue Report', 14, yPos);
      yPos += 10;
      
      doc.setFontSize(11);
      doc.setFont(undefined, 'normal');
      doc.text(`Generated: ${timestamp}`, 14, yPos);
      yPos += 6;
      doc.text(`Total Transactions: ${revenueBookings.length}`, 14, yPos);
      yPos += 15;
      
      // Summary Section
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text('Summary', 14, yPos);
      yPos += 8;
      
      autoTable(doc, {
        startY: yPos,
        head: [['Metric', 'Amount (PHP)']],
        body: [
          ['Total Revenue', formatPHP(reportData.totalRevenue)],
          ['Net to Hosts', formatPHP(reportData.totalRevenue)],
        ],
        theme: 'striped',
        headStyles: { fillColor: [34, 197, 94], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 10, cellPadding: 5 },
        margin: { left: 14, right: 14 },
      });
      yPos = (doc as any).lastAutoTable.finalY + 15;
      
      // Detailed Breakdown
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text('Detailed Breakdown', 14, yPos);
      yPos += 8;
      
      const tableData = revenueBookings.map(booking => {
        const netToHost = booking.totalPrice || 0;
        return [
          booking.id.substring(0, 8) + '...',
          booking.guestId.substring(0, 8) + '...',
          booking.hostId.substring(0, 8) + '...',
          formatPHP(booking.totalPrice || 0),
          formatPHP(netToHost),
          booking.status.toUpperCase(),
          new Date(booking.checkIn).toLocaleDateString(),
        ];
      });
      
      autoTable(doc, {
        startY: yPos,
        head: [['Booking ID', 'Guest ID', 'Host ID', 'Total Price', 'Net to Host', 'Status', 'Check In']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 8, cellPadding: 3 },
        margin: { left: 14, right: 14 },
      });
      
      return doc.output('blob');
    } else if (format === 'xlsx') {
      const wb = XLSX.utils.book_new();
      
      // Summary Sheet
      const summaryData = [
        ['REVENUE REPORT'],
        ['Generated:', timestamp],
        ['Total Transactions:', revenueBookings.length],
        [],
        ['SUMMARY'],
        ['Metric', 'Amount (PHP)'],
        ['Total Revenue', reportData.totalRevenue],
        ['Net to Hosts', reportData.totalRevenue],
        [],
        ['DETAILED BREAKDOWN'],
        ['Booking ID', 'Guest ID', 'Host ID', 'Total Price (PHP)', 'Net to Host (PHP)', 'Status', 'Check In Date'],
        ...revenueBookings.map(booking => {
          const netToHost = booking.totalPrice || 0;
          return [
            booking.id,
            booking.guestId,
            booking.hostId,
            booking.totalPrice || 0,
            netToHost,
            booking.status.toUpperCase(),
            new Date(booking.checkIn).toLocaleDateString(),
          ];
        }),
      ];
      
      const ws = XLSX.utils.aoa_to_sheet(summaryData);
      
      // Set column widths
      ws['!cols'] = [
        { wch: 25 },
        { wch: 25 },
        { wch: 25 },
        { wch: 20 },
        { wch: 20 },
        { wch: 12 },
        { wch: 15 },
      ];
      
      XLSX.utils.book_append_sheet(wb, ws, 'Revenue');
      
      return XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
    }
    
    return '';
  };

  const generateListingsReport = (format: ExportFormat): string | Blob => {
    const timestamp = new Date().toLocaleString();
    
    if (format === 'csv') {
      const headers = 'ID,Title,Host ID,Category,Price (PHP),Status,Location,Created At\n';
      const rows = detailedData.listings.map(listing => {
        return `${listing.id},"${listing.title}","${listing.hostId}",${listing.category.toUpperCase()},${listing.price.toFixed(2)},${listing.status.toUpperCase()},"${listing.location}","${new Date(listing.createdAt).toLocaleDateString()}"`;
      }).join('\n');
      return `LISTINGS REPORT
Generated: ${timestamp}
Total Listings: ${detailedData.listings.length}

${headers}${rows}`;
    } else if (format === 'pdf') {
      const doc = new jsPDF('landscape');
      let yPos = 20;
      
      // Header
      doc.setFontSize(20);
      doc.setFont(undefined, 'bold');
      doc.text('Listings Report', 14, yPos);
      yPos += 10;
      
      doc.setFontSize(11);
      doc.setFont(undefined, 'normal');
      doc.text(`Generated: ${timestamp}`, 14, yPos);
      yPos += 6;
      doc.text(`Total Listings: ${detailedData.listings.length}`, 14, yPos);
      yPos += 15;
      
      // Table
      const tableData = detailedData.listings.map(listing => [
        listing.id.substring(0, 8) + '...',
        listing.title.length > 30 ? listing.title.substring(0, 30) + '...' : listing.title,
        listing.hostId.substring(0, 8) + '...',
        listing.category.toUpperCase(),
        formatPHP(listing.price),
        listing.status.toUpperCase(),
        listing.location.length > 25 ? listing.location.substring(0, 25) + '...' : listing.location,
        new Date(listing.createdAt).toLocaleDateString(),
      ]);
      
      autoTable(doc, {
        startY: yPos,
        head: [['ID', 'Title', 'Host ID', 'Category', 'Price', 'Status', 'Location', 'Created At']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 8, cellPadding: 3 },
        margin: { left: 14, right: 14 },
      });
      
      return doc.output('blob');
    } else if (format === 'xlsx') {
      const wb = XLSX.utils.book_new();
      
      const listingsData = [
        ['LISTINGS REPORT'],
        ['Generated:', timestamp],
        ['Total Listings:', detailedData.listings.length],
        [],
        ['ID', 'Title', 'Host ID', 'Category', 'Price (PHP)', 'Status', 'Location', 'Created At'],
        ...detailedData.listings.map(listing => [
          listing.id,
          listing.title,
          listing.hostId,
          listing.category.toUpperCase(),
          listing.price,
          listing.status.toUpperCase(),
          listing.location,
          new Date(listing.createdAt).toLocaleDateString(),
        ]),
      ];
      
      const ws = XLSX.utils.aoa_to_sheet(listingsData);
      
      // Set column widths
      ws['!cols'] = [
        { wch: 25 },
        { wch: 35 },
        { wch: 25 },
        { wch: 15 },
        { wch: 15 },
        { wch: 12 },
        { wch: 30 },
        { wch: 15 },
      ];
      
      XLSX.utils.book_append_sheet(wb, ws, 'Listings');
      
      return XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
    }
    
    return '';
  };

  const generateReport = () => {
    setGenerating(true);
    try {
      let content: string | Blob = '';
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
        mimeType = 'text/csv;charset=utf-8;';
        filename += '.csv';
        // Create blob from string for CSV
        const blob = new Blob(['\ufeff' + content], { type: mimeType }); // BOM for UTF-8
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } else if (exportFormat === 'pdf') {
        // Content is already a Blob for PDF
        const url = window.URL.createObjectURL(content as Blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } else if (exportFormat === 'xlsx') {
        // Content is already an ArrayBuffer for XLSX
        const blob = new Blob([content as ArrayBuffer], { 
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
        });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
      
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
        <BackButton to="/admin/dashboard" className="mb-6" />

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
                      <SelectItem value="csv">CSV (Comma Separated Values)</SelectItem>
                      <SelectItem value="pdf">PDF (Portable Document Format)</SelectItem>
                      <SelectItem value="xlsx">XLSX (Excel Spreadsheet)</SelectItem>
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
                        {formatPHP(reportData.totalRevenue)}
                      </div>
                      <div className="text-sm text-muted-foreground">Net to Hosts (100%)</div>
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
                      Revenue Breakdown
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-3 bg-muted rounded">
                        <span>Total Revenue</span>
                        <span className="font-bold">{formatPHP(reportData.totalRevenue)}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-primary/10 rounded">
                        <span className="font-semibold">Net to Hosts</span>
                        <span className="font-bold">
                          {formatPHP(reportData.totalRevenue)}
                        </span>
                        <span className="text-xs text-muted-foreground">(100%)</span>
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
