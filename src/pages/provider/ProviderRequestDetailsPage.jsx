import { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
import { formatIssueLabel, formatSlot, formatTimestamp } from '../../utils/format.js';

function ProviderRequestDetailsPage({ requestId }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const data = useApi(() => providerApi.getRequest(requestId), [requestId]);
  const [taken, setTaken] = useState(false);

  const back = { to: '/provider/requests', label: t('provider.requests.title') };

  if (data.loading) {
    return (
      <AppShell>
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
      <AppShell>
        <PageHeader title={t('provider.requestDetails.title')} back={back} />
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
  const posted = formatTimestamp(request.createdAt);

  return (
    <AppShell>
      <PageHeader
        back={back}
        title={request.service?.name || t('provider.requestDetails.fallbackTitle')}
        subtitle={
          formatIssueLabel(request.issueKey, request.issueLabel)
            ? t('provider.requestDetails.postedWithIssue', { issue: formatIssueLabel(request.issueKey, request.issueLabel), time: posted })
            : t('provider.requestDetails.posted', { time: posted })
        }
        actions={<StatusBadge status={taken ? 'ACCEPTED' : request.status} audience="provider" />}
      />

      <div className="detail-layout">
        <div className="detail-layout__main">
          {canAccept ? (
            <Card className="card--accent">
              <h2 className="card__title">{t('provider.requestDetails.takeTitle')}</h2>
              <p className="body-text">{t('provider.requestDetails.takeText')}</p>
              <AcceptJobButton
                requestId={request.id}
                size="lg"
                onTaken={() => setTaken(true)}
                onFailed={() => data.refresh()}
              />
            </Card>
          ) : null}

          {isOpen && isAdminViewer ? (
            <Notice tone="info">{t('provider.requestDetails.adminReadOnly')}</Notice>
          ) : null}

          {isAssigned && request.bookingId ? (
            <Card className="card--accent">
              <h2 className="card__title">{t('provider.requestDetails.yoursTitle')}</h2>
              <p className="body-text">{t('provider.requestDetails.yoursText')}</p>
              <ButtonLink to={`/provider/jobs/${request.bookingId}`} block>
                {t('provider.requestDetails.openJob')}
              </ButtonLink>
            </Card>
          ) : null}

          {taken ? (
            <Card>
              <h2 className="card__title">{t('provider.requestDetails.goneTitle')}</h2>
              <p className="body-text">{t('provider.requestDetails.alreadyAccepted')}</p>
              <ButtonLink to="/provider/requests" variant="secondary" block>
                {t('provider.requestDetails.seeOther')}
              </ButtonLink>
            </Card>
          ) : null}

          {request.status === 'CANCELLED' ? (
            <Card>
              <h2 className="card__title">{t('provider.requestDetails.cancelledTitle')}</h2>
              <p className="body-text">{t('provider.requestDetails.cancelledText')}</p>
            </Card>
          ) : null}
        </div>

        <aside className="detail-layout__side">
          <Card>
            <h2 className="card__title">{t('provider.requestDetails.detailsTitle')}</h2>
            <DetailList
              items={[
                // Contact details arrive only once this provider has accepted the job.
                { label: t('provider.shared.customer'), value: request.customer?.name },
                {
                  label: t('provider.shared.phone'),
                  value: request.customer?.phone ? (
                    <a href={`tel:${request.customer.phone}`} className="text-link">
                      {request.customer.phone}
                    </a>
                  ) : null,
                },
                { label: t('provider.shared.issue'), value: formatIssueLabel(request.issueKey, request.issueLabel) },
                { label: t('provider.shared.problem'), value: request.description },
                {
                  label: t('provider.shared.preferredTime'),
                  value: request.preferredDate ? formatSlot(request.preferredDate, request.preferredTime) : '',
                },
              ]}
            />
            <h3 className="card__subtitle">{isAssigned ? t('provider.shared.serviceLocation') : t('provider.shared.area')}</h3>
            <AddressBlock address={request.address} />
            <ServiceLocationBlock
              location={request.location}
              navigate
              fallback={
                isAssigned
                  ? t('provider.shared.noMapPin')
                  : t('provider.requestDetails.locationAfterAccept')
              }
            />
            {request.attachments?.length ? (
              <>
                <h3 className="card__subtitle">{t('provider.shared.photos')}</h3>
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
