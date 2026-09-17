import { useAuth } from '../../hooks/useAuth.jsx';
import { buildLoginPath } from '../../utils/roles.js';

// Customers go straight to the report form; everyone else logs in first.
export function useReportIssuePath(serviceId) {
  const { isAuthenticated, user } = useAuth();
  const reportPath = serviceId ? `/report?serviceId=${encodeURIComponent(serviceId)}` : '/report';

  if (isAuthenticated && user.role === 'CUSTOMER') {
    return reportPath;
  }

  if (isAuthenticated) {
    return null;
  }

  return buildLoginPath(reportPath);
}
