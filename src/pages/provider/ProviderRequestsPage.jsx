import AppShell from '../../components/AppShell.jsx';
import { RequestCard } from '../../components/cards.jsx';
import { EmptyState, ErrorState, LoadingState, Notice, PageHeader } from '../../components/ui.jsx';
import { useApi } from '../../hooks/useApi.js';
import { navigate, useQueryParam } from '../../hooks/useRoute.js';
import { providerApi } from '../../services/fixApi.js';
import { useProviderJobs } from './useProviderJobs.js';

const TABS = [
  { key: 'PENDING', label: 'New', path: '/provider/requests' },
  { key: 'QUOTE_RECEIVED', label: 'Has quotes', path: '/provider/requests?status=QUOTE_RECEIVED' },
  { key: 'jobs', label: 'My jobs', path: '/provider/requests?tab=jobs' },
];

function RequestList({ requests }) {
  return (
    <div className="list">
      {requests.map((request) => (
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

  return <RequestList requests={list} />;
}

function MyJobs() {
  const jobs = useProviderJobs();

  if (jobs.loading) return <LoadingState label="Loading your jobs…" />;
  if (jobs.error) return <ErrorState error={jobs.error} onRetry={jobs.reload} />;

  const { active, awaiting, completed, partial } = jobs.data;

  if (active.length + awaiting.length + completed.length === 0) {
    return (
      <EmptyState
        title="No jobs yet"
        message="Requests you quote on from this device will appear here."
      />
    );
  }

  return (
    <div className="stack">
      {partial ? <Notice tone="info">Some jobs couldn’t be loaded right now.</Notice> : null}
      {active.length ? (
        <section className="section section--tight">
          <h2 className="section__title">Active</h2>
          <RequestList requests={active} />
        </section>
      ) : null}
      {awaiting.length ? (
        <section className="section section--tight">
          <h2 className="section__title">Waiting for the customer</h2>
          <RequestList requests={awaiting} />
        </section>
      ) : null}
      {completed.length ? (
        <section className="section section--tight">
          <h2 className="section__title">Completed</h2>
          <RequestList requests={completed} />
        </section>
      ) : null}
    </div>
  );
}

function ProviderRequestsPage() {
  const tabParam = useQueryParam('tab');
  const statusParam = (useQueryParam('status') || '').toUpperCase();
  const activeTab =
    tabParam === 'jobs' ? 'jobs' : statusParam === 'QUOTE_RECEIVED' ? 'QUOTE_RECEIVED' : 'PENDING';

  return (
    <AppShell>
      <PageHeader
        title="Requests"
        subtitle="Open customer requests you can quote on, and the jobs you’ve won."
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

      {activeTab === 'jobs' ? <MyJobs /> : <OpenRequests key={activeTab} status={activeTab} />}
    </AppShell>
  );
}

export default ProviderRequestsPage;
