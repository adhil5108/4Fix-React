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
import { formatSlot, formatTimestamp } from '../../utils/format.js';

function AdminRequestDetailsPage({ requestId }) {
  const data = useApi(() => adminApi.request(requestId), [requestId]);
  const back = { to: '/app/admin/requests', label: 'Requests' };

  if (data.loading) {
    return (
      <AdminShell>
        <LoadingState label="Loading request…" />
      </AdminShell>
    );
  }

  if (data.error) {
    return (
      <AdminShell>
        <PageHeader title="Request" back={back} />
        <ErrorState error={data.error} onRetry={data.reload} />
      </AdminShell>
    );
  }

  const { request, booking, review } = data.data;

  return (
    <AdminShell>
      <PageHeader
        back={back}
        title={request.service?.name || 'Service request'}
        subtitle={`${request.customer?.name || 'Customer'} · requested ${formatTimestamp(request.createdAt)}`}
        actions={<StatusBadge status={request.status} />}
      />

      <div className="admin-detail">
        <div>
          <Card>
            <h2 className="card__title">Request</h2>
            <DetailList
              items={[
                { label: 'Customer', value: request.customer?.name },
                { label: 'Service', value: request.service?.name },
                { label: 'Issue', value: request.issueLabel },
                { label: 'Description', value: request.description },
                {
                  label: 'Preferred time',
                  value: request.preferredDate ? formatSlot(request.preferredDate, request.preferredTime) : '',
                },
                { label: 'Accepted', value: request.acceptedAt ? formatTimestamp(request.acceptedAt) : '' },
                {
                  label: 'Scheduled visit',
                  value: request.scheduledDate ? formatSlot(request.scheduledDate, request.scheduledTime) : '',
                },
              ]}
            />
            <h3 className="card__subtitle">Location</h3>
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

          {booking ? (
            <Card>
              <h2 className="card__title">Conversation</h2>
              <p className="body-text">
                Read the customer/provider chat for this job's booking. Admin can view every message
                but cannot send as either participant.
              </p>
              <Link to={`/app/admin/bookings/${booking.id}`} className="text-link">
                View conversation →
              </Link>
            </Card>
          ) : null}

          {booking ? (
            <Card>
              <div className="card__heading-row">
                <h2 className="card__title">Booking</h2>
                <StatusBadge status={booking.status} audience="booking" />
              </div>
              <DetailList
                items={[
                  { label: 'Provider', value: booking.provider?.name },
                  { label: 'Arrival code', value: booking.arrivalCode },
                  {
                    label: 'Scheduled visit',
                    value: booking.scheduledDate ? formatSlot(booking.scheduledDate, booking.scheduledTime) : '',
                  },
                ]}
              />
              <Link to={`/app/admin/bookings/${booking.id}`} className="text-link">
                View booking →
              </Link>
            </Card>
          ) : null}

          {review ? (
            <Card>
              <h2 className="card__title">Review</h2>
              <DetailList
                items={[
                  { label: 'Rating', value: `${review.rating} / 5` },
                  { label: 'Comment', value: review.comment },
                ]}
              />
            </Card>
          ) : null}
        </div>

        <aside>
          <Card>
            <h2 className="card__title">Customer</h2>
            <DetailList items={[{ label: 'Name', value: request.customer?.name }]} />
            {request.customer ? (
              <Link to={`/app/admin/customers/${request.customer.id}`} className="text-link">
                View customer →
              </Link>
            ) : null}
          </Card>
          <Card>
            <h2 className="card__title">Assigned provider</h2>
            {request.selectedProvider ? (
              <DetailList items={[{ label: 'Provider', value: request.selectedProvider.name }]} />
            ) : (
              <p className="body-text">No provider has accepted this request yet.</p>
            )}
            {request.selectedProvider ? (
              <Link to={`/app/admin/providers/${request.selectedProviderId}`} className="text-link">
                View provider →
              </Link>
            ) : null}
          </Card>
        </aside>
      </div>

    </AdminShell>
  );
}

export default AdminRequestDetailsPage;
