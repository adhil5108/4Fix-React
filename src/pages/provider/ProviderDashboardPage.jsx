import AppShell from '../../components/AppShell.jsx';
import { RequestCard } from '../../components/cards.jsx';
import {
  ButtonLink,
  EmptyState,
  ErrorState,
  Link,
  LoadingState,
  Notice,
  PageHeader,
} from '../../components/ui.jsx';
import { useApi } from '../../hooks/useApi.js';
import { useAuth } from '../../hooks/useAuth.jsx';
import { providerApi } from '../../services/fixApi.js';
import { useProviderJobs } from './useProviderJobs.js';

function StatTile({ label, value, to }) {
  return (
    <Link to={to} className="card card--link stat">
      <span className="stat__value">{value ?? '–'}</span>
      <span className="stat__label">{label}</span>
    </Link>
  );
}

function RequestSection({ title, requests, emptyTitle, emptyMessage, action }) {
  return (
    <section className="section section--tight">
      <div className="section__header">
        <h2 className="section__title">{title}</h2>
        {action}
      </div>
      {requests.length === 0 ? (
        <EmptyState title={emptyTitle} message={emptyMessage} />
      ) : (
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
      )}
    </section>
  );
}

function ProviderDashboardPage() {
  const { user } = useAuth();
  const open = useApi(async () => {
    const [pending, quoted] = await Promise.all([
      providerApi.listRequests('PENDING'),
      providerApi.listRequests('QUOTE_RECEIVED'),
    ]);
    return { pending: pending.requests, quoted: quoted.requests };
  }, []);
  const jobs = useProviderJobs();

  const loading = open.loading || jobs.loading;

  return (
    <AppShell>
      <PageHeader
        title={`Hi ${user.name.split(' ')[0]}`}
        subtitle="Find new work and keep your jobs moving."
        actions={
          <ButtonLink to="/provider/requests" size="sm" className="hide-mobile">
            Browse requests
          </ButtonLink>
        }
      />

      {loading ? <LoadingState label="Loading your dashboard…" /> : null}

      {!loading && open.error && jobs.error ? (
        <ErrorState
          error={open.error}
          onRetry={() => {
            open.reload();
            jobs.reload();
          }}
        />
      ) : null}

      {!loading && !(open.error && jobs.error) ? (
        <>
          <div className="stat-grid">
            <StatTile label="New requests" value={open.data?.pending.length} to="/provider/requests" />
            <StatTile
              label="Open with quotes"
              value={open.data?.quoted.length}
              to="/provider/requests?status=QUOTE_RECEIVED"
            />
            <StatTile label="Active jobs" value={jobs.data?.active.length} to="/provider/requests?tab=jobs" />
            <StatTile label="Completed" value={jobs.data?.completed.length} to="/provider/requests?tab=jobs" />
          </div>

          {jobs.error ? <Notice>{`Couldn’t load your jobs: ${jobs.error.message}`}</Notice> : null}
          {jobs.data?.partial ? (
            <Notice tone="info">Some of your jobs couldn’t be loaded. Try again in a moment.</Notice>
          ) : null}

          {jobs.data ? (
            <RequestSection
              title="Active jobs"
              requests={jobs.data.active}
              emptyTitle="No active jobs"
              emptyMessage="Jobs appear here when a customer accepts your quote."
            />
          ) : null}

          {jobs.data?.awaiting.length ? (
            <RequestSection
              title="Waiting for the customer"
              requests={jobs.data.awaiting}
              emptyTitle=""
            />
          ) : null}

          {open.error ? (
            <ErrorState error={open.error} onRetry={open.reload} />
          ) : (
            <RequestSection
              title="Latest requests"
              requests={open.data.pending.slice(0, 5)}
              emptyTitle="No new requests right now"
              emptyMessage="New customer requests will show up here."
              action={
                <Link to="/provider/requests" className="text-link">
                  See all
                </Link>
              }
            />
          )}
        </>
      ) : null}
    </AppShell>
  );
}

export default ProviderDashboardPage;
