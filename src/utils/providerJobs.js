// The backend has no "my jobs" listing for providers yet: discovery only returns open
// requests. Requests this provider has quoted on are remembered on this device so they
// can be reopened (via GET /api/provider/requests/:id) once they leave discovery.
const MAX_TRACKED = 50;

function storageKey(providerId) {
  return `4fix.provider.${providerId}.requests`;
}

export function getTrackedRequestIds(providerId) {
  try {
    const stored = JSON.parse(window.localStorage.getItem(storageKey(providerId)) || '[]');
    return Array.isArray(stored) ? stored.filter((id) => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

export function trackRequest(providerId, requestId) {
  try {
    const ids = [requestId, ...getTrackedRequestIds(providerId).filter((id) => id !== requestId)];
    window.localStorage.setItem(storageKey(providerId), JSON.stringify(ids.slice(0, MAX_TRACKED)));
  } catch {
    // Storage can be unavailable (private mode); tracking is best-effort.
  }
}

export function untrackRequest(providerId, requestId) {
  try {
    const ids = getTrackedRequestIds(providerId).filter((id) => id !== requestId);
    window.localStorage.setItem(storageKey(providerId), JSON.stringify(ids));
  } catch {
    // Best-effort, see trackRequest.
  }
}
