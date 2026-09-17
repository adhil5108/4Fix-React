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
        subtitle="Track quotes and bookings for the issues you reported."
        actions={
          <ButtonLink to="/report" size="sm" className="hide-mobile">
            Report an issue
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
            message="Report an issue and service providers will send you quotes."
            action={<ButtonLink to="/report">Report an issue</ButtonLink>}
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
        Looking for finished jobs?{' '}
        <Link to="/history" className="text-link">
          View history
        </Link>
      </p>
    </AppShell>
  );
}

export default RequestsPage;
