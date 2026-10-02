import { useTranslation } from 'react-i18next';
import AppShell from '../../components/AppShell.jsx';
import { ServiceCard, ServiceIcon } from '../../components/cards.jsx';
import { ButtonLink, EmptyState, ErrorState, LoadingState, PageHeader } from '../../components/ui.jsx';
import { useApi } from '../../hooks/useApi.js';
import { categoriesApi } from '../../services/fixApi.js';

// Second browsing step: the services inside one category. Choosing a service
// continues into its details and the booking form.
function CategoryPage({ categoryId }) {
  const { t } = useTranslation();
  const data = useApi(() => categoriesApi.services(categoryId), [categoryId]);
  const back = { to: '/services', label: t('public.services.allCategories') };

  if (data.loading) {
    return (
      <AppShell>
        <LoadingState label={t('public.category.loading')} />
      </AppShell>
    );
  }

  if (data.error) {
    const isUnavailable = [400, 404].includes(data.error.status);

    return (
      <AppShell>
        <PageHeader title={t('public.category.fallbackTitle')} back={back} />
        <ErrorState
          error={isUnavailable ? { status: 404, message: t('public.category.unavailable') } : data.error}
          onRetry={data.reload}
        />
      </AppShell>
    );
  }

  const { category, services } = data.data;

  return (
    <AppShell>
      <PageHeader
        back={back}
        title={
          <span className="service-inline">
            <ServiceIcon service={category} size="sm" />
            {category.name}
          </span>
        }
        subtitle={category.description || t('public.category.subtitle')}
      />

      {services.length === 0 ? (
        <EmptyState
          title={t('public.category.emptyTitle')}
          message={t('public.category.emptyMessage')}
          action={
            <ButtonLink to="/services" variant="secondary">
              {t('public.services.allCategories')}
            </ButtonLink>
          }
        />
      ) : (
        <div className="card-grid">
          {services.map((service) => (
            <ServiceCard key={service.id} service={service} showCategory={false} />
          ))}
        </div>
      )}
    </AppShell>
  );
}

export default CategoryPage;
