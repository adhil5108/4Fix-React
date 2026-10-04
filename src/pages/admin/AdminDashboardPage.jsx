import { useTranslation } from 'react-i18next';
import AdminShell from '../../components/admin/AdminShell.jsx';
import AdminTable from '../../components/admin/AdminTable.jsx';
import { ErrorState, Link, LoadingState, PageHeader, SectionHeader, StatusBadge } from '../../components/ui.jsx';
import { useApi } from '../../hooks/useApi.js';
import { useAuth } from '../../hooks/useAuth.jsx';
import { firstName, formatTimestamp } from '../../utils/format.js';
import { adminApi } from '../../services/fixApi.js';

// Labels are translated at render from admin.dashboard.tiles.<key>. Customers are
// anonymous in V1, so there is no customer-count tile (legacy accounts stay listed under
// Customers).
const TILE_GROUPS = [
  {
    key: 'jobs',
    tiles: [
      { key: 'openRequests', to: '/app/admin/requests?status=PENDING' },
      { key: 'acceptedRequests', to: '/app/admin/requests?status=ACCEPTED' },
      { key: 'activeBookings', to: '/app/admin/bookings' },
      { key: 'completedBookings', to: '/app/admin/bookings?status=COMPLETED' },
    ],
  },
  {
    key: 'marketplace',
    tiles: [
      { key: 'activeProviders', to: '/app/admin/providers?isActive=true' },
      { key: 'totalProviders', to: '/app/admin/providers' },
      { key: 'activeServices', to: '/app/admin/services?isActive=true' },
      { key: 'totalServices', to: '/app/admin/services' },
    ],
  },
];

function StatTile({ label, value, to }) {
  return (
    <Link to={to} className="stat">
      <span className="stat__value">{value ?? '–'}</span>
      <span className="stat__label">{label}</span>
    </Link>
  );
}

function AdminDashboardPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const dashboard = useApi(() => adminApi.dashboard(), []);

  const requestColumns = [
    { key: 'customer', label: t('admin.fields.customer'), render: (row) => row.customer?.name || '—' },
    { key: 'service', label: t('admin.fields.service'), render: (row) => row.service?.name || '—' },
    { key: 'status', label: t('admin.fields.status'), render: (row) => <StatusBadge status={row.status} /> },
    { key: 'created', label: t('admin.fields.created'), render: (row) => formatTimestamp(row.createdAt) },
  ];
  const bookingColumns = [
    { key: 'service', label: t('admin.fields.service'), render: (row) => row.service?.name || '—' },
    { key: 'provider', label: t('admin.fields.provider'), render: (row) => row.provider?.name || '—' },
    { key: 'status', label: t('admin.fields.status'), render: (row) => <StatusBadge status={row.status} audience="booking" /> },
    { key: 'accepted', label: t('admin.fields.accepted'), render: (row) => (row.confirmedAt ? formatTimestamp(row.confirmedAt) : '—') },
  ];

  return (
    <AdminShell>
      <PageHeader
        title={t('admin.dashboard.greeting', { name: firstName(user.name) })}
        subtitle={t('admin.dashboard.subtitle')}
      />

      {dashboard.loading ? <LoadingState label={t('admin.dashboard.loading')} /> : null}
      {dashboard.error ? <ErrorState error={dashboard.error} onRetry={dashboard.reload} /> : null}

      {dashboard.data ? (
        <>
          <div className="admin-stat-groups">
            {TILE_GROUPS.map((group) => (
              <section key={group.key} aria-labelledby={`tiles-${group.key}`}>
                <h2 className="list-group__title" id={`tiles-${group.key}`}>
                  {t(`admin.dashboard.groups.${group.key}`)}
                </h2>
                <div className="stat-grid admin-stat-grid">
                  {group.tiles.map((tile) => (
                    <StatTile
                      key={tile.key}
                      label={t(`admin.dashboard.tiles.${tile.key}`)}
                      value={dashboard.data.counts[tile.key]}
                      to={tile.to}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>

          <section className="section" aria-labelledby="recent-requests-heading">
            <SectionHeader
              id="recent-requests-heading"
              title={t('admin.dashboard.recentRequests')}
              action={
                <Link to="/app/admin/requests" className="link">
                  {t('admin.dashboard.viewAll')}
                </Link>
              }
            />
            <AdminTable
              columns={requestColumns}
              rows={dashboard.data.recent.requests}
              emptyTitle={t('admin.shared.noRequestsYet')}
              getRowHref={(row) => `/app/admin/requests/${row.id}`}
            />
          </section>

          <section className="section" aria-labelledby="recent-bookings-heading">
            <SectionHeader
              id="recent-bookings-heading"
              title={t('admin.dashboard.recentBookings')}
              action={
                <Link to="/app/admin/bookings" className="link">
                  {t('admin.dashboard.viewAll')}
                </Link>
              }
            />
            <AdminTable
              columns={bookingColumns}
              rows={dashboard.data.recent.bookings}
              emptyTitle={t('admin.shared.noBookingsYet')}
              getRowHref={(row) => `/app/admin/bookings/${row.id}`}
            />
          </section>
        </>
      ) : null}
    </AdminShell>
  );
}

export default AdminDashboardPage;
