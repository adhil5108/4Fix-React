import { useEffect } from 'react';
import { AuthProvider, useAuth } from './hooks/useAuth.jsx';
import { getCurrentLocation, matchPath, navigate, useRoute } from './hooks/useRoute.js';
import DashboardPage from './pages/DashboardPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import SignupPage from './pages/SignupPage.jsx';
import HistoryPage from './pages/customer/HistoryPage.jsx';
import PaymentPage from './pages/customer/PaymentPage.jsx';
import ReportPage from './pages/customer/ReportPage.jsx';
import RequestDetailsPage from './pages/customer/RequestDetailsPage.jsx';
import RequestsPage from './pages/customer/RequestsPage.jsx';
import ProviderDashboardPage from './pages/provider/ProviderDashboardPage.jsx';
import ProviderRequestDetailsPage from './pages/provider/ProviderRequestDetailsPage.jsx';
import ProviderRequestsPage from './pages/provider/ProviderRequestsPage.jsx';
import AboutPage from './pages/public/AboutPage.jsx';
import HomePage from './pages/public/HomePage.jsx';
import NotFoundPage from './pages/public/NotFoundPage.jsx';
import ServiceDetailsPage from './pages/public/ServiceDetailsPage.jsx';
import ServicesPage from './pages/public/ServicesPage.jsx';
import { buildLoginPath, getHomeRouteForRole, resolvePostAuthRoute } from './utils/roles.js';

const PUBLIC = 'PUBLIC';
const GUEST = 'GUEST';

// `access` is PUBLIC (anyone), GUEST (logged-out only) or the single role allowed.
const ROUTES = [
  { path: '/', access: PUBLIC, render: () => <HomePage /> },
  { path: '/services', access: PUBLIC, render: () => <ServicesPage /> },
  {
    path: '/services/:serviceId',
    access: PUBLIC,
    render: ({ serviceId }) => <ServiceDetailsPage key={serviceId} serviceId={serviceId} />,
  },
  { path: '/about', access: PUBLIC, render: () => <AboutPage /> },

  { path: '/login', access: GUEST, render: () => <LoginPage /> },
  { path: '/signup', access: GUEST, redirect: '/signup/customer' },
  { path: '/signup/customer', access: GUEST, render: () => <SignupPage key="customer" role="CUSTOMER" /> },
  { path: '/signup/provider', access: GUEST, render: () => <SignupPage key="provider" role="PROVIDER" /> },

  { path: '/report', access: 'CUSTOMER', render: () => <ReportPage /> },
  { path: '/requests', access: 'CUSTOMER', render: () => <RequestsPage /> },
  {
    path: '/requests/:requestId',
    access: 'CUSTOMER',
    render: ({ requestId }) => <RequestDetailsPage key={requestId} requestId={requestId} />,
  },
  {
    path: '/requests/:requestId/payment',
    access: 'CUSTOMER',
    render: ({ requestId }) => <PaymentPage key={requestId} requestId={requestId} />,
  },
  { path: '/history', access: 'CUSTOMER', render: () => <HistoryPage /> },
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
  { path: '/provider/profile', access: 'PROVIDER', render: () => <ProfilePage /> },

  { path: '/app/admin', access: 'ADMIN', render: () => <DashboardPage role="ADMIN" /> },
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

  if (route.redirect) {
    return <Redirect to={route.redirect} />;
  }

  if (route.access === GUEST && isAuthenticated) {
    const returnTo = new URLSearchParams(search).get('returnTo');
    return <Redirect to={resolvePostAuthRoute(user.role, returnTo)} />;
  }

  if (route.access !== PUBLIC && route.access !== GUEST) {
    if (!isAuthenticated) {
      return <Redirect to={buildLoginPath(getCurrentLocation())} />;
    }

    if (user.role !== route.access) {
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
