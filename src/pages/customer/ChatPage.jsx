import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import AppShell from '../../components/AppShell.jsx';
import ChatWindow from '../../components/ChatWindow.jsx';
import { EmptyState, ErrorState, LoadingState, PageHeader } from '../../components/ui.jsx';
import { useAction, useApi } from '../../hooks/useApi.js';
import { useAuth } from '../../hooks/useAuth.jsx';
import { useConversationSocket } from '../../hooks/useConversationSocket.js';
import { usePolling } from '../../hooks/usePolling.js';
import { tokenForBooking } from '../../services/customerAccess.js';
import { bookingsApi, customerBookingsApi } from '../../services/fixApi.js';

// Shared by both participants: the provider chats with their account, the (anonymous)
// customer with the request token saved in this browser. The backend admits only the
// two of them for this job.
function ChatPage({ bookingId }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isProvider = user?.role === 'PROVIDER';
  const requestToken = isProvider ? null : tokenForBooking(bookingId);
  const canChat = isProvider || Boolean(requestToken);
  const chatApi = isProvider ? bookingsApi : customerBookingsApi;
  const conversation = useApi(() => (canChat ? chatApi.openChat(bookingId) : Promise.resolve(null)), [bookingId]);
  const messages = useApi(() => (canChat ? chatApi.messages(bookingId) : Promise.resolve(null)), [bookingId]);
  const send = useAction();
  const markingRead = useRef(false);

  // Socket.IO delivers new messages/read receipts in real time; the slow poll is
  // only a safety net in case the socket connection drops unnoticed.
  useConversationSocket(canChat ? bookingId : null, {
    requestToken,
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
    chatApi
      .markRead(bookingId)
      .then(() => messages.refresh())
      .catch(() => {})
      .finally(() => {
        markingRead.current = false;
      });
  }, [unreadFromOther, bookingId, messages, chatApi]);

  const back = isProvider
    ? { to: `/provider/jobs/${bookingId}`, label: t('customer.shared.job') }
    : { to: `/bookings/${bookingId}`, label: t('customer.shared.booking') };

  if (!canChat) {
    return (
      <AppShell width="narrow">
        <PageHeader title={t('customer.shared.chat')} back={{ to: '/requests', label: t('common.nav.myRequests') }} />
        <EmptyState title={t('customer.access.noAccessTitle')} message={t('customer.access.noAccessMessage')} />
      </AppShell>
    );
  }

  if (conversation.loading || (messages.loading && !messages.data)) {
    return (
      <AppShell width="narrow">
        <LoadingState label={t('customer.chat.opening')} />
      </AppShell>
    );
  }

  if (conversation.error) {
    return (
      <AppShell width="narrow">
        <PageHeader title={t('customer.shared.chat')} back={back} />
        <ErrorState error={conversation.error} onRetry={conversation.reload} />
      </AppShell>
    );
  }

  const counterpart = isProvider
    ? conversation.data.conversation.customer
    : conversation.data.conversation.provider;

  async function handleSend(text) {
    const ok = await send.run('send', () => chatApi.sendMessage(bookingId, text));
    await messages.refresh();
    return ok;
  }

  return (
    <AppShell width="narrow">
      <PageHeader
        back={back}
        title={counterpart?.name || t('customer.shared.chat')}
        subtitle={isProvider ? t('customer.shared.customer') : t('customer.shared.yourTechnician')}
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
