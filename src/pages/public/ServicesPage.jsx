import AppShell from '../../components/AppShell.jsx';
import SearchBar from '../../components/SearchBar.jsx';
import { ServiceCard } from '../../components/cards.jsx';
import { EmptyState, ErrorState, LoadingState, PageHeader } from '../../components/ui.jsx';
import { useApi } from '../../hooks/useApi.js';
import { navigate, useQueryParam } from '../../hooks/useRoute.js';
import { servicesApi } from '../../services/fixApi.js';
import { formatCategory } from '../../utils/format.js';

function buildPath({ search, category }) {
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (category) params.set('category', category);
  const query = params.toString();
  return query ? `/services?${query}` : '/services';
}

function ServicesPage() {
  const search = (useQueryParam('search') || '').trim();
  const category = (useQueryParam('category') || '').toUpperCase();
  const allServices = useApi(() => servicesApi.list(), []);
  const services = useApi(
    () => servicesApi.list({ search: search || undefined, category: category || undefined }),
    [search, category],
  );

  const categories = [
    ...new Set((allServices.data?.services || []).map((service) => service.category)),
  ].sort();
  const list = services.data?.services || [];

  return (
    <AppShell>
      <PageHeader title="Services" subtitle="Choose a service, then tell us what’s wrong." />

      <SearchBar
        key={search}
        initialValue={search}
        onSearch={(query) => navigate(buildPath({ search: query, category }), { replace: true })}
      />

      {categories.length > 1 ? (
        <div className="chip-row chip-row--scroll" role="group" aria-label="Filter by category">
          <button
            type="button"
            className={`chip${!category ? ' is-active' : ''}`}
            aria-pressed={!category}
            onClick={() => navigate(buildPath({ search }), { replace: true })}
          >
            All
          </button>
          {categories.map((item) => (
            <button
              key={item}
              type="button"
              className={`chip${category === item ? ' is-active' : ''}`}
              aria-pressed={category === item}
              onClick={() => navigate(buildPath({ search, category: item }), { replace: true })}
            >
              {formatCategory(item)}
            </button>
          ))}
        </div>
      ) : null}

      {services.loading ? <LoadingState label="Loading services…" /> : null}
      {services.error ? <ErrorState error={services.error} onRetry={services.reload} /> : null}
      {!services.loading && !services.error && list.length === 0 ? (
        <EmptyState
          title={search ? `No services match “${search}”` : category ? 'No services in this category' : 'No services available'}
          message={search || category ? 'Try a different search or category.' : 'Please check back soon.'}
          action={
            search || category ? (
              <button type="button" className="text-link" onClick={() => navigate('/services', { replace: true })}>
                Show all services
              </button>
            ) : null
          }
        />
      ) : null}
      {!services.loading && !services.error && list.length > 0 ? (
        <div className="card-grid">
          {list.map((service) => (
            <ServiceCard key={service.id} service={service} />
          ))}
        </div>
      ) : null}
    </AppShell>
  );
}

export default ServicesPage;
