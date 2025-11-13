import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
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
const ForgotPassword = lazy(() => import("./pages/auth/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/auth/ResetPassword"));
const PayPalCallback = lazy(() => import("./pages/auth/PayPalCallback"));
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
const HostEarnings = lazy(() => import("./pages/host/HostEarnings"));
const Wallet = lazy(() => import("./pages/guest/Wallet"));
const ManageUsers = lazy(() => import("./pages/admin/ManageUsers"));
const ReviewListings = lazy(() => import("./pages/admin/ReviewListings"));
const ReviewCancellationRequests = lazy(() => import("./pages/admin/ReviewCancellationRequests"));
const ActiveListings = lazy(() => import("./pages/admin/ActiveListings"));
const AccountSettings = lazy(() => import("./pages/shared/AccountSettings"));
const HostAccountSettings = lazy(() => import("./pages/host/HostAccountSettings"));
const GuestAccountSettings = lazy(() => import("./pages/guest/GuestAccountSettings"));
const HostRegister = lazy(() => import("./pages/host/HostRegister"));
const HostPayment = lazy(() => import("./pages/host/HostPayment"));
const HostPaymentSuccess = lazy(() => import("./pages/host/HostPaymentSuccess"));
const Favorites = lazy(() => import("./pages/guest/Favorites"));
const HostMessages = lazy(() => import("./pages/host/Messages"));
const GuestMessages = lazy(() => import("./pages/guest/Messages"));
const AdminMessages = lazy(() => import("./pages/admin/Messages"));
const HostCalendar = lazy(() => import("./pages/host/Calendar"));
const HostRewards = lazy(() => import("./pages/host/HostRewards"));
const Analytics = lazy(() => import("./pages/admin/Analytics"));
const ManagePayments = lazy(() => import("./pages/admin/ManagePayments"));
const AdminPayPalSettings = lazy(() => import("./pages/admin/AdminPayPalSettings"));
const CreateEvent = lazy(() => import("./pages/admin/CreateEvent"));
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
            <Route path="/host/register" element={<LazyRoute component={HostRegister} />} />
            <Route path="/host/payment" element={<LazyRoute component={HostPayment} />} />
            <Route path="/host/payment/success" element={<LazyRoute component={HostPaymentSuccess} />} />
            <Route path="/login" element={<Navigate to="/guest/login" replace />} />
            <Route path="/host/login" element={<LazyRoute component={HostLogin} />} />
            <Route path="/guest/login" element={<LazyRoute component={GuestLogin} />} />
            <Route path="/admin/login" element={<LazyRoute component={AdminLogin} />} />
            <Route path="/verify-email" element={<LazyRoute component={EmailVerification} />} />
            <Route path="/verify-otp" element={<LazyRoute component={OTPVerification} />} />
            <Route path="/verification-pending" element={<LazyRoute component={VerificationPending} />} />
            <Route path="/forgot-password" element={<LazyRoute component={ForgotPassword} />} />
            <Route path="/reset-password" element={<LazyRoute component={ResetPassword} />} />
            <Route path="/paypal-callback" element={<LazyRoute component={PayPalCallback} />} />
            <Route path="/host/dashboard" element={<LazyRoute component={HostDashboard} />} />
            <Route path="/host/create-listing" element={<LazyRoute component={CreateListing} />} />
            <Route path="/host/listings" element={<LazyRoute component={ManageListings} />} />
            <Route path="/host/bookings" element={<LazyRoute component={HostBookings} />} />
            <Route path="/host/calendar" element={<LazyRoute component={HostCalendar} />} />
            <Route path="/host/payments" element={<LazyRoute component={HostPayments} />} />
            <Route path="/host/earnings" element={<LazyRoute component={HostEarnings} />} />
            <Route path="/host/messages" element={<LazyRoute component={HostMessages} />} />
            <Route path="/host/settings" element={<LazyRoute component={HostAccountSettings} />} />
            <Route path="/host/rewards" element={<LazyRoute component={HostRewards} />} />
            <Route path="/guest/dashboard" element={<LazyRoute component={GuestDashboard} />} />
            <Route path="/guest/browse" element={<LazyRoute component={BrowseListings} />} />
            <Route path="/guest/listing/:id" element={<LazyRoute component={ListingDetails} />} />
            <Route path="/guest/bookings" element={<LazyRoute component={MyBookings} />} />
            <Route path="/guest/wallet" element={<LazyRoute component={Wallet} />} />
            <Route path="/guest/messages" element={<LazyRoute component={GuestMessages} />} />
            <Route path="/guest/settings" element={<LazyRoute component={GuestAccountSettings} />} />
            <Route path="/guest/favorites" element={<LazyRoute component={Favorites} />} />
            <Route path="/guest/wishlist" element={<Navigate to="/guest/settings?tab=wishlist" replace />} />
            <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="/admin/dashboard" element={<LazyRoute component={AdminDashboard} />} />
            <Route path="/admin/users" element={<LazyRoute component={ManageUsers} />} />
            <Route path="/admin/listings" element={<LazyRoute component={ReviewListings} />} />
            <Route path="/admin/active-listings" element={<LazyRoute component={ActiveListings} />} />
            <Route path="/admin/cancellation-requests" element={<LazyRoute component={ReviewCancellationRequests} />} />
            <Route path="/admin/messages" element={<LazyRoute component={AdminMessages} />} />
            <Route path="/admin/payments" element={<LazyRoute component={ManagePayments} />} />
              <Route path="/admin/paypal-settings" element={<LazyRoute component={AdminPayPalSettings} />} />
              <Route path="/admin/create-event" element={<LazyRoute component={CreateEvent} />} />
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
          <BrowserRouter
            future={{
              v7_startTransition: true,
              v7_relativeSplatPath: true,
            }}
          >
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
