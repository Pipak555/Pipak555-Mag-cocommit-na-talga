import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Landing from "./pages/Landing";
import HostLogin from "./pages/auth/HostLogin";
import GuestLogin from "./pages/auth/GuestLogin";
import AdminLogin from "./pages/auth/AdminLogin";
import HostDashboard from "./pages/host/HostDashboard";
import GuestDashboard from "./pages/guest/GuestDashboard";
import AdminDashboard from "./pages/admin/AdminDashboard";
import CreateListing from "./pages/host/CreateListing";
import ManageListings from "./pages/host/ManageListings";
import BrowseListings from "./pages/guest/BrowseListings";
import ListingDetails from "./pages/guest/ListingDetails";
import MyBookings from "./pages/guest/MyBookings";
import HostBookings from "./pages/host/HostBookings";
import Wallet from "./pages/guest/Wallet";
import ManageUsers from "./pages/admin/ManageUsers";
import ReviewListings from "./pages/admin/ReviewListings";
import AccountSettings from "./pages/shared/AccountSettings";
import HostMessages from "./pages/host/Messages";
import GuestMessages from "./pages/guest/Messages";
import Analytics from "./pages/admin/Analytics";
import Reports from "./pages/admin/Reports";
import Policies from "./pages/admin/Policies";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/host/login" element={<HostLogin />} />
            <Route path="/guest/login" element={<GuestLogin />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/host/dashboard" element={<HostDashboard />} />
            <Route path="/host/create-listing" element={<CreateListing />} />
            <Route path="/host/listings" element={<ManageListings />} />
            <Route path="/host/bookings" element={<HostBookings />} />
            <Route path="/host/messages" element={<HostMessages />} />
            <Route path="/guest/dashboard" element={<GuestDashboard />} />
            <Route path="/guest/browse" element={<BrowseListings />} />
            <Route path="/guest/listing/:id" element={<ListingDetails />} />
            <Route path="/guest/bookings" element={<MyBookings />} />
            <Route path="/guest/wallet" element={<Wallet />} />
            <Route path="/guest/messages" element={<GuestMessages />} />
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/users" element={<ManageUsers />} />
            <Route path="/admin/listings" element={<ReviewListings />} />
            <Route path="/admin/analytics" element={<Analytics />} />
            <Route path="/admin/reports" element={<Reports />} />
            <Route path="/admin/policies" element={<Policies />} />
            <Route path="/settings" element={<AccountSettings />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
