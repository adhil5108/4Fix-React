import { useTranslation } from 'react-i18next';
import AppShell from '../../components/AppShell.jsx';
import TrackingTimeline from '../../components/TrackingTimeline.jsx';
import { AddressBlock, ServiceLocationBlock, Avatar, RatingSummary } from '../../components/cards.jsx';
import {
  ButtonLink,
  Card,
  DetailList,
  EmptyState,
  ErrorState,
  Link,
  LoadingState,
  Notice,
  PageHeader,
  StatusBadge,
} from '../../components/ui.jsx';
import { useApi } from '../../hooks/useApi.js';
import { usePolling } from '../../hooks/usePolling.js';
import { tokenForBooking } from '../../services/customerAccess.js';
import { customerBookingsApi, providersApi } from '../../services/fixApi.js';
import { formatIssueLabel } from '../../utils/format.js';

const LIVE = ['ASSIGNED', 'IN_PROGRESS'];

function nextStep(booking, t) {
  return ['ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].includes(booking.status)
    ? t(`customer.booking.next.${booking.status}`)
    : '';
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

// The customer's job page, reached with the request token saved in this browser.
function BookingPage({ bookingId }) {
  const { t } = useTranslation();
  const hasAccess = Boolean(tokenForBooking(bookingId));
  const data = useApi(async () => {
    if (!hasAccess) return null;
    const { booking } = await customerBookingsApi.get(bookingId);
    const [provider, review] = await Promise.all([
      booking.providerId ? optional(providersApi.get(booking.providerId)) : null,
      booking.status === 'COMPLETED' ? optional(customerBookingsApi.review(bookingId)) : null,
    ]);
    return {
      booking,
      provider: provider?.provider || booking.provider,
      review: review?.review || null,
    };
  }, [bookingId]);

  const booking = data.data?.booking;
  usePolling(() => data.refresh(), 20000, Boolean(booking) && LIVE.includes(booking.status));

  const back = { to: '/requests', label: t('common.nav.myRequests') };

  if (!hasAccess) {
    return (
      <AppShell>
        <PageHeader title={t('customer.shared.booking')} back={back} />
        <EmptyState title={t('customer.access.noAccessTitle')} message={t('customer.access.noAccessMessage')} />
      </AppShell>
    );
  }

  if (data.loading) {
    return (
      <AppShell>
        <LoadingState label={t('customer.booking.loading')} />
      </AppShell>
    );
  }

  if (data.error && !data.data) {
    return (
      <AppShell>
        <PageHeader title={t('customer.shared.booking')} back={back} />
        <ErrorState
          error={data.error.status === 400 ? { status: 404, message: t('customer.booking.notFound') } : data.error}
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
        title={booking.service?.name || t('customer.shared.booking')}
        subtitle={formatIssueLabel(booking.request?.issueKey, booking.request?.issueLabel)}
        actions={<StatusBadge status={booking.status} audience="booking" />}
      />

      <div className="stack">
        {data.error ? <Notice>{data.error.message}</Notice> : null}
      </div>

      <div className="detail-layout">
        <div className="detail-layout__main">
          <Card className={isLive ? 'card--accent' : ''}>
            <h2 className="card__title">{nextStep(booking, t)}</h2>
            <TrackingTimeline status={booking.status} timeline={booking.timeline} compact />
            <div className="action-grid">
              {booking.status !== 'CANCELLED' ? (
                <ButtonLink to={`/bookings/${booking.id}/chat`} variant={isCompleted ? 'secondary' : 'primary'}>
                  {t('customer.booking.chatWith', {
                    name: provider?.name ? provider.name.split(' ')[0] : t('customer.shared.technician'),
                  })}
                </ButtonLink>
              ) : null}
              {isCompleted ? (
                <ButtonLink to={`/bookings/${booking.id}/review`} variant={review ? 'secondary' : 'primary'}>
                  {review ? t('customer.booking.yourReview') : t('customer.booking.rate')}
                </ButtonLink>
              ) : null}
            </div>
          </Card>

          {provider ? (
            <Card>
              <h2 className="card__title">{t('customer.shared.yourTechnician')}</h2>
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
            <h2 className="card__title">{t('customer.booking.detailsTitle')}</h2>
            <DetailList
              items={[
                { label: t('customer.shared.service'), value: booking.service?.name },
                { label: t('customer.shared.issue'), value: formatIssueLabel(booking.request?.issueKey, booking.request?.issueLabel) },
                { label: t('customer.shared.details'), value: booking.request?.description },
              ]}
            />
            <h3 className="card__subtitle">{t('customer.shared.serviceLocation')}</h3>
            <AddressBlock address={booking.request?.address} />
            <ServiceLocationBlock location={booking.request?.location} fallback={null} />
            <p className="card__links">
              <Link to={`/requests/${booking.requestId}`} className="text-link">
                {t('customer.booking.viewRequest')}
              </Link>
            </p>
          </Card>
        </aside>
      </div>
    </AppShell>
  );
}

export default BookingPage;
