import { useEffect, useRef } from 'react';
import AppShell from '../../components/AppShell.jsx';
import ChatWindow from '../../components/ChatWindow.jsx';
import { ErrorState, LoadingState, PageHeader } from '../../components/ui.jsx';
import { useAction, useApi } from '../../hooks/useApi.js';
import { useAuth } from '../../hooks/useAuth.jsx';
import { useConversationSocket } from '../../hooks/useConversationSocket.js';
import { usePolling } from '../../hooks/usePolling.js';
import { bookingsApi } from '../../services/fixApi.js';

// Shared by customers and providers; the backend only admits the two participants.
function ChatPage({ bookingId }) {
  const { user } = useAuth();
  const isProvider = user.role === 'PROVIDER';
  const conversation = useApi(() => bookingsApi.openChat(bookingId), [bookingId]);
  const messages = useApi(() => bookingsApi.messages(bookingId), [bookingId]);
  const send = useAction();
  const markingRead = useRef(false);

  // Socket.IO delivers new messages/read receipts in real time; the slow poll is
  // only a safety net in case the socket connection drops unnoticed.
  useConversationSocket(bookingId, {
    onMessage: () => messages.refresh(),
    onRead: () => messages.refresh(),
  });
  usePolling(() => messages.refresh(), 20000, Boolean(conversation.data));

  const list = messages.data?.messages || [];
  const unreadFromOther = list.some((message) => !message.isMine && !message.readAt);

  useEffect(() => {
    if (!unreadFromOther || markingRead.current) {
      return;
    }

    markingRead.current = true;
    bookingsApi
      .markRead(bookingId)
      .then(() => messages.refresh())
      .catch(() => {})
      .finally(() => {
        markingRead.current = false;
      });
  }, [unreadFromOther, bookingId, messages]);

  const back = isProvider
    ? { to: `/provider/jobs/${bookingId}`, label: 'Job' }
    : { to: `/bookings/${bookingId}`, label: 'Booking' };

  if (conversation.loading || (messages.loading && !messages.data)) {
    return (
      <AppShell width="narrow">
        <LoadingState label="Opening chat…" />
      </AppShell>
    );
  }

  if (conversation.error) {
    return (
      <AppShell width="narrow">
        <PageHeader title="Chat" back={back} />
        <ErrorState error={conversation.error} onRetry={conversation.reload} />
      </AppShell>
    );
  }

  const counterpart = isProvider
    ? conversation.data.conversation.customer
    : conversation.data.conversation.provider;

  async function handleSend(text) {
    const ok = await send.run('send', () => bookingsApi.sendMessage(bookingId, text));
    await messages.refresh();
    return ok;
  }

  return (
    <AppShell width="narrow">
      <PageHeader
        back={back}
        title={counterpart?.name || 'Chat'}
        subtitle={isProvider ? 'Customer' : 'Your technician'}
      />
      {messages.error && !messages.data ? (
        <ErrorState error={messages.error} onRetry={messages.reload} />
      ) : (
        <ChatWindow
          messages={list}
          counterpartName={counterpart?.name}
          busy={send.pending === 'send'}
          error={send.error}
          onSend={handleSend}
        />
      )}
    </AppShell>
  );
}

export default ChatPage;
