import { useTranslation } from 'react-i18next';
import { Star } from 'lucide-react';
import AppShell from '../../components/AppShell.jsx';
import { StarRating } from '../../components/StarRating.jsx';
import { ServiceIcon } from '../../components/cards.jsx';
import { Card, EmptyState, ErrorState, LoadingState, SectionHeader } from '../../components/ui.jsx';
import { useApi } from '../../hooks/useApi.js';
import { providerApi } from '../../services/fixApi.js';
import { formatIssueLabel, formatRating, formatTimestamp } from '../../utils/format.js';

// "My Reviews": what customers said about this provider's completed jobs. The API only
// ever returns the signed-in provider's own reviews (there is no id in the URL).
function ProviderReviewsPage() {
  const { t } = useTranslation();
  const data = useApi(() => providerApi.reviews(), []);
  const back = { to: '/provider/profile', label: t('profile.title'), history: true };

  if (data.loading) {
    return (
      <AppShell title={t('provider.reviews.title')} back={back}>
        <LoadingState label={t('provider.reviews.loading')} />
      </AppShell>
    );
  }

  if (data.error) {
    return (
      <AppShell title={t('provider.reviews.title')} back={back}>
        <ErrorState error={data.error} onRetry={data.reload} />
      </AppShell>
    );
  }

  const { reviews, summary } = data.data;
  const average = formatRating(summary.rating);

  return (
    <AppShell title={t('provider.reviews.title')} back={back}>
      {reviews.length === 0 ? (
        <EmptyState
          icon={Star}
          title={t('provider.reviews.emptyTitle')}
          message={t('provider.reviews.emptyMessage')}
        />
      ) : (
        <>
          <Card className="profile-summary review-summary">
            {average ? <p className="review-summary__value">{average}</p> : null}
            <StarRating value={Math.round(summary.rating || 0)} readOnly size="lg" />
            <p className="field-hint">{t('provider.reviews.summary', { count: summary.reviewCount })}</p>
          </Card>

          <section className="section" aria-labelledby="my-reviews-heading">
            <SectionHeader id="my-reviews-heading" title={t('provider.reviews.listTitle')} count={reviews.length} />
            <div className="stack">
              {reviews.map((review) => {
                const issue = formatIssueLabel(review.issueKey, review.issueLabel);

                return (
                  <article key={review.id} className="card review-item">
                    <div className="review-item__top">
                      <StarRating value={review.rating} readOnly />
                      <span className="field-hint">{formatTimestamp(review.createdAt)}</span>
                    </div>
                    {review.comment ? (
                      <p className="body-text review-item__comment">{review.comment}</p>
                    ) : (
                      <p className="field-hint">{t('provider.reviews.noComment')}</p>
                    )}
                    <div className="review-item__job">
                      <ServiceIcon service={review.service} size="sm" />
                      <div>
                        <p className="review-item__service">
                          {review.service?.name || t('provider.shared.job')}
                          {issue ? ` · ${issue}` : ''}
                        </p>
                        <p className="field-hint">
                          {[
                            review.customer?.name ? t('provider.shared.forCustomer', { name: review.customer.name }) : null,
                            review.completedAt
                              ? t('provider.reviews.completedOn', { date: formatTimestamp(review.completedAt) })
                              : null,
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </p>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        </>
      )}
    </AppShell>
  );
}

export default ProviderReviewsPage;
