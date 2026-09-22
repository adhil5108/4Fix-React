import AppShell from '../../components/AppShell.jsx';
import { StarRating } from '../../components/StarRating.jsx';
import { Avatar, ProviderFacts, RatingSummary } from '../../components/cards.jsx';
import { Card, EmptyState, ErrorState, LoadingState, PageHeader } from '../../components/ui.jsx';
import { useApi } from '../../hooks/useApi.js';
import { providersApi } from '../../services/fixApi.js';
import { formatTimestamp } from '../../utils/format.js';

function ProviderProfilePage({ providerId }) {
  const data = useApi(async () => {
    const [profile, reviews] = await Promise.all([
      providersApi.get(providerId),
      providersApi.reviews(providerId),
    ]);
    return { provider: profile.provider, reviews: reviews.reviews, summary: reviews.summary };
  }, [providerId]);

  const back = { to: '/services', label: 'Back' };

  if (data.loading) {
    return (
      <AppShell width="narrow">
        <LoadingState label="Loading provider…" />
      </AppShell>
    );
  }

  if (data.error) {
    return (
      <AppShell width="narrow">
        <PageHeader title="Provider" back={back} />
        <ErrorState
          error={
            data.error.status === 400
              ? { status: 404, message: 'This provider could not be found.' }
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
              {provider.isAvailable ? 'Accepting bookings' : 'Not accepting bookings right now'}
            </p>
          </div>
        </div>
        {provider.bio ? <p className="body-text">{provider.bio}</p> : null}
        <ProviderFacts provider={provider} />
      </Card>

      <section className="section section--tight" aria-labelledby="reviews-heading">
        <h2 id="reviews-heading" className="section__title">
          Reviews {reviews.length > 0 ? <span className="count">{reviews.length}</span> : null}
        </h2>
        {reviews.length === 0 ? (
          <EmptyState title="No reviews yet" message="Reviews appear here after completed bookings." />
        ) : (
          <div className="list">
            {reviews.map((review) => (
              <article key={review.id} className="card review-card">
                <div className="review-card__top">
                  <StarRating value={review.rating} readOnly />
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
    </AppShell>
  );
}

export default ProviderProfilePage;
