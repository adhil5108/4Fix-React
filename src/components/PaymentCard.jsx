import { formatDateTime, formatMoney, statusLabel, statusTone } from '../utils/format.js';
import { Card } from './ui.jsx';

const METHOD_LABELS = { CASH: 'Cash', UPI: 'UPI', CARD: 'Card', OTHER: 'Other' };

// Reflects exactly what the backend records. There is no payment gateway yet, so a
// pending payment is settled directly with the technician and recorded by them.
function PaymentCard({ payment, audience = 'customer', children }) {
  const isPaid = payment.status === 'PAID';

  return (
    <Card className="payment-card">
      <div className="card__heading-row">
        <div>
          <p className="payment-card__label">{isPaid ? 'Amount paid' : 'Amount due'}</p>
          <p className="payment-card__amount">{formatMoney(payment.amount)}</p>
        </div>
        <span className={`badge badge--${statusTone(payment.status)}`}>
          {statusLabel(payment.status, { audience: 'payment' })}
        </span>
      </div>

      {isPaid ? (
        <p className="body-text">
          Paid {payment.method ? `by ${METHOD_LABELS[payment.method] || payment.method}` : ''} on{' '}
          {formatDateTime(payment.paidAt)}
          {payment.transactionReference ? ` · Ref ${payment.transactionReference}` : ''}.
        </p>
      ) : audience === 'customer' ? (
        <p className="body-text">
          Online payment isn’t available yet. Pay your technician directly by cash or UPI —
          they will record it here once received.
        </p>
      ) : (
        <p className="body-text">
          Collect {formatMoney(payment.amount)} from the customer, then record it here.
        </p>
      )}

      {children}
    </Card>
  );
}

export default PaymentCard;
