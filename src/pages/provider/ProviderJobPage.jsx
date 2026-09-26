import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import AppShell from '../../components/AppShell.jsx';
import JobNotes from '../../components/JobNotes.jsx';
import TrackingTimeline from '../../components/TrackingTimeline.jsx';
import { AddressBlock, ServiceLocationBlock, AttachmentList, VoiceNoteBlock } from '../../components/cards.jsx';
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
import { useQueryParam } from '../../hooks/useRoute.js';
import { bookingsApi, providerApi } from '../../services/fixApi.js';
import { formatDateTime, formatIssueLabel } from '../../utils/format.js';

const TERMINAL = ['COMPLETED', 'CANCELLED'];

// V1 job lifecycle: accepted → start → complete. Every button calls the backend and
// refreshes; nothing changes state locally. There are no scheduling or travel steps and
// the provider never shares a live location — Navigate opens the customer's location.
function nextAction(booking) {
  const { requestStatus, status } = booking;

  if (TERMINAL.includes(status) || TERMINAL.includes(requestStatus)) return null;
  if (requestStatus === 'ACCEPTED') return 'start';
  if (requestStatus === 'IN_PROGRESS') return 'complete';
  return null;
}

function ProviderJobPage({ bookingId }) {
  const { t } = useTranslation();
  const justAccepted = useQueryParam('accepted') === '1';
  const data = useApi(() => bookingsApi.get(bookingId), [bookingId]);
  const action = useAction();
  const [confirm, setConfirm] = useState(null);
  // Stores a translation key so the notice follows a language switch.
  const [success, setSuccess] = useState('');

  const back = { to: '/provider/jobs', label: t('provider.shared.myJobs') };

  if (data.loading) {
    return (
      <AppShell>
        <LoadingState label={t('provider.shared.loadingJob')} />
      </AppShell>
    );
  }

  if (data.error && !data.data) {
    return (
      <AppShell>
        <PageHeader title={t('provider.shared.job')} back={back} />
        <ErrorState
          error={data.error.status === 400 ? { status: 404, message: t('provider.shared.jobNotFound') } : data.error}
          onRetry={data.reload}
        />
      </AppShell>
    );
  }

  const { booking } = data.data;
  const request = booking.request;
  const step = nextAction(booking);

  async function perform(key, operation, messageKey) {
    setSuccess('');
    const ok = await action.run(key, operation);
    setConfirm(null);
    if (ok) setSuccess(messageKey);
    await data.refresh();
    return ok;
  }

  const runners = {
    start: () => perform('start', () => providerApi.start(booking.requestId), 'provider.job.success.start'),
    complete: () => perform('complete', () => providerApi.complete(booking.requestId), 'provider.job.success.complete'),
  };

  const confirmContent = {
    start: {
      title: t('provider.job.confirm.start.title'),
      message: t('provider.job.confirm.start.message'),
      confirmLabel: t('provider.job.confirm.start.confirmLabel'),
    },
    complete: {
      title: t('provider.job.confirm.complete.title'),
      message: t('provider.job.confirm.complete.message'),
      confirmLabel: t('provider.job.confirm.complete.confirmLabel'),
    },
  }[confirm];


  return (
    <AppShell>
      <PageHeader
        back={back}
        title={booking.service?.name || t('provider.shared.job')}
        subtitle={[formatIssueLabel(request?.issueKey, request?.issueLabel), booking.customer?.name ? t('provider.shared.forCustomer', { name: booking.customer.name }) : null].filter(Boolean).join(' · ')}
        actions={<StatusBadge status={booking.status} audience="booking" />}
      />

      <div className="stack">
        {justAccepted && !success ? (
          <Notice tone="success">{t('provider.job.justAccepted')}</Notice>
        ) : null}
        <Notice tone="success">{success ? t(success) : ''}</Notice>
        <Notice>{action.error}</Notice>
        {data.error ? <Notice>{data.error.message}</Notice> : null}
      </div>

      <div className="detail-layout">
        <div className="detail-layout__main">
          {step ? (
            <Card className="card--accent">
              <h2 className="card__title">{t(`provider.job.actions.${step}.title`)}</h2>
              <p className="body-text">{t(`provider.job.actions.${step}.text`)}</p>
              <div className="action-grid">
                <Button
                  block
                  onClick={() => setConfirm(step)}
                  loading={action.pending === step}
                  loadingText={t('provider.shared.updating')}
                  disabled={Boolean(action.pending) && action.pending !== step}
                >
                  {t(`provider.job.actions.${step}.button`)}
                </Button>
                <ButtonLink to={`/bookings/${booking.id}/chat`} variant="secondary" block>
                  {t('provider.job.chat')}
                </ButtonLink>
              </div>
              <ServiceLocationBlock location={request?.location} navigate fallback={null} />
            </Card>
          ) : null}

          {booking.status === 'COMPLETED' ? (
            <Card>
              <h2 className="card__title">{t('provider.job.completedTitle')}</h2>
              <p className="body-text">{t('provider.job.completedText', { time: formatDateTime(booking.timeline.completedAt) })}</p>
            </Card>
          ) : null}

          {booking.status === 'CANCELLED' ? (
            <Card>
              <h2 className="card__title">{t('provider.job.cancelledTitle')}</h2>
              <p className="body-text">{t('provider.job.cancelledText')}</p>
            </Card>
          ) : null}

          <Card>
            <h2 className="card__title">{t('provider.shared.progress')}</h2>
            <TrackingTimeline status={booking.status} timeline={booking.timeline} />
          </Card>

          <Card>
            <h2 className="card__title">{t('provider.shared.privateNotes')}</h2>
            <p className="field-hint">{t('provider.job.notesHint')}</p>
            <JobNotes jobId={booking.id} notesApi={bookingsApi.notes} />
          </Card>
        </div>

        <aside className="detail-layout__side">
          <Card>
            <h2 className="card__title">{t('provider.shared.customerAndJob')}</h2>
            <DetailList
              items={[
                { label: t('provider.shared.customer'), value: booking.customer?.name },
                { label: t('provider.shared.issue'), value: formatIssueLabel(request?.issueKey, request?.issueLabel) },
                { label: t('provider.shared.problem'), value: request?.description },
                { label: t('provider.shared.accepted'), value: formatDateTime(booking.timeline?.acceptedAt) },
              ]}
            />
            <h3 className="card__subtitle">{t('provider.shared.serviceLocation')}</h3>
            <AddressBlock address={request?.address} />
            <ServiceLocationBlock
              location={request?.location}
              navigate
              fallback={t('provider.shared.noMapPin')}
            />
            {request?.attachments?.length ? (
              <>
                <h3 className="card__subtitle">{t('provider.shared.attachments')}</h3>
                <AttachmentList attachments={request.attachments} />
              </>
            ) : null}
            <VoiceNoteBlock voiceNote={request?.voiceNote} />
            <div className="card__actions">
              <ButtonLink to={`/bookings/${booking.id}/chat`} variant="secondary" block>
                {t('provider.job.chat')}
              </ButtonLink>
            </div>
          </Card>
        </aside>
      </div>

      <ConfirmDialog
        open={Boolean(confirmContent)}
        title={confirmContent?.title}
        message={confirmContent?.message}
        confirmLabel={confirmContent?.confirmLabel}
        busy={Boolean(action.pending)}
        onConfirm={() => runners[confirm]()}
        onCancel={() => setConfirm(null)}
      />
    </AppShell>
  );
}

export default ProviderJobPage;
