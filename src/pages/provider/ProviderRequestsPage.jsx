import AppShell from '../../components/AppShell.jsx';
import { RequestCard } from '../../components/cards.jsx';
import { EmptyState, ErrorState, Link, LoadingState, PageHeader } from '../../components/ui.jsx';
import { useApi } from '../../hooks/useApi.js';
import { navigate, useQueryParam } from '../../hooks/useRoute.js';
import { providerApi } from '../../services/fixApi.js';

const TABS = [
  { key: 'PENDING', label: 'New', path: '/provider/requests' },
  { key: 'QUOTE_RECEIVED', label: 'Has quotes', path: '/provider/requests?status=QUOTE_RECEIVED' },
];

function OpenRequests({ status }) {
  const requests = useApi(() => providerApi.listRequests(status), [status]);
  const list = requests.data?.requests || [];

  if (requests.loading) return <LoadingState label="Loading requests…" />;
  if (requests.error) return <ErrorState error={requests.error} onRetry={requests.reload} />;

  if (list.length === 0) {
    return (
      <EmptyState
        title={status === 'PENDING' ? 'No new requests' : 'No open requests with quotes'}
        message="Check back soon — new customer requests appear here."
      />
    );
  }

  return (
    <div className="list">
      {list.map((request) => (
        <RequestCard
          key={request.id}
          request={request}
          audience="provider"
          to={`/provider/requests/${request.id}`}
        />
      ))}
    </div>
  );
}

function ProviderRequestsPage() {
  const statusParam = (useQueryParam('status') || '').toUpperCase();
  const activeTab = statusParam === 'QUOTE_RECEIVED' ? 'QUOTE_RECEIVED' : 'PENDING';

  return (
    <AppShell>
      <PageHeader
        title="Requests"
        subtitle="Open customer requests you can quote on."
        actions={
          <Link to="/provider/jobs" className="text-link hide-mobile">
            My jobs →
          </Link>
        }
      />

      <div className="tabs" role="tablist" aria-label="Requests">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.key}
            className={`tab${activeTab === tab.key ? ' is-active' : ''}`}
            onClick={() => navigate(tab.path, { replace: true })}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <OpenRequests key={activeTab} status={activeTab} />
    </AppShell>
  );
}

export default ProviderRequestsPage;
