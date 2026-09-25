import AppShell from '../../components/AppShell.jsx';
import TrackingTimeline from '../../components/TrackingTimeline.jsx';
import { AddressBlock, ServiceLocationBlock, Avatar, RatingSummary } from '../../components/cards.jsx';
import {
  ButtonLink,
  Card,
  DetailList,
  ErrorState,
  Link,
  LoadingState,
  Notice,
  PageHeader,
  StatusBadge,
} from '../../components/ui.jsx';
import { useApi } from '../../hooks/useApi.js';
import { usePolling } from '../../hooks/usePolling.js';
import { bookingsApi, providersApi } from '../../services/fixApi.js';
import { formatSlot } from '../../utils/format.js';

const LIVE = ['CONFIRMED', 'ASSIGNED', 'ON_THE_WAY', 'ARRIVED', 'IN_SERVICE'];

function nextStep(booking) {
  switch (booking.status) {
    case 'CONFIRMED':
    case 'ASSIGNED':
      return booking.scheduledDate
        ? `Your technician is booked for ${formatSlot(booking.scheduledDate, booking.scheduledTime)}.`
        : 'Your provider accepted the job and will confirm the visit date and time shortly.';
    case 'ON_THE_WAY':
      return 'Your technician is on the way. Keep your arrival code handy.';
    case 'ARRIVED':
      return 'Your technician has arrived. Share the arrival code to start.';
    case 'IN_SERVICE':
      return 'The service is in progress.';
    case 'COMPLETED':
      return 'Service completed. Rate your experience to help other customers.';
    case 'CANCELLED':
      return 'This booking was cancelled.';
    default:
      return '';
  }
}

// Fetch-if-exists helpers: 404 simply means "not there yet".
async function optional(promise) {
  try {
    return await promise;
  } catch (error) {
    if (error.status === 404) return null;
    throw error;
  }
}

function BookingPage({ bookingId }) {
  const data = useApi(async () => {
    const { booking } = await bookingsApi.get(bookingId);
    const [provider, review] = await Promise.all([
      booking.providerId ? optional(providersApi.get(booking.providerId)) : null,
      booking.status === 'COMPLETED' ? optional(bookingsApi.review(bookingId)) : null,
    ]);
    return {
      booking,
      provider: provider?.provider || booking.provider,
      review: review?.review || null,
    };
  }, [bookingId]);

  const booking = data.data?.booking;
  usePolling(() => data.refresh(), 20000, Boolean(booking) && LIVE.includes(booking.status));

  const back = { to: '/bookings', label: 'My bookings' };

  if (data.loading) {
    return (
      <AppShell>
        <LoadingState label="Loading booking…" />
      </AppShell>
    );
  }

  if (data.error && !data.data) {
    return (
      <AppShell>
        <PageHeader title="Booking" back={back} />
        <ErrorState
          error={data.error.status === 400 ? { status: 404, message: 'This booking could not be found.' } : data.error}
          onRetry={data.reload}
        />
      </AppShell>
    );
  }

  const { provider, review } = data.data;
  const isCompleted = booking.status === 'COMPLETED';
  const isLive = LIVE.includes(booking.status);

  return (
    <AppShell>
      <PageHeader
        back={back}
        title={booking.service?.name || 'Booking'}
        subtitle={booking.request?.issueLabel}
        actions={<StatusBadge status={booking.status} audience="booking" />}
      />

      <div className="stack">
        {data.error ? <Notice>{data.error.message}</Notice> : null}
      </div>

      <div className="detail-layout">
        <div className="detail-layout__main">
          <Card className={isLive ? 'card--accent' : ''}>
            <h2 className="card__title">{nextStep(booking)}</h2>
            <TrackingTimeline status={booking.status} timeline={booking.timeline} compact />
            <div className="action-grid">
              {isLive ? (
                <ButtonLink to={`/bookings/${booking.id}/tracking`}>Track technician</ButtonLink>
              ) : null}
              {booking.status !== 'CANCELLED' ? (
                <ButtonLink to={`/bookings/${booking.id}/chat`} variant={isLive ? 'secondary' : 'primary'}>
                  Chat with {provider?.name ? provider.name.split(' ')[0] : 'technician'}
                </ButtonLink>
              ) : null}
              {isCompleted ? (
                <ButtonLink to={`/bookings/${booking.id}/review`} variant={review ? 'secondary' : 'primary'}>
                  {review ? 'Your review' : 'Rate your experience'}
                </ButtonLink>
              ) : null}
            </div>
          </Card>

          {isLive && booking.arrivalCode ? (
            <Card className="arrival-card">
              <p className="arrival-card__label">Arrival code</p>
              <p className="arrival-card__code" aria-label={`Arrival code ${booking.arrivalCode.split('').join(' ')}`}>
                {booking.arrivalCode}
              </p>
              <p className="field-hint">Share this with your technician only when they arrive.</p>
            </Card>
          ) : null}

          {provider ? (
            <Card>
              <h2 className="card__title">Your technician</h2>
              <div className="provider-card__head">
                <Avatar name={provider.name} image={provider.profileImage} />
                <div className="provider-card__identity">
                  <Link to={`/providers/${provider.id}`} className="provider-card__name">
                    {provider.name}
                  </Link>
                  {'rating' in provider ? (
                    <RatingSummary rating={provider.rating} reviewCount={provider.reviewCount} />
                  ) : null}
                </div>
              </div>
            </Card>
          ) : null}
        </div>

        <aside className="detail-layout__side">
          <Card>
            <h2 className="card__title">Booking details</h2>
            <DetailList
              items={[
                { label: 'Service', value: booking.service?.name },
                { label: 'Issue', value: booking.request?.issueLabel },
                {
                  label: 'Scheduled visit',
                  value: booking.scheduledDate
                    ? formatSlot(booking.scheduledDate, booking.scheduledTime)
                    : 'Provider will confirm',
                },
                { label: 'Details', value: booking.request?.description },
              ]}
            />
            <h3 className="card__subtitle">Service location</h3>
            <AddressBlock address={booking.request?.address} />
            <ServiceLocationBlock location={booking.request?.location} fallback={null} />
            <p className="card__links">
              <Link to={`/requests/${booking.requestId}`} className="text-link">
                View original request
              </Link>
            </p>
          </Card>
        </aside>
      </div>
    </AppShell>
  );
}

export default BookingPage;
