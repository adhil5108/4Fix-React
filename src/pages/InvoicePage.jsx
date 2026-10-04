import { useTranslation } from 'react-i18next';
import { Printer, Smartphone } from 'lucide-react';
import AppShell from '../components/AppShell.jsx';
import AdminShell from '../components/admin/AdminShell.jsx';
import { EmptyState, ErrorState, IconButton, LoadingState, PageHeader } from '../components/ui.jsx';
import { useApi } from '../hooks/useApi.js';
import { useAuth } from '../hooks/useAuth.jsx';
import { requestIdForBooking, tokenForBooking } from '../services/customerAccess.js';
import { bookingsApi, customerBookingsApi } from '../services/fixApi.js';
import { formatDateTime, formatIssueLabel, formatTimestamp } from '../utils/format.js';

function Party({ label, contact, fallback }) {
  return (
    <div className="invoice-doc__party">
      <span className="invoice-doc__label">{label}</span>
      <strong className="invoice-doc__name">{contact?.name || fallback}</strong>
      {contact?.phone ? <span>{contact.phone}</span> : null}
    </div>
  );
}

// Admin sees the invoice inside the console; customers and providers inside the app.
function Frame({ isAdmin, title, back, actions, children }) {
  if (isAdmin) {
    return (
      <AdminShell>
        <PageHeader title={title} back={back} actions={actions} />
        {children}
      </AdminShell>
    );
  }

  return (
    <AppShell title={title} back={back} actions={actions}>
      {children}
    </AppShell>
  );
}

// The invoice of a completed 4Fix job, as a printable document. The provider/admin read
// it with their account; the (anonymous) customer with this browser's request token.
// The API admits only those three, so changing the id in the URL reveals nothing.
// 4Fix records no price, so the document says the amount was agreed directly.
function InvoicePage({ bookingId }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const role = user?.role;
  const isAdmin = role === 'ADMIN';
  const usesAccount = role === 'PROVIDER' || isAdmin;
  const requestToken = usesAccount ? null : tokenForBooking(bookingId);
  const canRead = usesAccount || Boolean(requestToken);
  const invoice = useApi(
    () =>
      canRead
        ? (usesAccount ? bookingsApi : customerBookingsApi).invoice(bookingId)
        : Promise.resolve(null),
    [bookingId],
  );

  const requestId = usesAccount ? null : requestIdForBooking(bookingId);
  const back =
    role === 'PROVIDER'
      ? { to: `/provider/jobs/${bookingId}`, label: t('customer.shared.job') }
      : isAdmin
        ? { to: `/app/admin/bookings/${bookingId}`, label: t('customer.shared.booking') }
        : { to: requestId ? `/requests/${requestId}` : '/requests', label: t('customer.shared.job') };
  const title = t('invoice.title');

  if (!canRead) {
    return (
      <Frame isAdmin={isAdmin} title={title} back={{ to: '/requests', label: t('common.nav.myRequests') }}>
        <EmptyState icon={Smartphone} title={t('customer.access.noAccessTitle')} message={t('customer.access.noAccessMessage')} />
      </Frame>
    );
  }

  if (invoice.loading) {
    return (
      <Frame isAdmin={isAdmin} title={title} back={back}>
        <LoadingState label={t('invoice.loading')} />
      </Frame>
    );
  }

  if (invoice.error) {
    const notReady = invoice.error.status === 404 || invoice.error.status === 400;

    return (
      <Frame isAdmin={isAdmin} title={title} back={back}>
        <ErrorState
          error={notReady ? { status: 404, message: t('invoice.notAvailable') } : invoice.error}
          onRetry={invoice.reload}
        />
      </Frame>
    );
  }

  const doc = invoice.data.invoice;
  const issue = formatIssueLabel(doc.issueKey, doc.issueLabel);

  return (
    <Frame
      isAdmin={isAdmin}
      title={title}
      back={back}
      actions={<IconButton icon={Printer} label={t('invoice.print')} onClick={() => window.print()} />}
    >
      <article className="invoice-doc" aria-labelledby="invoice-heading">
        <header className="invoice-doc__head">
          <span className="invoice-doc__brand">
            <span className="brand-mark">4</span>Fix
          </span>
          <div className="invoice-doc__title-block">
            <h2 id="invoice-heading" className="invoice-doc__title">
              {t('invoice.heading')}
            </h2>
            <dl className="invoice-doc__meta">
              <div>
                <dt>{t('invoice.number')}</dt>
                <dd>{doc.invoiceNumber}</dd>
              </div>
              <div>
                <dt>{t('invoice.date')}</dt>
                <dd>{formatTimestamp(doc.issuedAt)}</dd>
              </div>
            </dl>
          </div>
        </header>

        <div className="invoice-doc__parties">
          <Party label={t('invoice.from')} contact={doc.provider} fallback={t('invoice.providerFallback')} />
          <Party label={t('invoice.to')} contact={doc.customer} fallback={t('invoice.customerFallback')} />
        </div>

        <table className="invoice-doc__table">
          <thead>
            <tr>
              <th scope="col">{t('invoice.job')}</th>
              <th scope="col" className="invoice-doc__amount-col">
                {t('invoice.amount')}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <strong>{doc.service.name}</strong>
                {issue ? <span className="invoice-doc__issue">{issue}</span> : null}
                {doc.description ? <p className="invoice-doc__description">{doc.description}</p> : null}
                <span className="invoice-doc__completed">
                  {t('invoice.completedOn', { date: formatDateTime(doc.completedAt) })}
                </span>
              </td>
              <td className="invoice-doc__amount-col">{t('invoice.amountAgreed')}</td>
            </tr>
          </tbody>
        </table>

        <footer className="invoice-doc__foot">
          <p>{t('invoice.paymentNote')}</p>
          <p>{t('invoice.thanks')}</p>
        </footer>
      </article>
    </Frame>
  );
}

export default InvoicePage;
