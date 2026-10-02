import { useTranslation } from 'react-i18next';
import AppShell from '../components/AppShell.jsx';
import AdminShell from '../components/admin/AdminShell.jsx';
import { Button, EmptyState, ErrorState, LoadingState, PageHeader } from '../components/ui.jsx';
import { useApi } from '../hooks/useApi.js';
import { useAuth } from '../hooks/useAuth.jsx';
import { tokenForBooking } from '../services/customerAccess.js';
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

// The invoice of a completed 4Fix job, as a printable document. The provider/admin read
// it with their account; the (anonymous) customer with this browser's request token.
// The API admits only those three, so changing the id in the URL reveals nothing.
// 4Fix records no price, so the document says the amount was agreed directly.
function InvoicePage({ bookingId }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const role = user?.role;
  const usesAccount = role === 'PROVIDER' || role === 'ADMIN';
  const requestToken = usesAccount ? null : tokenForBooking(bookingId);
  const canRead = usesAccount || Boolean(requestToken);
  const invoice = useApi(
    () =>
      canRead
        ? (usesAccount ? bookingsApi : customerBookingsApi).invoice(bookingId)
        : Promise.resolve(null),
    [bookingId],
  );

  const Shell = role === 'ADMIN' ? AdminShell : AppShell;
  const back =
    role === 'PROVIDER'
      ? { to: `/provider/jobs/${bookingId}`, label: t('customer.shared.job') }
      : role === 'ADMIN'
        ? { to: `/app/admin/bookings/${bookingId}`, label: t('customer.shared.booking') }
        : { to: `/bookings/${bookingId}`, label: t('customer.shared.booking') };

  if (!canRead) {
    return (
      <Shell width="narrow">
        <PageHeader title={t('invoice.title')} back={{ to: '/requests', label: t('common.nav.myRequests') }} />
        <EmptyState title={t('customer.access.noAccessTitle')} message={t('customer.access.noAccessMessage')} />
      </Shell>
    );
  }

  if (invoice.loading) {
    return (
      <Shell width="narrow">
        <LoadingState label={t('invoice.loading')} />
      </Shell>
    );
  }

  if (invoice.error) {
    const notReady = invoice.error.status === 404 || invoice.error.status === 400;

    return (
      <Shell width="narrow">
        <PageHeader title={t('invoice.title')} back={back} />
        <ErrorState
          error={notReady ? { status: 404, message: t('invoice.notAvailable') } : invoice.error}
          onRetry={invoice.reload}
        />
      </Shell>
    );
  }

  const doc = invoice.data.invoice;
  const issue = formatIssueLabel(doc.issueKey, doc.issueLabel);

  return (
    <Shell width="narrow">
      <div className="invoice-toolbar no-print">
        <PageHeader title={t('invoice.title')} back={back} />
        <Button variant="secondary" onClick={() => window.print()}>
          {t('invoice.print')}
        </Button>
      </div>

      <article className="invoice-doc" aria-labelledby="invoice-heading">
        <header className="invoice-doc__head">
          <span className="invoice-doc__brand">
            <span className="brand-logo__mark">4</span>Fix
          </span>
          <div className="invoice-doc__title-block">
            <h1 id="invoice-heading" className="invoice-doc__title">
              {t('invoice.heading')}
            </h1>
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
    </Shell>
  );
}

export default InvoicePage;
