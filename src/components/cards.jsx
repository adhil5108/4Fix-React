import {
  formatAddress,
  formatCategory,
  formatIssueLabel,
  formatMoney,
  formatRating,
  formatSlot,
  formatTimestamp,
  initials,
} from '../utils/format.js';
import { useTranslation } from 'react-i18next';
import { Link, StatusBadge } from './ui.jsx';

export function ServiceCard({ service }) {
  const { t } = useTranslation();

  return (
    <Link to={`/services/${service.id}`} className="card card--link service-card">
      {service.image ? (
        <img className="service-card__image" src={service.image} alt="" loading="lazy" />
      ) : null}
      <span className="service-card__category">{formatCategory(service.category)}</span>
      <span className="service-card__name">{service.name}</span>
      <span className="service-card__description">{service.description}</span>
      <span className="service-card__footer">
        {service.startingPrice !== null && service.startingPrice !== undefined ? (
          <span className="service-card__price">
            {t('cards.serviceCard.from', { price: formatMoney(service.startingPrice) })}
          </span>
        ) : (
          <span />
        )}
        <span className="service-card__cta" aria-hidden="true">
          {t('cards.serviceCard.book')}
        </span>
      </span>
    </Link>
  );
}

export function IssueCard({ issue, selected = false, onSelect }) {
  return (
    <button
      type="button"
      className={`issue-card${selected ? ' is-selected' : ''}`}
      aria-pressed={selected}
      onClick={() => onSelect(issue)}
    >
      <span className="issue-card__label">{formatIssueLabel(issue.key, issue.label)}</span>
      {issue.description ? <span className="issue-card__description">{issue.description}</span> : null}
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
      <span className="rating-summary__star" aria-hidden="true">
        ★
      </span>
      {value ? (
        <>
          <strong>{value}</strong>
          <span className="rating-summary__count">
            {t('cards.rating.reviews', { count: reviewCount })}
          </span>
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
    provider.serviceCategories?.length
      ? provider.serviceCategories.map(formatCategory).join(' · ')
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

export function RequestCard({ request, to, audience = 'customer' }) {
  const { t } = useTranslation();
  // Only legacy requests carry a preferred slot; V1 jobs have no scheduling step.
  const slot = request.preferredDate
    ? t('cards.requestCard.preferred', { slot: formatSlot(request.preferredDate, request.preferredTime) })
    : '';

  return (
    <Link to={to} className="card card--link request-card">
      <span className="request-card__top">
        <span className="request-card__service">
          {request.service?.name || t('cards.requestCard.fallbackService')}
          {formatIssueLabel(request.issueKey, request.issueLabel) ? <span className="request-card__issue"> · {formatIssueLabel(request.issueKey, request.issueLabel)}</span> : null}
        </span>
        <StatusBadge status={request.status} audience={audience} />
      </span>
      <span className="request-card__description">{request.description}</span>
      <span className="request-card__meta">
        {slot ? <span>{slot}</span> : null}
        {audience === 'provider' && request.address ? (
          <span>{[request.address.city, request.address.pincode].filter(Boolean).join(' · ')}</span>
        ) : null}
        {audience === 'customer' && request.selectedProvider ? (
          <span>{t('cards.requestCard.provider', { name: request.selectedProvider.name })}</span>
        ) : null}
        {audience === 'provider' || !request.selectedProvider ? (
          <span>{t('cards.requestCard.requested', { time: formatTimestamp(request.createdAt) })}</span>
        ) : null}
      </span>
    </Link>
  );
}

// Booking list card for both roles; the counterpart shown depends on who is looking.
export function BookingCard({ booking, to, audience = 'customer' }) {
  const { t } = useTranslation();
  const counterpart = audience === 'provider' ? booking.customer : booking.provider;
  const slot = booking.request?.preferredDate
    ? t('cards.requestCard.preferred', {
        slot: formatSlot(booking.request.preferredDate, booking.request.preferredTime),
      })
    : '';

  return (
    <Link to={to} className="card card--link booking-card">
      <span className="request-card__top">
        <span className="request-card__service">
          {booking.service?.name || t('cards.requestCard.fallbackBooking')}
          {formatIssueLabel(booking.request?.issueKey, booking.request?.issueLabel) ? (
            <span className="request-card__issue"> · {formatIssueLabel(booking.request.issueKey, booking.request.issueLabel)}</span>
          ) : null}
        </span>
        <StatusBadge status={booking.status} audience="booking" />
      </span>
      <span className="booking-card__row">
        {counterpart ? (
          <span className="booking-card__person">
            <Avatar name={counterpart.name} image={counterpart.profileImage} size="sm" />
            {counterpart.name}
          </span>
        ) : null}
      </span>
      <span className="request-card__meta">
        {slot ? <span>{slot}</span> : null}
        {audience === 'provider' && booking.request?.address ? (
          <span>{booking.request.address.city}</span>
        ) : null}
        <span>{t('cards.requestCard.booked', { time: formatTimestamp(booking.createdAt) })}</span>
      </span>
    </Link>
  );
}

// A customer's recorded voice message, wherever a request/job/booking with one is
// shown. Native controls only (play/pause/seek); never autoplays.
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
      {address.label ? <strong>{address.label}</strong> : null}
      <span>{formatAddress(address)}</span>
    </address>
  );
}

// Pinned customer location. Providers get turn-by-turn via Google Maps (`navigate`);
// everyone else just views the pin. Without coordinates, no link is rendered at all.
// `fallback` from callers is already translated; `undefined` uses the default text, `null` hides it.
export function ServiceLocationBlock({ location, navigate = false, fallback }) {
  const { t } = useTranslation();
  const hasCoordinates = Number.isFinite(location?.latitude) && Number.isFinite(location?.longitude);

  if (!hasCoordinates) {
    const text = fallback === undefined ? t('cards.serviceLocation.notShared') : fallback;
    return text ? <p className="field-hint">{text}</p> : null;
  }

  const coordinates = `${location.latitude},${location.longitude}`;
  const href = navigate
    ? location.navigationUrl || `https://www.google.com/maps/dir/?api=1&destination=${coordinates}`
    : `https://www.google.com/maps/search/?api=1&query=${coordinates}`;

  return (
    <div className="service-location">
      <span className="service-location__label">{t('cards.serviceLocation.pinned')}</span>
      {location.address ? <span>{location.address}</span> : null}
      <a
        className={`btn ${navigate ? 'btn--primary' : 'btn--secondary'} btn--sm`}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
      >
        {navigate ? t('cards.serviceLocation.navigate') : t('cards.serviceLocation.openInMaps')}
      </a>
    </div>
  );
}

const IMAGE_ATTACHMENT_RE = /^https?:\/\/.*\.(?:jpe?g|png|gif|webp|avif|bmp|svg)(?:\?.*)?$/i;

// Uploaded photos (Cloudinary URLs) render as thumbnails; any other attachment
// (a plain note, or a non-image link) keeps the original text/link treatment.
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
        <ul className="attachment-thumbs">
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
                  <a href={attachment} target="_blank" rel="noopener noreferrer" className="text-link">
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
