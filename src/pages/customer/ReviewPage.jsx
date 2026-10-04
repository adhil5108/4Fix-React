import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Smartphone } from 'lucide-react';
import AppShell from '../../components/AppShell.jsx';
import { ReviewForm, StarRating } from '../../components/StarRating.jsx';
import { Avatar } from '../../components/cards.jsx';
import { ButtonLink, Card, EmptyState, ErrorState, Link, LoadingState, Notice } from '../../components/ui.jsx';
import { useAction, useApi } from '../../hooks/useApi.js';
import { requestIdForBooking, tokenForBooking } from '../../services/customerAccess.js';
import { customerBookingsApi } from '../../services/fixApi.js';
import { formatTimestamp } from '../../utils/format.js';

// The customer reviews their own completed job; access comes from the request token
// saved in this browser (the backend refuses anyone else's).
function ReviewPage({ bookingId }) {
  const { t } = useTranslation();
  const hasAccess = Boolean(tokenForBooking(bookingId));
  const data = useApi(async () => {
    if (!hasAccess) return null;
    const { booking } = await customerBookingsApi.get(bookingId);
    let review = null;

    try {
      review = (await customerBookingsApi.review(bookingId)).review;
    } catch (error) {
      if (error.status !== 404) throw error;
    }

    return { booking, review };
  }, [bookingId]);
  const submit = useAction();
  const [submitted, setSubmitted] = useState(false);
  const requestId = requestIdForBooking(bookingId);
  const back = { to: requestId ? `/requests/${requestId}` : '/requests', label: t('customer.shared.job') };

  if (!hasAccess) {
    return (
      <AppShell title={t('customer.review.title')} back={{ to: '/requests', label: t('common.nav.myRequests') }}>
        <EmptyState icon={Smartphone} title={t('customer.access.noAccessTitle')} message={t('customer.access.noAccessMessage')} />
      </AppShell>
    );
  }

  if (data.loading) {
    return (
      <AppShell title={t('customer.review.rate')} back={back}>
        <LoadingState />
      </AppShell>
    );
  }

  if (data.error && !data.data) {
    return (
      <AppShell title={t('customer.review.title')} back={back}>
        <ErrorState error={data.error} onRetry={data.reload} />
      </AppShell>
    );
  }

  const { booking, review } = data.data;
  const provider = booking.provider;

  async function handleSubmit(payload) {
    const ok = await submit.run('review', () => customerBookingsApi.createReview(bookingId, payload));

    if (ok) {
      setSubmitted(true);
      await data.refresh();
    }
  }

  const reviewee = provider ? (
    <div className="review-head">
      <Avatar name={provider.name} image={provider.profileImage} size="lg" />
      <p className="review-head__name">{provider.name}</p>
      <p className="review-head__service">{booking.service?.name}</p>
    </div>
  ) : null;

  if (review) {
    return (
      <AppShell title={t('customer.booking.yourReview')} back={back}>
        <div className="stack stack--lg">
          {submitted ? <Notice tone="success">{t('customer.review.thanks')}</Notice> : null}
          <Card className="review-card">
            {reviewee}
            <div className="review-card__stars">
              <StarRating value={review.rating} readOnly size="lg" />
              <span className="field-hint">{formatTimestamp(review.createdAt)}</span>
            </div>
            {review.comment ? <p className="body-text">{review.comment}</p> : null}
            <p className="field-hint">{t('customer.review.noEdit')}</p>
          </Card>
          {provider ? (
            <Link to={`/providers/${provider.id}`} className="link page-note">
              {t('customer.review.seeAll', { name: provider.name })}
            </Link>
          ) : null}
        </div>
      </AppShell>
    );
  }

  if (booking.status !== 'COMPLETED') {
    return (
      <AppShell title={t('customer.review.rate')} back={back}>
        <div className="stack stack--lg">
          <Notice tone="info">{t('customer.review.notYet')}</Notice>
          <ButtonLink to={back.to} variant="secondary" block>
            {t('customer.review.backToBooking')}
          </ButtonLink>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title={t('customer.review.rate')} back={back}>
      <Card className="review-card">
        {reviewee}
        <ReviewForm
          providerName={provider?.name}
          busy={submit.pending === 'review'}
          error={submit.error}
          onSubmit={handleSubmit}
        />
      </Card>
    </AppShell>
  );
}

export default ReviewPage;
