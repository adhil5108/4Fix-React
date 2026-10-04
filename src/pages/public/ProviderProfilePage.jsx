import { useTranslation } from 'react-i18next';
import { Star } from 'lucide-react';
import AppShell from '../../components/AppShell.jsx';
import { StarRating } from '../../components/StarRating.jsx';
import { Avatar, ProviderFacts, RatingSummary } from '../../components/cards.jsx';
import { Card, EmptyState, ErrorState, LoadingState, SectionHeader } from '../../components/ui.jsx';
import { useApi } from '../../hooks/useApi.js';
import { useAuth } from '../../hooks/useAuth.jsx';
import { providersApi } from '../../services/fixApi.js';
import { formatTimestamp } from '../../utils/format.js';

function ProviderProfilePage({ providerId }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const data = useApi(async () => {
    const [profile, reviews] = await Promise.all([
      providersApi.get(providerId),
      providersApi.reviews(providerId),
    ]);
    return { provider: profile.provider, reviews: reviews.reviews, summary: reviews.summary };
  }, [providerId]);

  // Reached from a job, a review or the provider's own profile: go back where they came from.
  const back = {
    to: user?.role === 'PROVIDER' ? '/provider/profile' : '/requests',
    label: t('public.back'),
    history: true,
  };

  if (data.loading) {
    return (
      <AppShell title="" back={back}>
        <LoadingState label={t('public.providerProfile.loading')} />
      </AppShell>
    );
  }

  if (data.error) {
    return (
      <AppShell title={t('public.providerProfile.fallbackTitle')} back={back}>
        <ErrorState
          error={data.error.status === 400 ? { status: 404, message: t('public.providerProfile.notFound') } : data.error}
          onRetry={data.reload}
        />
      </AppShell>
    );
  }

  const { provider, reviews } = data.data;

  return (
    <AppShell title={provider.name} back={back}>
      <Card className="profile-summary">
        <Avatar name={provider.name} image={provider.profileImage} size="lg" />
        <h2 className="profile-summary__name">{provider.name}</h2>
        <RatingSummary rating={provider.rating} reviewCount={provider.reviewCount} />
        <span className={`badge ${provider.isAvailable ? 'badge--done' : 'badge--muted'}`}>
          {provider.isAvailable ? t('public.providerProfile.accepting') : t('public.providerProfile.notAccepting')}
        </span>
        {provider.bio ? <p className="body-text profile-summary__bio">{provider.bio}</p> : null}
        <ProviderFacts provider={provider} />
      </Card>

      <section className="section" aria-labelledby="reviews-heading">
        <SectionHeader id="reviews-heading" title={t('public.providerProfile.reviews')} count={reviews.length || null} />
        {reviews.length === 0 ? (
          <EmptyState icon={Star} title={t('public.providerProfile.noReviews')} message={t('public.providerProfile.noReviewsMessage')} />
        ) : (
          <div className="stack">
            {reviews.map((review) => (
              <article key={review.id} className="card review-item">
                <div className="review-item__top">
                  <StarRating value={review.rating} readOnly />
                  <span className="field-hint">
                    {review.customer?.name || t('public.providerProfile.customerFallback')} · {formatTimestamp(review.createdAt)}
                  </span>
                </div>
                {review.comment ? <p className="body-text">{review.comment}</p> : null}
              </article>
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}

export default ProviderProfilePage;
