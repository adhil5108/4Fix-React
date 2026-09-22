import AppShell from '../../components/AppShell.jsx';
import TrackingTimeline from '../../components/TrackingTimeline.jsx';
import { Avatar } from '../../components/cards.jsx';
import {
  ButtonLink,
  Card,
  DetailList,
  ErrorState,
  LoadingState,
  PageHeader,
  StatusBadge,
} from '../../components/ui.jsx';
import { useApi } from '../../hooks/useApi.js';
import { usePolling } from '../../hooks/usePolling.js';
import { bookingsApi } from '../../services/fixApi.js';
import { formatDateTime, formatSlot } from '../../utils/format.js';

const TERMINAL = ['COMPLETED', 'CANCELLED'];

function TrackingPage({ bookingId }) {
  const data = useApi(() => bookingsApi.tracking(bookingId), [bookingId]);
  const tracking = data.data?.tracking;

  // Refresh every 10s while the booking is live; no push channel exists yet.
  usePolling(() => data.refresh(), 10000, Boolean(tracking) && !TERMINAL.includes(tracking.status));

  const back = { to: `/bookings/${bookingId}`, label: 'Booking' };

  if (data.loading) {
    return (
      <AppShell width="narrow">
        <LoadingState label="Loading tracking…" />
      </AppShell>
    );
  }

  if (data.error && !data.data) {
    return (
      <AppShell width="narrow">
        <PageHeader title="Track technician" back={back} />
        <ErrorState error={data.error} onRetry={data.reload} />
      </AppShell>
    );
  }

  const hasLocation = Boolean(tracking.lastLocation);

  return (
    <AppShell width="narrow">
      <PageHeader
        back={back}
        title="Track technician"
        subtitle={tracking.scheduledDate ? `Visit: ${formatSlot(tracking.scheduledDate, tracking.scheduledTime)}` : undefined}
        actions={<StatusBadge status={tracking.status} audience="booking" />}
      />

      <Card>
        <TrackingTimeline status={tracking.status} timeline={tracking.timeline} />
      </Card>

      <Card>
        <h2 className="card__title">Live location</h2>
        {hasLocation ? (
          <DetailList
            items={[
              {
                label: 'Last known position',
                value: `${tracking.lastLocation.latitude.toFixed(5)}, ${tracking.lastLocation.longitude.toFixed(5)}`,
              },
              { label: 'Updated', value: formatDateTime(tracking.lastLocation.updatedAt) },
              { label: 'ETA', value: tracking.eta ?? 'Not available yet' },
              { label: 'Distance', value: tracking.distance ?? 'Not available yet' },
            ]}
          />
        ) : (
          <p className="body-text">Live location will appear when available.</p>
        )}
        {!TERMINAL.includes(tracking.status) ? (
          <p className="field-hint">This page refreshes automatically.</p>
        ) : null}
      </Card>

      {tracking.provider ? (
        <Card>
          <div className="provider-card__head">
            <Avatar name={tracking.provider.name} image={tracking.provider.profileImage} />
            <div className="provider-card__identity">
              <span className="provider-card__name">{tracking.provider.name}</span>
              <span className="field-hint">Your technician</span>
            </div>
          </div>
          <div className="card__actions">
            <ButtonLink to={`/bookings/${bookingId}/chat`} variant="secondary">
              Chat
            </ButtonLink>
          </div>
        </Card>
      ) : null}
    </AppShell>
  );
}

export default TrackingPage;
