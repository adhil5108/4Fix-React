import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Inbox } from 'lucide-react';
import AcceptJobButton from '../../components/AcceptJobButton.jsx';
import AppShell from '../../components/AppShell.jsx';
import { AttachmentList, ServiceIcon, ServiceLocationBlock, VoiceNoteBlock } from '../../components/cards.jsx';
import {
  ButtonLink,
  Card,
  EmptyState,
  ErrorState,
  ListRow,
  LoadingState,
  Notice,
  SectionHeader,
  StatusBadge,
  StickyActionBar,
} from '../../components/ui.jsx';
import { useApi } from '../../hooks/useApi.js';
import { useAuth } from '../../hooks/useAuth.jsx';
import { providerApi } from '../../services/fixApi.js';
import { formatAddress, formatIssueLabel, formatRelative, formatSlot, shortRef } from '../../utils/format.js';

// An open request before acceptance: the problem and the area only. The customer's name,
// phone and exact location arrive once this provider accepts.
function ProviderRequestDetailsPage({ requestId }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const data = useApi(() => providerApi.getRequest(requestId), [requestId]);
  const [taken, setTaken] = useState(false);

  const back = { to: '/provider/requests', label: t('provider.requests.title') };

  if (data.loading) {
    return (
      <AppShell title={t('provider.requestDetails.title')} back={back}>
        <LoadingState label={t('provider.requestDetails.loading')} />
      </AppShell>
    );
  }

  if (data.error && !data.data) {
    const error =
      data.error.status === 403
        ? { status: 403, message: t('provider.requestDetails.alreadyAccepted') }
        : data.error.status === 400
          ? { status: 404, message: t('provider.requestDetails.notFound') }
          : data.error;

    return (
      <AppShell title={t('provider.requestDetails.title')} back={back}>
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
  const issue = formatIssueLabel(request.issueKey, request.issueLabel);
  const area = request.address ? formatAddress(request.address) : '';

  return (
    <AppShell title={request.service?.name || t('provider.requestDetails.fallbackTitle')} back={back} bar={canAccept}>
      <header className="job-header">
        <ServiceIcon service={request.service} size="lg" />
        <div className="job-header__text">
          <p className="job-header__ref">
            {shortRef(request.id)} · {formatRelative(request.createdAt)}
          </p>
          <h2 className="job-header__title">{request.service?.name || t('provider.requestDetails.fallbackTitle')}</h2>
          {issue ? <p className="job-header__sub">{issue}</p> : null}
        </div>
        <StatusBadge status={taken ? 'ACCEPTED' : request.status} audience="provider" />
      </header>

      <div className="stack section-gap">
        {isOpen && isAdminViewer ? <Notice tone="info">{t('provider.requestDetails.adminReadOnly')}</Notice> : null}
        {canAccept ? <Notice tone="info">{t('provider.requestDetails.takeText')}</Notice> : null}
      </div>

      {isAssigned && request.bookingId ? (
        <Card tint className="status-panel">
          <p className="status-panel__text">{t('provider.requestDetails.yoursText')}</p>
          <ButtonLink to={`/provider/jobs/${request.bookingId}`} block>
            {t('provider.requestDetails.openJob')}
          </ButtonLink>
        </Card>
      ) : null}

      {taken ? (
        <EmptyState
          icon={Inbox}
          title={t('provider.requestDetails.goneTitle')}
          message={t('provider.requestDetails.alreadyAccepted')}
          action={
            <ButtonLink to="/provider/requests" variant="secondary">
              {t('provider.requestDetails.seeOther')}
            </ButtonLink>
          }
        />
      ) : null}

      {request.status === 'CANCELLED' ? (
        <Notice tone="info">{t('provider.requestDetails.cancelledText')}</Notice>
      ) : null}

      <section className="section" aria-labelledby="request-details-heading">
        <SectionHeader id="request-details-heading" title={t('provider.requestDetails.detailsTitle')} />
        <div className="list-group">
          {request.customer?.name ? <ListRow label={t('provider.shared.customer')} value={request.customer.name} /> : null}
          {issue ? <ListRow label={t('provider.shared.issue')} value={issue} /> : null}
          <ListRow label={t('provider.shared.problem')} value={request.description} />
          {request.preferredDate ? (
            <ListRow label={t('provider.shared.preferredTime')} value={formatSlot(request.preferredDate, request.preferredTime)} />
          ) : null}
          <div className="list-block">
            <span className="list-row__label">{isAssigned ? t('provider.shared.serviceLocation') : t('provider.shared.area')}</span>
            {isAssigned ? (
              <ServiceLocationBlock location={request.location} address={request.address} navigate fallback={t('provider.shared.noMapPin')} />
            ) : (
              <>
                <p className="list-row__value">{area || '—'}</p>
                <p className="field-hint">{t('provider.requestDetails.locationAfterAccept')}</p>
              </>
            )}
          </div>
          {request.attachments?.length || request.voiceNote?.url ? (
            <div className="list-block stack">
              <span className="list-row__label">{t('provider.shared.photos')}</span>
              <AttachmentList attachments={request.attachments} />
              <VoiceNoteBlock voiceNote={request.voiceNote} />
            </div>
          ) : null}
        </div>
      </section>

      {canAccept ? (
        <StickyActionBar>
          <AcceptJobButton
            requestId={request.id}
            size="lg"
            onTaken={() => setTaken(true)}
            onFailed={() => data.refresh()}
          />
        </StickyActionBar>
      ) : null}
    </AppShell>
  );
}

export default ProviderRequestDetailsPage;
