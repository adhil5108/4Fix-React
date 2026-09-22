import { useAuth } from '../../hooks/useAuth.jsx';
import { navigate, useRoute } from '../../hooks/useRoute.js';
import { Link } from '../ui.jsx';

const NAV_ITEMS = [
  { to: '/app/admin', label: 'Dashboard', exact: true },
  { to: '/app/admin/services', label: 'Services' },
  { to: '/app/admin/providers', label: 'Providers' },
  { to: '/app/admin/customers', label: 'Customers' },
  { to: '/app/admin/requests', label: 'Requests' },
  { to: '/app/admin/quotes', label: 'Quotes' },
  { to: '/app/admin/bookings', label: 'Bookings' },
  { to: '/app/admin/payments', label: 'Payments' },
  { to: '/app/admin/reviews', label: 'Reviews' },
];

function isActive(item, path) {
  if (item.exact) {
    return path === item.to;
  }

  return path === item.to || path.startsWith(`${item.to}/`);
}

function AdminShell({ children }) {
  const { path } = useRoute();
  const { user, logout } = useAuth();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="admin-shell">
      <header className="admin-header">
        <Link to="/app/admin" className="brand-logo admin-header__brand" aria-label="4Fix admin">
          <span className="brand-logo__mark">4</span>Fix <span className="admin-header__tag">Admin</span>
        </Link>
        <div className="admin-header__actions">
          <span className="admin-header__user">{user.name}</span>
          <button type="button" className="text-link" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </header>

      <nav className="admin-tabs" aria-label="Admin sections">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={`chip admin-tabs__link${isActive(item, path) ? ' is-active' : ''}`}
            aria-current={isActive(item, path) ? 'page' : undefined}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="admin-layout">
        <aside className="admin-sidebar" aria-label="Admin sections">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`admin-sidebar__link${isActive(item, path) ? ' is-active' : ''}`}
              aria-current={isActive(item, path) ? 'page' : undefined}
            >
              {item.label}
            </Link>
          ))}
        </aside>
        <main className="admin-content">{children}</main>
      </div>
    </div>
  );
}

export default AdminShell;
