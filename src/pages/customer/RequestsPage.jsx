import AppShell from '../../components/AppShell.jsx';
import { RequestCard } from '../../components/cards.jsx';
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
import { requestsApi } from '../../services/fixApi.js';
import { REQUEST_STATUSES, statusLabel } from '../../utils/format.js';

// Requests that have not become bookings yet (waiting for quotes / a provider choice).
function RequestsPage() {
  const rawStatus = (useQueryParam('status') || '').toUpperCase();
  const status = REQUEST_STATUSES.includes(rawStatus) ? rawStatus : '';
  const requests = useApi(() => requestsApi.list(status || undefined), [status]);
  const list = requests.data?.requests || [];

  function selectStatus(nextStatus) {
    navigate(nextStatus ? `/requests?status=${nextStatus}` : '/requests', { replace: true });
  }

  return (
    <AppShell>
      <PageHeader
        title="My requests"
        subtitle="Everything you’ve asked for, including requests still waiting for quotes."
        actions={
          <ButtonLink to="/services" size="sm" className="hide-mobile">
            Book a service
          </ButtonLink>
        }
      />

      <div className="chip-row chip-row--scroll" role="group" aria-label="Filter by status">
        <button
          type="button"
          className={`chip${!status ? ' is-active' : ''}`}
          aria-pressed={!status}
          onClick={() => selectStatus('')}
        >
          All
        </button>
        {REQUEST_STATUSES.map((item) => (
          <button
            key={item}
            type="button"
            className={`chip${status === item ? ' is-active' : ''}`}
            aria-pressed={status === item}
            onClick={() => selectStatus(item)}
          >
            {statusLabel(item)}
          </button>
        ))}
      </div>

      {requests.loading ? <LoadingState label="Loading your requests…" /> : null}
      {requests.error ? <ErrorState error={requests.error} onRetry={requests.reload} /> : null}
      {!requests.loading && !requests.error && list.length === 0 ? (
        status ? (
          <EmptyState
            title={`No requests with status “${statusLabel(status)}”`}
            action={
              <button type="button" className="text-link" onClick={() => selectStatus('')}>
                Show all requests
              </button>
            }
          />
        ) : (
          <EmptyState
            title="No requests yet"
            message="Book a service and providers will send you quotes."
            action={<ButtonLink to="/services">Book a service</ButtonLink>}
          />
        )
      ) : null}
      {!requests.loading && !requests.error && list.length > 0 ? (
        <div className="list">
          {list.map((request) => (
            <RequestCard key={request.id} request={request} to={`/requests/${request.id}`} />
          ))}
        </div>
      ) : null}

      <p className="page-footnote">
        Confirmed bookings live in{' '}
        <Link to="/bookings" className="text-link">
          My bookings
        </Link>
      </p>
    </AppShell>
  );
}

export default RequestsPage;
