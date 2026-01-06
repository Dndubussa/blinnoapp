import { lazy, Suspense, ReactNode, JSX } from 'react';

// Lazy load dashboard pages to reduce initial bundle
export const BuyerDashboardLazy = lazy(() =>
  import('../pages/buyer/Dashboard').then((m) => ({ default: m.default }))
);
export const BuyerOverviewLazy = lazy(() =>
  import('../pages/buyer/Overview').then((m) => ({ default: m.default }))
);
export const BuyerOrdersLazy = lazy(() =>
  import('../pages/buyer/Orders').then((m) => ({ default: m.default }))
);
export const BuyerMessagesLazy = lazy(() =>
  import('../pages/buyer/Messages').then((m) => ({ default: m.default }))
);
export const BuyerPaymentsLazy = lazy(() =>
  import('../pages/buyer/Payments').then((m) => ({ default: m.default }))
);
export const BuyerNotificationsLazy = lazy(() =>
  import('../pages/buyer/Notifications').then((m) => ({ default: m.default }))
);
export const BuyerSettingsLazy = lazy(() =>
  import('../pages/buyer/Settings').then((m) => ({ default: m.default }))
);

// Seller dashboard
export const SellerDashboardLazy = lazy(() =>
  import('../pages/seller/Dashboard').then((m) => ({ default: m.default }))
);
export const SellerOverviewLazy = lazy(() =>
  import('../pages/seller/Overview').then((m) => ({ default: m.default }))
);
export const SellerProductsLazy = lazy(() =>
  import('../pages/seller/Products').then((m) => ({ default: m.default }))
);
export const SellerOrdersLazy = lazy(() =>
  import('../pages/seller/Orders').then((m) => ({ default: m.default }))
);
export const SellerMessagesLazy = lazy(() =>
  import('../pages/seller/Messages').then((m) => ({ default: m.default }))
);
export const SellerEarningsLazy = lazy(() =>
  import('../pages/seller/Earnings').then((m) => ({ default: m.default }))
);
export const SellerAnalyticsLazy = lazy(() =>
  import('../pages/seller/Analytics').then((m) => ({ default: m.default }))
);
export const SellerSettingsLazy = lazy(() =>
  import('../pages/seller/Settings').then((m) => ({ default: m.default }))
);

// Admin dashboard
export const AdminDashboardLazy = lazy(() =>
  import('../pages/admin/Dashboard').then((m) => ({ default: m.default }))
);
export const AdminOverviewLazy = lazy(() =>
  import('../pages/admin/Overview').then((m) => ({ default: m.default }))
);
export const AdminUsersLazy = lazy(() =>
  import('../pages/admin/Users').then((m) => ({ default: m.default }))
);
export const AdminModerationLazy = lazy(() =>
  import('../pages/admin/Moderation').then((m) => ({ default: m.default }))
);
export const AdminWithdrawalsLazy = lazy(() =>
  import('../pages/admin/Withdrawals').then((m) => ({ default: m.default }))
);
export const AdminNewsletterLazy = lazy(() =>
  import('../pages/admin/Newsletter').then((m) => ({ default: m.default }))
);
export const AdminAnalyticsLazy = lazy(() =>
  import('../pages/admin/Analytics').then((m) => ({ default: m.default }))
);
export const AdminPaymentAnalyticsLazy = lazy(() =>
  import('../pages/admin/PaymentAnalytics').then((m) => ({ default: m.default }))
);
export const AdminSecurityLazy = lazy(() =>
  import('../pages/admin/Security').then((m) => ({ default: m.default }))
);
export const AdminSettingsLazy = lazy(() =>
  import('../pages/admin/Settings').then((m) => ({ default: m.default }))
);

// Loading fallback component
export const PageLoader = (): JSX.Element => {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-pulse space-y-4 w-full max-w-md">
        <div className="h-10 bg-muted rounded-lg"></div>
        <div className="h-48 bg-muted rounded-lg"></div>
        <div className="h-10 bg-muted rounded-lg"></div>
      </div>
    </div>
  );
};

/**
 * Wrap lazy-loaded pages with Suspense boundary
 * Usage: <Suspense fallback={<PageLoader />}><LazyComponent /></Suspense>
 */
export const LazyPage = ({ children }: { children: ReactNode }): JSX.Element => (
  <Suspense fallback={<PageLoader />}>{children}</Suspense>
);
