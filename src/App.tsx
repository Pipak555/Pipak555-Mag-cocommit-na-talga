import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import LoadingScreen from "@/components/ui/loading-screen";
import Landing from "./pages/Landing";
import HostLogin from "./pages/auth/HostLogin";
import HostPolicyAcceptance from "./pages/auth/HostPolicyAcceptance";
import GuestLogin from "./pages/auth/GuestLogin";
import AdminLogin from "./pages/auth/AdminLogin";
import EmailVerification from "./pages/auth/EmailVerification";
import OTPVerification from "./pages/auth/OTPVerification";
import VerificationPending from "./pages/auth/VerificationPending";
import HostDashboard from "./pages/host/HostDashboard";
import GuestDashboard from "./pages/guest/GuestDashboard";
import AdminDashboard from "./pages/admin/AdminDashboard";
import CreateListing from "./pages/host/CreateListing";
import ManageListings from "./pages/host/ManageListings";
import BrowseListings from "./pages/guest/BrowseListings";
import ListingDetails from "./pages/guest/ListingDetails";
import MyBookings from "./pages/guest/MyBookings";
import HostBookings from "./pages/host/HostBookings";
import HostPayments from "./pages/host/HostPayments";
import Wallet from "./pages/guest/Wallet";
import ManageUsers from "./pages/admin/ManageUsers";
import ReviewListings from "./pages/admin/ReviewListings";
import AccountSettings from "./pages/shared/AccountSettings";
import HostAccountSettings from "./pages/host/HostAccountSettings";
import GuestAccountSettings from "./pages/guest/GuestAccountSettings";
import HostMessages from "./pages/host/Messages";
import GuestMessages from "./pages/guest/Messages";
import Analytics from "./pages/admin/Analytics";
import ManagePayments from "./pages/admin/ManagePayments";
import Reports from "./pages/admin/Reports";
import Policies from "./pages/admin/Policies";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AppRoutes = () => {
  const { loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/host/policies" element={<HostPolicyAcceptance />} />
            <Route path="/host/login" element={<HostLogin />} />
            <Route path="/guest/login" element={<GuestLogin />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/verify-email" element={<EmailVerification />} />
            <Route path="/verify-otp" element={<OTPVerification />} />
            <Route path="/verification-pending" element={<VerificationPending />} />
            <Route path="/host/dashboard" element={<HostDashboard />} />
            <Route path="/host/create-listing" element={<CreateListing />} />
            <Route path="/host/listings" element={<ManageListings />} />
            <Route path="/host/bookings" element={<HostBookings />} />
            <Route path="/host/payments" element={<HostPayments />} />
            <Route path="/host/messages" element={<HostMessages />} />
            <Route path="/host/settings" element={<HostAccountSettings />} />
            <Route path="/guest/dashboard" element={<GuestDashboard />} />
            <Route path="/guest/browse" element={<BrowseListings />} />
            <Route path="/guest/listing/:id" element={<ListingDetails />} />
            <Route path="/guest/bookings" element={<MyBookings />} />
            <Route path="/guest/wallet" element={<Wallet />} />
            <Route path="/guest/messages" element={<GuestMessages />} />
            <Route path="/guest/settings" element={<GuestAccountSettings />} />
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/users" element={<ManageUsers />} />
            <Route path="/admin/listings" element={<ReviewListings />} />
            <Route path="/admin/payments" element={<ManagePayments />} />
            <Route path="/admin/analytics" element={<Analytics />} />
            <Route path="/admin/reports" element={<Reports />} />
            <Route path="/admin/policies" element={<Policies />} />
            <Route path="/settings" element={<AccountSettings />} />
            <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
