import { useState } from 'react';
import AdminShell from '../../components/admin/AdminShell.jsx';
import { AddressBlock, AttachmentList, QuoteCard } from '../../components/cards.jsx';
import {
  Button,
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
import { adminApi } from '../../services/fixApi.js';
import { formatMoney, formatSlot, formatTimestamp } from '../../utils/format.js';

function AdminRequestDetailsPage({ requestId }) {
  const data = useApi(() => adminApi.request(requestId), [requestId]);
  const action = useAction();
  const [confirmQuote, setConfirmQuote] = useState(null);
  const [success, setSuccess] = useState('');
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

  const { request, quotes, booking, payment, review } = data.data;
  const canAssign = request.status === 'QUOTE_RECEIVED';

  async function handleAssign() {
    setSuccess('');
    const ok = await action.run(`assign-${confirmQuote.id}`, () => adminApi.assignQuote(confirmQuote.id));
    setConfirmQuote(null);

    if (ok) {
      setSuccess(
        `${confirmQuote.provider?.name || 'This provider'} was assigned to the request. The customer still needs to confirm the booking.`,
      );
    }

    await data.refresh();
  }

  return (
    <AdminShell>
      <PageHeader
        back={back}
        title={request.service?.name || 'Service request'}
        subtitle={`${request.customer?.name || 'Customer'} · requested ${formatTimestamp(request.createdAt)}`}
        actions={<StatusBadge status={request.status} />}
      />

      <div className="stack">
        <Notice tone="success">{success}</Notice>
        <Notice>{action.error}</Notice>
      </div>

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
                { label: 'Preferred time', value: formatSlot(request.preferredDate, request.preferredTime) },
                {
                  label: 'Scheduled visit',
                  value: request.scheduledDate ? formatSlot(request.scheduledDate, request.scheduledTime) : '',
                },
              ]}
            />
            <h3 className="card__subtitle">Address</h3>
            <AddressBlock address={request.address} />
            {request.attachments?.length ? (
              <>
                <h3 className="card__subtitle">Attachments</h3>
                <AttachmentList attachments={request.attachments} />
              </>
            ) : null}
          </Card>

          <section className="section section--tight" aria-labelledby="quotes-heading">
            <h2 id="quotes-heading" className="section__title">
              Quotes {quotes.length > 0 ? <span className="count">{quotes.length}</span> : null}
            </h2>
            {quotes.length === 0 ? (
              <EmptyState title="No quotes yet" message="Providers haven't quoted on this request." />
            ) : (
              <div className="list">
                {quotes.map((quote) => (
                  <QuoteCard
                    key={quote.id}
                    quote={quote}
                    highlight={quote.status === 'ACCEPTED'}
                    actions={
                      canAssign && quote.status === 'PENDING' ? (
                        <Button
                          block
                          onClick={() => setConfirmQuote(quote)}
                          disabled={Boolean(action.pending)}
                        >
                          Assign this quote
                        </Button>
                      ) : null
                    }
                  />
                ))}
              </div>
            )}
          </section>

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

          {payment ? (
            <Card>
              <div className="card__heading-row">
                <h2 className="card__title">Payment</h2>
                <StatusBadge status={payment.status} audience="payment" />
              </div>
              <DetailList items={[{ label: 'Amount', value: formatMoney(payment.amount) }]} />
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
            <h2 className="card__title">Selected provider</h2>
            {request.selectedProvider ? (
              <DetailList
                items={[
                  { label: 'Provider', value: request.selectedProvider.name },
                  { label: 'Agreed price', value: request.acceptedQuote ? formatMoney(request.acceptedQuote.amount) : '' },
                ]}
              />
            ) : (
              <p className="body-text">No provider selected yet.</p>
            )}
            {request.selectedProvider ? (
              <Link to={`/app/admin/providers/${request.selectedProviderId}`} className="text-link">
                View provider →
              </Link>
            ) : null}
          </Card>
        </aside>
      </div>

      <ConfirmDialog
        open={Boolean(confirmQuote)}
        title="Assign this quote?"
        message={
          confirmQuote
            ? `${confirmQuote.provider?.name || 'This provider'} will be assigned to the request for ${formatMoney(
                confirmQuote.amount,
              )}. Any other pending quotes will be declined.`
            : ''
        }
        confirmLabel="Assign quote"
        busy={Boolean(action.pending)}
        onConfirm={handleAssign}
        onCancel={() => setConfirmQuote(null)}
      />
    </AdminShell>
  );
}

export default AdminRequestDetailsPage;
