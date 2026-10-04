import { useTranslation } from 'react-i18next';
import { MessageCircle, X } from 'lucide-react';
import { useUnread, useUnreadCount } from '../hooks/useUnread.jsx';
import { navigate } from '../hooks/useRoute.js';

const shown = (count) => (count > 99 ? '99+' : String(count));

// The number on a navigation item: total unread across all of this person's chats.
// The digits are decorative; screen readers get the full phrase.
export function NavBadge({ count }) {
  const { t } = useTranslation();

  if (!count) return null;

  return (
    <>
      <span className="unread-badge" aria-hidden="true" data-testid="nav-unread">
        {shown(count)}
      </span>
      <span className="sr-only">, {t('common.unread.count', { count })}</span>
    </>
  );
}

// Unread count for one conversation (job cards, "Chat" buttons). Renders nothing at 0.
export function ChatCount({ bookingId }) {
  const { t } = useTranslation();
  const count = useUnreadCount(bookingId);

  if (!count) return null;

  return (
    <span className="chat-count" data-testid="chat-unread" title={t('common.unread.count', { count })}>
      <MessageCircle aria-hidden="true" />
      <span aria-hidden="true">{shown(count)}</span>
      <span className="sr-only">{t('common.unread.count', { count })}</span>
    </span>
  );
}

// Small, non-blocking "New message from …" notices. Tapping one opens that chat.
export function UnreadToasts() {
  const { t } = useTranslation();
  const { toasts, dismissToast } = useUnread();

  return (
    <div className="toast-stack" role="region" aria-label={t('common.unread.region')}>
      <div aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className="toast" data-testid="unread-toast">
            <button
              type="button"
              className="toast__body"
              onClick={() => {
                dismissToast(toast.id);
                navigate(`/bookings/${encodeURIComponent(toast.bookingId)}/chat`);
              }}
            >
              <span className="toast__icon">
                <MessageCircle aria-hidden="true" />
              </span>
              <span className="toast__text">
                <strong>
                  {toast.senderName
                    ? t('common.unread.newFrom', { name: toast.senderName })
                    : t('common.unread.newMessage')}
                </strong>
                <span>{t('common.unread.open')}</span>
              </span>
            </button>
            <button
              type="button"
              className="toast__close"
              aria-label={t('common.unread.dismiss')}
              onClick={() => dismissToast(toast.id)}
            >
              <X aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
