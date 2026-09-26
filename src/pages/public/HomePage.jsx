import { useTranslation } from 'react-i18next';
import AppShell from '../../components/AppShell.jsx';
import SearchBar from '../../components/SearchBar.jsx';
import { RequestCard, ServiceCard } from '../../components/cards.jsx';
import { ButtonLink, EmptyState, ErrorState, Link, LoadingState } from '../../components/ui.jsx';
import { useApi } from '../../hooks/useApi.js';
import { useSavedRequests } from '../../hooks/useSavedRequests.js';
import { useAuth } from '../../hooks/useAuth.jsx';
import { navigate } from '../../hooks/useRoute.js';
import { servicesApi } from '../../services/fixApi.js';
import { firstName, formatCategory } from '../../utils/format.js';

// Keys under public.home.steps; labels are translated at render.
const STEPS = ['report', 'accept', 'track'];

// The customer's most recent open request from this browser, if any.
function LatestRequest() {
  const { t } = useTranslation();
  const saved = useSavedRequests();
  const latest = (saved.data || []).find((request) => !['CANCELLED', 'COMPLETED'].includes(request.status));

  if (!latest) {
    return null;
  }

  return (
    <section className="section section--tight" aria-labelledby="latest-heading">
      <div className="section__header">
        <h2 id="latest-heading" className="section__title">
          {t('public.home.latestRequest')}
        </h2>
        <Link to="/requests" className="text-link">
          {t('common.nav.myRequests')}
        </Link>
      </div>
      <RequestCard request={latest} to={`/requests/${latest.id}`} />
    </section>
  );
}

function HomePage() {
  const { t } = useTranslation();
  const { isAuthenticated, user } = useAuth();
  const services = useApi(() => servicesApi.list(), []);
  const all = services.data?.services || [];
  const popular = all.filter((service) => service.isPopular);
  const featured = (popular.length > 0 ? popular : all).slice(0, 6);
  const categories = [...new Set(all.map((service) => service.category))].sort();

  return (
    <AppShell>
      <section className="hero">
        <p className="hero__eyebrow">
          {isAuthenticated
            ? t('public.home.greeting', { name: firstName(user.name) })
            : t('public.home.eyebrow')}
        </p>
        <h1 className="hero__title">{t('public.home.title')}</h1>
        <p className="hero__text">{t('public.home.text')}</p>
        <div className="hero__search">
          <SearchBar
            size="lg"
            onSearch={(query) =>
              navigate(query ? `/services?search=${encodeURIComponent(query)}` : '/services')
            }
          />
        </div>
        {categories.length > 0 ? (
          <div className="chip-row chip-row--scroll hero__categories" aria-label={t('public.home.categories')}>
            {categories.map((category) => (
              <Link
                key={category}
                to={`/services?category=${encodeURIComponent(category)}`}
                className="chip"
              >
                {formatCategory(category)}
              </Link>
            ))}
          </div>
        ) : null}
      </section>

      {!isAuthenticated ? <LatestRequest /> : null}

      <section className="section" aria-labelledby="popular-heading">
        <div className="section__header">
          <h2 id="popular-heading" className="section__title">
            {t('public.home.popular')}
          </h2>
          <Link to="/services" className="text-link">
            {t('public.home.seeAll')}
          </Link>
        </div>

        {services.loading ? <LoadingState label={t('public.home.loadingServices')} /> : null}
        {services.error ? <ErrorState error={services.error} onRetry={services.reload} /> : null}
        {!services.loading && !services.error && featured.length === 0 ? (
          <EmptyState
            title={t('public.home.emptyTitle')}
            message={t('public.home.emptyMessage')}
          />
        ) : null}
        {featured.length > 0 && !services.error ? (
          <div className="card-grid card-grid--popular">
            {featured.map((service) => (
              <ServiceCard key={service.id} service={service} />
            ))}
          </div>
        ) : null}
      </section>

      <section className="section" aria-labelledby="how-heading">
        <h2 id="how-heading" className="section__title">
          {t('public.home.howTitle')}
        </h2>
        <ol className="steps">
          {STEPS.map((step, index) => (
            <li key={step} className="step">
              <span className="step__number">{index + 1}</span>
              <div>
                <p className="step__title">{t(`public.home.steps.${step}.title`)}</p>
                <p className="step__text">{t(`public.home.steps.${step}.text`)}</p>
              </div>
            </li>
          ))}
        </ol>
        <div className="section__cta">
          <ButtonLink to="/services" size="lg">
            {t('common.nav.bookService')}
          </ButtonLink>
        </div>
      </section>

      {!isAuthenticated ? (
        <section className="card callout">
          <div>
            <p className="callout__title">{t('public.home.providerTitle')}</p>
            <p className="callout__text">{t('public.home.providerText')}</p>
          </div>
          <ButtonLink to="/signup/provider" variant="secondary">
            {t('public.home.joinProvider')}
          </ButtonLink>
        </section>
      ) : null}
    </AppShell>
  );
}

export default HomePage;
