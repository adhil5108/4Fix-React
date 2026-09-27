import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { linkBooking, listSavedRequests } from '../services/customerAccess.js';
import { chatUnreadApi } from '../services/fixApi.js';
import { getSocket } from '../services/socket.js';
import { useAuth } from './useAuth.jsx';
import { useRoute } from './useRoute.js';

// Customers can have several requests saved in this browser; each has its own token
// (and so its own socket). Only the most recent ones are watched.
const MAX_CUSTOMER_REQUESTS = 10;
const TOAST_MS = 8000;
const MAX_TOASTS = 3;

const UnreadContext = createContext(null);

// Who this browser listens as: the provider's account, or each saved customer request.
// Admin reads chats but is never a recipient, so it has no sources at all.
function resolveSources(user) {
  if (user?.role === 'PROVIDER') {
    return [{ key: 'account', requestToken: null, requestId: null }];
  }

  if (user?.role === 'ADMIN') {
    return [];
  }

  return listSavedRequests()
    .slice(0, MAX_CUSTOMER_REQUESTS)
    .map((entry) => ({ key: `request:${entry.requestId}`, requestToken: entry.token, requestId: entry.requestId }));
}

// Unread chat counts for the whole app. The server owns the numbers: they are loaded
// from GET /api/bookings/unread on start and after every (re)connect, and each
// `chat:unread` socket event carries the conversation's absolute count — so refreshes,
// reconnects and repeated events can never inflate or reset them.
export function UnreadProvider({ children }) {
  const { user } = useAuth();
  // Subscribing to the route re-reads the saved requests on navigation, so a request
  // created a moment ago starts being watched.
  useRoute();
  const sources = resolveSources(user);
  const sourcesKey = sources.map((source) => `${source.key}:${source.requestToken || ''}`).join('|');

  const [bySource, setBySource] = useState({});
  const [toasts, setToasts] = useState([]);
  const [activeBookingId, setActiveBookingId] = useState(null);
  const activeRef = useRef(null);
  const seenMessages = useRef(new Set());
  const timers = useRef(new Map());

  const dismissToast = useCallback((toastId) => {
    setToasts((current) => current.filter((toast) => toast.id !== toastId));
    clearTimeout(timers.current.get(toastId));
    timers.current.delete(toastId);
  }, []);

  const dismissForBooking = useCallback((bookingId) => {
    setToasts((current) => current.filter((toast) => toast.bookingId !== bookingId));
  }, []);

  const showToast = useCallback(
    (toast) => {
      // One notification per conversation (the newest), at most a few on screen.
      setToasts((current) => [toast, ...current.filter((item) => item.bookingId !== toast.bookingId)].slice(0, MAX_TOASTS));
      timers.current.set(
        toast.id,
        setTimeout(() => dismissToast(toast.id), TOAST_MS),
      );
    },
    [dismissToast],
  );

  useEffect(() => {
    const allTimers = timers.current;
    return () => {
      for (const timer of allTimers.values()) clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    const cleanups = sources.map((source) => {
      const socket = getSocket({ requestToken: source.requestToken });
      let cancelled = false;

      function setCounts(counts) {
        setBySource((current) => ({ ...current, [source.key]: counts }));
      }

      async function sync() {
        try {
          const summary = await chatUnreadApi.summary(source.requestToken);

          if (cancelled) return;
          const counts = {};

          for (const item of summary.conversations) {
            counts[item.bookingId] = item.bookingId === activeRef.current ? 0 : item.unreadCount;
            if (source.requestId) linkBooking(source.requestId, item.bookingId);
          }

          setCounts(counts);
        } catch {
          // Offline or a forgotten request: keep what we have; the next sync corrects it.
        }
      }

      function handleUnread(payload) {
        const { bookingId, unreadCount, message } = payload || {};

        if (!bookingId) return;
        const isViewing = activeRef.current === bookingId;

        if (source.requestId) linkBooking(source.requestId, bookingId);
        setBySource((current) => ({
          ...current,
          [source.key]: { ...current[source.key], [bookingId]: isViewing ? 0 : unreadCount },
        }));

        if (unreadCount === 0) {
          dismissForBooking(bookingId);
          return;
        }

        // Never twice for the same message (a second tab, a re-delivered event…), and
        // never while the person is already looking at that conversation.
        if (message?.id && !isViewing && !seenMessages.current.has(message.id)) {
          seenMessages.current.add(message.id);
          showToast({ id: message.id, bookingId, senderName: message.senderName, senderRole: message.senderRole });
        }
      }

      socket.on('connect', sync);
      socket.on('chat:unread', handleUnread);
      sync();

      if (!socket.connected) {
        socket.connect();
      }

      return () => {
        cancelled = true;
        socket.off('connect', sync);
        socket.off('chat:unread', handleUnread);
      };
    });

    // Drop counts of identities that are gone (logout, a forgotten request).
    const keys = new Set(sources.map((source) => source.key));
    setBySource((current) => Object.fromEntries(Object.entries(current).filter(([key]) => keys.has(key))));

    function handleFocus() {
      // Cheap safety net for sockets that went quiet while the tab was in background.
      for (const source of sources) {
        const socket = getSocket({ requestToken: source.requestToken });
        if (!socket.connected) socket.connect();
      }
    }

    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('focus', handleFocus);
      for (const cleanup of cleanups) cleanup();
    };
    // `sources` is rebuilt every render; its identity is `sourcesKey`.
  }, [sourcesKey]);

  // Called by the chat page while it is open: that conversation counts as read here at
  // once (the page marks it read on the server, which confirms with a 0).
  const enterConversation = useCallback(
    (bookingId) => {
      activeRef.current = bookingId;
      setActiveBookingId(bookingId);
      dismissForBooking(bookingId);
      setBySource((current) =>
        Object.fromEntries(
          Object.entries(current).map(([key, counts]) => [
            key,
            counts[bookingId] ? { ...counts, [bookingId]: 0 } : counts,
          ]),
        ),
      );
    },
    [dismissForBooking],
  );

  const leaveConversation = useCallback((bookingId) => {
    if (activeRef.current === bookingId) {
      activeRef.current = null;
      setActiveBookingId(null);
    }
  }, []);

  const value = useMemo(() => {
    const counts = {};

    for (const sourceCounts of Object.values(bySource)) {
      for (const [bookingId, count] of Object.entries(sourceCounts)) {
        counts[bookingId] = bookingId === activeBookingId ? 0 : count;
      }
    }

    return {
      counts,
      total: Object.values(counts).reduce((sum, count) => sum + count, 0),
      toasts,
      dismissToast,
      enterConversation,
      leaveConversation,
    };
  }, [bySource, activeBookingId, toasts, dismissToast, enterConversation, leaveConversation]);

  return <UnreadContext.Provider value={value}>{children}</UnreadContext.Provider>;
}

const EMPTY = { counts: {}, total: 0, toasts: [], dismissToast: () => {}, enterConversation: () => {}, leaveConversation: () => {} };

export function useUnread() {
  return useContext(UnreadContext) || EMPTY;
}

export function useUnreadCount(bookingId) {
  const { counts } = useUnread();
  return bookingId ? counts[bookingId] || 0 : 0;
}

// Marks the given conversation as the one on screen while the calling page is mounted.
export function useActiveConversation(bookingId) {
  const { enterConversation, leaveConversation } = useUnread();

  useEffect(() => {
    if (!bookingId) return undefined;
    enterConversation(bookingId);
    return () => leaveConversation(bookingId);
  }, [bookingId, enterConversation, leaveConversation]);
}
