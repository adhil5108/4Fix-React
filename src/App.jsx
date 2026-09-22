import { useEffect } from 'react';
import { AuthProvider, useAuth } from './hooks/useAuth.jsx';
import { getCurrentLocation, matchPath, navigate, useRoute } from './hooks/useRoute.js';
import LoginPage from './pages/LoginPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import SignupPage from './pages/SignupPage.jsx';
import BookPage from './pages/customer/BookPage.jsx';
import BookingPage from './pages/customer/BookingPage.jsx';
import BookingsPage from './pages/customer/BookingsPage.jsx';
import ChatPage from './pages/customer/ChatPage.jsx';
import ConfirmPage from './pages/customer/ConfirmPage.jsx';
import PaymentPage from './pages/customer/PaymentPage.jsx';
import RequestDetailsPage from './pages/customer/RequestDetailsPage.jsx';
import RequestsPage from './pages/customer/RequestsPage.jsx';
import ReviewPage from './pages/customer/ReviewPage.jsx';
import TrackingPage from './pages/customer/TrackingPage.jsx';
import AdminBookingDetailPage from './pages/admin/AdminBookingDetailPage.jsx';
import AdminBookingsPage from './pages/admin/AdminBookingsPage.jsx';
import AdminCustomerDetailPage from './pages/admin/AdminCustomerDetailPage.jsx';
import AdminCustomersPage from './pages/admin/AdminCustomersPage.jsx';
import AdminDashboardPage from './pages/admin/AdminDashboardPage.jsx';
import AdminPaymentDetailPage from './pages/admin/AdminPaymentDetailPage.jsx';
import AdminPaymentsPage from './pages/admin/AdminPaymentsPage.jsx';
import AdminProviderDetailPage from './pages/admin/AdminProviderDetailPage.jsx';
import AdminProvidersPage from './pages/admin/AdminProvidersPage.jsx';
import AdminQuoteDetailPage from './pages/admin/AdminQuoteDetailPage.jsx';
import AdminQuotesPage from './pages/admin/AdminQuotesPage.jsx';
import AdminRequestDetailsPage from './pages/admin/AdminRequestDetailsPage.jsx';
import AdminRequestsPage from './pages/admin/AdminRequestsPage.jsx';
import AdminReviewDetailPage from './pages/admin/AdminReviewDetailPage.jsx';
import AdminReviewsPage from './pages/admin/AdminReviewsPage.jsx';
import AdminServiceFormPage from './pages/admin/AdminServiceFormPage.jsx';
import AdminServicesPage from './pages/admin/AdminServicesPage.jsx';
import ProviderDashboardPage from './pages/provider/ProviderDashboardPage.jsx';
import ProviderJobPage from './pages/provider/ProviderJobPage.jsx';
import ProviderJobsPage from './pages/provider/ProviderJobsPage.jsx';
import ProviderRequestDetailsPage from './pages/provider/ProviderRequestDetailsPage.jsx';
import ProviderRequestsPage from './pages/provider/ProviderRequestsPage.jsx';
import AboutPage from './pages/public/AboutPage.jsx';
import HomePage from './pages/public/HomePage.jsx';
import NotFoundPage from './pages/public/NotFoundPage.jsx';
import ProviderProfilePage from './pages/public/ProviderProfilePage.jsx';
import ServiceDetailsPage from './pages/public/ServiceDetailsPage.jsx';
import ServicesPage from './pages/public/ServicesPage.jsx';
import { buildLoginPath, getHomeRouteForRole, resolvePostAuthRoute } from './utils/roles.js';

const PUBLIC = 'PUBLIC';
const GUEST = 'GUEST';

// `access` is PUBLIC (anyone), GUEST (logged-out only) or the role(s) allowed.
// `redirect` is a path or a function of (params, searchParams) for legacy routes.
const ROUTES = [
  { path: '/', access: PUBLIC, render: () => <HomePage /> },
  { path: '/services', access: PUBLIC, render: () => <ServicesPage /> },
  {
    path: '/services/:serviceId',
    access: PUBLIC,
    render: ({ serviceId }) => <ServiceDetailsPage key={serviceId} serviceId={serviceId} />,
  },
  {
    path: '/providers/:providerId',
    access: PUBLIC,
    render: ({ providerId }) => <ProviderProfilePage key={providerId} providerId={providerId} />,
  },
  { path: '/about', access: PUBLIC, render: () => <AboutPage /> },

  { path: '/login', access: GUEST, render: () => <LoginPage /> },
  { path: '/signup', access: GUEST, redirect: '/signup/customer' },
  { path: '/signup/customer', access: GUEST, render: () => <SignupPage key="customer" role="CUSTOMER" /> },
  { path: '/signup/provider', access: GUEST, render: () => <SignupPage key="provider" role="PROVIDER" /> },

  {
    path: '/book/:serviceId',
    access: 'CUSTOMER',
    render: ({ serviceId }) => <BookPage key={serviceId} serviceId={serviceId} />,
  },
  {
    path: '/requests',
    access: ['CUSTOMER', 'ADMIN'],
    render: () => <RequestsPage />,
  },
  {
    path: '/requests/:requestId',
    access: 'CUSTOMER',
    render: ({ requestId }) => <RequestDetailsPage key={requestId} requestId={requestId} />,
  },
  {
    path: '/requests/:requestId/confirm',
    access: 'CUSTOMER',
    render: ({ requestId }) => <ConfirmPage key={requestId} requestId={requestId} />,
  },
  {
    path: '/bookings',
    access: ['CUSTOMER', 'ADMIN'],
    render: () => <BookingsPage />,
  },
  {
    path: '/bookings/:bookingId',
    access: 'CUSTOMER',
    render: ({ bookingId }) => <BookingPage key={bookingId} bookingId={bookingId} />,
  },
  {
    path: '/bookings/:bookingId/tracking',
    access: 'CUSTOMER',
    render: ({ bookingId }) => <TrackingPage key={bookingId} bookingId={bookingId} />,
  },
  {
    path: '/bookings/:bookingId/chat',
    access: ['CUSTOMER', 'PROVIDER'],
    render: ({ bookingId }) => <ChatPage key={bookingId} bookingId={bookingId} />,
  },
  {
    path: '/bookings/:bookingId/payment',
    access: 'CUSTOMER',
    render: ({ bookingId }) => <PaymentPage key={bookingId} bookingId={bookingId} />,
  },
  {
    path: '/bookings/:bookingId/review',
    access: 'CUSTOMER',
    render: ({ bookingId }) => <ReviewPage key={bookingId} bookingId={bookingId} />,
  },
  {
    path: '/profile',
    access: ['CUSTOMER', 'ADMIN'],
    render: () => <ProfilePage />,
  },

  {
    path: '/provider',
    access: ['PROVIDER', 'ADMIN'],
    render: () => <ProviderDashboardPage />,
  },
  {
    path: '/provider/requests',
    access: ['PROVIDER', 'ADMIN'],
    render: () => <ProviderRequestsPage />,
  },
  {
    // Discovery data (open requests any provider can see), not owner-scoped — safe to
    // let admin open from the Provider View list without exposing anything private.
    path: '/provider/requests/:requestId',
    access: ['PROVIDER', 'ADMIN'],
    render: ({ requestId }) => (
      <ProviderRequestDetailsPage key={requestId} requestId={requestId} />
    ),
  },
  {
    path: '/provider/jobs',
    access: ['PROVIDER', 'ADMIN'],
    render: () => <ProviderJobsPage />,
  },
  {
    path: '/provider/jobs/:bookingId',
    access: 'PROVIDER',
    render: ({ bookingId }) => <ProviderJobPage key={bookingId} bookingId={bookingId} />,
  },
  {
    path: '/provider/profile',
    access: ['PROVIDER', 'ADMIN'],
    render: () => <ProfilePage />,
  },

  { path: '/app/admin', access: 'ADMIN', render: () => <AdminDashboardPage /> },
  { path: '/app/admin/services', access: 'ADMIN', render: () => <AdminServicesPage /> },
  { path: '/app/admin/services/new', access: 'ADMIN', render: () => <AdminServiceFormPage /> },
  {
    path: '/app/admin/services/:serviceId',
    access: 'ADMIN',
    render: ({ serviceId }) => <AdminServiceFormPage key={serviceId} serviceId={serviceId} />,
  },
  { path: '/app/admin/providers', access: 'ADMIN', render: () => <AdminProvidersPage /> },
  {
    path: '/app/admin/providers/:providerId',
    access: 'ADMIN',
    render: ({ providerId }) => <AdminProviderDetailPage key={providerId} providerId={providerId} />,
  },
  { path: '/app/admin/customers', access: 'ADMIN', render: () => <AdminCustomersPage /> },
  {
    path: '/app/admin/customers/:customerId',
    access: 'ADMIN',
    render: ({ customerId }) => <AdminCustomerDetailPage key={customerId} customerId={customerId} />,
  },
  { path: '/app/admin/requests', access: 'ADMIN', render: () => <AdminRequestsPage /> },
  {
    path: '/app/admin/requests/:requestId',
    access: 'ADMIN',
    render: ({ requestId }) => <AdminRequestDetailsPage key={requestId} requestId={requestId} />,
  },
  { path: '/app/admin/quotes', access: 'ADMIN', render: () => <AdminQuotesPage /> },
  {
    path: '/app/admin/quotes/:quoteId',
    access: 'ADMIN',
    render: ({ quoteId }) => <AdminQuoteDetailPage key={quoteId} quoteId={quoteId} />,
  },
  { path: '/app/admin/bookings', access: 'ADMIN', render: () => <AdminBookingsPage /> },
  {
    path: '/app/admin/bookings/:bookingId',
    access: 'ADMIN',
    render: ({ bookingId }) => <AdminBookingDetailPage key={bookingId} bookingId={bookingId} />,
  },
  { path: '/app/admin/payments', access: 'ADMIN', render: () => <AdminPaymentsPage /> },
  {
    path: '/app/admin/payments/:paymentId',
    access: 'ADMIN',
    render: ({ paymentId }) => <AdminPaymentDetailPage key={paymentId} paymentId={paymentId} />,
  },
  { path: '/app/admin/reviews', access: 'ADMIN', render: () => <AdminReviewsPage /> },
  {
    path: '/app/admin/reviews/:reviewId',
    access: 'ADMIN',
    render: ({ reviewId }) => <AdminReviewDetailPage key={reviewId} reviewId={reviewId} />,
  },

  // Legacy links from the earlier customer experience.
  {
    path: '/report',
    access: PUBLIC,
    redirect: (_params, search) => {
      const serviceId = search.get('serviceId');
      return serviceId ? `/book/${encodeURIComponent(serviceId)}` : '/services';
    },
  },
  {
    path: '/history',
    access: PUBLIC,
    redirect: (_params, search) => `/bookings?status=${search.get('status') || 'COMPLETED'}`,
  },
  {
    path: '/requests/:requestId/payment',
    access: PUBLIC,
    redirect: ({ requestId }) => `/requests/${encodeURIComponent(requestId)}`,
  },
  { path: '/app/customer', access: PUBLIC, redirect: '/' },
  { path: '/app/provider', access: PUBLIC, redirect: '/provider' },
];

function Redirect({ to }) {
  useEffect(() => {
    navigate(to, { replace: true });
  }, [to]);

  return null;
}

function resolveRoute(path) {
  const normalizedPath = path.length > 1 ? path.replace(/\/+$/, '') : path;

  for (const route of ROUTES) {
    const params = matchPath(route.path, normalizedPath);

    if (params) {
      return { route, params };
    }
  }

  return null;
}

function AppRoutes() {
  const { path, search } = useRoute();
  const { isAuthenticated, user } = useAuth();
  const match = resolveRoute(path);

  if (!match) {
    return <NotFoundPage />;
  }

  const { route, params } = match;
  const searchParams = new URLSearchParams(search);

  if (route.redirect) {
    const target =
      typeof route.redirect === 'function' ? route.redirect(params, searchParams) : route.redirect;
    return <Redirect to={target} />;
  }

  if (route.access === GUEST && isAuthenticated) {
    return <Redirect to={resolvePostAuthRoute(user.role, searchParams.get('returnTo'))} />;
  }

  if (route.access !== PUBLIC && route.access !== GUEST) {
    if (!isAuthenticated) {
      return <Redirect to={buildLoginPath(getCurrentLocation())} />;
    }

    const allowedRoles = Array.isArray(route.access) ? route.access : [route.access];

    if (!allowedRoles.includes(user.role)) {
      return <Redirect to={getHomeRouteForRole(user.role)} />;
    }
  }

  return route.render(params);
}

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

export default App;
