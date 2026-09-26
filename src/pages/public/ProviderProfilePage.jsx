import { useTranslation } from 'react-i18next';
import AppShell from '../../components/AppShell.jsx';
import { StarRating } from '../../components/StarRating.jsx';
import { Avatar, ProviderFacts, RatingSummary } from '../../components/cards.jsx';
import { Card, EmptyState, ErrorState, LoadingState, PageHeader } from '../../components/ui.jsx';
import { useApi } from '../../hooks/useApi.js';
import { providersApi } from '../../services/fixApi.js';
import { formatTimestamp } from '../../utils/format.js';

function ProviderProfilePage({ providerId }) {
  const { t } = useTranslation();
  const data = useApi(async () => {
    const [profile, reviews] = await Promise.all([
      providersApi.get(providerId),
      providersApi.reviews(providerId),
    ]);
    return { provider: profile.provider, reviews: reviews.reviews, summary: reviews.summary };
  }, [providerId]);

  const back = { to: '/services', label: t('public.back') };

  if (data.loading) {
    return (
      <AppShell width="narrow">
        <LoadingState label={t('public.providerProfile.loading')} />
      </AppShell>
    );
  }

  if (data.error) {
    return (
      <AppShell width="narrow">
        <PageHeader title={t('public.providerProfile.fallbackTitle')} back={back} />
        <ErrorState
          error={
            data.error.status === 400
              ? { status: 404, message: t('public.providerProfile.notFound') }
              : data.error
          }
          onRetry={data.reload}
        />
      </AppShell>
    );
  }

  const { provider, reviews } = data.data;

  return (
    <AppShell width="narrow">
      <PageHeader back={back} title={provider.name} />

      <Card className="profile-card">
        <div className="profile-card__head">
          <Avatar name={provider.name} image={provider.profileImage} size="lg" />
          <div>
            <RatingSummary rating={provider.rating} reviewCount={provider.reviewCount} />
            <p className="availability" style={{ margin: '6px 0 0' }}>
              <span
                className={`availability__dot${provider.isAvailable ? '' : ' availability__dot--off'}`}
                aria-hidden="true"
              />
              {provider.isAvailable
                ? t('public.providerProfile.accepting')
                : t('public.providerProfile.notAccepting')}
            </p>
          </div>
        </div>
        {provider.bio ? <p className="body-text">{provider.bio}</p> : null}
        <ProviderFacts provider={provider} />
      </Card>

      <section className="section section--tight" aria-labelledby="reviews-heading">
        <h2 id="reviews-heading" className="section__title">
          {t('public.providerProfile.reviews')} {reviews.length > 0 ? <span className="count">{reviews.length}</span> : null}
        </h2>
        {reviews.length === 0 ? (
          <EmptyState
            title={t('public.providerProfile.noReviews')}
            message={t('public.providerProfile.noReviewsMessage')}
          />
        ) : (
          <div className="list">
            {reviews.map((review) => (
              <article key={review.id} className="card review-card">
                <div className="review-card__top">
                  <StarRating value={review.rating} readOnly />
                  <span className="review-card__meta">
                    {review.customer?.name || t('public.providerProfile.customerFallback')} · {formatTimestamp(review.createdAt)}
                  </span>
                </div>
                {review.comment ? <p className="review-card__comment">{review.comment}</p> : null}
              </article>
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}

export default ProviderProfilePage;
