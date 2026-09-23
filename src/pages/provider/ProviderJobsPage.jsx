import AppShell from '../../components/AppShell.jsx';
import {
  ButtonLink,
  EmptyState,
  ErrorState,
  Link,
  LoadingState,
  PageHeader,
  StatusBadge,
} from '../../components/ui.jsx';
import { useApi } from '../../hooks/useApi.js';
import { navigate, useQueryParam } from '../../hooks/useRoute.js';
import { providerApi } from '../../services/fixApi.js';
import { formatMoney, formatSlot } from '../../utils/format.js';

const TABS = [
  { key: 'active', label: 'Active' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
];

// The server is the source of truth for jobs: everything here comes from /api/provider/jobs.
export function splitJobs(jobs) {
  const isDone = (job) => job.status === 'COMPLETED' || job.bookingStatus === 'COMPLETED';
  const isCancelled = (job) => job.status === 'CANCELLED' || job.bookingStatus === 'CANCELLED';

  return {
    active: jobs.filter((job) => !isDone(job) && !isCancelled(job)),
    completed: jobs.filter(isDone),
    cancelled: jobs.filter((job) => isCancelled(job) && !isDone(job)),
  };
}

export function jobPath(job) {
  if (job.source === 'EXTERNAL') return `/provider/jobs/external/${job.id}`;
  return job.bookingId ? `/provider/jobs/${job.bookingId}` : `/provider/requests/${job.id}`;
}

export function JobCard({ job }) {
  const isExternal = job.source === 'EXTERNAL';
  const slot = job.scheduledDate
    ? `Scheduled: ${formatSlot(job.scheduledDate, job.scheduledTime)}`
    : isExternal
      ? 'Not scheduled'
      : `Preferred: ${formatSlot(job.preferredDate, job.preferredTime)}`;

  return (
    <Link to={jobPath(job)} className="card card--link request-card">
      <span className="request-card__top">
        <span className="request-card__service">
          {job.service?.name || job.serviceLabel || 'Job'}
          {job.issueLabel ? <span className="request-card__issue"> · {job.issueLabel}</span> : null}
        </span>
        <span className="job-card__badges">
          {isExternal ? <span className="badge badge--muted">External</span> : null}
          {isExternal ? (
            <StatusBadge status={job.status} audience="externalJob" />
          ) : job.bookingStatus ? (
            <StatusBadge status={job.bookingStatus} audience="booking" />
          ) : (
            <StatusBadge status={job.status} audience="provider" />
          )}
        </span>
      </span>
      <span className="request-card__description">{job.description}</span>
      <span className="request-card__meta">
        <span>{slot}</span>
        {job.address ? <span>{[job.address.city, job.address.pincode].filter(Boolean).join(' · ')}</span> : null}
        {job.amount !== null ? <span>{formatMoney(job.amount)}</span> : null}
        {!isExternal && !job.bookingId ? <span>Awaiting customer confirmation</span> : null}
      </span>
    </Link>
  );
}

function ProviderJobsPage() {
  const tabParam = useQueryParam('tab');
  const tab = TABS.some((item) => item.key === tabParam) ? tabParam : 'active';
  const jobs = useApi(() => providerApi.jobs(), []);
  const grouped = jobs.data ? splitJobs(jobs.data.jobs) : null;
  const list = grouped ? grouped[tab] : [];

  return (
    <AppShell>
      <PageHeader
        title="My jobs"
        subtitle="Jobs customers have awarded to you, plus jobs you've added yourself."
        actions={
          <ButtonLink to="/provider/jobs/new" size="sm">
            + Add Job
          </ButtonLink>
        }
      />

      <div className="tabs" role="tablist" aria-label="Jobs">
        {TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={tab === item.key}
            className={`tab${tab === item.key ? ' is-active' : ''}`}
            onClick={() => navigate(item.key === 'active' ? '/provider/jobs' : `/provider/jobs?tab=${item.key}`, { replace: true })}
          >
            {item.label}
            {grouped ? <span className="count">{grouped[item.key].length}</span> : null}
          </button>
        ))}
      </div>

      {jobs.loading ? <LoadingState label="Loading your jobs…" /> : null}
      {jobs.error ? <ErrorState error={jobs.error} onRetry={jobs.reload} /> : null}
      {grouped && list.length === 0 ? (
        <EmptyState
          title={tab === 'active' ? 'No active jobs' : `No ${tab} jobs`}
          message={tab === 'active' ? 'Quote on open requests — jobs appear here when a customer chooses you.' : undefined}
        />
      ) : null}
      {grouped && list.length > 0 ? (
        <div className="list">
          {list.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      ) : null}
    </AppShell>
  );
}

export default ProviderJobsPage;
