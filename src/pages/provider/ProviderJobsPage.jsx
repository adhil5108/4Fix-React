import { useTranslation } from 'react-i18next';
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
import { formatIssueLabel, formatSlot } from '../../utils/format.js';

// Labels come from provider.jobs.tabs.<key>.
const TABS = [{ key: 'active' }, { key: 'completed' }, { key: 'cancelled' }];

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
  const { t } = useTranslation();
  const isExternal = job.source === 'EXTERNAL';
  const slot = job.scheduledDate
    ? t('provider.jobs.card.scheduled', { slot: formatSlot(job.scheduledDate, job.scheduledTime) })
    : job.preferredDate
      ? t('provider.jobs.card.preferred', { slot: formatSlot(job.preferredDate, job.preferredTime) })
      : t('provider.shared.notScheduledYet');

  return (
    <Link to={jobPath(job)} className="card card--link request-card">
      <span className="request-card__top">
        <span className="request-card__service">
          {job.service?.name || job.serviceLabel || t('provider.shared.job')}
          {formatIssueLabel(job.issueKey, job.issueLabel) ? <span className="request-card__issue"> · {formatIssueLabel(job.issueKey, job.issueLabel)}</span> : null}
        </span>
        <span className="job-card__badges">
          {isExternal ? <span className="badge badge--muted">{t('provider.shared.external')}</span> : null}
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
      </span>
    </Link>
  );
}

function ProviderJobsPage() {
  const { t } = useTranslation();
  const tabParam = useQueryParam('tab');
  const tab = TABS.some((item) => item.key === tabParam) ? tabParam : 'active';
  const jobs = useApi(() => providerApi.jobs(), []);
  const grouped = jobs.data ? splitJobs(jobs.data.jobs) : null;
  const list = grouped ? grouped[tab] : [];

  return (
    <AppShell>
      <PageHeader
        title={t('provider.shared.myJobs')}
        subtitle={t('provider.jobs.subtitle')}
        actions={
          <ButtonLink to="/provider/jobs/new" size="sm">
            {t('provider.jobs.addJob')}
          </ButtonLink>
        }
      />

      <div className="tabs" role="tablist" aria-label={t('provider.jobs.tabsAria')}>
        {TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={tab === item.key}
            className={`tab${tab === item.key ? ' is-active' : ''}`}
            onClick={() => navigate(item.key === 'active' ? '/provider/jobs' : `/provider/jobs?tab=${item.key}`, { replace: true })}
          >
            {t(`provider.jobs.tabs.${item.key}`)}
            {grouped ? <span className="count">{grouped[item.key].length}</span> : null}
          </button>
        ))}
      </div>

      {jobs.loading ? <LoadingState label={t('provider.jobs.loading')} /> : null}
      {jobs.error ? <ErrorState error={jobs.error} onRetry={jobs.reload} /> : null}
      {grouped && list.length === 0 ? (
        <EmptyState
          title={t(`provider.jobs.empty.${tab}`)}
          message={tab === 'active' ? t('provider.jobs.emptyActiveMessage') : undefined}
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
