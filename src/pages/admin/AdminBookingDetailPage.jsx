import AdminShell from '../../components/admin/AdminShell.jsx';
import TrackingTimeline from '../../components/TrackingTimeline.jsx';
import { AddressBlock, AttachmentList } from '../../components/cards.jsx';
import { Card, DetailList, ErrorState, Link, LoadingState, PageHeader, StatusBadge } from '../../components/ui.jsx';
import { useApi } from '../../hooks/useApi.js';
import { adminApi } from '../../services/fixApi.js';
import { formatMoney, formatSlot } from '../../utils/format.js';

function AdminBookingDetailPage({ bookingId }) {
  const data = useApi(() => adminApi.booking(bookingId), [bookingId]);
  const back = { to: '/app/admin/bookings', label: 'Bookings' };

  if (data.loading) {
    return (
      <AdminShell>
        <LoadingState label="Loading booking…" />
      </AdminShell>
    );
  }

  if (data.error) {
    return (
      <AdminShell>
        <PageHeader title="Booking" back={back} />
        <ErrorState error={data.error} onRetry={data.reload} />
      </AdminShell>
    );
  }

  const { booking } = data.data;

  return (
    <AdminShell>
      <PageHeader
        back={back}
        title={booking.service?.name || 'Booking'}
        subtitle={booking.request?.issueLabel}
        actions={<StatusBadge status={booking.status} audience="booking" />}
      />

      <div className="admin-detail">
        <div>
          <Card>
            <h2 className="card__title">Progress</h2>
            <TrackingTimeline status={booking.status} timeline={booking.timeline} />
          </Card>

          <Card>
            <h2 className="card__title">Job details</h2>
            <DetailList
              items={[
                { label: 'Description', value: booking.request?.description },
                {
                  label: 'Scheduled visit',
                  value: booking.scheduledDate ? formatSlot(booking.scheduledDate, booking.scheduledTime) : '',
                },
                { label: 'Amount', value: formatMoney(booking.amount) },
              ]}
            />
            <h3 className="card__subtitle">Address</h3>
            <AddressBlock address={booking.request?.address} />
            {booking.request?.attachments?.length ? (
              <>
                <h3 className="card__subtitle">Attachments</h3>
                <AttachmentList attachments={booking.request.attachments} />
              </>
            ) : null}
          </Card>
        </div>

        <aside>
          <Card>
            <h2 className="card__title">Customer</h2>
            <DetailList items={[{ label: 'Name', value: booking.customer?.name }]} />
            {booking.customer ? (
              <Link to={`/app/admin/customers/${booking.customer.id}`} className="text-link">
                View customer →
              </Link>
            ) : null}
          </Card>
          <Card>
            <h2 className="card__title">Provider</h2>
            <DetailList items={[{ label: 'Name', value: booking.provider?.name }]} />
            {booking.provider ? (
              <Link to={`/app/admin/providers/${booking.provider.id}`} className="text-link">
                View provider →
              </Link>
            ) : null}
          </Card>
          <Card>
            <h2 className="card__title">Request</h2>
            <Link to={`/app/admin/requests/${booking.requestId}`} className="text-link">
              View original request →
            </Link>
          </Card>
        </aside>
      </div>
    </AdminShell>
  );
}

export default AdminBookingDetailPage;
