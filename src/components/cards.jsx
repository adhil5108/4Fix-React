import { useTranslation } from 'react-i18next';
import { ChevronRight, Clock, ExternalLink, Image as ImageIcon, MapPin, Mic, Navigation, Star, User } from 'lucide-react';
import { categoryPath } from '../pages/public/publicLinks.js';
import {
  formatAddress,
  formatIssueLabel,
  formatMoney,
  formatRating,
  formatRelative,
  formatTimestamp,
  initials,
} from '../utils/format.js';
import { artFor, issueIcon } from './serviceArt.js';
import { ButtonLink, Link, ListRow, StatusBadge } from './ui.jsx';
import { ChatCount } from './Unread.jsx';

// The icon of a service or category, drawn straight on the card/page — no tile behind
// it. An uploaded asset (API field `image`) is always an ICON: compact, contain-fit,
// never cropped or used as a banner. Without one, a line icon matching the name is shown
// (see serviceArt.js).
export function ServiceIcon({ service, size = 'md' }) {
  const art = artFor(service);
  const Art = art.icon;

  return (
    <span className={`service-icon service-icon--${size}`} aria-hidden="true">
      {service?.image ? (
        <img src={service.image} alt="" loading="lazy" />
      ) : Art ? (
        <Art />
      ) : (
        <span className="service-icon__initials">{initials(service?.name) || '•'}</span>
      )}
    </span>
  );
}

// First browsing step: one category tile.
export function CategoryTile({ category, showCount = false }) {
  const { t } = useTranslation();

  return (
    <Link to={categoryPath(category.id)} className="category-tile">
      <ServiceIcon service={category} size="lg" />
      <span className="category-tile__name">{category.name}</span>
      {showCount && category.serviceCount !== undefined ? (
        <span className="category-tile__count">{t('cards.categoryCard.services', { count: category.serviceCount })}</span>
      ) : null}
    </Link>
  );
}

// A service in a list (category page, search results). Opens the service.
export function ServiceRow({ service, showCategory = false }) {
  const { t } = useTranslation();
  const hasPrice = service.startingPrice !== null && service.startingPrice !== undefined;

  return (
    <ListRow to={`/services/${service.id}`} leading={<ServiceIcon service={service} />}>
      <span className="list-row__title">{service.name}</span>
      {showCategory && service.category?.name ? <span className="list-row__label">{service.category.name}</span> : null}
      {service.description ? <span className="service-row__desc">{service.description}</span> : null}
      {hasPrice ? (
        <span className="service-row__price">{t('cards.serviceCard.from', { price: formatMoney(service.startingPrice) })}</span>
      ) : null}
    </ListRow>
  );
}

export function IssueTile({ issue, selected = false, onSelect }) {
  const Icon = issueIcon(issue);

  return (
    <button
      type="button"
      className={`issue-tile${selected ? ' is-selected' : ''}`}
      aria-pressed={selected}
      onClick={() => onSelect(issue)}
    >
      <Icon aria-hidden="true" />
      <span className="issue-tile__label">{formatIssueLabel(issue.key, issue.label)}</span>
      {issue.description ? <span className="issue-tile__description">{issue.description}</span> : null}
    </button>
  );
}

export function Avatar({ name, image, size = 'md' }) {
  return image ? (
    <img className={`avatar avatar--${size}`} src={image} alt="" />
  ) : (
    <span className={`avatar avatar--${size}`} aria-hidden="true">
      {initials(name)}
    </span>
  );
}

export function RatingSummary({ rating, reviewCount }) {
  const { t } = useTranslation();
  const value = formatRating(rating);

  return (
    <span className="rating-summary">
      <Star aria-hidden="true" />
      {value ? (
        <>
          <strong>{value}</strong>
          <span className="rating-summary__count">{t('cards.rating.reviews', { count: reviewCount })}</span>
        </>
      ) : (
        <span className="rating-summary__count">{t('cards.rating.noReviews')}</span>
      )}
    </span>
  );
}

// Facts a provider profile exposes; only fields the API actually returns are shown.
export function ProviderFacts({ provider }) {
  const { t } = useTranslation();
  const facts = [
    provider.experienceYears !== null && provider.experienceYears !== undefined
      ? t('cards.providerFacts.experience', { count: provider.experienceYears })
      : null,
    t('cards.providerFacts.jobsCompleted', { count: provider.completedJobs }),
    provider.categories?.length
      ? provider.categories.map((category) => category.name).filter(Boolean).join(' · ')
      : null,
  ].filter(Boolean);

  return (
    <ul className="provider-facts">
      {facts.map((fact) => (
        <li key={fact}>{fact}</li>
      ))}
    </ul>
  );
}

// ---------------------------------------------------------------- Job cards
// One card system for every request/job list. The wrappers below decide what goes in.

export function JobCard({
  to,
  service,
  title,
  subtitle,
  badge,
  chatBookingId,
  description,
  meta = [],
  actions,
  compact = false,
  highlight = false,
  showChevron = false,
}) {
  const Element = to ? Link : 'article';
  const classes = ['job-card', compact ? 'job-card--compact' : '', highlight ? 'job-card--highlight' : '']
    .filter(Boolean)
    .join(' ');

  return (
    <Element {...(to ? { to } : {})} className={classes}>
      <span className="job-card__head">
        <ServiceIcon service={service} size={compact ? 'sm' : 'md'} />
        <span className="job-card__title">
          <span className="job-card__service">{title}</span>
          {subtitle ? <span className="job-card__sub">{subtitle}</span> : null}
          {badge ? <span className="job-card__badge">{badge}</span> : null}
        </span>
        {chatBookingId ? (
          <span className="job-card__side">
            <ChatCount bookingId={chatBookingId} />
          </span>
        ) : null}
        {showChevron ? (
          <span className="job-card__chevron" aria-hidden="true">
            <ChevronRight />
          </span>
        ) : null}
      </span>
      {description ? <span className="job-card__desc">{description}</span> : null}
      {meta.length ? (
        <span className="job-card__meta">
          {meta.map(({ icon: Icon, text }) => (
            <span key={text}>
              {Icon ? <Icon aria-hidden="true" /> : null}
              {text}
            </span>
          ))}
        </span>
      ) : null}
      {actions ? <span className="job-card__actions">{actions}</span> : null}
    </Element>
  );
}

// A customer's request (My requests, Home).
export function CustomerRequestCard({ request, compact = false }) {
  const { t } = useTranslation();
  const issue = formatIssueLabel(request.issueKey, request.issueLabel);
  const meta = request.selectedProvider
    ? [{ icon: User, text: request.selectedProvider.name }]
    : [{ text: t('cards.requestCard.requested', { time: formatTimestamp(request.createdAt) }) }];

  return (
    <JobCard
      to={`/requests/${request.id}`}
      compact={compact}
      service={request.service}
      title={request.service?.name || t('cards.requestCard.fallbackService')}
      subtitle={issue || request.description}
      badge={<StatusBadge status={request.status} />}
      chatBookingId={request.booking?.id}
      meta={meta}
    />
  );
}

// A job in the provider's "My jobs" (4Fix or external) or the home summary.
export function ProviderJobCard({ job, compact = false }) {
  const { t } = useTranslation();
  const isExternal = job.source === 'EXTERNAL';
  const issue = formatIssueLabel(job.issueKey, job.issueLabel);
  const place = job.location?.address || [job.address?.city, job.address?.pincode].filter(Boolean).join(' · ');
  const customer = isExternal ? job.customerName : job.customer?.name;
  const path = isExternal
    ? `/provider/jobs/external/${job.id}`
    : job.bookingId
      ? `/provider/jobs/${job.bookingId}`
      : `/provider/requests/${job.id}`;

  return (
    <JobCard
      to={path}
      compact={compact}
      service={job.service || { name: job.serviceLabel }}
      title={job.service?.name || job.serviceLabel || t('provider.shared.job')}
      subtitle={[isExternal ? t('provider.shared.external') : null, issue].filter(Boolean).join(' · ') || null}
      badge={
        isExternal ? (
          <StatusBadge status={job.status} audience="externalJob" />
        ) : job.bookingStatus ? (
          <StatusBadge status={job.bookingStatus} audience="booking" />
        ) : (
          <StatusBadge status={job.status} audience="provider" />
        )
      }
      chatBookingId={job.bookingId}
      meta={[
        customer ? { icon: User, text: customer } : null,
        place ? { icon: MapPin, text: place } : null,
      ].filter(Boolean)}
    />
  );
}

// An open request in the provider feed: area only — never the customer's identity or
// exact location before acceptance.
export function OpenRequestCard({ request, actions, compact = false, to }) {
  const { t } = useTranslation();
  const issue = formatIssueLabel(request.issueKey, request.issueLabel);
  const area = [request.address?.city, request.address?.pincode].filter(Boolean).join(' · ');
  const photos = (request.attachments || []).length;

  return (
    <JobCard
      to={to}
      compact={compact}
      showChevron={compact}
      service={request.service}
      title={request.service?.name || t('provider.requests.fallbackService')}
      subtitle={issue}
      description={compact ? null : request.description}
      meta={[
        { icon: Clock, text: formatRelative(request.createdAt) },
        area ? { icon: MapPin, text: area } : null,
        photos ? { icon: ImageIcon, text: t('provider.requests.photos', { count: photos }) } : null,
        request.voiceNote?.url ? { icon: Mic, text: t('provider.requests.voiceNote') } : null,
      ].filter(Boolean)}
      actions={actions}
    />
  );
}

// ---------------------------------------------------------------- Contact

// The other person on a job, with the ways to reach them. `actions` are
// { key, icon, label, href|to|onClick, primary, badge }.
export function ContactCard({ role, name, phone, image, profileTo, actions = [] }) {
  return (
    <div className="contact-card">
      <div className="contact-card__person">
        <Avatar name={name} image={image} />
        <div className="contact-card__who">
          <span className="contact-card__role">{role}</span>
          {profileTo ? (
            <Link to={profileTo} className="contact-card__name">
              {name}
            </Link>
          ) : (
            <span className="contact-card__name">{name}</span>
          )}
          {phone ? <span className="contact-card__phone">{phone}</span> : null}
        </div>
      </div>
      {actions.length ? (
        <div className="contact-actions">
          {actions.map(({ key, icon: Icon, label, href, to, onClick, primary, badge, external }) => {
            const className = `contact-action${primary ? ' contact-action--primary' : ''}`;
            const content = (
              <>
                <Icon aria-hidden="true" />
                <span>{label}</span>
                {badge}
              </>
            );

            if (to) {
              return (
                <Link key={key} to={to} className={className}>
                  {content}
                </Link>
              );
            }

            if (href) {
              return (
                <a
                  key={key}
                  href={href}
                  className={className}
                  {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                >
                  {content}
                </a>
              );
            }

            return (
              <button key={key} type="button" className={className} onClick={onClick}>
                {content}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------- Job content blocks

// A customer's recorded voice message. Native controls only; never autoplays.
export function VoiceNoteBlock({ voiceNote }) {
  const { t } = useTranslation();

  if (!voiceNote?.url) {
    return null;
  }

  return (
    <div className="voice-note">
      <span className="voice-note__label">{t('cards.voiceNote.label')}</span>
      <audio controls preload="none" src={voiceNote.url} className="voice-note__player">
        {t('cards.voiceNote.unsupported')}
      </audio>
    </div>
  );
}

export function AddressBlock({ address }) {
  if (!address) {
    return null;
  }

  return (
    <address className="address-block">
      {address.label ? <strong>{address.label} · </strong> : null}
      {formatAddress(address)}
    </address>
  );
}

export function mapsLink(location, { navigate = false } = {}) {
  const coordinates = `${location.latitude},${location.longitude}`;
  return navigate
    ? location.navigationUrl || `https://www.google.com/maps/dir/?api=1&destination=${coordinates}`
    : `https://www.google.com/maps/search/?api=1&query=${coordinates}`;
}

export function hasCoordinates(location) {
  return Number.isFinite(location?.latitude) && Number.isFinite(location?.longitude);
}

// Where the job is: pinned coordinates and/or a typed address, with one maps action.
// `navigate` (providers) opens turn-by-turn; everyone else just views the pin.
// `fallback`: already translated; `undefined` uses the default text, `null` hides it.
export function ServiceLocationBlock({ location, address, navigate = false, fallback, showAction = true }) {
  const { t } = useTranslation();
  const pinned = hasCoordinates(location);

  if (!pinned && !address) {
    const text = fallback === undefined ? t('cards.serviceLocation.notShared') : fallback;
    return text ? <p className="field-hint">{text}</p> : null;
  }

  return (
    <div className="service-location">
      <span className="list-row__icon" aria-hidden="true">
        <MapPin />
      </span>
      <span className="service-location__text">
        {pinned ? <span className="list-row__label">{t('cards.serviceLocation.pinned')}</span> : null}
        {location?.address ? <span>{location.address}</span> : null}
        <AddressBlock address={address} />
        {pinned && showAction ? (
          <span>
            <ButtonLink
              href={mapsLink(location, { navigate })}
              target="_blank"
              rel="noopener noreferrer"
              size="sm"
              variant={navigate ? 'primary' : 'secondary'}
              icon={navigate ? Navigation : ExternalLink}
            >
              {navigate ? t('cards.serviceLocation.navigate') : t('cards.serviceLocation.openInMaps')}
            </ButtonLink>
          </span>
        ) : null}
        {!pinned && fallback ? <span className="field-hint">{fallback}</span> : null}
      </span>
    </div>
  );
}

const IMAGE_ATTACHMENT_RE = /^https?:\/\/.*\.(?:jpe?g|png|gif|webp|avif|bmp|svg)(?:\?.*)?$/i;

// Uploaded photos (Cloudinary URLs) render as thumbnails; any other attachment
// (a plain note, or a non-image link) keeps the text/link treatment.
export function AttachmentList({ attachments }) {
  const { t } = useTranslation();

  if (!attachments?.length) {
    return null;
  }

  const images = attachments.filter((attachment) => IMAGE_ATTACHMENT_RE.test(attachment));
  const others = attachments.filter((attachment) => !IMAGE_ATTACHMENT_RE.test(attachment));

  return (
    <>
      {images.length > 0 ? (
        <ul className="media-thumbs">
          {images.map((url, index) => (
            <li key={`${url}-${index}`}>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t('cards.attachments.openPhoto', { number: index + 1 })}
              >
                <img src={url} alt={t('cards.attachments.photoAlt', { number: index + 1 })} loading="lazy" />
              </a>
            </li>
          ))}
        </ul>
      ) : null}
      {others.length > 0 ? (
        <ul className="attachment-list">
          {others.map((attachment, index) => {
            const isUrl = /^https?:\/\//i.test(attachment);

            return (
              <li key={`${attachment}-${index}`}>
                {isUrl ? (
                  <a href={attachment} target="_blank" rel="noopener noreferrer" className="link">
                    {attachment}
                  </a>
                ) : (
                  <span>{attachment}</span>
                )}
              </li>
            );
          })}
        </ul>
      ) : null}
    </>
  );
}
