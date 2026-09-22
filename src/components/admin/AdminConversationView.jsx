import { Button, EmptyState, ErrorState, LoadingState } from '../ui.jsx';
import { useApi } from '../../hooks/useApi.js';
import { bookingsApi } from '../../services/fixApi.js';
import { formatClock, formatTimestamp } from '../../utils/format.js';

const ROLE_LABEL = { CUSTOMER: 'Customer', PROVIDER: 'Provider' };

function dayKey(value) {
  return new Date(value).toDateString();
}

// Admin's read-only view of a booking's chat: every message, who sent it, and when —
// no composer, since admin can never send as the customer or provider.
function AdminConversationView({ bookingId }) {
  const data = useApi(async () => {
    try {
      const [conversation, messages] = await Promise.all([
        bookingsApi.getConversation(bookingId),
        bookingsApi.messages(bookingId),
      ]);
      return { conversation: conversation.conversation, messages: messages.messages };
    } catch (error) {
      if (error.status === 404) {
        return { conversation: null, messages: [] };
      }
      throw error;
    }
  }, [bookingId]);

  if (data.loading) {
    return <LoadingState label="Loading conversation…" />;
  }

  if (data.error) {
    return <ErrorState error={data.error} onRetry={data.reload} />;
  }

  const { conversation, messages } = data.data;

  if (!conversation) {
    return (
      <EmptyState title="No conversation yet" message="Neither side has opened the chat for this booking." />
    );
  }

  let previousDay = null;

  return (
    <div className="chat chat--admin">
      <div className="chat__messages" role="log" aria-label="Conversation (read-only)">
        {messages.length === 0 ? <p className="chat__empty">No messages yet.</p> : null}
        {messages.map((message) => {
          const day = dayKey(message.createdAt);
          const showDay = day !== previousDay;
          previousDay = day;

          return (
            <div key={message.id}>
              {showDay ? <p className="chat__day">{formatTimestamp(message.createdAt)}</p> : null}
              <div className={`bubble${message.senderRole === 'PROVIDER' ? ' bubble--mine' : ''}`}>
                <span className="bubble__role">{ROLE_LABEL[message.senderRole] || message.senderRole}</span>
                <p className="bubble__text">{message.message}</p>
                <span className="bubble__meta">
                  {formatClock(message.createdAt)}
                  {message.readAt ? ' · Read' : ' · Sent'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      <div className="chat__admin-footer">
        <Button type="button" variant="secondary" size="sm" onClick={data.refresh}>
          Refresh
        </Button>
        <span className="field-hint">Admin can read this conversation but cannot send messages.</span>
      </div>
    </div>
  );
}

export default AdminConversationView;
