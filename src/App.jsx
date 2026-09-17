import { useEffect } from 'react';
import { AuthProvider, useAuth } from './hooks/useAuth.jsx';
import { navigate, useRoute } from './hooks/useRoute.js';
import LoginPage from './pages/LoginPage.jsx';
import SignupPage from './pages/SignupPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import { getHomeRouteForRole } from './utils/roles.js';

function Redirect({ to }) {
  useEffect(() => {
    navigate(to);
  }, [to]);

  return null;
}

function ProtectedRoute({ allowedRoles, children }) {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  if (!allowedRoles.includes(user.role)) {
    return <Redirect to={getHomeRouteForRole(user.role)} />;
  }

  return children;
}

function AppRoutes() {
  const route = useRoute();

  if (route === '/login') {
    return <LoginPage />;
  }

  if (route === '/signup') {
    return <Redirect to="/signup/customer" />;
  }

  if (route === '/signup/customer') {
    return <SignupPage role="CUSTOMER" />;
  }

  if (route === '/signup/provider') {
    return <SignupPage role="PROVIDER" />;
  }

  if (route === '/app/customer') {
    return (
      <ProtectedRoute allowedRoles={['CUSTOMER']}>
        <DashboardPage role="CUSTOMER" />
      </ProtectedRoute>
    );
  }

  if (route === '/app/provider') {
    return (
      <ProtectedRoute allowedRoles={['PROVIDER']}>
        <DashboardPage role="PROVIDER" />
      </ProtectedRoute>
    );
  }

  if (route === '/app/admin') {
    return (
      <ProtectedRoute allowedRoles={['ADMIN']}>
        <DashboardPage role="ADMIN" />
      </ProtectedRoute>
    );
  }

  return <Redirect to="/login" />;
}

function AuthRedirector({ children }) {
  const route = useRoute();
  const { isAuthenticated, user } = useAuth();
  const authRoutes = ['/', '/signup', '/signup/customer', '/signup/provider', '/login'];

  if (isAuthenticated && authRoutes.includes(route)) {
    return <Redirect to={getHomeRouteForRole(user.role)} />;
  }

  return children;
}

function App() {
  return (
    <AuthProvider>
      <AuthRedirector>
        <AppRoutes />
      </AuthRedirector>
    </AuthProvider>
  );
}

export default App;
