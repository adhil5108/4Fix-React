import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MapPin, NotebookPen, Pencil, Phone, Trash2 } from 'lucide-react';
import AppShell from '../../components/AppShell.jsx';
import JobNotes from '../../components/JobNotes.jsx';
import TrackingTimeline from '../../components/TrackingTimeline.jsx';
import { AttachmentList, ContactCard, ServiceIcon } from '../../components/cards.jsx';
import {
  Button,
  Card,
  ConfirmDialog,
  ErrorState,
  IconButton,
  ListRow,
  LoadingState,
  Notice,
  SectionHeader,
  Sheet,
  StatusBadge,
  StickyActionBar,
} from '../../components/ui.jsx';
import { useAction, useApi } from '../../hooks/useApi.js';
import { navigate } from '../../hooks/useRoute.js';
import { providerExternalJobsApi } from '../../services/fixApi.js';
import { formatAddress, formatSlot, shortRef } from '../../utils/format.js';

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

// A job the provider recorded themselves (work from outside 4Fix): same layout as a 4Fix
// job, clearly tagged "External", with its own lifecycle.
function ProviderExternalJobPage({ jobId }) {
  const { t } = useTranslation();
  const data = useApi(() => providerExternalJobsApi.get(jobId), [jobId]);
  const action = useAction();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const back = { to: '/provider/jobs', label: t('provider.shared.myJobs') };

  if (data.loading) {
    return (
      <AppShell title={t('provider.shared.job')} back={back}>
        <LoadingState label={t('provider.shared.loadingJob')} />
      </AppShell>
    );
  }

  if (data.error) {
    return (
      <AppShell title={t('provider.shared.job')} back={back}>
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
  const address = formatAddress(job.address);

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
    <AppShell
      title={`${t('provider.shared.job')} ${shortRef(job.id)}`}
      back={back}
      bar={Boolean(step)}
      actions={<IconButton icon={Pencil} to={`/provider/jobs/external/${job.id}/edit`} label={t('provider.externalJob.edit')} />}
    >
      <header className="job-header">
        <ServiceIcon service={{ name: job.serviceLabel }} size="lg" />
        <div className="job-header__text">
          <p className="job-header__ref">
            <span className="badge badge--plain badge--muted">{t('provider.shared.external')}</span>
          </p>
          <h2 className="job-header__title">{job.serviceLabel}</h2>
          <p className="job-header__sub">{t('provider.shared.forCustomer', { name: job.customer.name })}</p>
        </div>
        <StatusBadge status={job.status} audience="externalJob" />
      </header>

      <div className="stack section-gap">
        <Notice>{action.error}</Notice>
        {step ? <Notice tone="info">{t(`provider.externalJob.actions.${ACTION_COPY[step]}.text`)}</Notice> : null}
        {!step ? <Notice tone="success">{t('provider.externalJob.completedTitle')}</Notice> : null}
      </div>

      <section className="section" aria-labelledby="external-customer-heading">
        <SectionHeader id="external-customer-heading" title={t('provider.shared.customer')} />
        <Card>
          <ContactCard
            role={t('provider.shared.customer')}
            name={job.customer.name}
            phone={job.customer.phone}
            actions={[
              job.customer.phone ? { key: 'call', icon: Phone, label: t('provider.job.call'), href: `tel:${job.customer.phone}`, primary: true } : null,
              address
                ? {
                    key: 'map',
                    icon: MapPin,
                    label: t('cards.serviceLocation.openInMaps'),
                    href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`,
                    external: true,
                  }
                : null,
            ].filter(Boolean)}
          />
        </Card>
      </section>

      <section className="section" aria-labelledby="external-details-heading">
        <SectionHeader id="external-details-heading" title={t('provider.shared.customerAndJob')} />
        <div className="list-group">
          <ListRow label={t('provider.shared.description')} value={job.description} />
          <ListRow
            label={t('provider.shared.scheduledVisit')}
            value={job.scheduledDate ? formatSlot(job.scheduledDate, job.scheduledTime) : t('provider.shared.notScheduled')}
            muted={!job.scheduledDate}
          />
          <ListRow label={t('provider.shared.location')} value={address} />
          {job.attachments?.length ? (
            <div className="list-block stack">
              <span className="list-row__label">{t('provider.shared.attachments')}</span>
              <AttachmentList attachments={job.attachments} />
            </div>
          ) : null}
          <ListRow
            icon={NotebookPen}
            title={t('provider.shared.privateNotes')}
            value={t('provider.externalJob.notesHint')}
            muted
            onClick={() => setNotesOpen(true)}
            chevron
          />
        </div>
      </section>

      <section className="section" aria-labelledby="external-progress-heading">
        <SectionHeader id="external-progress-heading" title={t('provider.shared.progress')} />
        <Card>
          <TrackingTimeline status={job.status} timeline={job.timeline} stages={stages} rank={EXTERNAL_RANK} />
        </Card>
      </section>

      <section className="section">
        <div className="list-group">
          <ListRow icon={Trash2} danger title={t('provider.externalJob.delete')} onClick={() => setConfirmDelete(true)} />
        </div>
      </section>

      {step ? (
        <StickyActionBar>
          <Button
            block
            size="lg"
            onClick={runStep}
            loading={action.pending === step}
            loadingText={t('provider.shared.updating')}
            disabled={Boolean(action.pending) && action.pending !== step}
          >
            {t(`provider.externalJob.actions.${ACTION_COPY[step]}.button`)}
          </Button>
        </StickyActionBar>
      ) : null}

      <Sheet open={notesOpen} title={t('provider.shared.privateNotes')} onClose={() => setNotesOpen(false)}>
        <JobNotes jobId={job.id} notesApi={providerExternalJobsApi.notes} />
      </Sheet>

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
