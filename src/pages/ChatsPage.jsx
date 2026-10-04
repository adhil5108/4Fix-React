import { useTranslation } from 'react-i18next';
import { MessageCircle } from 'lucide-react';
import AppShell from '../components/AppShell.jsx';
import { ServiceIcon } from '../components/cards.jsx';
import { ButtonLink, EmptyState, ErrorState, ListRow, LoadingState } from '../components/ui.jsx';
import { ChatCount } from '../components/Unread.jsx';
import { useApi } from '../hooks/useApi.js';
import { useAuth } from '../hooks/useAuth.jsx';
import { useSavedRequests } from '../hooks/useSavedRequests.js';
import { useUnread } from '../hooks/useUnread.jsx';
import { providerApi } from '../services/fixApi.js';
import { formatIssueLabel, formatRelative } from '../utils/format.js';

// Conversations exist per job (booking). A customer's come from the requests saved in
// this browser; a provider's from their 4Fix jobs. Cancelled jobs have no chat.
function toCustomerThreads(requests) {
  return (requests || [])
    .filter((request) => request.booking?.id && request.status !== 'CANCELLED')
    .map((request) => ({
      bookingId: request.booking.id,
      name: request.selectedProvider?.name,
      service: request.service,
      detail: [request.service?.name, formatIssueLabel(request.issueKey, request.issueLabel)].filter(Boolean).join(' · '),
      updatedAt: request.updatedAt,
    }));
}

function toProviderThreads(jobs) {
  return (jobs || [])
    .filter((job) => job.source === '4FIX' && job.bookingId && job.bookingStatus !== 'CANCELLED')
    .map((job) => ({
      bookingId: job.bookingId,
      name: job.customer?.name,
      service: job.service,
      detail: [job.service?.name, formatIssueLabel(job.issueKey, job.issueLabel)].filter(Boolean).join(' · '),
      updatedAt: job.updatedAt,
    }));
}

function ChatsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isProvider = user?.role === 'PROVIDER';
  const saved = useSavedRequests({ enabled: !isProvider });
  const jobs = useApi(() => (isProvider ? providerApi.jobs() : Promise.resolve(null)), [isProvider]);
  const { counts } = useUnread();
  const source = isProvider ? jobs : saved;
  const threads = (isProvider ? toProviderThreads(jobs.data?.jobs) : toCustomerThreads(saved.data))
    // Unread conversations first, then the most recently active.
    .sort(
      (a, b) =>
        (counts[b.bookingId] || 0) - (counts[a.bookingId] || 0) ||
        new Date(b.updatedAt) - new Date(a.updatedAt),
    );

  return (
    <AppShell title={t('chats.title')} large>
      {source.loading ? <LoadingState label={t('chats.loading')} /> : null}
      {source.error ? <ErrorState error={source.error} onRetry={source.reload} /> : null}
      {!source.loading && !source.error && threads.length === 0 ? (
        <EmptyState
          icon={MessageCircle}
          title={t('chats.emptyTitle')}
          message={isProvider ? t('chats.emptyProvider') : t('chats.emptyCustomer')}
          action={
            isProvider ? (
              <ButtonLink to="/provider/requests" variant="secondary">
                {t('chats.findWork')}
              </ButtonLink>
            ) : null
          }
        />
      ) : null}
      {threads.length > 0 ? (
        <div className="list-group">
          {threads.map((thread) => (
            <ListRow
              key={thread.bookingId}
              to={`/bookings/${thread.bookingId}/chat`}
              leading={<ServiceIcon service={thread.service} size="sm" />}
              title={thread.name || t('chats.unknown')}
              value={thread.detail}
              muted
              chevron={false}
              className="thread-row"
              trailing={
                <>
                  <span className="list-row__time">{formatRelative(thread.updatedAt)}</span>
                  <ChatCount bookingId={thread.bookingId} />
                </>
              }
            />
          ))}
        </div>
      ) : null}
    </AppShell>
  );
}

export default ChatsPage;
