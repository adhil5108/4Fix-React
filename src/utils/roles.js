// Only providers and admins sign in; customers never have a session.
export const ROLE_HOME_ROUTES = {
  PROVIDER: '/provider',
  ADMIN: '/app/admin',
};

export function getHomeRouteForRole(role) {
  return ROLE_HOME_ROUTES[role] || '/login';
}

// Only same-site paths are accepted, so returnTo can't become an open redirect.
export function getSafeReturnTo(value) {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) {
    return null;
  }

  if (value.startsWith('/login') || value.startsWith('/signup')) {
    return null;
  }

  return value;
}

export function buildLoginPath(returnTo) {
  const safeReturnTo = getSafeReturnTo(returnTo);
  return safeReturnTo ? `/login?returnTo=${encodeURIComponent(safeReturnTo)}` : '/login';
}

function isProviderPath(path) {
  return path === '/provider' || path.startsWith('/provider/');
}

// Booking chat is shared by both roles, so a provider may return to it after login.
function isSharedPath(path) {
  return /^\/bookings\/[^/]+\/chat/.test(path);
}

// A returnTo into the other role's area would just bounce, so fall back to home.
export function resolvePostAuthRoute(role, returnTo) {
  const safeReturnTo = getSafeReturnTo(returnTo);

  if (!safeReturnTo) {
    return getHomeRouteForRole(role);
  }

  const isAdminPath = safeReturnTo.startsWith('/app/');

  if (role === 'PROVIDER' && !isProviderPath(safeReturnTo) && !isSharedPath(safeReturnTo)) {
    return getHomeRouteForRole(role);
  }

  if (role === 'ADMIN' && !isAdminPath) {
    return getHomeRouteForRole(role);
  }

  return safeReturnTo;
}
