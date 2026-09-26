import { useTranslation } from 'react-i18next';
import AdminShell from '../../components/admin/AdminShell.jsx';
import { ErrorState, Link, LoadingState, StatusBadge } from '../../components/ui.jsx';
import { useApi } from '../../hooks/useApi.js';
import { useAuth } from '../../hooks/useAuth.jsx';
import { navigate } from '../../hooks/useRoute.js';
import { adminApi } from '../../services/fixApi.js';
import { firstName, formatTimestamp } from '../../utils/format.js';

// Labels are translated at render from admin.dashboard.tiles.<key>.
const STAT_TILES = [
  { key: 'totalCustomers', to: '/app/admin/customers' },
  { key: 'totalProviders', to: '/app/admin/providers' },
  { key: 'totalServices', to: '/app/admin/services' },
  { key: 'openRequests', to: '/app/admin/requests?status=PENDING' },
  { key: 'acceptedRequests', to: '/app/admin/requests?status=ACCEPTED' },
  { key: 'activeBookings', to: '/app/admin/bookings' },
  { key: 'completedBookings', to: '/app/admin/bookings?status=COMPLETED' },
];

function StatTile({ label, value, to }) {
  return (
    <Link to={to} className="card card--link stat">
      <span className="stat__value">{value ?? '–'}</span>
      <span className="stat__label">{label}</span>
    </Link>
  );
}

function AdminDashboardPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const dashboard = useApi(() => adminApi.dashboard(), []);

  return (
    <AdminShell>
      <div className="admin-content__header">
        <div>
          <h1 className="admin-content__title">{t('admin.dashboard.greeting', { name: firstName(user.name) })}</h1>
          <p className="admin-content__subtitle">{t('admin.dashboard.subtitle')}</p>
        </div>
      </div>

      {dashboard.loading ? <LoadingState label={t('admin.dashboard.loading')} /> : null}
      {dashboard.error ? <ErrorState error={dashboard.error} onRetry={dashboard.reload} /> : null}

      {dashboard.data ? (
        <>
          <div className="stat-grid">
            {STAT_TILES.map((tile) => (
              <StatTile key={tile.key} label={t(`admin.dashboard.tiles.${tile.key}`)} value={dashboard.data.counts[tile.key]} to={tile.to} />
            ))}
          </div>

          <section className="section section--tight" aria-labelledby="recent-requests-heading">
            <h2 id="recent-requests-heading" className="section__title">
              {t('admin.dashboard.recentRequests')}
            </h2>
            {dashboard.data.recent.requests.length === 0 ? (
              <p className="body-text">{t('admin.shared.noRequestsYet')}</p>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>{t('admin.fields.customer')}</th>
                      <th>{t('admin.fields.service')}</th>
                      <th>{t('admin.fields.status')}</th>
                      <th>{t('admin.fields.created')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboard.data.recent.requests.map((request) => (
                      <tr
                        key={request.id}
                        className="admin-table__row--link"
                        onClick={() => navigate(`/app/admin/requests/${request.id}`)}
                      >
                        <td>{request.customer?.name || '—'}</td>
                        <td>{request.service?.name || '—'}</td>
                        <td>
                          <StatusBadge status={request.status} />
                        </td>
                        <td>{formatTimestamp(request.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="section section--tight" aria-labelledby="recent-bookings-heading">
            <h2 id="recent-bookings-heading" className="section__title">
              {t('admin.dashboard.recentBookings')}
            </h2>
            {dashboard.data.recent.bookings.length === 0 ? (
              <p className="body-text">{t('admin.shared.noBookingsYet')}</p>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>{t('admin.fields.service')}</th>
                      <th>{t('admin.fields.provider')}</th>
                      <th>{t('admin.fields.status')}</th>
                      <th>{t('admin.fields.visit')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboard.data.recent.bookings.map((booking) => (
                      <tr
                        key={booking.id}
                        className="admin-table__row--link"
                        onClick={() => navigate(`/app/admin/bookings/${booking.id}`)}
                      >
                        <td>{booking.service?.name || '—'}</td>
                        <td>{booking.provider?.name || '—'}</td>
                        <td>
                          <StatusBadge status={booking.status} audience="booking" />
                        </td>
                        <td>{booking.confirmedAt ? formatTimestamp(booking.confirmedAt) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      ) : null}
    </AdminShell>
  );
}

export default AdminDashboardPage;
