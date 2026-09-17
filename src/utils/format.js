export const REQUEST_STATUSES = [
  'PENDING',
  'QUOTE_RECEIVED',
  'QUOTE_ACCEPTED',
  'SCHEDULED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
];

const STATUS_LABELS = {
  PENDING: 'Waiting for quotes',
  QUOTE_RECEIVED: 'Quotes received',
  QUOTE_ACCEPTED: 'Quote accepted',
  SCHEDULED: 'Scheduled',
  IN_PROGRESS: 'In progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  ACCEPTED: 'Accepted',
  REJECTED: 'Rejected',
};

const PROVIDER_STATUS_LABELS = {
  ...STATUS_LABELS,
  PENDING: 'Open',
  QUOTE_RECEIVED: 'Open · quoted',
};

const QUOTE_STATUS_LABELS = {
  PENDING: 'Awaiting decision',
  ACCEPTED: 'Accepted',
  REJECTED: 'Declined',
};

export function statusLabel(status, { audience = 'customer' } = {}) {
  if (audience === 'quote') {
    return QUOTE_STATUS_LABELS[status] || status;
  }

  const labels = audience === 'provider' ? PROVIDER_STATUS_LABELS : STATUS_LABELS;
  return labels[status] || status;
}

export function statusTone(status) {
  switch (status) {
    case 'QUOTE_RECEIVED':
    case 'QUOTE_ACCEPTED':
    case 'SCHEDULED':
      return 'info';
    case 'IN_PROGRESS':
      return 'active';
    case 'COMPLETED':
    case 'ACCEPTED':
      return 'success';
    case 'CANCELLED':
    case 'REJECTED':
      return 'muted';
    default:
      return 'neutral';
  }
}

export function formatCategory(category) {
  if (!category) {
    return '';
  }

  if (category.length <= 3) {
    return category;
  }

  return category.charAt(0) + category.slice(1).toLowerCase();
}

// Backend dates are calendar dates (YYYY-MM-DD), so format them without timezone shifts.
export function formatDate(dateOnly) {
  if (!dateOnly) {
    return '';
  }

  const [year, month, day] = dateOnly.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatTime(time) {
  if (!time) {
    return '';
  }

  const [hours, minutes] = time.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
}

export function formatSlot(dateOnly, time) {
  return [formatDate(dateOnly), formatTime(time)].filter(Boolean).join(' · ');
}

export function formatTimestamp(value) {
  if (!value) {
    return '';
  }

  return new Date(value).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatMoney(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatAddress(address) {
  if (!address) {
    return '';
  }

  return [address.addressLine, address.city, address.state, address.pincode]
    .filter(Boolean)
    .join(', ');
}

export function todayDateOnly() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}
