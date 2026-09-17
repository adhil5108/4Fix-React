import { useApi } from '../../hooks/useApi.js';
import { useAuth } from '../../hooks/useAuth.jsx';
import { providerApi } from '../../services/fixApi.js';
import { getTrackedRequestIds, untrackRequest } from '../../utils/providerJobs.js';

const ACTIVE_JOB_STATUSES = ['QUOTE_ACCEPTED', 'SCHEDULED', 'IN_PROGRESS'];
const OPEN_STATUSES = ['PENDING', 'QUOTE_RECEIVED'];

export function useProviderJobs() {
  const { user } = useAuth();
  const providerId = user.id;

  return useApi(async () => {
    const ids = getTrackedRequestIds(providerId);
    const results = await Promise.allSettled(ids.map((id) => providerApi.getRequest(id)));
    const requests = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        requests.push(result.value.request);
      } else if ([400, 403, 404].includes(result.reason?.status)) {
        untrackRequest(providerId, ids[index]);
      }
    });

    const failed = results.some(
      (result) => result.status === 'rejected' && ![400, 403, 404].includes(result.reason?.status),
    );

    if (failed && requests.length === 0 && ids.length > 0) {
      throw results.find((result) => result.status === 'rejected').reason;
    }

    const isMine = (request) => request.selectedProviderId === providerId;

    return {
      active: requests.filter(
        (request) => isMine(request) && ACTIVE_JOB_STATUSES.includes(request.status),
      ),
      awaiting: requests.filter(
        (request) =>
          !isMine(request) &&
          OPEN_STATUSES.includes(request.status) &&
          request.ownQuote?.status === 'PENDING',
      ),
      completed: requests.filter((request) => isMine(request) && request.status === 'COMPLETED'),
      partial: failed,
    };
  }, [providerId]);
}
