import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import AppShell from '../../components/AppShell.jsx';
import { AddressBlock, Avatar, ServiceLocationBlock, AttachmentList, VoiceNoteBlock } from '../../components/cards.jsx';
import {
  Button,
  ButtonLink,
  Card,
  ConfirmDialog,
  DetailList,
  EmptyState,
  ErrorState,
  Link,
  LoadingState,
  Notice,
  PageHeader,
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
import { requestsApi } from '../../services/fixApi.js';
import { formatIssueLabel, formatSlot, formatTimestamp } from '../../utils/format.js';

function statusText(request, t) {
  switch (request.status) {
    case 'PENDING':
      return t('customer.request.status.PENDING');
    case 'ACCEPTED':
      return t('customer.request.status.ACCEPTED', {
        name: request.selectedProvider?.name || t('customer.request.status.acceptedFallbackName'),
      });
    case 'IN_PROGRESS':
      return t('customer.request.status.IN_PROGRESS');
    case 'COMPLETED':
      return t('customer.request.status.COMPLETED');
    case 'CANCELLED':
      return t('customer.request.status.CANCELLED');
    default:
      return '';
  }
}

// Private link that restores access to this request on another device or browser.
function TrackingLinkCard({ requestId }) {
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
    <Card>
      <h2 className="card__title">{t('customer.request.trackingLink.title')}</h2>
      <p className="field-hint">{t('customer.request.trackingLink.hint')}</p>
      <input className="field-input tracking-link" readOnly value={link} aria-label={t('customer.request.trackingLink.title')} onFocus={(event) => event.target.select()} />
      <div className="card__actions">
        <Button variant="secondary" onClick={copy}>
          {copied ? t('customer.request.trackingLink.copied') : t('customer.request.trackingLink.copy')}
        </Button>
      </div>
    </Card>
  );
}

function RequestDetailsPage({ requestId }) {
  const { t } = useTranslation();
  const justCreated = useQueryParam('created') === '1';
  // A private tracking link (#access=…) grants access on this browser; adopt it before
  // the first fetch. Without a saved token there is nothing to load.
  const [hasAccess] = useState(() => {
    adoptTokenFromLocation(requestId);
    return Boolean(tokenForRequest(requestId));
  });
  const data = useApi(
    () => (hasAccess ? requestsApi.get(requestId) : Promise.resolve(null)),
    [requestId, hasAccess],
  );
  const action = useAction();
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [success, setSuccess] = useState('');

  const request = data.data?.request;
  // Poll while waiting so the customer sees the moment a provider accepts.
  usePolling(() => data.refresh(), 15000, request?.status === 'PENDING');

  const back = { to: '/requests', label: t('common.nav.myRequests') };

  if (!hasAccess) {
    return (
      <AppShell>
        <PageHeader title={t('customer.request.title')} back={back} />
        <EmptyState
          title={t('customer.access.noAccessTitle')}
          message={t('customer.access.noAccessMessage')}
          action={<ButtonLink to="/services">{t('common.nav.bookService')}</ButtonLink>}
        />
      </AppShell>
    );
  }

  if (data.loading) {
    return (
      <AppShell>
        <LoadingState label={t('customer.request.loading')} />
      </AppShell>
    );
  }

  if (data.error && !data.data) {
    return (
      <AppShell>
        <PageHeader title={t('customer.request.title')} back={back} />
        <ErrorState
          error={
            data.error.status === 400
              ? { status: 404, message: t('customer.request.notFound') }
              : data.error
          }
          onRetry={data.reload}
        />
      </AppShell>
    );
  }

  async function cancel() {
    setSuccess('');
    const ok = await action.run('cancel', () => requestsApi.cancel(request.id));
    setConfirmCancel(false);
    // Stored as a key so the notice follows a language switch.
    if (ok) setSuccess('customer.request.cancelled');
    // Refresh either way so a conflict (a provider just accepted) shows the real state.
    await data.refresh();
  }

  const provider = request.selectedProvider;
  const booking = request.booking;
  // Lets the job, chat and review pages (addressed by booking id) find this token.
  linkBooking(request.id, booking?.id);

  return (
    <AppShell>
      <PageHeader
        back={back}
        title={request.status === 'PENDING' ? t('customer.request.findingProvider') : t('customer.request.yourRequest')}
        subtitle={t(formatIssueLabel(request.issueKey, request.issueLabel) ? 'customer.request.subtitleWithIssue' : 'customer.request.subtitle', {
          service: request.service?.name || t('customer.shared.service'),
          issue: formatIssueLabel(request.issueKey, request.issueLabel),
          time: formatTimestamp(request.createdAt),
        })}
        actions={<StatusBadge status={request.status} />}
      />

      <div className="stack">
        {justCreated && !success ? (
          <Notice tone="success">{t('customer.request.created')}</Notice>
        ) : null}
        <Notice tone="success">{success ? t(success) : ''}</Notice>
        <Notice>{action.error}</Notice>
        {data.error ? <Notice>{data.error.message}</Notice> : null}
      </div>

      <div className="detail-layout">
        <div className="detail-layout__main">
          <Card className={request.status === 'ACCEPTED' ? 'card--accent' : ''}>
            <h2 className="card__title">{t('customer.request.whatNext')}</h2>
            <p className="body-text">{statusText(request, t)}</p>
            {booking ? (
              <div className="card__actions">
                <ButtonLink to={`/bookings/${booking.id}`} block>
                  {t('customer.request.openBooking')}
                </ButtonLink>
                {request.status !== 'CANCELLED' ? (
                  <ButtonLink to={`/bookings/${booking.id}/chat`} variant="secondary" block>
                    {t('customer.request.chatWith', { name: provider?.name || t('customer.shared.yourProvider') })}
                  </ButtonLink>
                ) : null}
                {request.status === 'COMPLETED' ? (
                  <ButtonLink to={`/bookings/${booking.id}/review`} variant="secondary" block>
                    {t('customer.request.leaveReview')}
                  </ButtonLink>
                ) : null}
              </div>
            ) : null}
            {request.status === 'PENDING' ? (
              <div className="card__actions">
                <Button
                  variant="danger-ghost"
                  onClick={() => setConfirmCancel(true)}
                  disabled={Boolean(action.pending)}
                >
                  {t('customer.request.cancel')}
                </Button>
              </div>
            ) : null}
          </Card>

          {provider ? (
            <Card>
              <h2 className="card__title">{t('customer.request.yourProvider')}</h2>
              <div className="provider-card__head">
                <Avatar name={provider.name} image={provider.profileImage} />
                <div className="provider-card__identity">
                  <Link to={`/providers/${provider.id}`} className="provider-card__name">
                    {provider.name}
                  </Link>
                  {request.acceptedAt ? (
                    <span className="field-hint">
                      {t('customer.request.acceptedAt', { time: formatTimestamp(request.acceptedAt) })}
                    </span>
                  ) : null}
                </div>
              </div>
            </Card>
          ) : null}

          {request.status !== 'CANCELLED' ? <TrackingLinkCard requestId={request.id} /> : null}
        </div>

        <aside className="detail-layout__side">
          <Card>
            <h2 className="card__title">{t('customer.request.yourRequest')}</h2>
            <DetailList
              items={[
                { label: t('customer.shared.service'), value: request.service?.name },
                { label: t('customer.shared.issue'), value: formatIssueLabel(request.issueKey, request.issueLabel) },
                { label: t('customer.shared.details'), value: request.description },
                {
                  label: t('customer.request.preferredTime'),
                  value: request.preferredDate ? formatSlot(request.preferredDate, request.preferredTime) : '',
                },
              ]}
            />
            {request.customerDetails ? (
              <>
                <h3 className="card__subtitle">{t('customer.request.yourDetails')}</h3>
                <DetailList
                  items={[
                    { label: t('customer.book.details.name'), value: request.customerDetails.name },
                    { label: t('customer.book.details.phone'), value: request.customerDetails.phone },
                  ]}
                />
              </>
            ) : null}
            <h3 className="card__subtitle">{t('customer.shared.serviceLocation')}</h3>
            <AddressBlock address={request.address} />
            <ServiceLocationBlock location={request.location} fallback={null} />
            {request.attachments?.length ? (
              <>
                <h3 className="card__subtitle">{t('customer.request.attachments')}</h3>
                <AttachmentList attachments={request.attachments} />
              </>
            ) : null}
            <VoiceNoteBlock voiceNote={request.voiceNote} />
          </Card>
        </aside>
      </div>

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
