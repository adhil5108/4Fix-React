import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, ChevronDown, Copy, FileText, Link2, MessageCircle, Phone, Plus, Star } from 'lucide-react';
import AppShell from '../../components/AppShell.jsx';
import NoRequestAccess from '../../components/NoRequestAccess.jsx';
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
  ErrorState,
  ListRow,
  LoadingState,
  Notice,
  SectionHeader,
  Sheet,
} from '../../components/ui.jsx';
import { useAction, useApi } from '../../hooks/useApi.js';
import { navigate, useQueryParam } from '../../hooks/useRoute.js';
import { usePolling } from '../../hooks/usePolling.js';
import {
  adoptTokenFromLocation,
  linkBooking,
  tokenForRequest,
  trackingLink,
} from '../../services/customerAccess.js';
import { customerBookingsApi, requestsApi } from '../../services/fixApi.js';
import { customerTimeline, isActiveRequest, requestActions } from '../../utils/customerRequest.js';
import { formatIssueLabel, formatSlot, formatTimestamp, shortRef } from '../../utils/format.js';
import { bookPath } from '../public/publicLinks.js';

// Fetch-if-exists: 404 simply means "not there yet".
async function optional(promise) {
  try {
    return await promise;
  } catch (error) {
    if (error.status === 404) return null;
    throw error;
  }
}

// Clipboard API where allowed; the older copy command otherwise (e.g. plain-http
// previews). Returns false when neither worked so the link can be shown to copy by hand.
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const area = document.createElement('textarea');
      area.value = text;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand('copy');
      area.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

// "Keep this request": the private tracking link, copied rather than displayed. The
// link (it carries the access token) is only shown if copying is impossible.
function KeepRequestPanel({ requestId }) {
  const { t } = useTranslation();
  const [copyState, setCopyState] = useState('idle');
  const token = tokenForRequest(requestId);

  if (!token) {
    return null;
  }

  const link = trackingLink(requestId, token);

  async function copy() {
    setCopyState((await copyText(link)) ? 'copied' : 'failed');
  }

  return (
    <div className="keep-request">
      <p className="body-text">{t('customer.keep.text')}</p>
      <p className="keep-request__warning">{t('customer.keep.warning')}</p>
      <Button icon={copyState === 'copied' ? Check : Copy} variant="secondary" block onClick={copy}>
        {copyState === 'copied' ? t('customer.keep.copied') : t('customer.keep.copy')}
      </Button>
      <p className="sr-only" role="status">
        {copyState === 'copied' ? t('customer.keep.copied') : ''}
      </p>
      {copyState === 'failed' ? (
        <div className="form-stack">
          <p className="field-hint">{t('customer.keep.copyFailed')}</p>
          <div className="field-control">
            <input
              className="field-input"
              readOnly
              value={link}
              aria-label={t('customer.keep.linkLabel')}
              onFocus={(event) => event.target.select()}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

// One button per action key from requestActions().
function StatusAction({ action, tier, request, bookingId }) {
  const { t } = useTranslation();
  const label = t(`customer.state.actions.${action}`);
  const variant = tier === 'primary' ? 'primary' : tier === 'secondary' ? 'secondary' : 'ghost';
  const common = { variant, block: tier !== 'tertiary', size: tier === 'primary' ? 'lg' : tier === 'tertiary' ? 'sm' : undefined };

  switch (action) {
    case 'call':
      return (
        <ButtonLink href={`tel:${request.provider.phone}`} icon={Phone} {...common}>
          {tier === 'tertiary' ? t('customer.job.call') : label}
        </ButtonLink>
      );
    case 'chat':
      return (
        <ButtonLink to={`/bookings/${bookingId}/chat`} icon={MessageCircle} {...common}>
          {tier === 'tertiary' ? t('customer.job.chat') : label}
          <ChatCount bookingId={bookingId} />
        </ButtonLink>
      );
    case 'review':
    case 'yourReview':
      return (
        <ButtonLink to={`/bookings/${bookingId}/review`} icon={Star} {...common}>
          {label}
        </ButtonLink>
      );
    case 'invoice':
      return (
        <ButtonLink to={`/bookings/${bookingId}/invoice`} icon={FileText} {...common}>
          {label}
        </ButtonLink>
      );
    case 'newRequest':
      return (
        <ButtonLink
          to={request.service?.id ? bookPath(request.service.id, request.issueKey || undefined) : '/services'}
          icon={Plus}
          {...common}
        >
          {label}
        </ButtonLink>
      );
    default:
      return null;
  }
}

// The one place that says where the request stands: what it means, what the customer
// can do now (right under the status, so it stays near the top on small phones), and
// what happens next.
function StatusCard({ request, review, firstView, busy, onCancel }) {
  const { t } = useTranslation();
  const provider = request.selectedProvider;
  const bookingId = request.booking?.id;
  const isCancelled = request.status === 'CANCELLED';
  const name = provider?.name || t('customer.state.fallbackName');
  const copyKey = firstView && request.status === 'PENDING' ? 'firstView' : request.status;
  const actions = requestActions(request.status, {
    hasPhone: Boolean(request.provider?.phone),
    hasBooking: Boolean(bookingId),
    hasReview: Boolean(review),
  });
  const next =
    request.status === 'COMPLETED' && review
      ? t('customer.state.COMPLETED.reviewed')
      : t(`customer.state.${copyKey}.next`, { defaultValue: '' });

  return (
    <Card tint={!isCancelled} className={`request-status request-status--${request.status.toLowerCase()}`}>
      <div className="request-status__summary" aria-live="polite">
        <h2 id="request-status-title" className="request-status__title">
          {t(`customer.state.${copyKey}.title`, { name, defaultValue: request.status })}
        </h2>
        <p className="request-status__body">{t(`customer.state.${copyKey}.body`, { name, defaultValue: '' })}</p>
      </div>

      {provider && !isCancelled ? (
        <ContactCard
          role={t('customer.state.yourProvider')}
          name={provider.name}
          image={provider.profileImage}
          phone={request.provider?.phone}
          profileTo={`/providers/${provider.id}`}
        />
      ) : null}

      {actions.primary || actions.secondary.length ? (
        <div className="request-status__actions">
          {actions.primary ? (
            <StatusAction action={actions.primary} tier="primary" request={request} bookingId={bookingId} />
          ) : null}
          {actions.secondary.length ? (
            <div className="request-status__secondary">
              {actions.secondary.map((action) => (
                <StatusAction key={action} action={action} tier="secondary" request={request} bookingId={bookingId} />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {next ? (
        <div className="request-status__next">
          <h3 className="request-status__next-label">{t('customer.state.nextLabel')}</h3>
          <p>{next}</p>
          {copyKey === 'firstView' ? <p>{t('customer.state.firstView.recovery')}</p> : null}
        </div>
      ) : null}

      {actions.tertiary.length ? (
        <div className="request-status__tertiary">
          {actions.tertiary.map((action) => (
            <StatusAction key={action} action={action} tier="tertiary" request={request} bookingId={bookingId} />
          ))}
        </div>
      ) : null}

      {actions.canCancel ? (
        <button type="button" className="link request-status__cancel" onClick={onCancel} disabled={busy}>
          {t('customer.request.cancel')}
        </button>
      ) : null}
    </Card>
  );
}

// One "My request" screen for the whole lifecycle. (The old /bookings/:id page redirects here.)
function RequestDetailsPage({ requestId }) {
  const { t } = useTranslation();
  // Set once by the request form; consumed below so it never outlives this visit.
  const createdParam = useQueryParam('created') === '1';
  const [firstView] = useState(createdParam);
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
  const [cancelFailed, setCancelFailed] = useState(false);
  const errorRef = useRef(null);

  const request = data.data?.request;
  // Poll while the job is live so the customer sees acceptance / start / completion.
  usePolling(() => data.refresh(), 15000, Boolean(request) && isActiveRequest(request));

  // Drop "?created=1" from the address bar once read: a refresh, a bookmark or the
  // browser history then show the request as it is, not the one-time confirmation.
  useEffect(() => {
    if (createdParam) {
      navigate(`/requests/${encodeURIComponent(requestId)}`, { replace: true });
    }
  }, [createdParam, requestId]);

  useEffect(() => {
    if (action.error) errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [action.error]);

  const back = { to: '/requests', label: t('common.nav.myRequests') };

  if (!hasAccess) {
    return (
      <AppShell title={t('customer.request.title')} back={back}>
        <NoRequestAccess />
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
  const issue = formatIssueLabel(request.issueKey, request.issueLabel);
  const isCancelled = request.status === 'CANCELLED';
  const showFirstView = firstView && request.status === 'PENDING';
  const canKeep = !isCancelled && Boolean(tokenForRequest(request.id));
  const { stages, rank } = customerTimeline(request.status);
  const timeline = {
    sentAt: request.createdAt,
    acceptedAt: request.acceptedAt,
    locationReachedAt: request.locationReachedAt ?? booking?.timeline?.locationReachedAt,
    startedAt: booking?.timeline?.startedAt,
    completedAt: booking?.timeline?.completedAt,
  };

  async function cancel() {
    const ok = await action.run('cancel', () => requestsApi.cancel(request.id));
    setCancelFailed(!ok);
    setConfirmCancel(false);
    // Refresh either way so a conflict (a provider just accepted) shows the real state.
    await data.refresh();
  }

  return (
    <AppShell title={t('customer.request.title')} back={back}>
      <header className="request-head">
        <ServiceIcon service={request.service} size="lg" />
        <div className="request-head__text">
          <p className="request-head__service">{request.service?.name || t('customer.shared.service')}</p>
          {issue ? <p className="request-head__issue">{issue}</p> : null}
          <p className="request-head__ref">
            {t('customer.request.reference', { ref: shortRef(request.id), date: formatTimestamp(request.createdAt) })}
          </p>
        </div>
      </header>

      <div className="stack section-gap" ref={errorRef}>
        {/* A provider accepted just before the cancel landed: the page already shows it. */}
        {cancelFailed && !['PENDING', 'CANCELLED'].includes(request.status) ? (
          <Notice tone="info">{t('customer.request.cancelTooLate')}</Notice>
        ) : (
          <Notice>{action.error}</Notice>
        )}
        {data.error ? (
          <Notice>
            <strong>{t('customer.state.staleTitle')}</strong> {t('customer.state.stale')}{' '}
            <button type="button" className="link" onClick={() => data.refresh()}>
              {t('common.actions.tryAgain')}
            </button>
          </Notice>
        ) : null}
      </div>

      <StatusCard
        request={request}
        review={review}
        firstView={firstView}
        busy={Boolean(action.pending)}
        onCancel={() => setConfirmCancel(true)}
      />

      {showFirstView && canKeep ? (
        <section className="section" aria-labelledby="keep-heading">
          <SectionHeader id="keep-heading" title={t('customer.keep.title')} />
          <Card>
            <KeepRequestPanel requestId={request.id} />
          </Card>
        </section>
      ) : null}

      {!isCancelled ? (
        <section className="section" aria-labelledby="progress-heading">
          <SectionHeader id="progress-heading" title={t('customer.job.progress')} />
          <Card>
            <TrackingTimeline status={request.status} timeline={timeline} stages={stages} rank={rank} reachedIsDone />
          </Card>
        </section>
      ) : null}

      <section className="section">
        <details className="request-details">
          <summary className="request-details__summary">
            <span>{t('customer.request.requestDetails')}</span>
            <ChevronDown aria-hidden="true" />
          </summary>
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
        </details>
      </section>

      {canKeep && !showFirstView ? (
        <section className="section">
          <div className="list-group">
            <ListRow
              icon={Link2}
              title={t('customer.keep.title')}
              value={t('customer.keep.rowText')}
              muted
              onClick={() => setSharing(true)}
              chevron
            />
          </div>
        </section>
      ) : null}

      <Sheet open={sharing} title={t('customer.keep.title')} onClose={() => setSharing(false)}>
        <KeepRequestPanel requestId={request.id} />
      </Sheet>

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
