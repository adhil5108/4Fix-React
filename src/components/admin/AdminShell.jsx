import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth.jsx';
import { navigate, useRoute } from '../../hooks/useRoute.js';
import { Link } from '../ui.jsx';
import LanguageSwitcher from '../LanguageSwitcher.jsx';
import AreaSwitcher from './AreaSwitcher.jsx';

const NAV_ITEMS = [
  { to: '/app/admin', label: 'dashboard', exact: true },
  { to: '/app/admin/services', label: 'services' },
  { to: '/app/admin/providers', label: 'providers' },
  { to: '/app/admin/customers', label: 'customers' },
  { to: '/app/admin/requests', label: 'requests' },
  { to: '/app/admin/bookings', label: 'bookings' },
  { to: '/app/admin/reviews', label: 'reviews' },
];

// Nested detail routes (e.g. /app/admin/requests/:id) still highlight their parent
// section — only Dashboard needs an exact match, since every other section's own
// path is also a prefix of its detail pages.
function isActive(item, path) {
  if (item.exact) {
    return path === item.to;
  }

  return path === item.to || path.startsWith(`${item.to}/`);
}

// One persistent sidebar, reused as-is for desktop (always visible) and for the
// mobile drawer (toggled on/off canvas via CSS) — same markup, same active state.
function AdminShell({ children }) {
  const { t } = useTranslation();
  const { path } = useRoute();
  const { user, logout } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);

  function closeDrawer() {
    setDrawerOpen(false);
  }

  function handleLogout() {
    closeDrawer();
    logout();
    navigate('/login');
  }

  return (
    <div className="admin-shell">
      <header className="admin-header">
        <button
          type="button"
          className="admin-header__menu-toggle"
          aria-label={t('common.adminNav.openNav')}
          aria-expanded={drawerOpen}
          onClick={() => setDrawerOpen(true)}
        >
          <span aria-hidden="true">☰</span>
        </button>
        <Link to="/app/admin" className="brand-logo admin-header__brand" aria-label={t('common.brand.adminAria')}>
          <span className="brand-logo__mark">4</span>Fix <span className="admin-header__tag">{t('common.brand.adminTag')}</span>
        </Link>
        <LanguageSwitcher className="admin-header__lang" />
        <div className="admin-header__actions">
          <span className="admin-header__user">{user.name}</span>
          <button type="button" className="text-link" onClick={handleLogout}>
            {t('common.nav.logOut')}
          </button>
        </div>
      </header>

      {drawerOpen ? (
        <button
          type="button"
          className="admin-drawer-backdrop"
          aria-label={t('common.adminNav.closeNav')}
          onClick={closeDrawer}
        />
      ) : null}

      <div className="admin-layout">
        <aside className={`admin-sidebar${drawerOpen ? ' is-open' : ''}`} aria-label={t('common.adminNav.sections')}>
          <Link
            to="/app/admin"
            className="brand-logo admin-sidebar__brand"
            aria-label={t('common.brand.adminAria')}
            onClick={closeDrawer}
          >
            <span className="brand-logo__mark">4</span>Fix <span className="admin-header__tag">{t('common.brand.adminTag')}</span>
          </Link>

          <AreaSwitcher
            current="ADMIN"
            className="admin-sidebar__areas"
            linkClassName="admin-sidebar__area-link"
            onNavigate={closeDrawer}
          />

          <nav className="admin-sidebar__nav" aria-label={t('common.adminNav.sections')}>
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={`admin-sidebar__link${isActive(item, path) ? ' is-active' : ''}`}
                aria-current={isActive(item, path) ? 'page' : undefined}
                onClick={closeDrawer}
              >
                {t(`common.adminNav.${item.label}`)}
              </Link>
            ))}
          </nav>

          <div className="admin-sidebar__footer">
            <span className="admin-sidebar__user">{user.name}</span>
            <button type="button" className="text-link" onClick={handleLogout}>
              {t('common.nav.logOut')}
            </button>
          </div>
        </aside>
        <main className="admin-content">{children}</main>
      </div>
    </div>
  );
}

export default AdminShell;
