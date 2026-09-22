import { Link } from '../ui.jsx';

// The three top-level areas an ADMIN can move between without logging out. Customer
// View and Provider View land on each area's real home route — the admin stays
// authenticated as ADMIN the whole time; nothing here changes identity or role.
export const AREAS = [
  { key: 'ADMIN', label: 'Admin Console', to: '/app/admin' },
  { key: 'CUSTOMER', label: 'Customer View', to: '/' },
  { key: 'PROVIDER', label: 'Provider View', to: '/provider' },
];

// Reused by AdminShell (sidebar/drawer) and AppShell (the "Admin Preview" banner
// shown when an admin is browsing the customer/provider UI) so there is one source
// of truth for the three destinations.
function AreaSwitcher({ current, className = '', linkClassName = '', onNavigate }) {
  return (
    <div className={className} role="group" aria-label="Switch admin area">
      {AREAS.map((area) => (
        <Link
          key={area.key}
          to={area.to}
          className={`${linkClassName}${area.key === current ? ' is-active' : ''}`}
          aria-current={area.key === current ? 'page' : undefined}
          onClick={onNavigate}
        >
          {area.label}
        </Link>
      ))}
    </div>
  );
}

export default AreaSwitcher;
