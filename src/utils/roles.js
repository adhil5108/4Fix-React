export const ROLE_HOME_ROUTES = {
  CUSTOMER: '/app/customer',
  PROVIDER: '/app/provider',
  ADMIN: '/app/admin',
};

export function getHomeRouteForRole(role) {
  return ROLE_HOME_ROUTES[role] || '/login';
}
