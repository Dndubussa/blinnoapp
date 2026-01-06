import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { CartProvider } from "@/hooks/useCart";
import { WishlistProvider } from "@/hooks/useWishlist";
import { SavedSearchesProvider } from "@/hooks/useSavedSearches";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { SEOSchema } from "@/components/SEOSchema";
import { PageLoader } from "@/lib/lazyPages.tsx";

// Eagerly loaded pages (critical path - home, auth, product detail)
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";
import Onboarding from "./pages/Onboarding";
import OnboardingPaymentCallback from "./pages/OnboardingPaymentCallback";
import CheckoutPaymentCallback from "./pages/CheckoutPaymentCallback";
import SubscriptionPaymentCallback from "./pages/seller/SubscriptionPaymentCallback";
import ResetPassword from "./pages/ResetPassword";
import VerifyEmail from "./pages/VerifyEmail";
import TermsOfService from "./pages/TermsOfService";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import CookiePolicy from "./pages/CookiePolicy";
import SellerAgreement from "./pages/SellerAgreement";
import About from "./pages/About";
import Careers from "./pages/Careers";
import Press from "./pages/Press";
import Contact from "./pages/Contact";
import Help from "./pages/Help";
import Safety from "./pages/Safety";
import Community from "./pages/Community";
import ApiDocs from "./pages/ApiDocs";
import Status from "./pages/Status";
import NotFound from "./pages/NotFound";
import ProductsPage from "./pages/Products";
import ProductDetail from "./pages/ProductDetail";
import Profile from "./pages/Profile";
import Checkout from "./pages/Checkout";
import CheckoutSuccess from "./pages/CheckoutSuccess";
import Wishlist from "./pages/Wishlist";
import OrderTracking from "./pages/OrderTracking";
import SearchPage from "./pages/Search";
import CategoryPage from "./pages/category/CategoryPage";
import SellerStorefront from "./pages/SellerStorefront";

// Lazy-loaded dashboard routes (reduce initial bundle)
const SellerDashboard = lazy(() => import("./pages/seller/Dashboard"));
const Overview = lazy(() => import("./pages/seller/Overview"));
const SellerProducts = lazy(() => import("./pages/seller/Products"));
const Orders = lazy(() => import("./pages/seller/Orders"));
const Analytics = lazy(() => import("./pages/seller/Analytics"));
const SellerEarnings = lazy(() => import("./pages/seller/Earnings"));
const Settings = lazy(() => import("./pages/seller/Settings"));
const SellerMessages = lazy(() => import("./pages/seller/Messages"));

const AdminDashboard = lazy(() => import("./pages/admin/Dashboard"));
const AdminOverview = lazy(() => import("./pages/admin/Overview"));
const AdminUsers = lazy(() => import("./pages/admin/Users"));
const AdminNewsletter = lazy(() => import("./pages/admin/Newsletter"));
const AdminAnalytics = lazy(() => import("./pages/admin/Analytics"));
const AdminSecurity = lazy(() => import("./pages/admin/Security"));
const AdminSettings = lazy(() => import("./pages/admin/Settings"));
const PaymentAnalytics = lazy(() => import("./pages/admin/PaymentAnalytics"));
const AdminWithdrawals = lazy(() => import("./pages/admin/Withdrawals"));
const AdminModeration = lazy(() => import("./pages/admin/Moderation"));

const BuyerDashboard = lazy(() => import("./pages/buyer/Dashboard"));
const BuyerOverview = lazy(() => import("./pages/buyer/Overview"));
const BuyerOrders = lazy(() => import("./pages/buyer/Orders"));
const BuyerWishlist = lazy(() => import("./pages/buyer/BuyerWishlist"));
const BuyerPayments = lazy(() => import("./pages/buyer/Payments"));
const BuyerNotifications = lazy(() => import("./pages/buyer/Notifications"));
const BuyerSettings = lazy(() => import("./pages/buyer/Settings"));
const DigitalLibrary = lazy(() => import("./pages/buyer/DigitalLibrary"));
const BuyerMessages = lazy(() => import("./pages/buyer/Messages"));

// Configure React Query to prevent unnecessary refetches on tab switch
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Prevent refetching when window regains focus (tab switch)
      refetchOnWindowFocus: false,
      // Prevent refetching on reconnect (unless data is stale)
      refetchOnReconnect: false,
      // Prevent refetching on mount if data exists
      refetchOnMount: false,
      // Keep data fresh for 5 minutes (300000ms)
      staleTime: 5 * 60 * 1000,
      // Keep unused data in cache for 10 minutes
      gcTime: 10 * 60 * 1000, // Previously cacheTime
      // Retry failed requests once
      retry: 1,
      // Retry delay
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      // Retry failed mutations once
      retry: 1,
    },
  },
});

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <SEOSchema />
          <BrowserRouter
            future={{
              v7_startTransition: true,
              v7_relativeSplatPath: true,
            }}
          >
            <AuthProvider>
              <CurrencyProvider>
                <CartProvider>
                  <WishlistProvider>
                    <SavedSearchesProvider>
                      <CartDrawer />
                      <Routes>
                      <Route path="/" element={<Index />} />
                      <Route path="/auth" element={<Auth />} />
                      <Route path="/sign-in" element={<SignIn />} />
                      <Route path="/sign-up" element={<SignUp />} />
                      <Route path="/onboarding" element={<Onboarding />} />
                      <Route path="/onboarding/payment-callback" element={<OnboardingPaymentCallback />} />
                      <Route path="/checkout/payment-callback" element={<CheckoutPaymentCallback />} />
                      <Route path="/seller/subscription/payment-callback" element={<SubscriptionPaymentCallback />} />
                      <Route path="/reset-password" element={<ResetPassword />} />
                      <Route path="/verify-email" element={<VerifyEmail />} />
                      <Route path="/terms" element={<TermsOfService />} />
                      <Route path="/privacy" element={<PrivacyPolicy />} />
                      <Route path="/cookie-policy" element={<CookiePolicy />} />
                      <Route path="/seller-agreement" element={<SellerAgreement />} />
                      <Route path="/about" element={<About />} />
                      <Route path="/careers" element={<Careers />} />
                      <Route path="/press" element={<Press />} />
                      <Route path="/contact" element={<Contact />} />
                      <Route path="/help" element={<Help />} />
                      <Route path="/safety" element={<Safety />} />
                      <Route path="/community" element={<Community />} />
                      <Route path="/api-docs" element={<ApiDocs />} />
                      <Route path="/status" element={<Status />} />
                      <Route path="/products" element={<ProductsPage />} />
                      <Route path="/product/:id" element={<ProductDetail />} />
                      <Route path="/profile" element={<Profile />} />
                      <Route path="/checkout" element={<Checkout />} />
                      <Route path="/checkout/success" element={<CheckoutSuccess />} />
                      <Route path="/wishlist" element={<Wishlist />} />
                      <Route path="/order/:orderId" element={<OrderTracking />} />
                      <Route path="/search" element={<SearchPage />} />
                      <Route path="/category/:category" element={<CategoryPage />} />
                      <Route path="/seller/:sellerId" element={<SellerStorefront />} />
                      {/* Buyer Dashboard Routes - Code-split for performance */}
                      <Route path="/buyer" element={<Suspense fallback={<PageLoader />}><BuyerDashboard /></Suspense>}>
                        <Route index element={<Suspense fallback={<PageLoader />}><BuyerOverview /></Suspense>} />
                        <Route path="orders" element={<Suspense fallback={<PageLoader />}><BuyerOrders /></Suspense>} />
                        <Route path="library" element={<Suspense fallback={<PageLoader />}><DigitalLibrary /></Suspense>} />
                        <Route path="messages" element={<Suspense fallback={<PageLoader />}><BuyerMessages /></Suspense>} />
                        <Route path="wishlist" element={<Suspense fallback={<PageLoader />}><BuyerWishlist /></Suspense>} />
                        <Route path="payments" element={<Suspense fallback={<PageLoader />}><BuyerPayments /></Suspense>} />
                        <Route path="notifications" element={<Suspense fallback={<PageLoader />}><BuyerNotifications /></Suspense>} />
                        <Route path="settings" element={<Suspense fallback={<PageLoader />}><BuyerSettings /></Suspense>} />
                      </Route>
                      {/* Seller Dashboard Routes - Code-split for performance */}
                      <Route path="/seller" element={<Suspense fallback={<PageLoader />}><SellerDashboard /></Suspense>}>
                        <Route index element={<Suspense fallback={<PageLoader />}><Overview /></Suspense>} />
                        <Route path="products" element={<Suspense fallback={<PageLoader />}><SellerProducts /></Suspense>} />
                        <Route path="orders" element={<Suspense fallback={<PageLoader />}><Orders /></Suspense>} />
                        <Route path="messages" element={<Suspense fallback={<PageLoader />}><SellerMessages /></Suspense>} />
                        <Route path="earnings" element={<Suspense fallback={<PageLoader />}><SellerEarnings /></Suspense>} />
                        <Route path="analytics" element={<Suspense fallback={<PageLoader />}><Analytics /></Suspense>} />
                        <Route path="settings" element={<Suspense fallback={<PageLoader />}><Settings /></Suspense>} />
                      </Route>
                      {/* Admin Dashboard Routes - Code-split for performance */}
                      <Route path="/admin" element={<Suspense fallback={<PageLoader />}><AdminDashboard /></Suspense>}>
                        <Route index element={<Suspense fallback={<PageLoader />}><AdminOverview /></Suspense>} />
                        <Route path="users" element={<Suspense fallback={<PageLoader />}><AdminUsers /></Suspense>} />
                        <Route path="moderation" element={<Suspense fallback={<PageLoader />}><AdminModeration /></Suspense>} />
                        <Route path="withdrawals" element={<Suspense fallback={<PageLoader />}><AdminWithdrawals /></Suspense>} />
                        <Route path="newsletter" element={<Suspense fallback={<PageLoader />}><AdminNewsletter /></Suspense>} />
                        <Route path="analytics" element={<Suspense fallback={<PageLoader />}><AdminAnalytics /></Suspense>} />
                        <Route path="payments" element={<Suspense fallback={<PageLoader />}><PaymentAnalytics /></Suspense>} />
                        <Route path="security" element={<Suspense fallback={<PageLoader />}><AdminSecurity /></Suspense>} />
                        <Route path="settings" element={<Suspense fallback={<PageLoader />}><AdminSettings /></Suspense>} />
                      </Route>
                      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </SavedSearchesProvider>
                </WishlistProvider>
              </CartProvider>
            </CurrencyProvider>
          </AuthProvider>
        </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
