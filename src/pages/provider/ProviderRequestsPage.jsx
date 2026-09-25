import { useState } from 'react';
import AcceptJobButton from '../../components/AcceptJobButton.jsx';
import AppShell from '../../components/AppShell.jsx';
import { RequestCard } from '../../components/cards.jsx';
import { EmptyState, ErrorState, Link, LoadingState, PageHeader } from '../../components/ui.jsx';
import { useApi } from '../../hooks/useApi.js';
import { useAuth } from '../../hooks/useAuth.jsx';
import { usePolling } from '../../hooks/usePolling.js';
import { providerApi } from '../../services/fixApi.js';

function ProviderRequestsPage() {
  const { user } = useAuth();
  const requests = useApi(() => providerApi.listRequests(), []);
  const [taken, setTaken] = useState(() => new Set());
  const list = (requests.data?.requests || []).filter((request) => !taken.has(request.id));
  // Admin previews this feed from Provider View but can never accept.
  const canAccept = user.role === 'PROVIDER';

  // Jobs disappear as other providers accept them; keep the feed fresh.
  usePolling(() => requests.refresh(), 20000, !requests.loading);

  return (
    <AppShell>
      <PageHeader
        title="Available requests"
        subtitle="Open customer requests near you. The first provider to accept gets the job."
        actions={
          <Link to="/provider/jobs" className="text-link hide-mobile">
            My jobs →
          </Link>
        }
      />

      {requests.loading ? <LoadingState label="Loading requests…" /> : null}
      {requests.error && !requests.data ? (
        <ErrorState error={requests.error} onRetry={requests.reload} />
      ) : null}

      {requests.data && list.length === 0 ? (
        <EmptyState
          title="No open requests"
          message="Check back soon — new customer requests appear here."
        />
      ) : null}

      {list.length > 0 ? (
        <div className="list">
          {list.map((request) => (
            <div key={request.id} className="form-stack">
              <RequestCard request={request} audience="provider" to={`/provider/requests/${request.id}`} />
              {canAccept ? (
                <AcceptJobButton
                  requestId={request.id}
                  onTaken={() => setTaken((current) => new Set(current).add(request.id))}
                  onFailed={() => requests.refresh()}
                />
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </AppShell>
  );
}

export default ProviderRequestsPage;
