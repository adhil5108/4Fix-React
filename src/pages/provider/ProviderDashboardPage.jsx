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
import { firstName } from '../../utils/format.js';
import { JobCard, splitJobs } from './ProviderJobsPage.jsx';

function StatTile({ label, value, to }) {
  return (
    <Link to={to} className="card card--link stat">
      <span className="stat__value">{value ?? '–'}</span>
      <span className="stat__label">{label}</span>
    </Link>
  );
}

function ProviderDashboardPage() {
  const { user } = useAuth();
  const open = useApi(async () => ({ pending: (await providerApi.listRequests()).requests }), []);
  const jobs = useApi(() => providerApi.jobs(), []);

  const loading = open.loading || jobs.loading;
  const grouped = jobs.data ? splitJobs(jobs.data.jobs) : null;

  return (
    <AppShell>
      <PageHeader
        title={`Hi ${firstName(user.name)}`}
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
            <StatTile label="Available requests" value={open.data?.pending.length} to="/provider/requests" />
            <StatTile label="Active jobs" value={grouped?.active.length} to="/provider/jobs" />
            <StatTile label="Completed" value={grouped?.completed.length} to="/provider/jobs?tab=completed" />
          </div>

          {jobs.error ? <Notice>{`Couldn’t load your jobs: ${jobs.error.message}`}</Notice> : null}

          {grouped ? (
            <section className="section section--tight">
              <div className="section__header">
                <h2 className="section__title">Active jobs</h2>
                <Link to="/provider/jobs" className="text-link">
                  All jobs
                </Link>
              </div>
              {grouped.active.length === 0 ? (
                <EmptyState
                  title="No active jobs"
                  message="Jobs appear here when you accept a request."
                />
              ) : (
                <div className="list">
                  {grouped.active.slice(0, 5).map((job) => (
                    <JobCard key={job.id} job={job} />
                  ))}
                </div>
              )}
            </section>
          ) : null}

          {open.error ? (
            <ErrorState error={open.error} onRetry={open.reload} />
          ) : (
            <section className="section section--tight">
              <div className="section__header">
                <h2 className="section__title">Latest requests</h2>
                <Link to="/provider/requests" className="text-link">
                  See all
                </Link>
              </div>
              {open.data.pending.length === 0 ? (
                <EmptyState
                  title="No new requests right now"
                  message="New customer requests will show up here."
                />
              ) : (
                <div className="list">
                  {open.data.pending.slice(0, 5).map((request) => (
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
          )}
        </>
      ) : null}
    </AppShell>
  );
}

export default ProviderDashboardPage;
