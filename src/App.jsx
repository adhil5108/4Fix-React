import { useEffect } from 'react';
import { AuthProvider, useAuth } from './hooks/useAuth.jsx';
import { getCurrentLocation, matchPath, navigate, useRoute } from './hooks/useRoute.js';
import DashboardPage from './pages/DashboardPage.jsx';
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
  { path: '/requests', access: 'CUSTOMER', render: () => <RequestsPage /> },
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
  { path: '/bookings', access: 'CUSTOMER', render: () => <BookingsPage /> },
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
  { path: '/profile', access: 'CUSTOMER', render: () => <ProfilePage /> },

  { path: '/provider', access: 'PROVIDER', render: () => <ProviderDashboardPage /> },
  { path: '/provider/requests', access: 'PROVIDER', render: () => <ProviderRequestsPage /> },
  {
    path: '/provider/requests/:requestId',
    access: 'PROVIDER',
    render: ({ requestId }) => (
      <ProviderRequestDetailsPage key={requestId} requestId={requestId} />
    ),
  },
  { path: '/provider/jobs', access: 'PROVIDER', render: () => <ProviderJobsPage /> },
  {
    path: '/provider/jobs/:bookingId',
    access: 'PROVIDER',
    render: ({ bookingId }) => <ProviderJobPage key={bookingId} bookingId={bookingId} />,
  },
  { path: '/provider/profile', access: 'PROVIDER', render: () => <ProfilePage /> },

  { path: '/app/admin', access: 'ADMIN', render: () => <DashboardPage role="ADMIN" /> },

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
