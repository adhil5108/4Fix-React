export const REQUEST_STATUSES = [
  'PENDING',
  'QUOTE_RECEIVED',
  'QUOTE_ACCEPTED',
  'SCHEDULED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
];

export const BOOKING_GROUPS = ['UPCOMING', 'ACTIVE', 'COMPLETED', 'CANCELLED'];

const STATUS_LABELS = {
  PENDING: 'Waiting for quotes',
  QUOTE_RECEIVED: 'Quotes received',
  QUOTE_ACCEPTED: 'Provider chosen',
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
  QUOTE_ACCEPTED: 'You got the job',
};

const QUOTE_STATUS_LABELS = {
  PENDING: 'Awaiting decision',
  ACCEPTED: 'Accepted',
  REJECTED: 'Declined',
};

const BOOKING_STATUS_LABELS = {
  CONFIRMED: 'Booking confirmed',
  ASSIGNED: 'Technician assigned',
  ON_THE_WAY: 'On the way',
  ARRIVED: 'Technician arrived',
  IN_SERVICE: 'Service in progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

const PAYMENT_STATUS_LABELS = {
  PENDING: 'Payment pending',
  PAID: 'Paid',
  FAILED: 'Failed',
  CANCELLED: 'Cancelled',
  REFUNDED: 'Refunded',
};

// A provider-recorded job's own lifecycle — no CONFIRMED/ASSIGNED step, since it's
// already theirs the moment they add it.
const EXTERNAL_JOB_STATUS_LABELS = {
  SCHEDULED: 'Scheduled',
  ON_THE_WAY: 'On the way',
  ARRIVED: 'Arrived',
  IN_PROGRESS: 'In progress',
  COMPLETED: 'Completed',
};

export function statusLabel(status, { audience = 'customer' } = {}) {
  const labels =
    {
      quote: QUOTE_STATUS_LABELS,
      booking: BOOKING_STATUS_LABELS,
      payment: PAYMENT_STATUS_LABELS,
      provider: PROVIDER_STATUS_LABELS,
      externalJob: EXTERNAL_JOB_STATUS_LABELS,
    }[audience] || STATUS_LABELS;

  return labels[status] || status;
}

export function statusTone(status) {
  switch (status) {
    case 'QUOTE_RECEIVED':
    case 'QUOTE_ACCEPTED':
    case 'SCHEDULED':
    case 'CONFIRMED':
    case 'ASSIGNED':
      return 'info';
    case 'IN_PROGRESS':
    case 'ON_THE_WAY':
    case 'ARRIVED':
    case 'IN_SERVICE':
      return 'active';
    case 'COMPLETED':
    case 'ACCEPTED':
    case 'PAID':
      return 'success';
    case 'CANCELLED':
    case 'REJECTED':
    case 'FAILED':
    case 'REFUNDED':
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

export function formatDateTime(value) {
  if (!value) {
    return '';
  }

  return new Date(value).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatClock(value) {
  if (!value) {
    return '';
  }

  return new Date(value).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
}

export function formatMoney(amount) {
  if (amount === null || amount === undefined) {
    return '';
  }

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatRating(rating) {
  return rating === null || rating === undefined ? null : rating.toFixed(1);
}

export function formatAddress(address) {
  if (!address) {
    return '';
  }

  return [address.addressLine, address.city, address.state, address.pincode]
    .filter(Boolean)
    .join(', ');
}

export function firstName(name) {
  return (name || '').trim().split(' ')[0] || 'there';
}

export function initials(name) {
  return (name || '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

export function todayDateOnly() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}
