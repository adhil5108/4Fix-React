import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import AppShell from '../../components/AppShell.jsx';
import { ReviewForm, StarRating } from '../../components/StarRating.jsx';
import {
  ButtonLink,
  Card,
  EmptyState,
  ErrorState,
  Link,
  LoadingState,
  Notice,
  PageHeader,
} from '../../components/ui.jsx';
import { useAction, useApi } from '../../hooks/useApi.js';
import { tokenForBooking } from '../../services/customerAccess.js';
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

  const back = { to: `/bookings/${bookingId}`, label: t('customer.shared.booking') };

  if (!hasAccess) {
    return (
      <AppShell width="narrow">
        <PageHeader title={t('customer.review.title')} back={{ to: '/requests', label: t('common.nav.myRequests') }} />
        <EmptyState title={t('customer.access.noAccessTitle')} message={t('customer.access.noAccessMessage')} />
      </AppShell>
    );
  }

  if (data.loading) {
    return (
      <AppShell width="narrow">
        <LoadingState label={t('common.states.loading')} />
      </AppShell>
    );
  }

  if (data.error && !data.data) {
    return (
      <AppShell width="narrow">
        <PageHeader title={t('customer.review.title')} back={back} />
        <ErrorState error={data.error} onRetry={data.reload} />
      </AppShell>
    );
  }

  const { booking, review } = data.data;

  async function handleSubmit(payload) {
    const ok = await submit.run('review', () => customerBookingsApi.createReview(bookingId, payload));

    if (ok) {
      setSubmitted(true);
      await data.refresh();
    }
  }

  if (review) {
    return (
      <AppShell width="narrow">
        <PageHeader back={back} title={t('customer.booking.yourReview')} subtitle={booking.service?.name} />
        {submitted ? <Notice tone="success">{t('customer.review.thanks')}</Notice> : null}
        <Card className="review-card">
          <div className="review-card__top">
            <StarRating value={review.rating} readOnly size="lg" />
            <span className="review-card__meta">{formatTimestamp(review.createdAt)}</span>
          </div>
          {review.comment ? <p className="review-card__comment">{review.comment}</p> : null}
          <p className="field-hint">{t('customer.review.noEdit')}</p>
        </Card>
        {booking.provider ? (
          <p className="page-footnote">
            <Link to={`/providers/${booking.provider.id}`} className="text-link">
              {t('customer.review.seeAll', { name: booking.provider.name })}
            </Link>
          </p>
        ) : null}
      </AppShell>
    );
  }

  if (booking.status !== 'COMPLETED') {
    return (
      <AppShell width="narrow">
        <PageHeader back={back} title={t('customer.review.rate')} />
        <Notice tone="info">{t('customer.review.notYet')}</Notice>
        <ButtonLink to={`/bookings/${bookingId}`} variant="secondary" block>
          {t('customer.review.backToBooking')}
        </ButtonLink>
      </AppShell>
    );
  }

  return (
    <AppShell width="narrow">
      <PageHeader back={back} title={t('customer.review.rate')} subtitle={booking.service?.name} />
      <Card>
        <ReviewForm
          providerName={booking.provider?.name}
          busy={submit.pending === 'review'}
          error={submit.error}
          onSubmit={handleSubmit}
        />
      </Card>
    </AppShell>
  );
}

export default ReviewPage;
