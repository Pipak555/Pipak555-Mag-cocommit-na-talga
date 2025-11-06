import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import LoadingScreen from "@/components/ui/loading-screen";

// Lazy load pages for code splitting
const Landing = lazy(() => import("./pages/Landing"));
const HostLogin = lazy(() => import("./pages/auth/HostLogin"));
const HostPolicyAcceptance = lazy(() => import("./pages/auth/HostPolicyAcceptance"));
const GuestLogin = lazy(() => import("./pages/auth/GuestLogin"));
const AdminLogin = lazy(() => import("./pages/auth/AdminLogin"));
const EmailVerification = lazy(() => import("./pages/auth/EmailVerification"));
const OTPVerification = lazy(() => import("./pages/auth/OTPVerification"));
const VerificationPending = lazy(() => import("./pages/auth/VerificationPending"));
const HostDashboard = lazy(() => import("./pages/host/HostDashboard"));
const GuestDashboard = lazy(() => import("./pages/guest/GuestDashboard"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const CreateListing = lazy(() => import("./pages/host/CreateListing"));
const ManageListings = lazy(() => import("./pages/host/ManageListings"));
const BrowseListings = lazy(() => import("./pages/guest/BrowseListings"));
const ListingDetails = lazy(() => import("./pages/guest/ListingDetails"));
const MyBookings = lazy(() => import("./pages/guest/MyBookings"));
const HostBookings = lazy(() => import("./pages/host/HostBookings"));
const HostPayments = lazy(() => import("./pages/host/HostPayments"));
const Wallet = lazy(() => import("./pages/guest/Wallet"));
const ManageUsers = lazy(() => import("./pages/admin/ManageUsers"));
const ReviewListings = lazy(() => import("./pages/admin/ReviewListings"));
const AccountSettings = lazy(() => import("./pages/shared/AccountSettings"));
const HostAccountSettings = lazy(() => import("./pages/host/HostAccountSettings"));
const GuestAccountSettings = lazy(() => import("./pages/guest/GuestAccountSettings"));
const HostMessages = lazy(() => import("./pages/host/Messages"));
const GuestMessages = lazy(() => import("./pages/guest/Messages"));
const Analytics = lazy(() => import("./pages/admin/Analytics"));
const ManagePayments = lazy(() => import("./pages/admin/ManagePayments"));
const Reports = lazy(() => import("./pages/admin/Reports"));
const Policies = lazy(() => import("./pages/admin/Policies"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

// Lazy loading wrapper component
const LazyRoute = ({ component: Component }: { component: React.LazyExoticComponent<React.ComponentType<unknown>> }) => (
  <Suspense fallback={<LoadingScreen />}>
    <Component />
  </Suspense>
);

const AppRoutes = () => {
  const { loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <Routes>
            <Route path="/" element={<LazyRoute component={Landing} />} />
            <Route path="/host/policies" element={<LazyRoute component={HostPolicyAcceptance} />} />
            <Route path="/host/login" element={<LazyRoute component={HostLogin} />} />
            <Route path="/guest/login" element={<LazyRoute component={GuestLogin} />} />
            <Route path="/admin/login" element={<LazyRoute component={AdminLogin} />} />
            <Route path="/verify-email" element={<LazyRoute component={EmailVerification} />} />
            <Route path="/verify-otp" element={<LazyRoute component={OTPVerification} />} />
            <Route path="/verification-pending" element={<LazyRoute component={VerificationPending} />} />
            <Route path="/host/dashboard" element={<LazyRoute component={HostDashboard} />} />
            <Route path="/host/create-listing" element={<LazyRoute component={CreateListing} />} />
            <Route path="/host/listings" element={<LazyRoute component={ManageListings} />} />
            <Route path="/host/bookings" element={<LazyRoute component={HostBookings} />} />
            <Route path="/host/payments" element={<LazyRoute component={HostPayments} />} />
            <Route path="/host/messages" element={<LazyRoute component={HostMessages} />} />
            <Route path="/host/settings" element={<LazyRoute component={HostAccountSettings} />} />
            <Route path="/guest/dashboard" element={<LazyRoute component={GuestDashboard} />} />
            <Route path="/guest/browse" element={<LazyRoute component={BrowseListings} />} />
            <Route path="/guest/listing/:id" element={<LazyRoute component={ListingDetails} />} />
            <Route path="/guest/bookings" element={<LazyRoute component={MyBookings} />} />
            <Route path="/guest/wallet" element={<LazyRoute component={Wallet} />} />
            <Route path="/guest/messages" element={<LazyRoute component={GuestMessages} />} />
            <Route path="/guest/settings" element={<LazyRoute component={GuestAccountSettings} />} />
            <Route path="/admin/dashboard" element={<LazyRoute component={AdminDashboard} />} />
            <Route path="/admin/users" element={<LazyRoute component={ManageUsers} />} />
            <Route path="/admin/listings" element={<LazyRoute component={ReviewListings} />} />
            <Route path="/admin/payments" element={<LazyRoute component={ManagePayments} />} />
            <Route path="/admin/analytics" element={<LazyRoute component={Analytics} />} />
            <Route path="/admin/reports" element={<LazyRoute component={Reports} />} />
            <Route path="/admin/policies" element={<LazyRoute component={Policies} />} />
            <Route path="/settings" element={<LazyRoute component={AccountSettings} />} />
            <Route path="*" element={<LazyRoute component={NotFound} />} />
    </Routes>
  );
};

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <ErrorBoundary>
              <AuthProvider>
                <NotificationProvider>
                  <AppRoutes />
                </NotificationProvider>
              </AuthProvider>
            </ErrorBoundary>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
