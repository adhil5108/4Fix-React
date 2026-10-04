import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CircleCheck, FileText, MessageCircle, Navigation, NotebookPen, Phone, Play } from 'lucide-react';
import AppShell from '../../components/AppShell.jsx';
import JobNotes from '../../components/JobNotes.jsx';
import TrackingTimeline from '../../components/TrackingTimeline.jsx';
import {
  AttachmentList,
  ContactCard,
  ServiceIcon,
  ServiceLocationBlock,
  VoiceNoteBlock,
  hasCoordinates,
  mapsLink,
} from '../../components/cards.jsx';
import { ChatCount } from '../../components/Unread.jsx';
import {
  Button,
  Card,
  ConfirmDialog,
  ErrorState,
  ListRow,
  LoadingState,
  Notice,
  SectionHeader,
  Sheet,
  StatusBadge,
  StickyActionBar,
} from '../../components/ui.jsx';
import { useAction, useApi } from '../../hooks/useApi.js';
import { useQueryParam } from '../../hooks/useRoute.js';
import { bookingsApi, providerApi } from '../../services/fixApi.js';
import { formatDateTime, formatIssueLabel, shortRef } from '../../utils/format.js';

const TERMINAL = ['COMPLETED', 'CANCELLED'];
const ACTION_ICONS = { start: Play, complete: CircleCheck };

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
  const [notesOpen, setNotesOpen] = useState(false);
  // Stores a translation key so the notice follows a language switch.
  const [success, setSuccess] = useState('');

  const back = { to: '/provider/jobs', label: t('provider.shared.myJobs') };

  if (data.loading) {
    return (
      <AppShell title={t('provider.shared.job')} back={back}>
        <LoadingState label={t('provider.shared.loadingJob')} />
      </AppShell>
    );
  }

  if (data.error && !data.data) {
    return (
      <AppShell title={t('provider.shared.job')} back={back}>
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
  const issue = formatIssueLabel(request?.issueKey, request?.issueLabel);
  const customer = booking.customer;
  const location = request?.location;
  const isLive = !TERMINAL.includes(booking.status);

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

  const confirmContent = confirm
    ? {
        title: t(`provider.job.confirm.${confirm}.title`),
        message: t(`provider.job.confirm.${confirm}.message`),
        confirmLabel: t(`provider.job.confirm.${confirm}.confirmLabel`),
      }
    : null;

  const contactActions = [
    customer?.phone && isLive
      ? { key: 'call', icon: Phone, label: t('provider.job.call'), href: `tel:${customer.phone}`, primary: true }
      : null,
    hasCoordinates(location) && isLive
      ? { key: 'navigate', icon: Navigation, label: t('cards.serviceLocation.navigate'), href: mapsLink(location, { navigate: true }), external: true }
      : null,
    booking.status !== 'CANCELLED'
      ? {
          key: 'chat',
          icon: MessageCircle,
          label: t('provider.job.chatShort'),
          to: `/bookings/${booking.id}/chat`,
          badge: <ChatCount bookingId={booking.id} />,
        }
      : null,
  ].filter(Boolean);

  const StepIcon = step ? ACTION_ICONS[step] : null;

  return (
    <AppShell title={`${t('provider.shared.job')} ${shortRef(booking.id)}`} back={back} bar={Boolean(step)}>
      <header className="job-header">
        <ServiceIcon service={booking.service} size="lg" />
        <div className="job-header__text">
          <p className="job-header__ref">{t('provider.job.acceptedOn', { time: formatDateTime(booking.timeline?.acceptedAt) })}</p>
          <h2 className="job-header__title">{booking.service?.name || t('provider.shared.job')}</h2>
          {issue ? <p className="job-header__sub">{issue}</p> : null}
        </div>
        <StatusBadge status={booking.status} audience="booking" />
      </header>

      <div className="stack section-gap">
        {justAccepted && !success ? <Notice tone="success">{t('provider.job.justAccepted')}</Notice> : null}
        <Notice tone="success">{success ? t(success) : ''}</Notice>
        <Notice>{action.error}</Notice>
        {data.error ? <Notice>{data.error.message}</Notice> : null}
        {step ? <Notice tone="info">{t(`provider.job.actions.${step}.text`)}</Notice> : null}
        {booking.status === 'CANCELLED' ? <Notice tone="info">{t('provider.job.cancelledText')}</Notice> : null}
      </div>

      {booking.status === 'COMPLETED' ? (
        <Card tint className="status-panel">
          <p className="status-panel__text">
            {t('provider.job.completedText', { time: formatDateTime(booking.timeline.completedAt) })}
          </p>
          <div className="list-group">
            <ListRow icon={FileText} to={`/bookings/${booking.id}/invoice`} title={t('invoice.view')} />
          </div>
        </Card>
      ) : null}

      {customer ? (
        <section className="section" aria-labelledby="customer-heading">
          <SectionHeader id="customer-heading" title={t('provider.shared.customer')} />
          <Card>
            <ContactCard
              role={t('provider.shared.customer')}
              name={customer.name}
              phone={customer.phone}
              actions={contactActions}
            />
          </Card>
        </section>
      ) : null}

      <section className="section" aria-labelledby="job-details-heading">
        <SectionHeader id="job-details-heading" title={t('provider.shared.customerAndJob')} />
        <div className="list-group">
          {issue ? <ListRow label={t('provider.shared.issue')} value={issue} /> : null}
          <ListRow label={t('provider.shared.problem')} value={request?.description} />
          <div className="list-block">
            <span className="list-row__label">{t('provider.shared.serviceLocation')}</span>
            <ServiceLocationBlock
              location={location}
              address={request?.address}
              navigate
              showAction={false}
              fallback={t('provider.shared.noMapPin')}
            />
          </div>
          {request?.attachments?.length || request?.voiceNote?.url ? (
            <div className="list-block stack">
              <span className="list-row__label">{t('provider.shared.attachments')}</span>
              <AttachmentList attachments={request?.attachments} />
              <VoiceNoteBlock voiceNote={request?.voiceNote} />
            </div>
          ) : null}
          <ListRow
            icon={NotebookPen}
            title={t('provider.shared.privateNotes')}
            value={t('provider.job.notesHint')}
            muted
            onClick={() => setNotesOpen(true)}
            chevron
          />
        </div>
      </section>

      <section className="section" aria-labelledby="progress-heading">
        <SectionHeader id="progress-heading" title={t('provider.shared.progress')} />
        <Card>
          <TrackingTimeline status={booking.status} timeline={booking.timeline} />
        </Card>
      </section>

      {step ? (
        <StickyActionBar>
          <Button
            block
            size="lg"
            icon={StepIcon}
            onClick={() => setConfirm(step)}
            loading={action.pending === step}
            loadingText={t('provider.shared.updating')}
          >
            {t(`provider.job.actions.${step}.button`)}
          </Button>
        </StickyActionBar>
      ) : null}

      <Sheet open={notesOpen} title={t('provider.shared.privateNotes')} onClose={() => setNotesOpen(false)}>
        <JobNotes jobId={booking.id} notesApi={bookingsApi.notes} />
      </Sheet>

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
