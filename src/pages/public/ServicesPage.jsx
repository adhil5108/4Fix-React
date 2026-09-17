import AppShell from '../../components/AppShell.jsx';
import { ServiceCard } from '../../components/cards.jsx';
import { EmptyState, ErrorState, LoadingState, PageHeader } from '../../components/ui.jsx';
import { useApi } from '../../hooks/useApi.js';
import { navigate, useQueryParam } from '../../hooks/useRoute.js';
import { servicesApi } from '../../services/fixApi.js';
import { formatCategory } from '../../utils/format.js';

function ServicesPage() {
  const category = (useQueryParam('category') || '').toUpperCase();
  const allServices = useApi(() => servicesApi.list(), []);
  const services = useApi(() => servicesApi.list(category || undefined), [category]);

  const categories = [
    ...new Set((allServices.data?.services || []).map((service) => service.category)),
  ].sort();

  function selectCategory(nextCategory) {
    navigate(nextCategory ? `/services?category=${encodeURIComponent(nextCategory)}` : '/services', {
      replace: true,
    });
  }

  const list = services.data?.services || [];

  return (
    <AppShell>
      <PageHeader title="Services" subtitle="Choose a service to see details and report an issue." />

      {categories.length > 1 ? (
        <div className="chip-row" role="group" aria-label="Filter by category">
          <button
            type="button"
            className={`chip${!category ? ' is-active' : ''}`}
            aria-pressed={!category}
            onClick={() => selectCategory('')}
          >
            All
          </button>
          {categories.map((item) => (
            <button
              key={item}
              type="button"
              className={`chip${category === item ? ' is-active' : ''}`}
              aria-pressed={category === item}
              onClick={() => selectCategory(item)}
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
          title={category ? 'No services in this category' : 'No services available'}
          message={category ? 'Try another category.' : 'Please check back soon.'}
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
