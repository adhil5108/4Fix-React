import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Handshake, IndianRupee } from 'lucide-react';
import AppShell from '../../components/AppShell.jsx';
import { IssueTile, ServiceIcon } from '../../components/cards.jsx';
import { Button, ErrorState, LoadingState, Notice, SectionHeader, StickyActionBar } from '../../components/ui.jsx';
import { useApi } from '../../hooks/useApi.js';
import { useAuth } from '../../hooks/useAuth.jsx';
import { navigate } from '../../hooks/useRoute.js';
import { servicesApi } from '../../services/fixApi.js';
import { formatMoney } from '../../utils/format.js';
import { bookPath, categoryPath } from './publicLinks.js';

// What the service is, and "what's wrong?". The chosen issue is carried into the booking
// form (pre-selected there), so the customer never picks it twice. No account needed.
function ServiceDetailsPage({ serviceId }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const service = useApi(() => servicesApi.get(serviceId), [serviceId]);
  const [issueKey, setIssueKey] = useState('');
  const category = service.data?.service.category;
  const isProvider = user?.role === 'PROVIDER';
  // Back to the category this service was chosen from (all categories if it has none).
  const back = category?.id
    ? { to: categoryPath(category.id), label: category.name }
    : { to: '/services', label: t('public.allServices') };

  if (service.loading) {
    return (
      <AppShell back={back} title="" nav={false}>
        <LoadingState label={t('public.serviceDetails.loading')} />
      </AppShell>
    );
  }

  if (service.error) {
    const isUnavailable = service.error.status === 404 || service.error.status === 400;

    return (
      <AppShell back={back} title={t('public.serviceDetails.fallbackTitle')} nav={false}>
        <ErrorState
          error={isUnavailable ? { status: 404, message: t('public.serviceDetails.unavailable') } : service.error}
          onRetry={service.reload}
        />
      </AppShell>
    );
  }

  const { service: details } = service.data;

  return (
    <AppShell back={back} title={details.name} nav={false} bar={!isProvider}>
      <header className="intro-header">
        <ServiceIcon service={details} size="xl" />
        <div className="intro-header__body">
          {details.category?.name ? <p className="eyebrow">{details.category.name}</p> : null}
          <h2 className="intro-header__title">{details.name}</h2>
          <p className="intro-header__text">{details.description}</p>
        </div>
      </header>

      <div className="fact-row">
        {details.startingPrice !== null ? (
          <span className="fact">
            <IndianRupee aria-hidden="true" />
            <span>
              <span className="fact__label">{t('public.serviceDetails.startingFrom')}</span>
              <strong>{formatMoney(details.startingPrice)}</strong>
            </span>
          </span>
        ) : null}
        <span className="fact">
          <Handshake aria-hidden="true" />
          <span className="fact__label">{t('public.serviceDetails.priceAgreed')}</span>
        </span>
      </div>

      <section className="section" aria-labelledby="issues-heading">
        <SectionHeader id="issues-heading" title={t('public.serviceDetails.whatsWrong')} />
        {isProvider ? (
          <Notice tone="info">{t('public.serviceDetails.providerNotice')}</Notice>
        ) : (
          <>
            <p className="field-hint section-hint">{t('public.serviceDetails.pickClosest')}</p>
            <div className="issue-grid">
              {details.issues.map((issue) => (
                <IssueTile
                  key={issue.key}
                  issue={issue}
                  selected={issue.key === issueKey}
                  onSelect={(selected) => setIssueKey(selected.key === issueKey ? '' : selected.key)}
                />
              ))}
            </div>
          </>
        )}
      </section>

      {!isProvider ? (
        <StickyActionBar note={t('public.serviceDetails.noAccount')}>
          <Button size="lg" block onClick={() => navigate(bookPath(serviceId, issueKey || undefined))}>
            {t('public.serviceDetails.continue')}
          </Button>
        </StickyActionBar>
      ) : null}
    </AppShell>
  );
}

export default ServiceDetailsPage;
