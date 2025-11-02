import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Download, FileText } from "lucide-react";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { toast } from "sonner";

const Reports = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState({
    totalBookings: 0,
    totalRevenue: 0,
    totalServiceFees: 0,
    totalUsers: 0,
    totalListings: 0,
    activeHosts: 0,
    activeGuests: 0
  });

  useEffect(() => {
    loadReportData();
  }, []);

  const loadReportData = async () => {
    setLoading(true);
    try {
      const [bookingsSnap, usersSnap, listingsSnap] = await Promise.all([
        getDocs(collection(db, 'bookings')),
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'listing'))
      ]);

      const bookings = bookingsSnap.docs.map(doc => doc.data());
      const users = usersSnap.docs.map(doc => doc.data());
      
      const totalRevenue = bookings.reduce((sum, b) => sum + (b.totalPrice || 0), 0);
      const serviceFeeRate = 0.15; // 15% service fee
      
      setReportData({
        totalBookings: bookings.length,
        totalRevenue,
        totalServiceFees: totalRevenue * serviceFeeRate,
        totalUsers: users.length,
        totalListings: listingsSnap.size,
        activeHosts: users.filter(u => u.role === 'host').length,
        activeGuests: users.filter(u => u.role === 'guest').length
      });
    } catch (error) {
      toast.error("Failed to load report data");
    } finally {
      setLoading(false);
    }
  };

  const generateCSVReport = () => {
    const csv = `Platform Analytics Report
Generated: ${new Date().toLocaleString()}

Metric,Value
Total Bookings,${reportData.totalBookings}
Total Revenue,$${reportData.totalRevenue.toFixed(2)}
Service Fees Collected,$${reportData.totalServiceFees.toFixed(2)}
Total Users,${reportData.totalUsers}
Active Hosts,${reportData.activeHosts}
Active Guests,${reportData.activeGuests}
Total Listings,${reportData.totalListings}
`;
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `platform-report-${Date.now()}.csv`;
    a.click();
    toast.success("Report downloaded successfully");
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

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Platform Reports</h1>
            <p className="text-muted-foreground">
              Generate and download comprehensive platform analytics
            </p>
          </div>
          <Button onClick={generateCSVReport}>
            <Download className="h-4 w-4 mr-2" />
            Download CSV Report
          </Button>
        </div>

        {loading ? (
          <p>Loading report data...</p>
        ) : (
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Summary Report
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-primary">
                      {reportData.totalBookings}
                    </div>
                    <div className="text-sm text-muted-foreground">Total Bookings</div>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      ${reportData.totalRevenue.toFixed(2)}
                    </div>
                    <div className="text-sm text-muted-foreground">Total Revenue</div>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      ${reportData.totalServiceFees.toFixed(2)}
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
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Service Fee Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-muted rounded">
                    <span>Gross Revenue</span>
                    <span className="font-bold">${reportData.totalRevenue.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-muted rounded">
                    <span>Platform Fee (15%)</span>
                    <span className="font-bold text-blue-600">
                      ${reportData.totalServiceFees.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-primary/10 rounded">
                    <span className="font-semibold">Net to Hosts</span>
                    <span className="font-bold">
                      ${(reportData.totalRevenue - reportData.totalServiceFees).toFixed(2)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;
