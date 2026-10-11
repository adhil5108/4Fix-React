// What the (anonymous) customer sees for each state of their request: which actions to
// offer, how the progress timeline reads, and how "My requests" is grouped. Pure data —
// no React, no i18n — so the rules live in one place and can be tested on their own.

export const ACTIVE_REQUEST_STATUSES = ['PENDING', 'ACCEPTED', 'LOCATION_REACHED', 'IN_PROGRESS'];

export function isActiveRequest(request) {
  return ACTIVE_REQUEST_STATUSES.includes(request?.status);
}

function activityTime(request) {
  return new Date(request.updatedAt || request.createdAt || 0).getTime() || 0;
}

// Active requests first (the ones a customer is following), most recently changed first;
// then completed and cancelled ones, newest first. Uses only fields the API returns.
export function groupRequests(requests) {
  const byActivity = (a, b) => activityTime(b) - activityTime(a);
  const list = requests || [];

  return {
    active: list.filter(isActiveRequest).sort(byActivity),
    past: list.filter((request) => !isActiveRequest(request)).sort(byActivity),
  };
}

// The actions on the status card. `primary` is at most one action; `secondary` and
// `tertiary` are visually quieter. Each action is a key the page turns into a button:
//   call · chat · review · yourReview · invoice · newRequest
// Call needs the provider's phone (only sent to an authorized customer once a provider
// accepted); chat, invoice and review need the job (booking) created on acceptance.
export function requestActions(status, { hasPhone = false, hasBooking = false, hasReview = false } = {}) {
  const call = hasPhone ? 'call' : null;
  const chat = hasBooking ? 'chat' : null;
  const pick = (...keys) => keys.filter(Boolean);

  switch (status) {
    case 'PENDING':
      return { primary: null, secondary: [], tertiary: [], canCancel: true };
    case 'ACCEPTED': {
      const [primary = null, ...rest] = pick(call, chat);
      return { primary, secondary: rest, tertiary: [], canCancel: false };
    }
    case 'LOCATION_REACHED':
      return { primary: null, secondary: pick(call, chat), tertiary: [], canCancel: false };
    case 'IN_PROGRESS': {
      const [primary = null, ...rest] = pick(chat, call);
      return { primary, secondary: rest, tertiary: [], canCancel: false };
    }
    case 'COMPLETED':
      if (!hasBooking) {
        return { primary: null, secondary: [], tertiary: pick(call), canCancel: false };
      }
      return hasReview
        ? { primary: 'invoice', secondary: ['yourReview'], tertiary: pick(call, chat), canCancel: false }
        : { primary: 'review', secondary: ['invoice'], tertiary: pick(call, chat), canCancel: false };
    case 'CANCELLED':
      return { primary: 'newRequest', secondary: [], tertiary: [], canCancel: false };
    default:
      return { primary: null, secondary: [], tertiary: [], canCancel: false };
  }
}

// The customer's progress timeline. Every step that has happened is shown as done
// (including "Request sent" and, at the end, "Job completed"); while the request is
// open an explicit "waiting for a provider" step is the current one. `at` names the
// timeline field holding when the step happened; `labelKey` is under customer.job.stages.
const SENT = { status: 'SENT', labelKey: 'customer.job.stages.sent', at: 'sentAt' };
const WAITING = { status: 'WAITING', labelKey: 'customer.job.stages.waiting', state: 'current' };
const LATER_STAGES = [
  { status: 'ACCEPTED', labelKey: 'customer.job.stages.accepted', at: 'acceptedAt' },
  { status: 'LOCATION_REACHED', labelKey: 'customer.job.stages.arrived', at: 'locationReachedAt' },
  { status: 'IN_PROGRESS', labelKey: 'customer.job.stages.started', at: 'startedAt' },
  { status: 'COMPLETED', labelKey: 'customer.job.stages.completed', at: 'completedAt' },
];

export function customerTimeline(status) {
  const stages = status === 'PENDING' ? [SENT, WAITING, ...LATER_STAGES] : [SENT, ...LATER_STAGES];
  const rank = { PENDING: 0 };
  LATER_STAGES.forEach((stage, index) => {
    rank[stage.status] = index + 1;
  });

  return { stages, rank };
}
