import { useTranslation } from 'react-i18next';
import { Briefcase, ClipboardList, MessageCircle, UserCheck } from 'lucide-react';
import AppShell from '../../components/AppShell.jsx';
import LanguageSwitcher from '../../components/LanguageSwitcher.jsx';
import SearchBar from '../../components/SearchBar.jsx';
import { CategoryTile, CustomerRequestCard, ServiceRow } from '../../components/cards.jsx';
import { EmptyState, ErrorState, Link, ListRow, LoadingState, SectionHeader } from '../../components/ui.jsx';
import { useApi } from '../../hooks/useApi.js';
import { useAuth } from '../../hooks/useAuth.jsx';
import { useSavedRequests } from '../../hooks/useSavedRequests.js';
import { navigate } from '../../hooks/useRoute.js';
import { categoriesApi, servicesApi } from '../../services/fixApi.js';
import { dayPeriod } from '../../utils/format.js';

const HOME_CATEGORY_LIMIT = 6;
const POPULAR_LIMIT = 4;

// Keys under public.home.steps; the copy matches V1 — the first nearby provider to
// accept takes the job; there is no provider choice and no live tracking.
const STEPS = [
  { key: 'report', icon: ClipboardList },
  { key: 'accept', icon: UserCheck },
  { key: 'track', icon: MessageCircle },
];

// The customer's most recent open request from this browser, if any.
function ActiveRequest() {
  const { t } = useTranslation();
  const saved = useSavedRequests();
  const latest = (saved.data || []).find((request) => !['CANCELLED', 'COMPLETED'].includes(request.status));

  if (!latest) {
    return null;
  }

  return (
    <section className="section" aria-labelledby="active-request-heading">
      <SectionHeader
        id="active-request-heading"
        title={t('public.home.latestRequest')}
        action={
          <Link to="/requests" className="link">
            {t('public.home.seeAll')}
          </Link>
        }
      />
      <CustomerRequestCard request={latest} />
    </section>
  );
}

function HomePage() {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const categories = useApi(() => categoriesApi.list(), []);
  const services = useApi(() => servicesApi.list({ popular: 'true' }), []);
  const categoryList = categories.data?.categories || [];
  const popular = (services.data?.services || []).slice(0, POPULAR_LIMIT);

  return (
    <AppShell brand actions={<LanguageSwitcher compact />}>
      <section className="home-hello">
        <h1 className="home-hello__title">{t(`public.home.greet.${dayPeriod()}`)}</h1>
        <p className="home-hello__text">{t('public.home.question')}</p>
      </section>

      <SearchBar onSearch={(query) => navigate(query ? `/services?search=${encodeURIComponent(query)}` : '/services')} />

      {!isAuthenticated ? <ActiveRequest /> : null}

      <section className="section" aria-labelledby="categories-heading">
        <SectionHeader
          id="categories-heading"
          title={t('public.home.categories')}
          action={
            categoryList.length > HOME_CATEGORY_LIMIT ? (
              <Link to="/services" className="link">
                {t('public.home.seeAll')}
              </Link>
            ) : null
          }
        />
        {categories.loading ? <LoadingState label={t('public.home.loadingServices')} /> : null}
        {categories.error ? <ErrorState error={categories.error} onRetry={categories.reload} /> : null}
        {!categories.loading && !categories.error && categoryList.length === 0 ? (
          <EmptyState title={t('public.home.emptyTitle')} message={t('public.home.emptyMessage')} />
        ) : null}
        {categoryList.length > 0 ? (
          <div className="category-grid">
            {categoryList.slice(0, HOME_CATEGORY_LIMIT).map((category) => (
              <CategoryTile key={category.id} category={category} />
            ))}
          </div>
        ) : null}
      </section>

      {popular.length > 0 ? (
        <section className="section" aria-labelledby="popular-heading">
          <SectionHeader id="popular-heading" title={t('public.home.popular')} />
          <div className="list-group">
            {popular.map((service) => (
              <ServiceRow key={service.id} service={service} showCategory />
            ))}
          </div>
        </section>
      ) : null}

      <section className="section" aria-labelledby="how-heading">
        <SectionHeader id="how-heading" title={t('public.home.howTitle')} />
        <div className="list-group">
          {STEPS.map((step) => (
            <ListRow
              key={step.key}
              icon={step.icon}
              title={t(`public.home.steps.${step.key}.title`)}
              value={t(`public.home.steps.${step.key}.text`)}
              muted
            />
          ))}
        </div>
      </section>

      {!isAuthenticated ? (
        <section className="section">
          <div className="list-group">
            <ListRow
              to="/signup/provider"
              icon={Briefcase}
              title={t('public.home.providerTitle')}
              value={t('public.home.providerText')}
              muted
            />
          </div>
        </section>
      ) : null}
    </AppShell>
  );
}

export default HomePage;
