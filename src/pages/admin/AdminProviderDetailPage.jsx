import AdminShell from '../../components/admin/AdminShell.jsx';
import { Avatar, ProviderFacts, RatingSummary } from '../../components/cards.jsx';
import {
  Button,
  Card,
  DetailList,
  ErrorState,
  LoadingState,
  Notice,
  PageHeader,
  StatusBadge,
} from '../../components/ui.jsx';
import { useAction, useApi } from '../../hooks/useApi.js';
import { navigate } from '../../hooks/useRoute.js';
import { adminApi } from '../../services/fixApi.js';
import { formatCategory, formatSlot, formatTimestamp } from '../../utils/format.js';

function AdminProviderDetailPage({ providerId }) {
  const data = useApi(() => adminApi.provider(providerId), [providerId]);
  const action = useAction();
  const back = { to: '/app/admin/providers', label: 'Providers' };

  if (data.loading) {
    return (
      <AdminShell>
        <LoadingState label="Loading provider…" />
      </AdminShell>
    );
  }

  if (data.error) {
    return (
      <AdminShell>
        <PageHeader title="Provider" back={back} />
        <ErrorState error={data.error} onRetry={data.reload} />
      </AdminShell>
    );
  }

  const { provider, bookings, reviews } = data.data;

  async function toggleStatus() {
    await action.run('status', async () => {
      await adminApi.setProviderStatus(providerId, !provider.isActive);
      await data.refresh();
    });
  }

  return (
    <AdminShell>
      <PageHeader
        back={back}
        title={provider.name}
        subtitle={provider.username}
        actions={
          <Button
            variant={provider.isActive ? 'danger-ghost' : 'primary'}
            size="sm"
            loading={action.pending === 'status'}
            loadingText="Updating…"
            onClick={toggleStatus}
          >
            {provider.isActive ? 'Deactivate' : 'Activate'}
          </Button>
        }
      />

      <Notice>{action.error}</Notice>

      <div className="admin-detail">
        <div>
          <Card>
            <div className="provider-card__head">
              <Avatar name={provider.name} image={provider.profileImage} />
              <div className="provider-card__identity">
                <span className="provider-card__name">{provider.name}</span>
                <RatingSummary rating={provider.rating} reviewCount={provider.reviewCount} />
              </div>
              <span className={`badge badge--${provider.isActive ? 'success' : 'muted'}`}>
                {provider.isActive ? 'Active' : 'Deactivated'}
              </span>
            </div>
            {provider.bio ? <p className="body-text">{provider.bio}</p> : null}
            <ProviderFacts provider={provider} />
          </Card>

          <section className="section section--tight" aria-labelledby="provider-bookings-heading">
            <h2 id="provider-bookings-heading" className="section__title">
              Bookings {bookings.length > 0 ? <span className="count">{bookings.length}</span> : null}
            </h2>
            {bookings.length === 0 ? (
              <p className="body-text">No bookings yet.</p>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Customer</th>
                      <th>Service</th>
                      <th>Status</th>
                      <th>Visit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map((booking) => (
                      <tr
                        key={booking.id}
                        className="admin-table__row--link"
                        onClick={() => navigate(`/app/admin/bookings/${booking.id}`)}
                      >
                        <td>{booking.customer?.name || '—'}</td>
                        <td>{booking.service?.name || '—'}</td>
                        <td>
                          <StatusBadge status={booking.status} audience="booking" />
                        </td>
                        <td>{booking.scheduledDate ? formatSlot(booking.scheduledDate, booking.scheduledTime) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="section section--tight" aria-labelledby="provider-reviews-heading">
            <h2 id="provider-reviews-heading" className="section__title">
              Reviews {reviews.length > 0 ? <span className="count">{reviews.length}</span> : null}
            </h2>
            {reviews.length === 0 ? (
              <p className="body-text">No reviews yet.</p>
            ) : (
              <div className="list">
                {reviews.map((review) => (
                  <article key={review.id} className="card review-card">
                    <div className="review-card__top">
                      <strong>{review.rating} / 5</strong>
                      <span className="review-card__meta">
                        {review.customer?.name || 'Customer'} · {formatTimestamp(review.createdAt)}
                      </span>
                    </div>
                    {review.comment ? <p className="review-card__comment">{review.comment}</p> : null}
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>

        <aside>
          <Card>
            <h2 className="card__title">Account</h2>
            <DetailList
              items={[
                { label: 'Phone', value: provider.username },
                { label: 'Experience', value: provider.experienceYears !== null ? `${provider.experienceYears} years` : '' },
                {
                  label: 'Categories',
                  value: provider.serviceCategories?.length
                    ? provider.serviceCategories.map(formatCategory).join(', ')
                    : '',
                },
                { label: 'Accepting bookings', value: provider.isAvailable ? 'Yes' : 'No' },
                { label: 'Joined', value: formatTimestamp(provider.createdAt) },
              ]}
            />
          </Card>
        </aside>
      </div>
    </AdminShell>
  );
}

export default AdminProviderDetailPage;
