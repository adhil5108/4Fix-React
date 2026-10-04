import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Inbox, Tags } from 'lucide-react';
import AcceptJobButton from '../../components/AcceptJobButton.jsx';
import AppShell from '../../components/AppShell.jsx';
import { OpenRequestCard } from '../../components/cards.jsx';
import { ButtonLink, EmptyState, ErrorState, Link, LoadingState } from '../../components/ui.jsx';
import { useApi } from '../../hooks/useApi.js';
import { useAuth } from '../../hooks/useAuth.jsx';
import { usePolling } from '../../hooks/usePolling.js';
import { providerApi } from '../../services/fixApi.js';

// New requests in the provider's categories (filtered by the server). Accepted jobs live
// under My jobs, so this tab is only about finding work.
function ProviderRequestsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const requests = useApi(() => providerApi.listRequests(), []);
  const [taken, setTaken] = useState(() => new Set());
  const list = (requests.data?.requests || []).filter((request) => !taken.has(request.id));
  // Admin previews this feed from Provider View but can never accept.
  const canAccept = user.role === 'PROVIDER';
  const myCategories = (user.categories || []).map((category) => category.name).filter(Boolean);

  // Jobs disappear as other providers accept them; keep the feed fresh.
  usePolling(() => requests.refresh(), 20000, !requests.loading);

  return (
    <AppShell title={t('provider.requests.title')} large>
      {requests.data && canAccept && !requests.data.needsCategories && myCategories.length > 0 ? (
        <p className="filter-note">
          <Tags aria-hidden="true" />
          <span>{t('provider.requests.categoriesNote', { categories: myCategories.join(' · ') })}</span>
          <Link to="/provider/profile" className="link">
            {t('provider.requests.changeCategories')}
          </Link>
        </p>
      ) : null}

      {requests.loading ? <LoadingState label={t('provider.requests.loading')} /> : null}
      {requests.error && !requests.data ? <ErrorState error={requests.error} onRetry={requests.reload} /> : null}

      {requests.data?.needsCategories ? (
        <EmptyState
          icon={Tags}
          title={t('provider.requests.needsCategoriesTitle')}
          message={t('provider.requests.needsCategoriesMessage')}
          action={<ButtonLink to="/provider/profile">{t('provider.requests.chooseCategories')}</ButtonLink>}
        />
      ) : null}

      {requests.data && !requests.data.needsCategories && list.length === 0 ? (
        <EmptyState icon={Inbox} title={t('provider.requests.emptyTitle')} message={t('provider.requests.emptyMessage')} />
      ) : null}

      {list.length > 0 ? (
        <div className="stack">
          {list.map((request) => (
            <OpenRequestCard
              key={request.id}
              request={request}
              actions={
                <>
                  <ButtonLink to={`/provider/requests/${request.id}`} variant="secondary">
                    {t('provider.requests.viewDetails')}
                  </ButtonLink>
                  {canAccept ? (
                    <AcceptJobButton
                      requestId={request.id}
                      onTaken={() => setTaken((current) => new Set(current).add(request.id))}
                      onFailed={() => requests.refresh()}
                    />
                  ) : null}
                </>
              }
            />
          ))}
        </div>
      ) : null}
    </AppShell>
  );
}

export default ProviderRequestsPage;
