import AppShell from '../../components/AppShell.jsx';
import { BookingCard } from '../../components/cards.jsx';
import {
  ButtonLink,
  EmptyState,
  ErrorState,
  Link,
  LoadingState,
  PageHeader,
} from '../../components/ui.jsx';
import { useApi } from '../../hooks/useApi.js';
import { navigate, useQueryParam } from '../../hooks/useRoute.js';
import { bookingsApi } from '../../services/fixApi.js';
import { BOOKING_GROUPS } from '../../utils/format.js';

const TABS = [
  { value: 'UPCOMING', label: 'Upcoming' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const EMPTY = {
  UPCOMING: ['No upcoming bookings', 'Book a service and it will show up here once confirmed.'],
  ACTIVE: ['Nothing in progress', 'Bookings appear here while the technician is on the way or working.'],
  COMPLETED: ['No completed bookings yet', 'Finished jobs are kept here so you can pay and review them.'],
  CANCELLED: ['No cancelled bookings', ''],
};

function BookingsPage() {
  const requested = (useQueryParam('status') || '').toUpperCase();
  const status = BOOKING_GROUPS.includes(requested) ? requested : 'UPCOMING';
  const bookings = useApi(() => bookingsApi.list({ status }), [status]);
  const list = bookings.data?.bookings || [];

  return (
    <AppShell>
      <PageHeader
        title="My bookings"
        subtitle="Upcoming visits, jobs in progress and your history."
        actions={
          <ButtonLink to="/services" size="sm" className="hide-mobile">
            Book a service
          </ButtonLink>
        }
      />

      <div className="tabs" role="tablist" aria-label="Bookings">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={status === tab.value}
            className={`tab${status === tab.value ? ' is-active' : ''}`}
            onClick={() => navigate(`/bookings?status=${tab.value}`, { replace: true })}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {bookings.loading ? <LoadingState label="Loading bookings…" /> : null}
      {bookings.error ? <ErrorState error={bookings.error} onRetry={bookings.reload} /> : null}
      {!bookings.loading && !bookings.error && list.length === 0 ? (
        <EmptyState
          title={EMPTY[status][0]}
          message={EMPTY[status][1] || undefined}
          action={status === 'UPCOMING' ? <ButtonLink to="/services">Book a service</ButtonLink> : null}
        />
      ) : null}
      {!bookings.loading && !bookings.error && list.length > 0 ? (
        <div className="list">
          {list.map((booking) => (
            <BookingCard key={booking.id} booking={booking} to={`/bookings/${booking.id}`} />
          ))}
        </div>
      ) : null}

      <p className="page-footnote">
        Waiting for a provider to accept?{' '}
        <Link to="/requests" className="text-link">
          View open requests
        </Link>
      </p>
    </AppShell>
  );
}

export default BookingsPage;
