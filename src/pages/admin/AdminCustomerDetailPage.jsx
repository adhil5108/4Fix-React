import { useTranslation } from 'react-i18next';
import AdminShell from '../../components/admin/AdminShell.jsx';
import { Card, DetailList, ErrorState, LoadingState, PageHeader, StatusBadge } from '../../components/ui.jsx';
import { useApi } from '../../hooks/useApi.js';
import { navigate } from '../../hooks/useRoute.js';
import { adminApi } from '../../services/fixApi.js';
import { formatTimestamp } from '../../utils/format.js';

function AdminCustomerDetailPage({ customerId }) {
  const { t } = useTranslation();
  const data = useApi(() => adminApi.customer(customerId), [customerId]);
  const back = { to: '/app/admin/customers', label: t('common.adminNav.customers') };

  if (data.loading) {
    return (
      <AdminShell>
        <LoadingState label={t('admin.customerDetail.loading')} />
      </AdminShell>
    );
  }

  if (data.error) {
    return (
      <AdminShell>
        <PageHeader title={t('admin.customerDetail.fallbackTitle')} back={back} />
        <ErrorState error={data.error} onRetry={data.reload} />
      </AdminShell>
    );
  }

  const { customer, requests, bookings, reviews } = data.data;

  return (
    <AdminShell>
      <PageHeader
        back={back}
        title={customer.name}
        subtitle={customer.username}
        actions={
          <span className={`badge badge--${customer.isActive ? 'success' : 'muted'}`}>
            {customer.isActive ? t('admin.shared.active') : t('admin.shared.deactivated')}
          </span>
        }
      />

      <div className="admin-detail">
        <div>
          <section className="section section--tight" aria-labelledby="customer-requests-heading">
            <h2 id="customer-requests-heading" className="section__title">
              {t('admin.customerDetail.requests')} {requests.length > 0 ? <span className="count">{requests.length}</span> : null}
            </h2>
            {requests.length === 0 ? (
              <p className="body-text">{t('admin.shared.noRequestsYet')}</p>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>{t('admin.fields.service')}</th>
                      <th>{t('admin.fields.status')}</th>
                      <th>{t('admin.fields.created')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requests.map((request) => (
                      <tr
                        key={request.id}
                        className="admin-table__row--link"
                        onClick={() => navigate(`/app/admin/requests/${request.id}`)}
                      >
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

          <section className="section section--tight" aria-labelledby="customer-bookings-heading">
            <h2 id="customer-bookings-heading" className="section__title">
              {t('admin.customerDetail.bookings')} {bookings.length > 0 ? <span className="count">{bookings.length}</span> : null}
            </h2>
            {bookings.length === 0 ? (
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
                    {bookings.map((booking) => (
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

          <section className="section section--tight" aria-labelledby="customer-reviews-heading">
            <h2 id="customer-reviews-heading" className="section__title">
              {t('admin.customerDetail.reviewsLeft')} {reviews.length > 0 ? <span className="count">{reviews.length}</span> : null}
            </h2>
            {reviews.length === 0 ? (
              <p className="body-text">{t('admin.shared.noReviewsYet')}</p>
            ) : (
              <div className="list">
                {reviews.map((review) => (
                  <article key={review.id} className="card review-card">
                    <div className="review-card__top">
                      <strong>{t('admin.shared.ratingOutOf', { rating: review.rating })}</strong>
                      <span className="review-card__meta">{formatTimestamp(review.createdAt)}</span>
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
            <h2 className="card__title">{t('admin.fields.account')}</h2>
            <DetailList
              items={[
                { label: t('admin.fields.phone'), value: customer.username },
                { label: t('admin.fields.joined'), value: formatTimestamp(customer.createdAt) },
              ]}
            />
          </Card>
        </aside>
      </div>
    </AdminShell>
  );
}

export default AdminCustomerDetailPage;
