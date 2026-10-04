import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Copy, FileText, MessageCircle, Phone, Smartphone, Star, XCircle } from 'lucide-react';
import AppShell from '../../components/AppShell.jsx';
import TrackingTimeline from '../../components/TrackingTimeline.jsx';
import {
  AttachmentList,
  ContactCard,
  ServiceIcon,
  ServiceLocationBlock,
  VoiceNoteBlock,
} from '../../components/cards.jsx';
import { ChatCount } from '../../components/Unread.jsx';
import {
  Button,
  ButtonLink,
  Card,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  ListRow,
  LoadingState,
  Notice,
  SectionHeader,
  Sheet,
  StatusBadge,
} from '../../components/ui.jsx';
import { useAction, useApi } from '../../hooks/useApi.js';
import { useQueryParam } from '../../hooks/useRoute.js';
import { usePolling } from '../../hooks/usePolling.js';
import {
  adoptTokenFromLocation,
  linkBooking,
  tokenForRequest,
  trackingLink,
} from '../../services/customerAccess.js';
import { customerBookingsApi, requestsApi } from '../../services/fixApi.js';
import { formatIssueLabel, formatSlot, formatTimestamp, shortRef } from '../../utils/format.js';

// The customer's side of a job: request sent → provider assigned → in progress → done.
const JOB_STAGES = [
  { status: 'PENDING', labelKey: 'customer.job.stages.sent', at: 'sentAt' },
  { status: 'ACCEPTED', labelKey: 'customer.job.stages.assigned', at: 'acceptedAt' },
  { status: 'IN_PROGRESS', labelKey: 'customer.job.stages.inProgress', at: 'startedAt' },
  { status: 'COMPLETED', labelKey: 'customer.job.stages.completed', at: 'completedAt' },
];
const JOB_RANK = { PENDING: 0, ACCEPTED: 1, IN_PROGRESS: 2, COMPLETED: 3 };
const LIVE = ['PENDING', 'ACCEPTED', 'IN_PROGRESS'];

function statusText(request, t) {
  if (request.status === 'ACCEPTED') {
    return t('customer.request.status.ACCEPTED', {
      name: request.selectedProvider?.name || t('customer.request.status.acceptedFallbackName'),
    });
  }

  return t(`customer.request.status.${request.status}`, { defaultValue: '' });
}

// Fetch-if-exists: 404 simply means "not there yet".
async function optional(promise) {
  try {
    return await promise;
  } catch (error) {
    if (error.status === 404) return null;
    throw error;
  }
}

// "Open on another phone": the private tracking link, kept out of the way in a sheet.
function ShareSheet({ open, requestId, onClose }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const token = tokenForRequest(requestId);

  if (!token) {
    return null;
  }

  const link = trackingLink(requestId, token);

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Sheet open={open} title={t('customer.request.trackingLink.title')} onClose={onClose}>
      <div className="form-stack">
        <p className="body-text">{t('customer.request.trackingLink.hint')}</p>
        <div className="field-control">
          <input
            className="field-input"
            readOnly
            value={link}
            aria-label={t('customer.request.trackingLink.title')}
            onFocus={(event) => event.target.select()}
          />
        </div>
        <Button icon={Copy} block size="lg" onClick={copy}>
          {copied ? t('customer.request.trackingLink.copied') : t('customer.request.trackingLink.copy')}
        </Button>
      </div>
    </Sheet>
  );
}

// One "My job" screen for the whole lifecycle. (The old /bookings/:id page redirects here.)
function RequestDetailsPage({ requestId }) {
  const { t } = useTranslation();
  const justCreated = useQueryParam('created') === '1';
  // A private tracking link (#access=…) grants access on this browser; adopt it before
  // the first fetch. Without a saved token there is nothing to load.
  const [hasAccess] = useState(() => {
    adoptTokenFromLocation(requestId);
    return Boolean(tokenForRequest(requestId));
  });
  const data = useApi(async () => {
    if (!hasAccess) return null;
    const { request } = await requestsApi.get(requestId);
    // Lets the job, chat, review and invoice pages (addressed by booking id) find this token.
    linkBooking(request.id, request.booking?.id);
    const bookingId = request.booking?.id;
    const [booking, review] = await Promise.all([
      bookingId ? optional(customerBookingsApi.get(bookingId)) : null,
      bookingId && request.status === 'COMPLETED' ? optional(customerBookingsApi.review(bookingId)) : null,
    ]);
    return { request, booking: booking?.booking || null, review: review?.review || null };
  }, [requestId, hasAccess]);
  const action = useAction();
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [success, setSuccess] = useState('');

  const request = data.data?.request;
  // Poll while the job is live so the customer sees acceptance / start / completion.
  usePolling(() => data.refresh(), 15000, Boolean(request) && LIVE.includes(request.status));

  const back = { to: '/requests', label: t('common.nav.myRequests') };

  if (!hasAccess) {
    return (
      <AppShell title={t('customer.request.title')} back={back}>
        <EmptyState
          icon={Smartphone}
          title={t('customer.access.noAccessTitle')}
          message={t('customer.access.noAccessMessage')}
          action={<ButtonLink to="/services">{t('common.nav.bookService')}</ButtonLink>}
        />
      </AppShell>
    );
  }

  if (data.loading) {
    return (
      <AppShell title={t('customer.request.title')} back={back}>
        <LoadingState label={t('customer.request.loading')} />
      </AppShell>
    );
  }

  if (data.error && !data.data) {
    return (
      <AppShell title={t('customer.request.title')} back={back}>
        <ErrorState
          error={data.error.status === 400 ? { status: 404, message: t('customer.request.notFound') } : data.error}
          onRetry={data.reload}
        />
      </AppShell>
    );
  }

  const { booking, review } = data.data;
  const provider = request.selectedProvider;
  const bookingId = request.booking?.id;
  const issue = formatIssueLabel(request.issueKey, request.issueLabel);
  const isCompleted = request.status === 'COMPLETED';
  const isCancelled = request.status === 'CANCELLED';
  const timeline = {
    sentAt: request.createdAt,
    acceptedAt: request.acceptedAt,
    startedAt: booking?.timeline?.startedAt,
    completedAt: booking?.timeline?.completedAt,
  };

  async function cancel() {
    setSuccess('');
    const ok = await action.run('cancel', () => requestsApi.cancel(request.id));
    setConfirmCancel(false);
    // Stored as a key so the notice follows a language switch.
    if (ok) setSuccess('customer.request.cancelled');
    // Refresh either way so a conflict (a provider just accepted) shows the real state.
    await data.refresh();
  }

  return (
    <AppShell title={request.service?.name || t('customer.request.title')} back={back}>
      <header className="job-header">
        <ServiceIcon service={request.service} size="lg" />
        <div className="job-header__text">
          <p className="job-header__ref">
            {shortRef(request.id)} · {formatTimestamp(request.createdAt)}
          </p>
          <h2 className="job-header__title">{request.service?.name || t('customer.shared.service')}</h2>
          {issue ? <p className="job-header__sub">{issue}</p> : null}
        </div>
      </header>

      <div className="stack section-gap">
        {justCreated && !success ? <Notice tone="success">{t('customer.request.created')}</Notice> : null}
        <Notice tone="success">{success ? t(success) : ''}</Notice>
        <Notice>{action.error}</Notice>
        {data.error ? <Notice>{data.error.message}</Notice> : null}
      </div>

      <Card tint={!isCancelled} className="status-panel">
        <StatusBadge status={request.status} />
        <p className="status-panel__text">{statusText(request, t)}</p>
        {isCompleted && bookingId ? (
          <div className="status-panel__actions">
            <ButtonLink to={`/bookings/${bookingId}/invoice`} icon={FileText} block>
              {t('invoice.view')}
            </ButtonLink>
            <ButtonLink to={`/bookings/${bookingId}/review`} icon={Star} variant="secondary" block>
              {review ? t('customer.booking.yourReview') : t('customer.request.leaveReview')}
            </ButtonLink>
          </div>
        ) : null}
        {request.status === 'PENDING' ? (
          <div className="status-panel__actions">
            <Button
              variant="danger-ghost"
              icon={XCircle}
              block
              onClick={() => setConfirmCancel(true)}
              disabled={Boolean(action.pending)}
            >
              {t('customer.request.cancel')}
            </Button>
          </div>
        ) : null}
      </Card>

      {provider ? (
        <section className="section" aria-labelledby="provider-heading">
          <SectionHeader id="provider-heading" title={t('customer.request.yourProvider')} />
          <Card>
            <ContactCard
              role={
                request.acceptedAt
                  ? t('customer.request.acceptedAt', { time: formatTimestamp(request.acceptedAt) })
                  : t('customer.request.yourProvider')
              }
              name={provider.name}
              image={provider.profileImage}
              phone={request.provider?.phone}
              profileTo={`/providers/${provider.id}`}
              actions={[
                request.provider?.phone && !isCancelled
                  ? { key: 'call', icon: Phone, label: t('customer.job.call'), href: `tel:${request.provider.phone}`, primary: true }
                  : null,
                bookingId && !isCancelled
                  ? {
                      key: 'chat',
                      icon: MessageCircle,
                      label: t('customer.job.chat'),
                      to: `/bookings/${bookingId}/chat`,
                      badge: <ChatCount bookingId={bookingId} />,
                    }
                  : null,
              ].filter(Boolean)}
            />
          </Card>
        </section>
      ) : null}

      <section className="section" aria-labelledby="progress-heading">
        <SectionHeader id="progress-heading" title={t('customer.job.progress')} />
        <Card>
          <TrackingTimeline status={request.status} timeline={timeline} stages={JOB_STAGES} rank={JOB_RANK} />
        </Card>
      </section>

      <section className="section" aria-labelledby="details-heading">
        <SectionHeader id="details-heading" title={t('customer.request.yourRequest')} />
        <div className="list-group">
          {issue ? <ListRow label={t('customer.shared.issue')} value={issue} /> : null}
          <ListRow label={t('customer.shared.details')} value={request.description} />
          {request.preferredDate ? (
            <ListRow label={t('customer.request.preferredTime')} value={formatSlot(request.preferredDate, request.preferredTime)} />
          ) : null}
          {request.attachments?.length || request.voiceNote?.url ? (
            <div className="list-block stack">
              <span className="list-row__label">{t('customer.request.attachments')}</span>
              <AttachmentList attachments={request.attachments} />
              <VoiceNoteBlock voiceNote={request.voiceNote} />
            </div>
          ) : null}
          <div className="list-block">
            <span className="list-row__label">{t('customer.shared.serviceLocation')}</span>
            <ServiceLocationBlock location={request.location} address={request.address} fallback={null} />
          </div>
          {request.customerDetails ? (
            <ListRow
              label={t('customer.request.yourDetails')}
              value={`${request.customerDetails.name} · ${request.customerDetails.phone}`}
            />
          ) : null}
        </div>
      </section>

      {!isCancelled && tokenForRequest(request.id) ? (
        <section className="section">
          <div className="list-group">
            <ListRow
              icon={Smartphone}
              title={t('customer.job.openElsewhere')}
              value={t('customer.job.openElsewhereHint')}
              muted
              onClick={() => setSharing(true)}
              chevron
            />
          </div>
        </section>
      ) : null}

      <ShareSheet open={sharing} requestId={request.id} onClose={() => setSharing(false)} />

      <ConfirmDialog
        open={confirmCancel}
        title={t('customer.request.confirmTitle')}
        message={t('customer.request.confirmMessage')}
        confirmLabel={t('customer.request.cancel')}
        confirmVariant="danger"
        busy={Boolean(action.pending)}
        onConfirm={cancel}
        onCancel={() => setConfirmCancel(false)}
      />
    </AppShell>
  );
}

export default RequestDetailsPage;
