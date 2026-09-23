import { useState } from 'react';
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

const EXTERNAL_STAGES = [
  { status: 'SCHEDULED', label: 'Job scheduled', at: null },
  { status: 'ON_THE_WAY', label: 'On the way', at: 'onTheWayAt' },
  { status: 'ARRIVED', label: 'Arrived', at: 'arrivedAt' },
  { status: 'IN_PROGRESS', label: 'In progress', at: 'startedAt' },
  { status: 'COMPLETED', label: 'Completed', at: 'completedAt' },
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

const ACTION_COPY = {
  'on-the-way': { text: 'Mark yourself on the way to this job.', button: 'I’m on my way' },
  arrived: { text: 'Mark arrived when you reach the customer.', button: 'I’ve arrived' },
  start: { text: 'Start once you begin the work.', button: 'Start job' },
  complete: { text: 'Mark it complete once the work is done.', button: 'Mark as complete' },
};

function ProviderExternalJobPage({ jobId }) {
  const data = useApi(() => providerExternalJobsApi.get(jobId), [jobId]);
  const action = useAction();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const back = { to: '/provider/jobs', label: 'My jobs' };

  if (data.loading) {
    return (
      <AppShell>
        <LoadingState label="Loading job…" />
      </AppShell>
    );
  }

  if (data.error) {
    return (
      <AppShell>
        <PageHeader title="Job" back={back} />
        <ErrorState
          error={data.error.status === 404 ? { status: 404, message: 'This job could not be found.' } : data.error}
          onRetry={data.reload}
        />
      </AppShell>
    );
  }

  const { job } = data.data;
  const step = nextAction(job.status);

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
        subtitle={`for ${job.customer.name}`}
        actions={
          <>
            <span className="badge badge--muted">External</span>
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
              <h2 className="card__title">{ACTION_COPY[step].text}</h2>
              <Button
                block
                onClick={runStep}
                loading={action.pending === step}
                loadingText="Updating…"
                disabled={Boolean(action.pending) && action.pending !== step}
              >
                {ACTION_COPY[step].button}
              </Button>
            </Card>
          ) : (
            <Card>
              <h2 className="card__title">Job completed</h2>
            </Card>
          )}

          <Card>
            <h2 className="card__title">Progress</h2>
            <TrackingTimeline status={job.status} timeline={job.timeline} stages={EXTERNAL_STAGES} rank={EXTERNAL_RANK} />
          </Card>

          <Card>
            <h2 className="card__title">Private Notes</h2>
            <p className="field-hint">Visible only to you — never shown to a customer.</p>
            <JobNotes jobId={job.id} notesApi={providerExternalJobsApi.notes} />
          </Card>
        </div>

        <aside className="detail-layout__side">
          <Card>
            <h2 className="card__title">Customer &amp; job</h2>
            <DetailList
              items={[
                { label: 'Customer', value: job.customer.name },
                { label: 'Phone', value: job.customer.phone },
                { label: 'Service / job type', value: job.serviceLabel },
                { label: 'Description', value: job.description },
                {
                  label: 'Scheduled visit',
                  value: job.scheduledDate ? formatSlot(job.scheduledDate, job.scheduledTime) : 'Not scheduled',
                },
              ]}
            />
            <h3 className="card__subtitle">Location</h3>
            <AddressBlock address={job.address} />
            {job.attachments?.length ? (
              <>
                <h3 className="card__subtitle">Attachments</h3>
                <AttachmentList attachments={job.attachments} />
              </>
            ) : null}
            <div className="card__actions">
              <ButtonLink to={`/provider/jobs/external/${job.id}/edit`} variant="secondary" block>
                Edit job
              </ButtonLink>
              <Button variant="danger-ghost" block onClick={() => setConfirmDelete(true)}>
                Delete job
              </Button>
            </div>
          </Card>
        </aside>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete this job?"
        message="This removes the job and its private notes. This can’t be undone."
        confirmLabel="Delete job"
        confirmVariant="danger"
        busy={action.pending === 'delete'}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </AppShell>
  );
}

export default ProviderExternalJobPage;
