import AdminShell from '../../components/admin/AdminShell.jsx';
import { ErrorState, Link, LoadingState, StatusBadge } from '../../components/ui.jsx';
import { useApi } from '../../hooks/useApi.js';
import { useAuth } from '../../hooks/useAuth.jsx';
import { navigate } from '../../hooks/useRoute.js';
import { adminApi } from '../../services/fixApi.js';
import { firstName, formatMoney, formatTimestamp } from '../../utils/format.js';

const STAT_TILES = [
  { key: 'totalCustomers', label: 'Customers', to: '/app/admin/customers' },
  { key: 'totalProviders', label: 'Providers', to: '/app/admin/providers' },
  { key: 'totalServices', label: 'Services', to: '/app/admin/services' },
  { key: 'openRequests', label: 'Open requests', to: '/app/admin/requests?status=QUOTE_RECEIVED' },
  { key: 'openQuotes', label: 'Open quotes', to: '/app/admin/quotes?status=PENDING' },
  { key: 'activeBookings', label: 'Active bookings', to: '/app/admin/bookings' },
  { key: 'pendingPayments', label: 'Pending payments', to: '/app/admin/payments?status=PENDING' },
  { key: 'completedBookings', label: 'Completed bookings', to: '/app/admin/bookings?status=COMPLETED' },
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
  const { user } = useAuth();
  const dashboard = useApi(() => adminApi.dashboard(), []);

  return (
    <AdminShell>
      <div className="admin-content__header">
        <div>
          <h1 className="admin-content__title">Hi {firstName(user.name)}</h1>
          <p className="admin-content__subtitle">Marketplace overview and recent activity.</p>
        </div>
      </div>

      {dashboard.loading ? <LoadingState label="Loading dashboard…" /> : null}
      {dashboard.error ? <ErrorState error={dashboard.error} onRetry={dashboard.reload} /> : null}

      {dashboard.data ? (
        <>
          <div className="stat-grid">
            {STAT_TILES.map((tile) => (
              <StatTile key={tile.key} label={tile.label} value={dashboard.data.counts[tile.key]} to={tile.to} />
            ))}
          </div>

          <section className="section section--tight" aria-labelledby="recent-requests-heading">
            <h2 id="recent-requests-heading" className="section__title">
              Recent requests
            </h2>
            {dashboard.data.recent.requests.length === 0 ? (
              <p className="body-text">No requests yet.</p>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Customer</th>
                      <th>Service</th>
                      <th>Status</th>
                      <th>Created</th>
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

          <section className="section section--tight" aria-labelledby="recent-quotes-heading">
            <h2 id="recent-quotes-heading" className="section__title">
              Recent quotes
            </h2>
            {dashboard.data.recent.quotes.length === 0 ? (
              <p className="body-text">No quotes yet.</p>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Provider</th>
                      <th>Service</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboard.data.recent.quotes.map((quote) => (
                      <tr key={quote.id}>
                        <td>{quote.provider?.name || '—'}</td>
                        <td>{quote.request?.service?.name || '—'}</td>
                        <td>{formatMoney(quote.amount)}</td>
                        <td>
                          <StatusBadge status={quote.status} audience="quote" />
                        </td>
                        <td>{formatTimestamp(quote.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="section section--tight" aria-labelledby="recent-bookings-heading">
            <h2 id="recent-bookings-heading" className="section__title">
              Recent bookings
            </h2>
            {dashboard.data.recent.bookings.length === 0 ? (
              <p className="body-text">No bookings yet.</p>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Service</th>
                      <th>Provider</th>
                      <th>Status</th>
                      <th>Amount</th>
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
                        <td>{formatMoney(booking.amount)}</td>
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
