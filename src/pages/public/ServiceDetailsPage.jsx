import { Trans, useTranslation } from 'react-i18next';
import AppShell from '../../components/AppShell.jsx';
import StepIndicator from '../../components/StepIndicator.jsx';
import { IssueCard, ServiceIcon } from '../../components/cards.jsx';
import { Card, ErrorState, LoadingState, Notice, PageHeader } from '../../components/ui.jsx';
import { useApi } from '../../hooks/useApi.js';
import { useAuth } from '../../hooks/useAuth.jsx';
import { navigate } from '../../hooks/useRoute.js';
import { servicesApi } from '../../services/fixApi.js';
import { formatMoney } from '../../utils/format.js';
import { bookPath, categoryPath } from './publicLinks.js';

function ServiceDetailsPage({ serviceId }) {
  const { t } = useTranslation();
  const { isAuthenticated, user } = useAuth();
  const service = useApi(() => servicesApi.get(serviceId), [serviceId]);
  const category = service.data?.service.category;
  // Back to the category this service was chosen from (all categories if it has none).
  const back = category?.id
    ? { to: categoryPath(category.id), label: category.name }
    : { to: '/services', label: t('public.allServices') };
  const isProvider = isAuthenticated && user.role === 'PROVIDER';

  // Customers book without an account, so choosing an issue goes straight to booking.
  function chooseIssue(issue) {
    navigate(bookPath(serviceId, issue.key));
  }

  if (service.loading) {
    return (
      <AppShell width="narrow">
        <LoadingState label={t('public.serviceDetails.loading')} />
      </AppShell>
    );
  }

  if (service.error) {
    const isUnavailable = service.error.status === 404 || service.error.status === 400;

    return (
      <AppShell width="narrow">
        <PageHeader title={t('public.serviceDetails.fallbackTitle')} back={back} />
        <ErrorState
          error={
            isUnavailable
              ? { status: 404, message: t('public.serviceDetails.unavailable') }
              : service.error
          }
          onRetry={service.reload}
        />
      </AppShell>
    );
  }

  const { service: details } = service.data;

  return (
    <AppShell width="narrow">
      <StepIndicator current="issue" />
      <PageHeader back={back} title={details.name} subtitle={details.category?.name} />

      <Card>
        <div className="service-summary">
          <ServiceIcon service={details} size="lg" />
          <p className="body-text">{details.description}</p>
        </div>
        {details.startingPrice !== null ? (
          <p className="service-price">
            <Trans
              i18nKey="public.serviceDetails.startingAt"
              values={{ price: formatMoney(details.startingPrice) }}
              components={{ strong: <strong /> }}
            />
            <span className="field-hint">{t('public.serviceDetails.priceNote')}</span>
          </p>
        ) : null}
      </Card>

      <section className="section section--tight" aria-labelledby="issues-heading">
        <h2 id="issues-heading" className="section__title">
          {t('public.serviceDetails.whatsWrong')}
        </h2>
        {isProvider ? (
          <Notice tone="info">{t('public.serviceDetails.providerNotice')}</Notice>
        ) : (
          <>
            <p className="body-text">{t('public.serviceDetails.pickClosest')}</p>
            <div className="issue-grid">
              {details.issues.map((issue) => (
                <IssueCard key={issue.key} issue={issue} onSelect={chooseIssue} />
              ))}
            </div>
            {!isAuthenticated ? (
              <p className="field-hint">{t('public.serviceDetails.loginHint')}</p>
            ) : null}
          </>
        )}
      </section>
    </AppShell>
  );
}

export default ServiceDetailsPage;
