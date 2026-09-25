import { useState } from 'react';
import AcceptJobButton from '../../components/AcceptJobButton.jsx';
import AppShell from '../../components/AppShell.jsx';
import { AddressBlock, ServiceLocationBlock, AttachmentList, VoiceNoteBlock } from '../../components/cards.jsx';
import {
  ButtonLink,
  Card,
  DetailList,
  ErrorState,
  LoadingState,
  Notice,
  PageHeader,
  StatusBadge,
} from '../../components/ui.jsx';
import { useApi } from '../../hooks/useApi.js';
import { useAuth } from '../../hooks/useAuth.jsx';
import { providerApi } from '../../services/fixApi.js';
import { formatSlot, formatTimestamp } from '../../utils/format.js';

function ProviderRequestDetailsPage({ requestId }) {
  const { user } = useAuth();
  const data = useApi(() => providerApi.getRequest(requestId), [requestId]);
  const [taken, setTaken] = useState(false);

  const back = { to: '/provider/requests', label: 'Available requests' };

  if (data.loading) {
    return (
      <AppShell>
        <LoadingState label="Loading request…" />
      </AppShell>
    );
  }

  if (data.error && !data.data) {
    const error =
      data.error.status === 403
        ? { status: 403, message: 'This job has already been accepted by another provider.' }
        : data.error.status === 400
          ? { status: 404, message: 'This request could not be found.' }
          : data.error;

    return (
      <AppShell>
        <PageHeader title="Request" back={back} />
        <ErrorState error={error} />
      </AppShell>
    );
  }

  const { request } = data.data;
  const isAdminViewer = user.role === 'ADMIN';
  const isAssigned = request.selectedProviderId === user.id;
  const isOpen = request.status === 'PENDING' && !taken;
  // Admin reaches this page from Provider View, but is never a real provider — the
  // backend rejects ADMIN on accept, so the button is never offered.
  const canAccept = isOpen && !isAdminViewer;

  return (
    <AppShell>
      <PageHeader
        back={back}
        title={request.service?.name || 'Service request'}
        subtitle={`${request.issueLabel ? `${request.issueLabel} · ` : ''}posted ${formatTimestamp(request.createdAt)}`}
        actions={<StatusBadge status={taken ? 'ACCEPTED' : request.status} audience="provider" />}
      />

      <div className="detail-layout">
        <div className="detail-layout__main">
          {canAccept ? (
            <Card className="card--accent">
              <h2 className="card__title">Take this job?</h2>
              <p className="body-text">
                The first provider to accept gets the job. You’ll then see the customer’s exact
                location, can chat with them and schedule the visit. Agree the price with the customer
                directly.
              </p>
              <AcceptJobButton
                requestId={request.id}
                size="lg"
                onTaken={() => setTaken(true)}
                onFailed={() => data.refresh()}
              />
            </Card>
          ) : null}

          {isOpen && isAdminViewer ? (
            <Notice tone="info">Admin preview is read-only — accepting jobs is a provider-only action.</Notice>
          ) : null}

          {isAssigned && request.bookingId ? (
            <Card className="card--accent">
              <h2 className="card__title">This is your job</h2>
              <p className="body-text">Manage the visit, navigation, chat and notes from the job page.</p>
              <ButtonLink to={`/provider/jobs/${request.bookingId}`} block>
                Open job
              </ButtonLink>
            </Card>
          ) : null}

          {taken ? (
            <Card>
              <h2 className="card__title">Job no longer available</h2>
              <p className="body-text">This job has already been accepted by another provider.</p>
              <ButtonLink to="/provider/requests" variant="secondary" block>
                See other requests
              </ButtonLink>
            </Card>
          ) : null}

          {request.status === 'CANCELLED' ? (
            <Card>
              <h2 className="card__title">Request cancelled</h2>
              <p className="body-text">The customer cancelled this request.</p>
            </Card>
          ) : null}
        </div>

        <aside className="detail-layout__side">
          <Card>
            <h2 className="card__title">Job details</h2>
            <DetailList
              items={[
                { label: 'Customer', value: request.customer?.name },
                { label: 'Issue', value: request.issueLabel },
                { label: 'Problem', value: request.description },
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
            <h3 className="card__subtitle">{isAssigned ? 'Service location' : 'Area'}</h3>
            <AddressBlock address={request.address} />
            <ServiceLocationBlock
              location={request.location}
              navigate
              fallback={
                isAssigned
                  ? 'No map pin for this job. Use the address above or ask the customer in chat.'
                  : 'The customer’s exact location is shared once you accept the job.'
              }
            />
            {request.attachments?.length ? (
              <>
                <h3 className="card__subtitle">Photos</h3>
                <AttachmentList attachments={request.attachments} />
              </>
            ) : null}
            <VoiceNoteBlock voiceNote={request.voiceNote} />
          </Card>
        </aside>
      </div>

    </AppShell>
  );
}

export default ProviderRequestDetailsPage;
