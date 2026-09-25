import { useState } from 'react';
import AppShell from '../../components/AppShell.jsx';
import { AddressBlock, Avatar, ServiceLocationBlock, AttachmentList, VoiceNoteBlock } from '../../components/cards.jsx';
import {
  Button,
  ButtonLink,
  Card,
  ConfirmDialog,
  DetailList,
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
import { requestsApi } from '../../services/fixApi.js';
import { formatSlot, formatTimestamp } from '../../utils/format.js';

function statusText(request) {
  switch (request.status) {
    case 'PENDING':
      return 'Your request is live. Nearby providers can see it — the first one to accept takes the job. This page updates automatically.';
    case 'ACCEPTED':
      return `${request.selectedProvider?.name || 'A provider'} accepted your request and will schedule the visit. You can chat with them now.`;
    case 'SCHEDULED':
      return `Your visit is scheduled for ${formatSlot(request.scheduledDate, request.scheduledTime)}.`;
    case 'IN_PROGRESS':
      return 'Work on your request is in progress.';
    case 'COMPLETED':
      return 'This job is complete. Let others know how it went by leaving a review.';
    case 'CANCELLED':
      return 'This request was cancelled.';
    default:
      return '';
  }
}

function RequestDetailsPage({ requestId }) {
  const justCreated = useQueryParam('created') === '1';
  const data = useApi(() => requestsApi.get(requestId), [requestId]);
  const action = useAction();
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [success, setSuccess] = useState('');

  const request = data.data?.request;
  // Poll while waiting so the customer sees the moment a provider accepts.
  usePolling(() => data.refresh(), 15000, request?.status === 'PENDING');

  const back = { to: '/bookings', label: 'My bookings' };

  if (data.loading) {
    return (
      <AppShell>
        <LoadingState label="Loading your request…" />
      </AppShell>
    );
  }

  if (data.error && !data.data) {
    return (
      <AppShell>
        <PageHeader title="Request" back={back} />
        <ErrorState
          error={
            data.error.status === 400
              ? { status: 404, message: 'This request could not be found.' }
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
    if (ok) setSuccess('Your request was cancelled.');
    // Refresh either way so a conflict (a provider just accepted) shows the real state.
    await data.refresh();
  }

  const provider = request.selectedProvider;
  const booking = request.booking;

  return (
    <AppShell>
      <PageHeader
        back={back}
        title={request.status === 'PENDING' ? 'Finding a provider' : 'Your request'}
        subtitle={`${request.service?.name || 'Service'}${request.issueLabel ? ` · ${request.issueLabel}` : ''} · requested ${formatTimestamp(request.createdAt)}`}
        actions={<StatusBadge status={request.status} />}
      />

      <div className="stack">
        {justCreated && !success ? (
          <Notice tone="success">Request sent. Providers near you can now see it and accept the job.</Notice>
        ) : null}
        <Notice tone="success">{success}</Notice>
        <Notice>{action.error}</Notice>
        {data.error ? <Notice>{data.error.message}</Notice> : null}
      </div>

      <div className="detail-layout">
        <div className="detail-layout__main">
          <Card className={request.status === 'ACCEPTED' ? 'card--accent' : ''}>
            <h2 className="card__title">What happens next</h2>
            <p className="body-text">{statusText(request)}</p>
            {booking ? (
              <div className="card__actions">
                <ButtonLink to={`/bookings/${booking.id}`} block>
                  Open your booking
                </ButtonLink>
                {request.status !== 'CANCELLED' ? (
                  <ButtonLink to={`/bookings/${booking.id}/chat`} variant="secondary" block>
                    Chat with {provider?.name || 'your provider'}
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
                  Cancel request
                </Button>
              </div>
            ) : null}
          </Card>

          {provider ? (
            <Card>
              <h2 className="card__title">Your provider</h2>
              <div className="provider-card__head">
                <Avatar name={provider.name} image={provider.profileImage} />
                <div className="provider-card__identity">
                  <Link to={`/providers/${provider.id}`} className="provider-card__name">
                    {provider.name}
                  </Link>
                  {request.acceptedAt ? (
                    <span className="field-hint">Accepted {formatTimestamp(request.acceptedAt)}</span>
                  ) : null}
                </div>
              </div>
            </Card>
          ) : null}
        </div>

        <aside className="detail-layout__side">
          <Card>
            <h2 className="card__title">Your request</h2>
            <DetailList
              items={[
                { label: 'Service', value: request.service?.name },
                { label: 'Issue', value: request.issueLabel },
                { label: 'Details', value: request.description },
                {
                  label: 'Preferred time',
                  value: request.preferredDate ? formatSlot(request.preferredDate, request.preferredTime) : '',
                },
                {
                  label: 'Scheduled visit',
                  value: request.scheduledDate ? formatSlot(request.scheduledDate, request.scheduledTime) : '',
                },
              ]}
            />
            <h3 className="card__subtitle">Service location</h3>
            <AddressBlock address={request.address} />
            <ServiceLocationBlock location={request.location} fallback={null} />
            {request.attachments?.length ? (
              <>
                <h3 className="card__subtitle">Attachments</h3>
                <AttachmentList attachments={request.attachments} />
              </>
            ) : null}
            <VoiceNoteBlock voiceNote={request.voiceNote} />
          </Card>
        </aside>
      </div>

      <ConfirmDialog
        open={confirmCancel}
        title="Cancel this request?"
        message="Providers will no longer be able to accept it. This cannot be undone."
        confirmLabel="Cancel request"
        confirmVariant="danger"
        busy={Boolean(action.pending)}
        onConfirm={cancel}
        onCancel={() => setConfirmCancel(false)}
      />
    </AppShell>
  );
}

export default RequestDetailsPage;
