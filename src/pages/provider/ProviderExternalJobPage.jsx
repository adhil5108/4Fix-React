import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import AppShell from '../../components/AppShell.jsx';
import JobNotes from '../../components/JobNotes.jsx';
import TrackingTimeline from '../../components/TrackingTimeline.jsx';
import { AddressBlock, AttachmentList } from '../../components/cards.jsx';
import {
  Button,
  ButtonLink,
  Card,
  ConfirmDialog,
  DetailList,
  ErrorState,
  LoadingState,
  Notice,
  PageHeader,
  StatusBadge,
} from '../../components/ui.jsx';
import { useAction, useApi } from '../../hooks/useApi.js';
import { navigate } from '../../hooks/useRoute.js';
import { providerExternalJobsApi } from '../../services/fixApi.js';
import { formatSlot } from '../../utils/format.js';

// Labels come from provider.externalJob.stages.<status>, translated at render.
const EXTERNAL_STAGES = [
  { status: 'SCHEDULED', at: null },
  { status: 'ON_THE_WAY', at: 'onTheWayAt' },
  { status: 'ARRIVED', at: 'arrivedAt' },
  { status: 'IN_PROGRESS', at: 'startedAt' },
  { status: 'COMPLETED', at: 'completedAt' },
];

const EXTERNAL_RANK = { SCHEDULED: 0, ON_THE_WAY: 1, ARRIVED: 2, IN_PROGRESS: 3, COMPLETED: 4 };

function nextAction(status) {
  switch (status) {
    case 'SCHEDULED':
      return 'on-the-way';
    case 'ON_THE_WAY':
      return 'arrived';
    case 'ARRIVED':
      return 'start';
    case 'IN_PROGRESS':
      return 'complete';
    default:
      return null;
  }
}

// Step → key under provider.externalJob.actions.<key>.{text,button}.
const ACTION_COPY = {
  'on-the-way': 'onTheWay',
  arrived: 'arrived',
  start: 'start',
  complete: 'complete',
};

function ProviderExternalJobPage({ jobId }) {
  const { t } = useTranslation();
  const data = useApi(() => providerExternalJobsApi.get(jobId), [jobId]);
  const action = useAction();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const back = { to: '/provider/jobs', label: t('provider.shared.myJobs') };

  if (data.loading) {
    return (
      <AppShell>
        <LoadingState label={t('provider.shared.loadingJob')} />
      </AppShell>
    );
  }

  if (data.error) {
    return (
      <AppShell>
        <PageHeader title={t('provider.shared.job')} back={back} />
        <ErrorState
          error={data.error.status === 404 ? { status: 404, message: t('provider.shared.jobNotFound') } : data.error}
          onRetry={data.reload}
        />
      </AppShell>
    );
  }

  const { job } = data.data;
  const step = nextAction(job.status);
  const stages = EXTERNAL_STAGES.map((stage) => ({ ...stage, label: t(`provider.externalJob.stages.${stage.status}`) }));

  const runners = {
    'on-the-way': () => action.run('on-the-way', () => providerExternalJobsApi.onTheWay(job.id)),
    arrived: () => action.run('arrived', () => providerExternalJobsApi.arrived(job.id)),
    start: () => action.run('start', () => providerExternalJobsApi.start(job.id)),
    complete: () => action.run('complete', () => providerExternalJobsApi.complete(job.id)),
  };

  async function runStep() {
    const ok = await runners[step]();
    if (ok) await data.refresh();
  }

  async function handleDelete() {
    const ok = await action.run('delete', () => providerExternalJobsApi.remove(job.id));
    if (ok) navigate('/provider/jobs');
  }

  return (
    <AppShell>
      <PageHeader
        back={back}
        title={job.serviceLabel}
        subtitle={t('provider.shared.forCustomer', { name: job.customer.name })}
        actions={
          <>
            <span className="badge badge--muted">{t('provider.shared.external')}</span>
            <StatusBadge status={job.status} audience="externalJob" />
          </>
        }
      />

      <div className="stack">
        <Notice>{action.error}</Notice>
      </div>

      <div className="detail-layout">
        <div className="detail-layout__main">
          {step ? (
            <Card className="card--accent">
              <h2 className="card__title">{t(`provider.externalJob.actions.${ACTION_COPY[step]}.text`)}</h2>
              <Button
                block
                onClick={runStep}
                loading={action.pending === step}
                loadingText={t('provider.shared.updating')}
                disabled={Boolean(action.pending) && action.pending !== step}
              >
                {t(`provider.externalJob.actions.${ACTION_COPY[step]}.button`)}
              </Button>
            </Card>
          ) : (
            <Card>
              <h2 className="card__title">{t('provider.externalJob.completedTitle')}</h2>
            </Card>
          )}

          <Card>
            <h2 className="card__title">{t('provider.shared.progress')}</h2>
            <TrackingTimeline status={job.status} timeline={job.timeline} stages={stages} rank={EXTERNAL_RANK} />
          </Card>

          <Card>
            <h2 className="card__title">{t('provider.shared.privateNotes')}</h2>
            <p className="field-hint">{t('provider.externalJob.notesHint')}</p>
            <JobNotes jobId={job.id} notesApi={providerExternalJobsApi.notes} />
          </Card>
        </div>

        <aside className="detail-layout__side">
          <Card>
            <h2 className="card__title">{t('provider.shared.customerAndJob')}</h2>
            <DetailList
              items={[
                { label: t('provider.shared.customer'), value: job.customer.name },
                { label: t('provider.shared.phone'), value: job.customer.phone },
                { label: t('provider.shared.serviceType'), value: job.serviceLabel },
                { label: t('provider.shared.description'), value: job.description },
                {
                  label: t('provider.shared.scheduledVisit'),
                  value: job.scheduledDate ? formatSlot(job.scheduledDate, job.scheduledTime) : t('provider.shared.notScheduled'),
                },
              ]}
            />
            <h3 className="card__subtitle">{t('provider.shared.location')}</h3>
            <AddressBlock address={job.address} />
            {job.attachments?.length ? (
              <>
                <h3 className="card__subtitle">{t('provider.shared.attachments')}</h3>
                <AttachmentList attachments={job.attachments} />
              </>
            ) : null}
            <div className="card__actions">
              <ButtonLink to={`/provider/jobs/external/${job.id}/edit`} variant="secondary" block>
                {t('provider.externalJob.edit')}
              </ButtonLink>
              <Button variant="danger-ghost" block onClick={() => setConfirmDelete(true)}>
                {t('provider.externalJob.delete')}
              </Button>
            </div>
          </Card>
        </aside>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title={t('provider.externalJob.deleteTitle')}
        message={t('provider.externalJob.deleteMessage')}
        confirmLabel={t('provider.externalJob.delete')}
        confirmVariant="danger"
        busy={action.pending === 'delete'}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </AppShell>
  );
}

export default ProviderExternalJobPage;
