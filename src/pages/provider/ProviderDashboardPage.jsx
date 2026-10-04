import { useTranslation } from 'react-i18next';
import { Inbox, Tags, Wrench } from 'lucide-react';
import AppShell from '../../components/AppShell.jsx';
import LanguageSwitcher from '../../components/LanguageSwitcher.jsx';
import { Avatar, OpenRequestCard, ProviderJobCard } from '../../components/cards.jsx';
import { ButtonLink, EmptyState, ErrorState, Link, LoadingState, Notice, SectionHeader } from '../../components/ui.jsx';
import { useApi } from '../../hooks/useApi.js';
import { useAuth } from '../../hooks/useAuth.jsx';
import { providerApi } from '../../services/fixApi.js';
import { dayPeriod, firstName } from '../../utils/format.js';
import { splitJobs } from './ProviderJobsPage.jsx';

const PREVIEW_LIMIT = 3;

function StatTile({ label, value, to }) {
  return (
    <Link to={to} className="stat">
      <span className="stat__value">{value ?? '–'}</span>
      <span className="stat__label">{label}</span>
    </Link>
  );
}

// Provider home: what needs attention now — active jobs, then new requests. The full
// lists live in the Requests and Jobs tabs.
function ProviderDashboardPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const open = useApi(() => providerApi.listRequests(), []);
  const jobs = useApi(() => providerApi.jobs(), []);
  const loading = open.loading || jobs.loading;
  const grouped = jobs.data ? splitJobs(jobs.data.jobs) : null;
  const requests = open.data?.requests || [];
  const isProvider = user.role === 'PROVIDER';

  return (
    <AppShell brand actions={<LanguageSwitcher compact />}>
      <section className="provider-hello">
        <Avatar name={user.name} image={user.profileImage} size="lg" />
        <div className="provider-hello__text">
          <p className="provider-hello__greeting">{t(`provider.dashboard.greet.${dayPeriod()}`)}</p>
          <h1 className="provider-hello__name">{firstName(user.name)}</h1>
          {isProvider ? (
            <Link to="/provider/profile" className={`badge ${user.isAvailable !== false ? 'badge--done' : 'badge--muted'}`}>
              {user.isAvailable !== false ? t('profile.availableBadge') : t('profile.unavailableBadge')}
            </Link>
          ) : null}
        </div>
      </section>

      {loading ? <LoadingState label={t('provider.dashboard.loading')} /> : null}

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
          <div className="stat-grid stat-grid--3">
            <StatTile label={t('provider.dashboard.statActive')} value={grouped?.active.length} to="/provider/jobs" />
            <StatTile label={t('provider.dashboard.statAvailable')} value={open.data?.requests.length} to="/provider/requests" />
            <StatTile label={t('provider.dashboard.statCompleted')} value={grouped?.completed.length} to="/provider/jobs?tab=completed" />
          </div>

          {jobs.error ? <Notice>{t('provider.dashboard.jobsLoadError', { message: jobs.error.message })}</Notice> : null}

          {grouped && grouped.active.length > 0 ? (
            <section className="section" aria-labelledby="active-jobs-heading">
              <SectionHeader
                id="active-jobs-heading"
                title={t('provider.dashboard.activeJobs')}
                action={
                  <Link to="/provider/jobs" className="link">
                    {t('provider.dashboard.allJobs')}
                  </Link>
                }
              />
              <div className="stack">
                {grouped.active.slice(0, PREVIEW_LIMIT).map((job) => (
                  <ProviderJobCard key={job.id} job={job} />
                ))}
              </div>
            </section>
          ) : null}

          <section className="section" aria-labelledby="new-requests-heading">
            <SectionHeader
              id="new-requests-heading"
              title={t('provider.dashboard.latestRequests')}
              action={
                requests.length > 0 ? (
                  <Link to="/provider/requests" className="link">
                    {t('provider.dashboard.seeAll')}
                  </Link>
                ) : null
              }
            />
            {open.error ? <ErrorState error={open.error} onRetry={open.reload} /> : null}
            {open.data?.needsCategories ? (
              <EmptyState
                icon={Tags}
                title={t('provider.requests.needsCategoriesTitle')}
                message={t('provider.requests.needsCategoriesMessage')}
                action={<ButtonLink to="/provider/profile">{t('provider.requests.chooseCategories')}</ButtonLink>}
              />
            ) : null}
            {open.data && !open.data.needsCategories && requests.length === 0 ? (
              <EmptyState icon={Inbox} title={t('provider.dashboard.noRequestsTitle')} message={t('provider.dashboard.noRequestsMessage')} />
            ) : null}
            {requests.length > 0 ? (
              <div className="stack">
                {requests.slice(0, PREVIEW_LIMIT + 2).map((request) => (
                  <OpenRequestCard key={request.id} request={request} compact to={`/provider/requests/${request.id}`} />
                ))}
              </div>
            ) : null}
          </section>

          {grouped && grouped.active.length === 0 ? (
            <section className="section">
              <EmptyState icon={Wrench} title={t('provider.dashboard.noActiveTitle')} message={t('provider.dashboard.noActiveMessage')} />
            </section>
          ) : null}
        </>
      ) : null}
    </AppShell>
  );
}

export default ProviderDashboardPage;
