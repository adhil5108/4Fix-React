import AdminShell from '../../components/admin/AdminShell.jsx';
import { Card, DetailList, ErrorState, LoadingState, PageHeader, StatusBadge } from '../../components/ui.jsx';
import { useApi } from '../../hooks/useApi.js';
import { navigate } from '../../hooks/useRoute.js';
import { adminApi } from '../../services/fixApi.js';
import { formatMoney, formatTimestamp } from '../../utils/format.js';

function AdminCustomerDetailPage({ customerId }) {
  const data = useApi(() => adminApi.customer(customerId), [customerId]);
  const back = { to: '/app/admin/customers', label: 'Customers' };

  if (data.loading) {
    return (
      <AdminShell>
        <LoadingState label="Loading customer…" />
      </AdminShell>
    );
  }

  if (data.error) {
    return (
      <AdminShell>
        <PageHeader title="Customer" back={back} />
        <ErrorState error={data.error} onRetry={data.reload} />
      </AdminShell>
    );
  }

  const { customer, requests, bookings, payments, reviews } = data.data;

  return (
    <AdminShell>
      <PageHeader
        back={back}
        title={customer.name}
        subtitle={customer.username}
        actions={
          <span className={`badge badge--${customer.isActive ? 'success' : 'muted'}`}>
            {customer.isActive ? 'Active' : 'Deactivated'}
          </span>
        }
      />

      <div className="admin-detail">
        <div>
          <section className="section section--tight" aria-labelledby="customer-requests-heading">
            <h2 id="customer-requests-heading" className="section__title">
              Requests {requests.length > 0 ? <span className="count">{requests.length}</span> : null}
            </h2>
            {requests.length === 0 ? (
              <p className="body-text">No requests yet.</p>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Service</th>
                      <th>Status</th>
                      <th>Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requests.map((request) => (
                      <tr
                        key={request.id}
                        className="admin-table__row--link"
                        onClick={() => navigate(`/app/admin/requests/${request.id}`)}
                      >
                        <td>{request.service?.name || '—'}</td>
                        <td>
                          <StatusBadge status={request.status} />
                        </td>
                        <td>{formatTimestamp(request.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="section section--tight" aria-labelledby="customer-bookings-heading">
            <h2 id="customer-bookings-heading" className="section__title">
              Bookings {bookings.length > 0 ? <span className="count">{bookings.length}</span> : null}
            </h2>
            {bookings.length === 0 ? (
              <p className="body-text">No bookings yet.</p>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Service</th>
                      <th>Provider</th>
                      <th>Status</th>
                      <th>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map((booking) => (
                      <tr
                        key={booking.id}
                        className="admin-table__row--link"
                        onClick={() => navigate(`/app/admin/bookings/${booking.id}`)}
                      >
                        <td>{booking.service?.name || '—'}</td>
                        <td>{booking.provider?.name || '—'}</td>
                        <td>
                          <StatusBadge status={booking.status} audience="booking" />
                        </td>
                        <td>{formatMoney(booking.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="section section--tight" aria-labelledby="customer-payments-heading">
            <h2 id="customer-payments-heading" className="section__title">
              Payments {payments.length > 0 ? <span className="count">{payments.length}</span> : null}
            </h2>
            {payments.length === 0 ? (
              <p className="body-text">No payments yet.</p>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Paid</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((payment) => (
                      <tr key={payment.id}>
                        <td>{formatMoney(payment.amount)}</td>
                        <td>
                          <StatusBadge status={payment.status} audience="payment" />
                        </td>
                        <td>{payment.paidAt ? formatTimestamp(payment.paidAt) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="section section--tight" aria-labelledby="customer-reviews-heading">
            <h2 id="customer-reviews-heading" className="section__title">
              Reviews left {reviews.length > 0 ? <span className="count">{reviews.length}</span> : null}
            </h2>
            {reviews.length === 0 ? (
              <p className="body-text">No reviews yet.</p>
            ) : (
              <div className="list">
                {reviews.map((review) => (
                  <article key={review.id} className="card review-card">
                    <div className="review-card__top">
                      <strong>{review.rating} / 5</strong>
                      <span className="review-card__meta">{formatTimestamp(review.createdAt)}</span>
                    </div>
                    {review.comment ? <p className="review-card__comment">{review.comment}</p> : null}
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>

        <aside>
          <Card>
            <h2 className="card__title">Account</h2>
            <DetailList
              items={[
                { label: 'Phone', value: customer.username },
                { label: 'Joined', value: formatTimestamp(customer.createdAt) },
              ]}
            />
          </Card>
        </aside>
      </div>
    </AdminShell>
  );
}

export default AdminCustomerDetailPage;
