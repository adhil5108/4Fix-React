import {
  formatAddress,
  formatCategory,
  formatMoney,
  formatSlot,
  formatTimestamp,
} from '../utils/format.js';
import { Link, StatusBadge } from './ui.jsx';

export function ServiceCard({ service }) {
  return (
    <Link to={`/services/${service.id}`} className="card card--link service-card">
      <span className="service-card__category">{formatCategory(service.category)}</span>
      <span className="service-card__name">{service.name}</span>
      <span className="service-card__description">{service.description}</span>
      <span className="service-card__cta" aria-hidden="true">
        View details →
      </span>
    </Link>
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
        <span className="request-card__service">{request.service?.name || 'Service request'}</span>
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

export function AttachmentList({ attachments }) {
  if (!attachments?.length) {
    return null;
  }

  return (
    <ul className="attachment-list">
      {attachments.map((attachment, index) => {
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
  );
}
