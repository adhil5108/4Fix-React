import { useTranslation } from 'react-i18next';
import AppShell from '../../components/AppShell.jsx';
import { ServiceIcon, ServiceRow } from '../../components/cards.jsx';
import { ButtonLink, EmptyState, ErrorState, LoadingState, SectionHeader } from '../../components/ui.jsx';
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
      <AppShell back={back} title="">
        <LoadingState label={t('public.category.loading')} />
      </AppShell>
    );
  }

  if (data.error) {
    const isUnavailable = [400, 404].includes(data.error.status);

    return (
      <AppShell back={back} title={t('public.category.fallbackTitle')}>
        <ErrorState
          error={isUnavailable ? { status: 404, message: t('public.category.unavailable') } : data.error}
          onRetry={data.reload}
        />
      </AppShell>
    );
  }

  const { category, services } = data.data;

  return (
    <AppShell back={back} title={category.name}>
      <header className="intro-header">
        <ServiceIcon service={category} size="xl" />
        <p className="intro-header__text">{category.description || t('public.category.subtitle')}</p>
      </header>

      <section className="section" aria-labelledby="category-services-heading">
        <SectionHeader id="category-services-heading" title={t('public.category.services')} count={services.length || null} />
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
          <div className="list-group">
            {services.map((service) => (
              <ServiceRow key={service.id} service={service} />
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}

export default CategoryPage;
