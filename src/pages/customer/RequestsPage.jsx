import { useTranslation } from 'react-i18next';
import AppShell from '../../components/AppShell.jsx';
import { RequestCard } from '../../components/cards.jsx';
import {
  ButtonLink,
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
} from '../../components/ui.jsx';
import { useSavedRequests } from '../../hooks/useSavedRequests.js';
import { navigate, useQueryParam } from '../../hooks/useRoute.js';
import { REQUEST_STATUSES, statusLabel } from '../../utils/format.js';

// Requests made from this browser (customers have no account).
function RequestsPage() {
  const { t } = useTranslation();
  const rawStatus = (useQueryParam('status') || '').toUpperCase();
  const status = REQUEST_STATUSES.includes(rawStatus) ? rawStatus : '';
  const requests = useSavedRequests();
  const list = (requests.data || []).filter((request) => !status || request.status === status);

  function selectStatus(nextStatus) {
    navigate(nextStatus ? `/requests?status=${nextStatus}` : '/requests', { replace: true });
  }

  return (
    <AppShell>
      <PageHeader
        title={t('customer.requests.title')}
        subtitle={t('customer.requests.subtitle')}
        actions={
          <ButtonLink to="/services" size="sm" className="hide-mobile">
            {t('common.nav.bookService')}
          </ButtonLink>
        }
      />

      <div className="chip-row chip-row--scroll" role="group" aria-label={t('customer.requests.filterLabel')}>
        <button
          type="button"
          className={`chip${!status ? ' is-active' : ''}`}
          aria-pressed={!status}
          onClick={() => selectStatus('')}
        >
          {t('customer.requests.all')}
        </button>
        {REQUEST_STATUSES.map((item) => (
          <button
            key={item}
            type="button"
            className={`chip${status === item ? ' is-active' : ''}`}
            aria-pressed={status === item}
            onClick={() => selectStatus(item)}
          >
            {statusLabel(item)}
          </button>
        ))}
      </div>

      {requests.loading ? <LoadingState label={t('customer.requests.loading')} /> : null}
      {requests.error ? <ErrorState error={requests.error} onRetry={requests.reload} /> : null}
      {!requests.loading && !requests.error && list.length === 0 ? (
        status ? (
          <EmptyState
            title={t('customer.requests.emptyFiltered', { status: statusLabel(status) })}
            action={
              <button type="button" className="text-link" onClick={() => selectStatus('')}>
                {t('customer.requests.showAll')}
              </button>
            }
          />
        ) : (
          <EmptyState
            title={t('customer.requests.emptyTitle')}
            message={t('customer.requests.emptyMessage')}
            action={<ButtonLink to="/services">{t('common.nav.bookService')}</ButtonLink>}
          />
        )
      ) : null}
      {!requests.loading && !requests.error && list.length > 0 ? (
        <div className="list">
          {list.map((request) => (
            <RequestCard key={request.id} request={request} to={`/requests/${request.id}`} />
          ))}
        </div>
      ) : null}

      <p className="page-footnote">{t('customer.requests.deviceNote')}</p>
    </AppShell>
  );
}

export default RequestsPage;
