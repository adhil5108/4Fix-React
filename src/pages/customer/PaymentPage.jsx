import AppShell from '../../components/AppShell.jsx';
import PaymentCard from '../../components/PaymentCard.jsx';
import {
  ButtonLink,
  Card,
  DetailList,
  ErrorState,
  LoadingState,
  PageHeader,
  StatusBadge,
} from '../../components/ui.jsx';
import { useApi } from '../../hooks/useApi.js';
import { usePolling } from '../../hooks/usePolling.js';
import { bookingsApi } from '../../services/fixApi.js';
import { formatMoney, formatSlot } from '../../utils/format.js';

function PaymentPage({ bookingId }) {
  const data = useApi(async () => {
    const { booking } = await bookingsApi.get(bookingId);
    let payment = null;

    try {
      payment = (await bookingsApi.payment(bookingId)).payment;
    } catch (error) {
      // Not due yet (service not completed) is a normal state, not an error.
      if (error.code !== 'PAYMENT_NOT_DUE') throw error;
    }

    return { booking, payment };
  }, [bookingId]);

  const payment = data.data?.payment;
  // The provider records receipt on their side; poll so the customer sees it flip to PAID.
  usePolling(() => data.refresh(), 15000, payment?.status === 'PENDING');

  const back = { to: `/bookings/${bookingId}`, label: 'Booking' };

  if (data.loading) {
    return (
      <AppShell width="narrow">
        <LoadingState label="Loading payment…" />
      </AppShell>
    );
  }

  if (data.error && !data.data) {
    return (
      <AppShell width="narrow">
        <PageHeader title="Payment" back={back} />
        <ErrorState error={data.error} onRetry={data.reload} />
      </AppShell>
    );
  }

  const { booking } = data.data;

  return (
    <AppShell width="narrow">
      <PageHeader back={back} title="Payment" subtitle={booking.service?.name} />

      {payment ? (
        <PaymentCard payment={payment} audience="customer" />
      ) : (
        <Card className="placeholder-card">
          <h2 className="card__title">Payment isn’t due yet</h2>
          <p className="body-text">
            You’ll pay {booking.amount !== null ? formatMoney(booking.amount) : 'the agreed price'}{' '}
            after your technician marks the service as completed. No payment has been taken.
          </p>
        </Card>
      )}

      <Card>
        <div className="card__heading-row">
          <h2 className="card__title">Job summary</h2>
          <StatusBadge status={booking.status} audience="booking" />
        </div>
        <DetailList
          items={[
            { label: 'Provider', value: booking.provider?.name },
            { label: 'Issue', value: booking.request?.issueLabel },
            { label: 'Agreed price', value: formatMoney(booking.amount) },
            {
              label: 'Visit',
              value: booking.scheduledDate ? formatSlot(booking.scheduledDate, booking.scheduledTime) : '',
            },
          ]}
        />
      </Card>

      {booking.status === 'COMPLETED' ? (
        <ButtonLink to={`/bookings/${bookingId}/review`} variant="secondary" block>
          Rate your experience
        </ButtonLink>
      ) : null}
    </AppShell>
  );
}

export default PaymentPage;
