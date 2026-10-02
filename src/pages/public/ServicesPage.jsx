import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import AppShell from '../../components/AppShell.jsx';
import SearchBar from '../../components/SearchBar.jsx';
import { CategoryCard, ServiceCard } from '../../components/cards.jsx';
import { EmptyState, ErrorState, LoadingState, PageHeader } from '../../components/ui.jsx';
import { useApi } from '../../hooks/useApi.js';
import { navigate, useQueryParam } from '../../hooks/useRoute.js';
import { categoriesApi, servicesApi } from '../../services/fixApi.js';
import { categoryPath } from './publicLinks.js';

const OBJECT_ID = /^[a-f0-9]{24}$/i;

// Customers browse categories first (AC, Electrical, Plumbing…), then the services in
// one. Searching skips straight to matching services across every category.
function ServicesPage() {
  const { t } = useTranslation();
  const search = (useQueryParam('search') || '').trim();
  const legacyCategory = useQueryParam('category') || '';
  const categories = useApi(() => categoriesApi.list(), []);
  // All services: for search results, and for any service not yet given a category.
  const services = useApi(
    () => servicesApi.list({ search: search || undefined }),
    [search],
  );

  // Old "?category=<id>" links now open that category's own page.
  useEffect(() => {
    if (OBJECT_ID.test(legacyCategory)) {
      navigate(categoryPath(legacyCategory), { replace: true });
    }
  }, [legacyCategory]);

  const searchBar = (
    <SearchBar
      key={search}
      initialValue={search}
      onSearch={(query) =>
        navigate(query ? `/services?search=${encodeURIComponent(query)}` : '/services', { replace: true })
      }
    />
  );

  if (search) {
    const list = services.data?.services || [];

    return (
      <AppShell>
        <PageHeader
          title={t('public.services.searchTitle')}
          back={{ to: '/services', label: t('public.services.allCategories') }}
        />
        {searchBar}
        {services.loading ? <LoadingState label={t('public.services.loading')} /> : null}
        {services.error ? <ErrorState error={services.error} onRetry={services.reload} /> : null}
        {!services.loading && !services.error && list.length === 0 ? (
          <EmptyState
            title={t('public.services.noMatch', { search })}
            message={t('public.services.tryDifferent')}
            action={
              <button type="button" className="text-link" onClick={() => navigate('/services', { replace: true })}>
                {t('public.services.showAll')}
              </button>
            }
          />
        ) : null}
        {list.length > 0 && !services.error ? (
          <div className="card-grid">
            {list.map((service) => (
              <ServiceCard key={service.id} service={service} />
            ))}
          </div>
        ) : null}
      </AppShell>
    );
  }

  const categoryList = categories.data?.categories || [];
  const uncategorized = (services.data?.services || []).filter((service) => !service.category);

  return (
    <AppShell>
      <PageHeader title={t('public.services.title')} subtitle={t('public.services.subtitle')} />
      {searchBar}

      {categories.loading ? <LoadingState label={t('public.services.loadingCategories')} /> : null}
      {categories.error ? <ErrorState error={categories.error} onRetry={categories.reload} /> : null}
      {!categories.loading && !categories.error && categoryList.length === 0 && uncategorized.length === 0 ? (
        <EmptyState title={t('public.services.noneAvailable')} message={t('public.services.checkBack')} />
      ) : null}

      {categoryList.length > 0 ? (
        <div className="category-grid">
          {categoryList.map((category) => (
            <CategoryCard key={category.id} category={category} />
          ))}
        </div>
      ) : null}

      {uncategorized.length > 0 ? (
        <section className="section" aria-labelledby="more-services-heading">
          <h2 id="more-services-heading" className="section__title">
            {t('public.services.moreServices')}
          </h2>
          <div className="card-grid">
            {uncategorized.map((service) => (
              <ServiceCard key={service.id} service={service} />
            ))}
          </div>
        </section>
      ) : null}
    </AppShell>
  );
}

export default ServicesPage;
