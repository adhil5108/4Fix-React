import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { SearchX } from 'lucide-react';
import AppShell from '../../components/AppShell.jsx';
import SearchBar from '../../components/SearchBar.jsx';
import { CategoryTile, ServiceRow } from '../../components/cards.jsx';
import { EmptyState, ErrorState, LoadingState, SectionHeader } from '../../components/ui.jsx';
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
  const services = useApi(() => servicesApi.list({ search: search || undefined }), [search]);

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
      <AppShell title={t('public.services.searchTitle')} back={{ to: '/services', label: t('public.services.allCategories') }}>
        {searchBar}
        <div className="section">
          {services.loading ? <LoadingState label={t('public.services.loading')} /> : null}
          {services.error ? <ErrorState error={services.error} onRetry={services.reload} /> : null}
          {!services.loading && !services.error && list.length === 0 ? (
            <EmptyState
              icon={SearchX}
              title={t('public.services.noMatch', { search })}
              message={t('public.services.tryDifferent')}
              action={
                <button type="button" className="link" onClick={() => navigate('/services', { replace: true })}>
                  {t('public.services.showAll')}
                </button>
              }
            />
          ) : null}
          {list.length > 0 && !services.error ? (
            <div className="list-group">
              {list.map((service) => (
                <ServiceRow key={service.id} service={service} showCategory />
              ))}
            </div>
          ) : null}
        </div>
      </AppShell>
    );
  }

  const categoryList = categories.data?.categories || [];
  const uncategorized = (services.data?.services || []).filter((service) => !service.category);

  return (
    <AppShell title={t('public.services.title')} back={{ to: '/', label: t('common.nav.home') }}>
      {searchBar}

      <section className="section" aria-labelledby="all-categories-heading">
        <SectionHeader id="all-categories-heading" title={t('public.services.allCategories')} />
        {categories.loading ? <LoadingState label={t('public.services.loadingCategories')} /> : null}
        {categories.error ? <ErrorState error={categories.error} onRetry={categories.reload} /> : null}
        {!categories.loading && !categories.error && categoryList.length === 0 && uncategorized.length === 0 ? (
          <EmptyState title={t('public.services.noneAvailable')} message={t('public.services.checkBack')} />
        ) : null}
        {categoryList.length > 0 ? (
          <div className="category-grid">
            {categoryList.map((category) => (
              <CategoryTile key={category.id} category={category} showCount />
            ))}
          </div>
        ) : null}
      </section>

      {uncategorized.length > 0 ? (
        <section className="section" aria-labelledby="more-services-heading">
          <SectionHeader id="more-services-heading" title={t('public.services.moreServices')} />
          <div className="list-group">
            {uncategorized.map((service) => (
              <ServiceRow key={service.id} service={service} />
            ))}
          </div>
        </section>
      ) : null}
    </AppShell>
  );
}

export default ServicesPage;
