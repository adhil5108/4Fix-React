import { useTranslation } from 'react-i18next';
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
import { formatTimestamp } from '../../utils/format.js';

function AdminProviderDetailPage({ providerId }) {
  const { t } = useTranslation();
  const data = useApi(() => adminApi.provider(providerId), [providerId]);
  const action = useAction();
  const back = { to: '/app/admin/providers', label: t('common.adminNav.providers') };

  if (data.loading) {
    return (
      <AdminShell>
        <LoadingState label={t('admin.providerDetail.loading')} />
      </AdminShell>
    );
  }

  if (data.error) {
    return (
      <AdminShell>
        <PageHeader title={t('admin.providerDetail.fallbackTitle')} back={back} />
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
            loadingText={t('admin.providerDetail.updating')}
            onClick={toggleStatus}
          >
            {provider.isActive ? t('admin.providerDetail.deactivate') : t('admin.providerDetail.activate')}
          </Button>
        }
      />

      <Notice>{action.error}</Notice>

      <div className="admin-detail">
        <div>
          <Card>
            <div className="contact-card__person">
              <Avatar name={provider.name} image={provider.profileImage} />
              <div className="contact-card__who">
                <span className="contact-card__name">{provider.name}</span>
                <RatingSummary rating={provider.rating} reviewCount={provider.reviewCount} />
              </div>
              <span className={`badge badge--${provider.isActive ? 'done' : 'muted'}`}>
                {provider.isActive ? t('admin.shared.active') : t('admin.shared.deactivated')}
              </span>
            </div>
            {provider.bio ? <p className="body-text">{provider.bio}</p> : null}
            <ProviderFacts provider={provider} />
          </Card>

          <section className="section" aria-labelledby="provider-bookings-heading">
            <h2 id="provider-bookings-heading" className="section-header__title">
              {t('admin.providerDetail.bookings')} {bookings.length > 0 ? <span className="section-header__count">{bookings.length}</span> : null}
            </h2>
            {bookings.length === 0 ? (
              <p className="body-text">{t('admin.shared.noBookingsYet')}</p>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>{t('admin.fields.customer')}</th>
                      <th>{t('admin.fields.service')}</th>
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
                        <td>{booking.customer?.name || '—'}</td>
                        <td>{booking.service?.name || '—'}</td>
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

          <section className="section" aria-labelledby="provider-reviews-heading">
            <h2 id="provider-reviews-heading" className="section-header__title">
              {t('admin.providerDetail.reviews')} {reviews.length > 0 ? <span className="section-header__count">{reviews.length}</span> : null}
            </h2>
            {reviews.length === 0 ? (
              <p className="body-text">{t('admin.shared.noReviewsYet')}</p>
            ) : (
              <div className="stack">
                {reviews.map((review) => (
                  <article key={review.id} className="card review-item">
                    <div className="review-item__top">
                      <strong>{t('admin.shared.ratingOutOf', { rating: review.rating })}</strong>
                      <span className="field-hint">
                        {review.customer?.name || t('admin.shared.customerFallback')} · {formatTimestamp(review.createdAt)}
                      </span>
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
                { label: t('admin.fields.phone'), value: provider.username },
                {
                  label: t('admin.providerDetail.experience'),
                  value:
                    provider.experienceYears !== null
                      ? t('admin.providerDetail.experienceYears', { count: provider.experienceYears })
                      : '',
                },
                {
                  label: t('admin.providerDetail.categories'),
                  value: provider.categories?.length
                    ? provider.categories.map((category) => category.name).filter(Boolean).join(', ')
                    : t('admin.providerDetail.noCategories'),
                },
                {
                  label: t('admin.providerDetail.acceptingBookings'),
                  value: provider.isAvailable ? t('admin.shared.yes') : t('admin.shared.no'),
                },
                { label: t('admin.fields.joined'), value: formatTimestamp(provider.createdAt) },
              ]}
            />
          </Card>
        </aside>
      </div>
    </AdminShell>
  );
}

export default AdminProviderDetailPage;
