import { useTranslation } from 'react-i18next';
import { Plus, Wrench } from 'lucide-react';
import AppShell from '../../components/AppShell.jsx';
import { ProviderJobCard } from '../../components/cards.jsx';
import { EmptyState, ErrorState, IconButton, LoadingState, SegmentedTabs } from '../../components/ui.jsx';
import { useApi } from '../../hooks/useApi.js';
import { useAuth } from '../../hooks/useAuth.jsx';
import { navigate, useQueryParam } from '../../hooks/useRoute.js';
import { providerApi } from '../../services/fixApi.js';

// Labels come from provider.jobs.tabs.<key>.
const TABS = ['active', 'completed', 'cancelled'];

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

function ProviderJobsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const tabParam = useQueryParam('tab');
  const tab = TABS.includes(tabParam) ? tabParam : 'active';
  const jobs = useApi(() => providerApi.jobs(), []);
  const grouped = jobs.data ? splitJobs(jobs.data.jobs) : null;
  const list = grouped ? grouped[tab] : [];

  return (
    <AppShell
      title={t('provider.shared.myJobs')}
      large
      actions={
        user.role === 'PROVIDER' ? (
          <IconButton icon={Plus} to="/provider/jobs/new" variant="tonal" label={t('provider.jobs.addJob')} />
        ) : null
      }
    >
      <SegmentedTabs
        label={t('provider.jobs.tabsAria')}
        value={tab}
        onChange={(key) => navigate(key === 'active' ? '/provider/jobs' : `/provider/jobs?tab=${key}`, { replace: true })}
        items={TABS.map((key) => ({
          key,
          label: t(`provider.jobs.tabs.${key}`),
          count: grouped ? grouped[key].length : undefined,
        }))}
      />

      <div className="section">
        {jobs.loading ? <LoadingState label={t('provider.jobs.loading')} /> : null}
        {jobs.error ? <ErrorState error={jobs.error} onRetry={jobs.reload} /> : null}
        {grouped && list.length === 0 ? (
          <EmptyState
            icon={Wrench}
            title={t(`provider.jobs.empty.${tab}`)}
            message={tab === 'active' ? t('provider.jobs.emptyActiveMessage') : undefined}
          />
        ) : null}
        {grouped && list.length > 0 ? (
          <div className="stack">
            {list.map((job) => (
              <ProviderJobCard key={job.id} job={job} />
            ))}
          </div>
        ) : null}
      </div>

      {user.role === 'PROVIDER' ? <p className="page-note">{t('provider.jobs.subtitle')}</p> : null}
    </AppShell>
  );
}

export default ProviderJobsPage;
