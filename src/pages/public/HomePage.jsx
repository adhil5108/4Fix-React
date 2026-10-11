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
import { groupRequests } from '../../utils/customerRequest.js';
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

// Every request from this browser that is still in progress (usually just one), most
// recently changed first. Tapping one opens its progress.
function ActiveRequests() {
  const { t } = useTranslation();
  const saved = useSavedRequests();
  const { active } = groupRequests(saved.data);

  if (active.length === 0) {
    return null;
  }

  return (
    <section className="section" aria-labelledby="active-requests-heading">
      <SectionHeader
        id="active-requests-heading"
        title={t('public.home.activeRequests', { count: active.length })}
        action={
          <Link to="/requests" className="link">
            {t('public.home.seeAll')}
          </Link>
        }
      />
      <p className="field-hint section-hint">{t('public.home.activeHint')}</p>
      <div className="stack">
        {active.map((request) => (
          <CustomerRequestCard key={request.id} request={request} />
        ))}
      </div>
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
        <p className="home-hello__greet">{t(`public.home.greet.${dayPeriod()}`)}</p>
        <h1 className="home-hello__title">{t('public.home.question')}</h1>
      </section>

      <SearchBar onSearch={(query) => navigate(query ? `/services?search=${encodeURIComponent(query)}` : '/services')} />

      {!isAuthenticated ? <ActiveRequests /> : null}

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
