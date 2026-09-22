import { useEffect, useRef } from 'react';
import { getSocket } from '../services/socket.js';

// Joins the given booking's conversation room for real-time delivery while mounted.
// `onMessage`/`onRead` fire for events from anyone else in the room (the socket
// server never echoes a sender's own broadcast back with useful per-viewer fields,
// so the sender keeps relying on its own REST response instead).
export function useConversationSocket(bookingId, { onMessage, onRead } = {}) {
  const onMessageRef = useRef(onMessage);
  const onReadRef = useRef(onRead);
  onMessageRef.current = onMessage;
  onReadRef.current = onRead;

  useEffect(() => {
    if (!bookingId) {
      return undefined;
    }

    const socket = getSocket();

    function join() {
      socket.emit('conversation:join', { bookingId });
    }

    function handleMessage(message) {
      onMessageRef.current?.(message);
    }

    function handleRead(payload) {
      onReadRef.current?.(payload);
    }

    socket.on('connect', join);
    socket.on('message:new', handleMessage);
    socket.on('messages:read', handleRead);

    if (socket.connected) {
      join();
    } else {
      socket.connect();
    }

    return () => {
      socket.emit('conversation:leave', { bookingId });
      socket.off('connect', join);
      socket.off('message:new', handleMessage);
      socket.off('messages:read', handleRead);
    };
  }, [bookingId]);
}
