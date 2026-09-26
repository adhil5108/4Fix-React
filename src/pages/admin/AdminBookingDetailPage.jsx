import { useTranslation } from 'react-i18next';
import AdminShell from '../../components/admin/AdminShell.jsx';
import AdminConversationView from '../../components/admin/AdminConversationView.jsx';
import TrackingTimeline from '../../components/TrackingTimeline.jsx';
import { AddressBlock, ServiceLocationBlock, AttachmentList, VoiceNoteBlock } from '../../components/cards.jsx';
import { Card, DetailList, ErrorState, Link, LoadingState, PageHeader, StatusBadge } from '../../components/ui.jsx';
import { useApi } from '../../hooks/useApi.js';
import { adminApi } from '../../services/fixApi.js';
import { formatDateTime, formatIssueLabel } from '../../utils/format.js';

function AdminBookingDetailPage({ bookingId }) {
  const { t } = useTranslation();
  const data = useApi(() => adminApi.booking(bookingId), [bookingId]);
  const back = { to: '/app/admin/bookings', label: t('common.adminNav.bookings') };

  if (data.loading) {
    return (
      <AdminShell>
        <LoadingState label={t('admin.bookingDetail.loading')} />
      </AdminShell>
    );
  }

  if (data.error) {
    return (
      <AdminShell>
        <PageHeader title={t('admin.bookingDetail.fallbackTitle')} back={back} />
        <ErrorState error={data.error} onRetry={data.reload} />
      </AdminShell>
    );
  }

  const { booking } = data.data;

  return (
    <AdminShell>
      <PageHeader
        back={back}
        title={booking.service?.name || t('admin.bookingDetail.fallbackTitle')}
        subtitle={formatIssueLabel(booking.request?.issueKey, booking.request?.issueLabel)}
        actions={<StatusBadge status={booking.status} audience="booking" />}
      />

      <div className="admin-detail">
        <div>
          <Card>
            <h2 className="card__title">{t('admin.bookingDetail.progress')}</h2>
            <TrackingTimeline status={booking.status} timeline={booking.timeline} />
          </Card>

          <Card>
            <h2 className="card__title">{t('admin.bookingDetail.jobDetails')}</h2>
            <DetailList
              items={[
                { label: t('admin.fields.description'), value: booking.request?.description },
                { label: t('admin.fields.accepted'), value: formatDateTime(booking.timeline?.acceptedAt) },
                { label: t('admin.fields.started'), value: formatDateTime(booking.timeline?.startedAt) },
                { label: t('admin.fields.completed'), value: formatDateTime(booking.timeline?.completedAt) },
              ]}
            />
            <h3 className="card__subtitle">{t('admin.fields.location')}</h3>
            <AddressBlock address={booking.request?.address} />
            <ServiceLocationBlock location={booking.request?.location} fallback={null} />
            {booking.request?.attachments?.length ? (
              <>
                <h3 className="card__subtitle">{t('admin.fields.attachments')}</h3>
                <AttachmentList attachments={booking.request.attachments} />
              </>
            ) : null}
            <VoiceNoteBlock voiceNote={booking.request?.voiceNote} />
          </Card>

          <Card>
            <h2 className="card__title">{t('admin.bookingDetail.conversation')}</h2>
            <AdminConversationView bookingId={booking.id} />
          </Card>
        </div>

        <aside>
          <Card>
            <h2 className="card__title">{t('admin.fields.customer')}</h2>
            <DetailList items={[{ label: t('admin.fields.name'), value: booking.customer?.name }]} />
            {booking.customer ? (
              <Link to={`/app/admin/customers/${booking.customer.id}`} className="text-link">
                {t('admin.shared.viewCustomer')}
              </Link>
            ) : null}
          </Card>
          <Card>
            <h2 className="card__title">{t('admin.fields.provider')}</h2>
            <DetailList items={[{ label: t('admin.fields.name'), value: booking.provider?.name }]} />
            {booking.provider ? (
              <Link to={`/app/admin/providers/${booking.provider.id}`} className="text-link">
                {t('admin.shared.viewProvider')}
              </Link>
            ) : null}
          </Card>
          <Card>
            <h2 className="card__title">{t('admin.bookingDetail.request')}</h2>
            <Link to={`/app/admin/requests/${booking.requestId}`} className="text-link">
              {t('admin.bookingDetail.viewOriginalRequest')}
            </Link>
          </Card>
        </aside>
      </div>
    </AdminShell>
  );
}

export default AdminBookingDetailPage;
