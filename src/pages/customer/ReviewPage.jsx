import { useState } from 'react';
import AppShell from '../../components/AppShell.jsx';
import { ReviewForm, StarRating } from '../../components/StarRating.jsx';
import {
  ButtonLink,
  Card,
  ErrorState,
  Link,
  LoadingState,
  Notice,
  PageHeader,
} from '../../components/ui.jsx';
import { useAction, useApi } from '../../hooks/useApi.js';
import { bookingsApi } from '../../services/fixApi.js';
import { formatTimestamp } from '../../utils/format.js';

function ReviewPage({ bookingId }) {
  const data = useApi(async () => {
    const { booking } = await bookingsApi.get(bookingId);
    let review = null;

    try {
      review = (await bookingsApi.review(bookingId)).review;
    } catch (error) {
      if (error.status !== 404) throw error;
    }

    return { booking, review };
  }, [bookingId]);
  const submit = useAction();
  const [submitted, setSubmitted] = useState(false);

  const back = { to: `/bookings/${bookingId}`, label: 'Booking' };

  if (data.loading) {
    return (
      <AppShell width="narrow">
        <LoadingState label="Loading…" />
      </AppShell>
    );
  }

  if (data.error && !data.data) {
    return (
      <AppShell width="narrow">
        <PageHeader title="Review" back={back} />
        <ErrorState error={data.error} onRetry={data.reload} />
      </AppShell>
    );
  }

  const { booking, review } = data.data;

  async function handleSubmit(payload) {
    const ok = await submit.run('review', () => bookingsApi.createReview(bookingId, payload));

    if (ok) {
      setSubmitted(true);
      await data.refresh();
    }
  }

  if (review) {
    return (
      <AppShell width="narrow">
        <PageHeader back={back} title="Your review" subtitle={booking.service?.name} />
        {submitted ? <Notice tone="success">Thanks! Your review has been submitted.</Notice> : null}
        <Card className="review-card">
          <div className="review-card__top">
            <StarRating value={review.rating} readOnly size="lg" />
            <span className="review-card__meta">{formatTimestamp(review.createdAt)}</span>
          </div>
          {review.comment ? <p className="review-card__comment">{review.comment}</p> : null}
          <p className="field-hint">Reviews can’t be edited once submitted.</p>
        </Card>
        {booking.provider ? (
          <p className="page-footnote">
            <Link to={`/providers/${booking.provider.id}`} className="text-link">
              See all reviews for {booking.provider.name}
            </Link>
          </p>
        ) : null}
      </AppShell>
    );
  }

  if (booking.status !== 'COMPLETED') {
    return (
      <AppShell width="narrow">
        <PageHeader back={back} title="Rate your experience" />
        <Notice tone="info">You can leave a review once the service is completed.</Notice>
        <ButtonLink to={`/bookings/${bookingId}`} variant="secondary" block>
          Back to booking
        </ButtonLink>
      </AppShell>
    );
  }

  return (
    <AppShell width="narrow">
      <PageHeader back={back} title="Rate your experience" subtitle={booking.service?.name} />
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
