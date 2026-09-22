import {
  formatAddress,
  formatCategory,
  formatMoney,
  formatRating,
  formatSlot,
  formatTimestamp,
  initials,
} from '../utils/format.js';
import { Link, StatusBadge } from './ui.jsx';

export function ServiceCard({ service }) {
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
          <span className="service-card__price">From {formatMoney(service.startingPrice)}</span>
        ) : (
          <span />
        )}
        <span className="service-card__cta" aria-hidden="true">
          Book →
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
      <span className="issue-card__label">{issue.label}</span>
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
            ({reviewCount} {reviewCount === 1 ? 'review' : 'reviews'})
          </span>
        </>
      ) : (
        <span className="rating-summary__count">No reviews yet</span>
      )}
    </span>
  );
}

// Facts a provider profile exposes; only fields the API actually returns are shown.
export function ProviderFacts({ provider }) {
  const facts = [
    provider.experienceYears !== null && provider.experienceYears !== undefined
      ? `${provider.experienceYears} yrs experience`
      : null,
    `${provider.completedJobs} ${provider.completedJobs === 1 ? 'job' : 'jobs'} completed`,
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

export function ProviderCard({ provider, actions, children }) {
  return (
    <article className={`card provider-card${provider.isSelected ? ' provider-card--selected' : ''}`}>
      <div className="provider-card__head">
        <Avatar name={provider.name} image={provider.profileImage} />
        <div className="provider-card__identity">
          <Link to={`/providers/${provider.id}`} className="provider-card__name">
            {provider.name}
          </Link>
          <RatingSummary rating={provider.rating} reviewCount={provider.reviewCount} />
        </div>
        {provider.isSelected ? <span className="badge badge--success">Your provider</span> : null}
        {!provider.isSelected && !provider.isAvailable ? (
          <span className="badge badge--muted">Unavailable</span>
        ) : null}
      </div>
      <ProviderFacts provider={provider} />
      {children}
      {actions ? <div className="provider-card__actions">{actions}</div> : null}
    </article>
  );
}

export function RequestCard({ request, to, audience = 'customer' }) {
  const isScheduled = Boolean(request.scheduledDate);
  const slotLabel = isScheduled ? 'Scheduled' : 'Preferred';
  const slot = isScheduled
    ? formatSlot(request.scheduledDate, request.scheduledTime)
    : formatSlot(request.preferredDate, request.preferredTime);

  return (
    <Link to={to} className="card card--link request-card">
      <span className="request-card__top">
        <span className="request-card__service">
          {request.service?.name || 'Service request'}
          {request.issueLabel ? <span className="request-card__issue"> · {request.issueLabel}</span> : null}
        </span>
        <StatusBadge status={request.status} audience={audience} />
      </span>
      <span className="request-card__description">{request.description}</span>
      <span className="request-card__meta">
        <span>
          {slotLabel}: {slot}
        </span>
        {audience === 'provider' && request.address ? (
          <span>{[request.address.city, request.address.pincode].filter(Boolean).join(' · ')}</span>
        ) : null}
        {audience === 'customer' && request.selectedProvider ? (
          <span>Provider: {request.selectedProvider.name}</span>
        ) : null}
        {audience === 'customer' && !request.selectedProvider ? (
          <span>Requested {formatTimestamp(request.createdAt)}</span>
        ) : null}
      </span>
    </Link>
  );
}

// Booking list card for both roles; the counterpart shown depends on who is looking.
export function BookingCard({ booking, to, audience = 'customer' }) {
  const counterpart = audience === 'provider' ? booking.customer : booking.provider;
  const slot = booking.scheduledDate
    ? `Scheduled: ${formatSlot(booking.scheduledDate, booking.scheduledTime)}`
    : booking.request?.preferredDate
      ? `Preferred: ${formatSlot(booking.request.preferredDate, booking.request.preferredTime)}`
      : '';

  return (
    <Link to={to} className="card card--link booking-card">
      <span className="request-card__top">
        <span className="request-card__service">
          {booking.service?.name || 'Booking'}
          {booking.request?.issueLabel ? (
            <span className="request-card__issue"> · {booking.request.issueLabel}</span>
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
        {booking.amount !== null ? (
          <span className="booking-card__amount">{formatMoney(booking.amount)}</span>
        ) : null}
      </span>
      <span className="request-card__meta">
        {slot ? <span>{slot}</span> : null}
        {audience === 'provider' && booking.request?.address ? (
          <span>{booking.request.address.city}</span>
        ) : null}
        <span>Booked {formatTimestamp(booking.createdAt)}</span>
      </span>
    </Link>
  );
}

export function QuoteCard({ quote, showProvider = true, highlight = false, actions }) {
  return (
    <article className={`card quote-card${highlight ? ' quote-card--highlight' : ''}`}>
      <div className="quote-card__top">
        <div>
          {showProvider ? (
            <p className="quote-card__provider">{quote.provider?.name || 'Provider'}</p>
          ) : null}
          <p className="quote-card__amount">{formatMoney(quote.amount)}</p>
        </div>
        <StatusBadge status={quote.status} audience="quote" />
      </div>
      <p className="quote-card__description">{quote.description}</p>
      <p className="quote-card__date">Quoted {formatTimestamp(quote.createdAt)}</p>
      {actions ? <div className="quote-card__actions">{actions}</div> : null}
    </article>
  );
}

// A customer's recorded voice message, wherever a request/job/booking with one is
// shown. Native controls only (play/pause/seek); never autoplays.
export function VoiceNoteBlock({ voiceNote }) {
  if (!voiceNote?.url) {
    return null;
  }

  return (
    <div className="voice-note">
      <span className="voice-note__label">🎤 Voice message from customer</span>
      <audio controls preload="none" src={voiceNote.url} className="voice-note__player">
        Your browser does not support audio playback.
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

const IMAGE_ATTACHMENT_RE = /^https?:\/\/.*\.(?:jpe?g|png|gif|webp|avif|bmp|svg)(?:\?.*)?$/i;

// Uploaded photos (Cloudinary URLs) render as thumbnails; any other attachment
// (a plain note, or a non-image link) keeps the original text/link treatment.
export function AttachmentList({ attachments }) {
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
              <a href={url} target="_blank" rel="noopener noreferrer" aria-label={`Open photo ${index + 1}`}>
                <img src={url} alt={`Attachment ${index + 1}`} loading="lazy" />
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
