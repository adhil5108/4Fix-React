import AreaSwitcher from './admin/AreaSwitcher.jsx';
import { useAuth } from '../hooks/useAuth.jsx';
import { navigate, useRoute } from '../hooks/useRoute.js';
import { ButtonLink, Link } from './ui.jsx';

const icons = {
  home: <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />,
  grid: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </>
  ),
  plus: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v8M8 12h8" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </>
  ),
  briefcase: (
    <>
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
    </>
  ),
  wrench: (
    <path d="M14.7 6.3a4 4 0 0 0 5 5L13 18l-3-3 6.7-8.7zM4 20l4-4" />
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8h.01M11 12h1v4h1" />
    </>
  ),
};

function Icon({ name }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {icons[name]}
    </svg>
  );
}

// Mobile keeps to Home / Book / Bookings / Profile; desktop adds Services.
const NAV_BY_ROLE = {
  PUBLIC: [
    { to: '/', label: 'Home', icon: 'home', exact: true },
    { to: '/services', label: 'Services', icon: 'grid' },
    { to: '/about', label: 'About', icon: 'info' },
  ],
  CUSTOMER: [
    { to: '/', label: 'Home', icon: 'home', exact: true },
    { to: '/services', label: 'Services', icon: 'grid', desktopOnly: true },
    { to: '/services', label: 'Book', icon: 'plus', mobileOnly: true },
    { to: '/bookings', label: 'Bookings', icon: 'calendar' },
    { to: '/profile', label: 'Profile', icon: 'user' },
  ],
  PROVIDER: [
    { to: '/provider', label: 'Dashboard', icon: 'home', exact: true },
    { to: '/provider/requests', label: 'Requests', icon: 'briefcase' },
    { to: '/provider/jobs', label: 'My jobs', shortLabel: 'Jobs', icon: 'wrench' },
    { to: '/provider/profile', label: 'Profile', icon: 'user' },
  ],
  ADMIN: [{ to: '/app/admin', label: 'Admin', icon: 'home', exact: true }],
};

function isActive(item, path) {
  if (item.exact) {
    return path === item.to;
  }

  return path === item.to || path.startsWith(`${item.to}/`);
}

function Header({ navItems, path, previewRole }) {
  const { isAuthenticated, user, logout } = useAuth();
  const homeTarget = user?.role === 'PROVIDER' ? '/provider' : '/';

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link to={homeTarget} className="brand-logo brand-logo--header" aria-label="4Fix home">
          <span className="brand-logo__mark">4</span>Fix
        </Link>

        <nav className="site-nav" aria-label="Main">
          {navItems
            .filter((item) => !item.mobileOnly)
            .map((item) => (
              <Link
                key={item.label}
                to={item.to}
                className={`site-nav__link${isActive(item, path) ? ' is-active' : ''}`}
                aria-current={isActive(item, path) ? 'page' : undefined}
              >
                {item.label}
              </Link>
            ))}
        </nav>

        <div className="site-header__actions">
          {!isAuthenticated ? (
            <>
              <Link to="/login" className="text-link site-header__login">
                Log in
              </Link>
              <ButtonLink to="/services" size="sm">
                Book a service
              </ButtonLink>
            </>
          ) : null}
          {isAuthenticated && user.role === 'CUSTOMER' ? (
            <ButtonLink to="/services" size="sm" className="hide-mobile">
              Book a service
            </ButtonLink>
          ) : null}
          {isAuthenticated && user.role === 'ADMIN' ? (
            <button type="button" className="text-link" onClick={handleLogout}>
              Log out
            </button>
          ) : null}
        </div>
      </div>

      {previewRole ? (
        <div className="admin-preview-banner">
          <span className="admin-preview-banner__label">
            Admin Preview — Viewing {previewRole === 'PROVIDER' ? 'Provider' : 'Customer'} Side as Admin
          </span>
          <AreaSwitcher current={previewRole} className="admin-preview-banner__areas" linkClassName="chip" />
        </div>
      ) : null}
    </header>
  );
}

function MobileNav({ navItems, path }) {
  const items = navItems.filter((item) => !item.desktopOnly && item.icon);

  return (
    <nav className="mobile-nav" aria-label="Main">
      {items.map((item) => (
        <Link
          key={item.label}
          to={item.to}
          className={`mobile-nav__link${isActive(item, path) && !item.mobileOnly ? ' is-active' : ''}${
            item.icon === 'plus' ? ' mobile-nav__link--primary' : ''
          }`}
          aria-current={isActive(item, path) ? 'page' : undefined}
        >
          <Icon name={item.icon} />
          <span>{item.shortLabel || item.label}</span>
        </Link>
      ))}
    </nav>
  );
}

// AppShell only ever renders customer/provider/public pages (the admin console uses
// AdminShell), so an authenticated ADMIN here is always previewing — never their own
// area — which side is inferred from the current path.
function resolvePreviewRole(path) {
  return path === '/provider' || path.startsWith('/provider/') ? 'PROVIDER' : 'CUSTOMER';
}

function AppShell({ children, width = 'default' }) {
  const { path } = useRoute();
  const { isAuthenticated, user } = useAuth();
  const isAdminPreview = isAuthenticated && user.role === 'ADMIN';
  const previewRole = isAdminPreview ? resolvePreviewRole(path) : null;
  const navRole = isAdminPreview ? previewRole : isAuthenticated ? user.role : 'PUBLIC';
  const navItems = NAV_BY_ROLE[navRole] || NAV_BY_ROLE.PUBLIC;

  return (
    <div className="app-shell">
      <Header navItems={navItems} path={path} previewRole={previewRole} />
      <main className={`app-main app-main--${width}`}>{children}</main>
      <MobileNav navItems={navItems} path={path} />
    </div>
  );
}

export default AppShell;
