import { useTranslation } from 'react-i18next';
import AdminShell from '../../components/admin/AdminShell.jsx';
import AdminTable from '../../components/admin/AdminTable.jsx';
import { Card, DetailList, ErrorState, LoadingState, PageHeader, StatusBadge } from '../../components/ui.jsx';
import { useApi } from '../../hooks/useApi.js';
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
          <span className={`badge badge--${customer.isActive ? 'done' : 'muted'}`}>
            {customer.isActive ? t('admin.shared.active') : t('admin.shared.deactivated')}
          </span>
        }
      />

      <div className="admin-detail">
        <div>
          <section className="section" aria-labelledby="customer-requests-heading">
            <h2 id="customer-requests-heading" className="section-header__title">
              {t('admin.customerDetail.requests')} {requests.length > 0 ? <span className="section-header__count">{requests.length}</span> : null}
            </h2>
            <AdminTable
              columns={[
                { key: 'service', label: t('admin.fields.service'), render: (row) => row.service?.name || '—' },
                { key: 'status', label: t('admin.fields.status'), render: (row) => <StatusBadge status={row.status} /> },
                { key: 'created', label: t('admin.fields.created'), render: (row) => formatTimestamp(row.createdAt) },
              ]}
              rows={requests}
              emptyTitle={t('admin.shared.noRequestsYet')}
              getRowHref={(row) => `/app/admin/requests/${row.id}`}
            />
          </section>

          <section className="section" aria-labelledby="customer-bookings-heading">
            <h2 id="customer-bookings-heading" className="section-header__title">
              {t('admin.customerDetail.bookings')} {bookings.length > 0 ? <span className="section-header__count">{bookings.length}</span> : null}
            </h2>
            <AdminTable
              columns={[
                { key: 'service', label: t('admin.fields.service'), render: (row) => row.service?.name || '—' },
                { key: 'provider', label: t('admin.fields.provider'), render: (row) => row.provider?.name || '—' },
                { key: 'status', label: t('admin.fields.status'), render: (row) => <StatusBadge status={row.status} audience="booking" /> },
                { key: 'accepted', label: t('admin.fields.accepted'), render: (row) => (row.confirmedAt ? formatTimestamp(row.confirmedAt) : '—') },
              ]}
              rows={bookings}
              emptyTitle={t('admin.shared.noBookingsYet')}
              getRowHref={(row) => `/app/admin/bookings/${row.id}`}
            />
          </section>

          <section className="section" aria-labelledby="customer-reviews-heading">
            <h2 id="customer-reviews-heading" className="section-header__title">
              {t('admin.customerDetail.reviewsLeft')} {reviews.length > 0 ? <span className="section-header__count">{reviews.length}</span> : null}
            </h2>
            {reviews.length === 0 ? (
              <p className="body-text">{t('admin.shared.noReviewsYet')}</p>
            ) : (
              <div className="stack">
                {reviews.map((review) => (
                  <article key={review.id} className="card review-item">
                    <div className="review-item__top">
                      <strong>{t('admin.shared.ratingOutOf', { rating: review.rating })}</strong>
                      <span className="field-hint">{formatTimestamp(review.createdAt)}</span>
                    </div>
                    {review.comment ? <p className="body-text">{review.comment}</p> : null}
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
