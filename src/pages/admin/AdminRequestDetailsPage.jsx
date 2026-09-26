import { useTranslation } from 'react-i18next';
import AdminShell from '../../components/admin/AdminShell.jsx';
import { AddressBlock, ServiceLocationBlock, AttachmentList, VoiceNoteBlock } from '../../components/cards.jsx';
import {
  Card,
  DetailList,
  ErrorState,
  Link,
  LoadingState,
  PageHeader,
  StatusBadge,
} from '../../components/ui.jsx';
import { useApi } from '../../hooks/useApi.js';
import { adminApi } from '../../services/fixApi.js';
import { formatIssueLabel, formatSlot, formatTimestamp } from '../../utils/format.js';

function AdminRequestDetailsPage({ requestId }) {
  const { t } = useTranslation();
  const data = useApi(() => adminApi.request(requestId), [requestId]);
  const back = { to: '/app/admin/requests', label: t('common.adminNav.requests') };

  if (data.loading) {
    return (
      <AdminShell>
        <LoadingState label={t('admin.requestDetail.loading')} />
      </AdminShell>
    );
  }

  if (data.error) {
    return (
      <AdminShell>
        <PageHeader title={t('admin.requestDetail.fallbackTitle')} back={back} />
        <ErrorState error={data.error} onRetry={data.reload} />
      </AdminShell>
    );
  }

  const { request, booking, review } = data.data;

  return (
    <AdminShell>
      <PageHeader
        back={back}
        title={request.service?.name || t('admin.requestDetail.serviceFallback')}
        subtitle={t('admin.requestDetail.subtitle', {
          name: request.customer?.name || t('admin.shared.customerFallback'),
          time: formatTimestamp(request.createdAt),
        })}
        actions={<StatusBadge status={request.status} />}
      />

      <div className="admin-detail">
        <div>
          <Card>
            <h2 className="card__title">{t('admin.requestDetail.request')}</h2>
            <DetailList
              items={[
                { label: t('admin.fields.customer'), value: request.customer?.name },
                { label: t('admin.fields.service'), value: request.service?.name },
                { label: t('admin.fields.issue'), value: formatIssueLabel(request.issueKey, request.issueLabel) },
                { label: t('admin.fields.description'), value: request.description },
                {
                  label: t('admin.requestDetail.preferredTime'),
                  value: request.preferredDate ? formatSlot(request.preferredDate, request.preferredTime) : '',
                },
                { label: t('admin.requestDetail.accepted'), value: request.acceptedAt ? formatTimestamp(request.acceptedAt) : '' },
              ]}
            />
            <h3 className="card__subtitle">{t('admin.fields.location')}</h3>
            <AddressBlock address={request.address} />
            <ServiceLocationBlock location={request.location} fallback={null} />
            {request.attachments?.length ? (
              <>
                <h3 className="card__subtitle">{t('admin.fields.attachments')}</h3>
                <AttachmentList attachments={request.attachments} />
              </>
            ) : null}
            <VoiceNoteBlock voiceNote={request.voiceNote} />
          </Card>

          {booking ? (
            <Card>
              <h2 className="card__title">{t('admin.requestDetail.conversation')}</h2>
              <p className="body-text">{t('admin.requestDetail.conversationBody')}</p>
              <Link to={`/app/admin/bookings/${booking.id}`} className="text-link">
                {t('admin.requestDetail.viewConversation')}
              </Link>
            </Card>
          ) : null}

          {booking ? (
            <Card>
              <div className="card__heading-row">
                <h2 className="card__title">{t('admin.requestDetail.booking')}</h2>
                <StatusBadge status={booking.status} audience="booking" />
              </div>
              <DetailList
                items={[
                  { label: t('admin.fields.provider'), value: booking.provider?.name },
                  { label: t('admin.fields.accepted'), value: formatTimestamp(booking.confirmedAt) },
                ]}
              />
              <Link to={`/app/admin/bookings/${booking.id}`} className="text-link">
                {t('admin.shared.viewBooking')}
              </Link>
            </Card>
          ) : null}

          {review ? (
            <Card>
              <h2 className="card__title">{t('admin.requestDetail.review')}</h2>
              <DetailList
                items={[
                  { label: t('admin.fields.rating'), value: t('admin.shared.ratingOutOf', { rating: review.rating }) },
                  { label: t('admin.fields.comment'), value: review.comment },
                ]}
              />
            </Card>
          ) : null}
        </div>

        <aside>
          <Card>
            <h2 className="card__title">{t('admin.fields.customer')}</h2>
            <DetailList items={[{ label: t('admin.fields.name'), value: request.customer?.name }]} />
            {request.customer ? (
              <Link to={`/app/admin/customers/${request.customer.id}`} className="text-link">
                {t('admin.shared.viewCustomer')}
              </Link>
            ) : null}
          </Card>
          <Card>
            <h2 className="card__title">{t('admin.requestDetail.assignedProvider')}</h2>
            {request.selectedProvider ? (
              <DetailList items={[{ label: t('admin.fields.provider'), value: request.selectedProvider.name }]} />
            ) : (
              <p className="body-text">{t('admin.requestDetail.noProvider')}</p>
            )}
            {request.selectedProvider ? (
              <Link to={`/app/admin/providers/${request.selectedProviderId}`} className="text-link">
                {t('admin.shared.viewProvider')}
              </Link>
            ) : null}
          </Card>
        </aside>
      </div>

    </AdminShell>
  );
}

export default AdminRequestDetailsPage;
