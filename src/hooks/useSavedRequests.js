import { forgetRequest, linkBooking, listSavedRequests } from '../services/customerAccess.js';
import { requestsApi } from '../services/fixApi.js';
import { useApi } from './useApi.js';

// Customers have no account, so "my requests" are the ones whose access token is saved
// in this browser. Each is loaded with its own token; ones the server no longer accepts
// are forgotten, other failures are simply skipped this time. Newest first.
async function loadSavedRequests() {
  const saved = listSavedRequests();
  const results = await Promise.allSettled(saved.map((entry) => requestsApi.get(entry.requestId)));

  return results
    .flatMap((result, index) => {
      if (result.status === 'fulfilled') {
        const { request } = result.value;
        linkBooking(request.id, request.booking?.id);
        return [request];
      }

      if ([401, 403, 404].includes(result.reason?.status)) {
        forgetRequest(saved[index].requestId);
      }

      return [];
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export function useSavedRequests({ enabled = true } = {}) {
  return useApi(() => (enabled ? loadSavedRequests() : Promise.resolve([])), [enabled]);
}
