// Customers have no accounts: each request they create comes with a secret access
// token, kept here in this browser. It is the only way to see that request, its job,
// chat and review. Knowing a request id alone grants nothing.
const STORAGE_KEY = '4fix.customerRequests';
const MAX_ENTRIES = 50;

function readAll() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.filter((entry) => entry?.requestId && entry?.token) : [];
  } catch {
    return [];
  }
}

function writeAll(entries) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
  } catch {
    // Storage unavailable (private mode): the tracking link still works for this visit.
  }
}

export function saveRequestAccess(requestId, token) {
  const entries = readAll().filter((entry) => entry.requestId !== requestId);
  const previous = readAll().find((entry) => entry.requestId === requestId);
  writeAll([{ requestId, token, bookingId: previous?.bookingId || null, savedAt: new Date().toISOString() }, ...entries]);
}

// Remembers which request a job (booking) came from, so booking/chat/review pages can
// find the right token from the booking id in their URL.
export function linkBooking(requestId, bookingId) {
  if (!bookingId) return;
  const entries = readAll();
  const entry = entries.find((item) => item.requestId === requestId);

  if (entry && entry.bookingId !== bookingId) {
    entry.bookingId = bookingId;
    writeAll(entries);
  }
}

export function tokenForRequest(requestId) {
  return readAll().find((entry) => entry.requestId === requestId)?.token || null;
}

export function tokenForBooking(bookingId) {
  return readAll().find((entry) => entry.bookingId === bookingId)?.token || null;
}

export function requestIdForBooking(bookingId) {
  return readAll().find((entry) => entry.bookingId === bookingId)?.requestId || null;
}

export function listSavedRequests() {
  return readAll();
}

export function forgetRequest(requestId) {
  writeAll(readAll().filter((entry) => entry.requestId !== requestId));
}

// A private link that restores access on another device. The token travels in the URL
// fragment (#…), which browsers never send to the server.
export function trackingLink(requestId, token) {
  return `${window.location.origin}/requests/${encodeURIComponent(requestId)}#access=${encodeURIComponent(token)}`;
}

// Called on the request page: adopts a token from a tracking link, then strips it from
// the address bar so it isn't shared by accident.
export function adoptTokenFromLocation(requestId) {
  const match = /(?:^#|&)access=([^&]+)/.exec(window.location.hash || '');

  if (!match) {
    return;
  }

  saveRequestAccess(requestId, decodeURIComponent(match[1]));
  window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search);
}
