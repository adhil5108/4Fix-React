import { useTranslation } from 'react-i18next';
import { ClipboardList, Smartphone } from 'lucide-react';
import AppShell from '../../components/AppShell.jsx';
import { CustomerRequestCard } from '../../components/cards.jsx';
import { ButtonLink, EmptyState, ErrorState, LoadingState, SectionHeader } from '../../components/ui.jsx';
import { useSavedRequests } from '../../hooks/useSavedRequests.js';
import { groupRequests } from '../../utils/customerRequest.js';

// Requests made from this browser (customers have no account): the ones still in
// progress first, then completed and cancelled ones.
function RequestsPage() {
  const { t } = useTranslation();
  const requests = useSavedRequests();
  const { active, past } = groupRequests(requests.data);
  const isEmpty = !requests.loading && !requests.error && active.length === 0 && past.length === 0;

  return (
    <AppShell title={t('customer.requests.title')} large>
      <p className="device-note">
        <Smartphone aria-hidden="true" />
        <span>{t('customer.requests.deviceNote')}</span>
      </p>

      {requests.loading ? <LoadingState label={t('customer.requests.loading')} /> : null}
      {requests.error ? <ErrorState error={requests.error} onRetry={requests.reload} /> : null}

      {isEmpty ? (
        <EmptyState
          icon={ClipboardList}
          title={t('customer.requests.emptyTitle')}
          message={t('customer.requests.emptyMessage')}
          action={<ButtonLink to="/services">{t('customer.requests.newRequest')}</ButtonLink>}
        />
      ) : null}

      {!requests.loading && !requests.error && !isEmpty ? (
        <>
          <section className="section" aria-labelledby="active-heading">
            <SectionHeader id="active-heading" title={t('customer.requests.active')} count={active.length || null} />
            {active.length > 0 ? (
              <div className="stack">
                {active.map((request) => (
                  <CustomerRequestCard key={request.id} request={request} />
                ))}
              </div>
            ) : (
              <div className="requests-none">
                <p className="field-hint">{t('customer.requests.noActive')}</p>
                <ButtonLink to="/services" variant="secondary" size="sm">
                  {t('customer.requests.newRequest')}
                </ButtonLink>
              </div>
            )}
          </section>

          {past.length > 0 ? (
            <section className="section" aria-labelledby="past-heading">
              <SectionHeader id="past-heading" title={t('customer.requests.past')} count={past.length} />
              <div className="stack">
                {past.map((request) => (
                  <CustomerRequestCard key={request.id} request={request} />
                ))}
              </div>
            </section>
          ) : null}
        </>
      ) : null}
    </AppShell>
  );
}

export default RequestsPage;
