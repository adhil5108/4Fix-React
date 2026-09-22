import AdminShell from '../../components/admin/AdminShell.jsx';
import { Card, DetailList, ErrorState, Link, LoadingState, PageHeader, StatusBadge } from '../../components/ui.jsx';
import { useApi } from '../../hooks/useApi.js';
import { adminApi } from '../../services/fixApi.js';
import { formatDateTime, formatMoney } from '../../utils/format.js';

function AdminPaymentDetailPage({ paymentId }) {
  const data = useApi(() => adminApi.payment(paymentId), [paymentId]);
  const back = { to: '/app/admin/payments', label: 'Payments' };

  if (data.loading) {
    return (
      <AdminShell>
        <LoadingState label="Loading payment…" />
      </AdminShell>
    );
  }

  if (data.error) {
    return (
      <AdminShell>
        <PageHeader title="Payment" back={back} />
        <ErrorState error={data.error} onRetry={data.reload} />
      </AdminShell>
    );
  }

  const { payment } = data.data;

  return (
    <AdminShell>
      <PageHeader back={back} title={formatMoney(payment.amount)} actions={<StatusBadge status={payment.status} audience="payment" />} />

      <Card>
        <h2 className="card__title">Payment</h2>
        <DetailList
          items={[
            { label: 'Amount', value: formatMoney(payment.amount) },
            { label: 'Currency', value: payment.currency },
            { label: 'Method', value: payment.method },
            { label: 'Transaction reference', value: payment.transactionReference },
            { label: 'Paid at', value: payment.paidAt ? formatDateTime(payment.paidAt) : '' },
          ]}
        />
        <Link to={`/app/admin/bookings/${payment.bookingId}`} className="text-link">
          View booking →
        </Link>
      </Card>
    </AdminShell>
  );
}

export default AdminPaymentDetailPage;
