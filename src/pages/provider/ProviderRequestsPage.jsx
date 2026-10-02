import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import AcceptJobButton from '../../components/AcceptJobButton.jsx';
import AppShell from '../../components/AppShell.jsx';
import { ServiceIcon } from '../../components/cards.jsx';
import { ButtonLink, EmptyState, ErrorState, Link, LoadingState, PageHeader, StatusBadge } from '../../components/ui.jsx';
import { useApi } from '../../hooks/useApi.js';
import { useAuth } from '../../hooks/useAuth.jsx';
import { usePolling } from '../../hooks/usePolling.js';
import { providerApi } from '../../services/fixApi.js';
import { formatAddress, formatIssueLabel, formatTimestamp } from '../../utils/format.js';

const MAX_THUMBNAILS = 3;
const IMAGE_RE = /^https?:\/\/.*\.(?:jpe?g|png|gif|webp|avif)(?:\?.*)?$/i;

function WorkCardHeader({ item, status, audience }) {
  const { t } = useTranslation();
  const issue = formatIssueLabel(item.issueKey, item.issueLabel);

  return (
    <div className="work-card__head">
      <ServiceIcon service={item.service} />
      <div className="work-card__title">
        <h3 className="work-card__service">{item.service?.name || t('provider.requests.fallbackService')}</h3>
        {issue ? <p className="work-card__issue">{issue}</p> : null}
      </div>
      <StatusBadge status={status} audience={audience} />
    </div>
  );
}

// Photos and voice note the customer attached (URLs only; no private data).
function WorkMedia({ item }) {
  const { t } = useTranslation();
  const photos = (item.attachments || []).filter((url) => IMAGE_RE.test(url));

  if (photos.length === 0 && !item.voiceNote?.url) {
    return null;
  }

  return (
    <div className="work-card__media">
      {photos.slice(0, MAX_THUMBNAILS).map((url) => (
        <img key={url} className="work-card__thumb" src={url} alt="" loading="lazy" />
      ))}
      {photos.length > MAX_THUMBNAILS ? (
        <span className="work-card__more">+{photos.length - MAX_THUMBNAILS}</span>
      ) : null}
      {photos.length > 0 ? (
        <span className="work-card__media-label">{t('provider.requests.photos', { count: photos.length })}</span>
      ) : null}
      {item.voiceNote?.url ? <span className="work-card__media-label">🎤 {t('provider.requests.voiceNote')}</span> : null}
    </div>
  );
}

// A job this provider accepted: they are authorized to see the customer and location.
function ActiveJobCard({ job }) {
  const { t } = useTranslation();
  const place = job.location?.address || formatAddress(job.address);

  return (
    <article className="card work-card work-card--assigned">
      <WorkCardHeader item={job} status={job.bookingStatus} audience="booking" />
      <p className="work-card__description">{job.description}</p>
      <dl className="work-card__meta">
        {job.customer?.name ? (
          <div>
            <dt>{t('provider.shared.customer')}</dt>
            <dd>{job.customer.name}</dd>
          </div>
        ) : null}
        {place ? (
          <div>
            <dt>{t('provider.requests.place')}</dt>
            <dd>{place}</dd>
          </div>
        ) : null}
        {job.timeline?.acceptedAt ? (
          <div>
            <dt>{t('provider.shared.accepted')}</dt>
            <dd>{formatTimestamp(job.timeline.acceptedAt)}</dd>
          </div>
        ) : null}
      </dl>
      <div className="work-card__actions">
        <ButtonLink to={`/provider/jobs/${job.bookingId}`} size="sm" className="work-card__primary">
          {t('provider.requests.openJob')}
        </ButtonLink>
        {job.location?.navigationUrl ? (
          <a className="btn btn--secondary btn--sm" href={job.location.navigationUrl} target="_blank" rel="noopener noreferrer">
            {t('cards.serviceLocation.navigate')}
          </a>
        ) : null}
        {job.customer?.phone ? (
          <a className="btn btn--secondary btn--sm" href={`tel:${job.customer.phone}`}>
            {t('provider.requests.call')}
          </a>
        ) : null}
        <ButtonLink to={`/bookings/${job.bookingId}/chat`} variant="secondary" size="sm">
          {t('provider.requests.chat')}
        </ButtonLink>
      </div>
    </article>
  );
}

// An open request: only the area, never the customer's identity or exact location.
function OpenRequestCard({ request, canAccept, onTaken, onFailed }) {
  const { t } = useTranslation();
  const area = [request.address?.city, request.address?.pincode].filter(Boolean).join(' · ');

  return (
    <article className="card work-card">
      <WorkCardHeader item={request} status={request.status} audience="provider" />
      <p className="work-card__description">{request.description}</p>
      <WorkMedia item={request} />
      <dl className="work-card__meta">
        {area ? (
          <div>
            <dt>{t('provider.shared.area')}</dt>
            <dd>{area}</dd>
          </div>
        ) : null}
        <div>
          <dt>{t('provider.requests.postedLabel')}</dt>
          <dd>{formatTimestamp(request.createdAt)}</dd>
        </div>
      </dl>
      <div className="work-card__actions">
        {canAccept ? (
          <div className="work-card__primary">
            <AcceptJobButton requestId={request.id} onTaken={onTaken} onFailed={onFailed} />
          </div>
        ) : null}
        <ButtonLink to={`/provider/requests/${request.id}`} variant="secondary" size={canAccept ? undefined : 'sm'}>
          {t('provider.requests.viewDetails')}
        </ButtonLink>
      </div>
    </article>
  );
}

function ProviderRequestsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const requests = useApi(() => providerApi.listRequests(), []);
  const jobs = useApi(() => providerApi.jobs(), []);
  const [taken, setTaken] = useState(() => new Set());
  const list = (requests.data?.requests || []).filter((request) => !taken.has(request.id));
  const activeJobs = (jobs.data?.jobs || []).filter(
    (job) => job.source === '4FIX' && job.bookingId && !['COMPLETED', 'CANCELLED'].includes(job.bookingStatus),
  );
  // Admin previews this feed from Provider View but can never accept.
  const canAccept = user.role === 'PROVIDER';
  const myCategories = (user.categories || []).map((category) => category.name).filter(Boolean);

  // Jobs disappear as other providers accept them; keep the feed fresh.
  usePolling(() => requests.refresh(), 20000, !requests.loading);

  return (
    <AppShell>
      <PageHeader
        title={t('provider.requests.title')}
        subtitle={t('provider.requests.subtitle')}
        actions={
          <Link to="/provider/jobs" className="text-link hide-mobile">
            {t('provider.requests.myJobsLink')}
          </Link>
        }
      />

      {activeJobs.length > 0 ? (
        <section className="section section--tight" aria-labelledby="active-jobs-heading">
          <div className="section__header">
            <h2 id="active-jobs-heading" className="section__title">
              {t('provider.requests.activeTitle')} <span className="count">{activeJobs.length}</span>
            </h2>
          </div>
          <div className="list">
            {activeJobs.map((job) => (
              <ActiveJobCard key={job.id} job={job} />
            ))}
          </div>
        </section>
      ) : null}

      <section className="section section--tight" aria-labelledby="open-requests-heading">
        <div className="section__header">
          <h2 id="open-requests-heading" className="section__title">
            {t('provider.requests.openTitle')} {list.length > 0 ? <span className="count">{list.length}</span> : null}
          </h2>
        </div>

        {requests.loading ? <LoadingState label={t('provider.requests.loading')} /> : null}
        {requests.error && !requests.data ? (
          <ErrorState error={requests.error} onRetry={requests.reload} />
        ) : null}

        {/* Requests are filtered by the categories the provider works in (server-side). */}
        {requests.data && canAccept && !requests.data.needsCategories && myCategories.length > 0 ? (
          <p className="field-hint provider-categories-note">
            {t('provider.requests.categoriesNote', { categories: myCategories.join(' · ') })}{' '}
            <Link to="/provider/profile" className="text-link">
              {t('provider.requests.changeCategories')}
            </Link>
          </p>
        ) : null}

        {requests.data?.needsCategories ? (
          <EmptyState
            title={t('provider.requests.needsCategoriesTitle')}
            message={t('provider.requests.needsCategoriesMessage')}
            action={<ButtonLink to="/provider/profile">{t('provider.requests.chooseCategories')}</ButtonLink>}
          />
        ) : null}

        {requests.data && !requests.data.needsCategories && list.length === 0 ? (
          <EmptyState title={t('provider.requests.emptyTitle')} message={t('provider.requests.emptyMessage')} />
        ) : null}

        {list.length > 0 ? (
          <div className="list">
            {list.map((request) => (
              <OpenRequestCard
                key={request.id}
                request={request}
                canAccept={canAccept}
                onTaken={() => setTaken((current) => new Set(current).add(request.id))}
                onFailed={() => requests.refresh()}
              />
            ))}
          </div>
        ) : null}
      </section>
    </AppShell>
  );
}

export default ProviderRequestsPage;
