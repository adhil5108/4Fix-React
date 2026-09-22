import { useState } from 'react';
import AdminShell from '../../components/admin/AdminShell.jsx';
import {
  Button,
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
import { adminApi } from '../../services/fixApi.js';
import { formatMoney, formatTimestamp } from '../../utils/format.js';

function AdminQuoteDetailPage({ quoteId }) {
  const data = useApi(() => adminApi.quote(quoteId), [quoteId]);
  const action = useAction();
  const [confirming, setConfirming] = useState(false);
  const [success, setSuccess] = useState('');
  const back = { to: '/app/admin/quotes', label: 'Quotes' };

  if (data.loading) {
    return (
      <AdminShell>
        <LoadingState label="Loading quote…" />
      </AdminShell>
    );
  }

  if (data.error) {
    return (
      <AdminShell>
        <PageHeader title="Quote" back={back} />
        <ErrorState error={data.error} onRetry={data.reload} />
      </AdminShell>
    );
  }

  const { quote, booking } = data.data;
  const canAssign = quote.status === 'PENDING' && quote.request?.status === 'QUOTE_RECEIVED';

  async function handleAssign() {
    setSuccess('');
    const ok = await action.run('assign', () => adminApi.assignQuote(quoteId));
    setConfirming(false);

    if (ok) {
      setSuccess('This quote was assigned to the request.');
    }

    await data.refresh();
  }

  return (
    <AdminShell>
      <PageHeader
        back={back}
        title={formatMoney(quote.amount)}
        subtitle={`${quote.provider?.name || 'Provider'} · ${quote.request?.service?.name || 'Request'}`}
        actions={<StatusBadge status={quote.status} audience="quote" />}
      />

      <div className="stack">
        <Notice tone="success">{success}</Notice>
        <Notice>{action.error}</Notice>
      </div>

      <div className="admin-detail">
        <div>
          <Card>
            <h2 className="card__title">Quote</h2>
            <DetailList
              items={[
                { label: 'Provider', value: quote.provider?.name },
                { label: 'Amount', value: formatMoney(quote.amount) },
                { label: 'Description', value: quote.description },
                { label: 'Created', value: formatTimestamp(quote.createdAt) },
              ]}
            />
            {canAssign ? (
              <div className="card__actions">
                <Button onClick={() => setConfirming(true)} disabled={Boolean(action.pending)}>
                  Assign this quote
                </Button>
              </div>
            ) : null}
          </Card>

          {booking ? (
            <Card>
              <div className="card__heading-row">
                <h2 className="card__title">Booking</h2>
                <StatusBadge status={booking.status} audience="booking" />
              </div>
              <Link to={`/app/admin/bookings/${booking.id}`} className="text-link">
                View booking →
              </Link>
            </Card>
          ) : null}
        </div>

        <aside>
          <Card>
            <h2 className="card__title">Request</h2>
            {quote.request ? (
              <>
                <DetailList
                  items={[
                    { label: 'Customer', value: quote.request.customer?.name },
                    { label: 'Service', value: quote.request.service?.name },
                    { label: 'Status', value: quote.request.status },
                  ]}
                />
                <Link to={`/app/admin/requests/${quote.request.id}`} className="text-link">
                  View request →
                </Link>
              </>
            ) : (
              <p className="body-text">Request not found.</p>
            )}
          </Card>
        </aside>
      </div>

      <ConfirmDialog
        open={confirming}
        title="Assign this quote?"
        message={`${quote.provider?.name || 'This provider'} will be assigned to the request for ${formatMoney(
          quote.amount,
        )}. Any other pending quotes will be declined.`}
        confirmLabel="Assign quote"
        busy={Boolean(action.pending)}
        onConfirm={handleAssign}
        onCancel={() => setConfirming(false)}
      />
    </AdminShell>
  );
}

export default AdminQuoteDetailPage;
