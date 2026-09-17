import AppShell from '../../components/AppShell.jsx';
import { RequestCard } from '../../components/cards.jsx';
import { EmptyState, ErrorState, LoadingState, PageHeader } from '../../components/ui.jsx';
import { useApi } from '../../hooks/useApi.js';
import { navigate, useQueryParam } from '../../hooks/useRoute.js';
import { requestsApi } from '../../services/fixApi.js';

const TABS = [
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

function HistoryPage() {
  const requestedTab = (useQueryParam('status') || '').toUpperCase();
  const status = TABS.some((tab) => tab.value === requestedTab) ? requestedTab : 'COMPLETED';
  const requests = useApi(() => requestsApi.list(status), [status]);
  const list = requests.data?.requests || [];

  return (
    <AppShell>
      <PageHeader title="History" subtitle="Your finished and cancelled requests." />

      <div className="tabs" role="tablist" aria-label="History">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={status === tab.value}
            className={`tab${status === tab.value ? ' is-active' : ''}`}
            onClick={() => navigate(`/history?status=${tab.value}`, { replace: true })}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {requests.loading ? <LoadingState label="Loading history…" /> : null}
      {requests.error ? <ErrorState error={requests.error} onRetry={requests.reload} /> : null}
      {!requests.loading && !requests.error && list.length === 0 ? (
        <EmptyState
          title={status === 'COMPLETED' ? 'No completed jobs yet' : 'No cancelled requests'}
          message={
            status === 'COMPLETED'
              ? 'Jobs appear here once your provider marks them complete.'
              : undefined
          }
        />
      ) : null}
      {!requests.loading && !requests.error && list.length > 0 ? (
        <div className="list">
          {list.map((request) => (
            <RequestCard key={request.id} request={request} to={`/requests/${request.id}`} />
          ))}
        </div>
      ) : null}
    </AppShell>
  );
}

export default HistoryPage;
