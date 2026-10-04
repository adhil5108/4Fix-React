import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Phone, Smartphone } from 'lucide-react';
import AppShell from '../../components/AppShell.jsx';
import ChatWindow from '../../components/ChatWindow.jsx';
import { Avatar } from '../../components/cards.jsx';
import { BackButton, EmptyState, ErrorState, IconButton, LoadingState } from '../../components/ui.jsx';
import { UnreadToasts } from '../../components/Unread.jsx';
import { useAction, useApi } from '../../hooks/useApi.js';
import { useAuth } from '../../hooks/useAuth.jsx';
import { useConversationSocket } from '../../hooks/useConversationSocket.js';
import { useActiveConversation } from '../../hooks/useUnread.jsx';
import { usePolling } from '../../hooks/usePolling.js';
import { requestIdForBooking, tokenForBooking } from '../../services/customerAccess.js';
import { bookingsApi, customerBookingsApi, requestsApi } from '../../services/fixApi.js';

// Who the customer/provider is talking to, with their phone (for the call button) and the
// job's service. Each side reads it through the endpoint it is already allowed to use.
async function loadCounterpart(isProvider, bookingId) {
  try {
    if (isProvider) {
      const { booking } = await bookingsApi.get(bookingId);
      return { phone: booking.customer?.phone || null, service: booking.service?.name || null };
    }

    const requestId = requestIdForBooking(bookingId);
    if (!requestId) return null;
    const { request } = await requestsApi.get(requestId);
    return { phone: request.provider?.phone || null, service: request.service?.name || null };
  } catch {
    return null;
  }
}

// Full-screen chat shared by both participants: the provider chats with their account,
// the (anonymous) customer with the request token saved in this browser. The backend
// admits only the two of them for this job.
function ChatPage({ bookingId }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isProvider = user?.role === 'PROVIDER';
  const requestToken = isProvider ? null : tokenForBooking(bookingId);
  const canChat = isProvider || Boolean(requestToken);
  const chatApi = isProvider ? bookingsApi : customerBookingsApi;
  const conversation = useApi(() => (canChat ? chatApi.openChat(bookingId) : Promise.resolve(null)), [bookingId]);
  const messages = useApi(() => (canChat ? chatApi.messages(bookingId) : Promise.resolve(null)), [bookingId]);
  const counterpartInfo = useApi(() => (canChat ? loadCounterpart(isProvider, bookingId) : Promise.resolve(null)), [bookingId]);
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
  // While this page is open its conversation is never "unread" and raises no
  // notifications; new messages are marked read below as they arrive.
  useActiveConversation(canChat ? bookingId : null);

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

  const requestId = isProvider ? null : requestIdForBooking(bookingId);
  const back = isProvider
    ? { to: `/provider/jobs/${bookingId}`, label: t('customer.shared.job') }
    : { to: requestId ? `/requests/${requestId}` : '/chats', label: t('customer.shared.booking') };

  if (!canChat) {
    return (
      <AppShell title={t('customer.shared.chat')} back={{ to: '/chats', label: t('common.navShort.chat') }}>
        <EmptyState icon={Smartphone} title={t('customer.access.noAccessTitle')} message={t('customer.access.noAccessMessage')} />
      </AppShell>
    );
  }

  if (conversation.error) {
    return (
      <AppShell title={t('customer.shared.chat')} back={back} nav={false}>
        <ErrorState error={conversation.error} onRetry={conversation.reload} />
      </AppShell>
    );
  }

  const counterpart = isProvider
    ? conversation.data?.conversation.customer
    : conversation.data?.conversation.provider;
  const phone = counterpartInfo.data?.phone;
  const subtitle = [
    isProvider ? t('customer.shared.customer') : t('customer.chat.providerRole'),
    counterpartInfo.data?.service,
  ]
    .filter(Boolean)
    .join(' · ');

  async function handleSend(text) {
    const ok = await send.run('send', () => chatApi.sendMessage(bookingId, text));
    await messages.refresh();
    return ok;
  }

  return (
    <div className="chat-screen app app--no-nav">
      <header className="topbar">
        <div className="topbar__inner">
          <BackButton to={back.to} label={back.label} />
          <div className="chat-head">
            <Avatar name={counterpart?.name || '?'} image={counterpart?.profileImage} size="sm" />
            <div className="chat-head__text">
              <h1 className="chat-head__name">{counterpart?.name || t('customer.shared.chat')}</h1>
              <span className="chat-head__sub">{subtitle}</span>
            </div>
          </div>
          {phone ? (
            <IconButton
              icon={Phone}
              href={`tel:${phone}`}
              variant="tonal"
              label={t('customer.job.callName', { name: counterpart?.name || '' })}
            />
          ) : null}
        </div>
      </header>

      {conversation.loading || (messages.loading && !messages.data) ? (
        <LoadingState label={t('customer.chat.opening')} />
      ) : messages.error && !messages.data ? (
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
      <UnreadToasts />
    </div>
  );
}

export default ChatPage;
