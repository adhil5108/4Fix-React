import { io } from 'socket.io-client';
import { API_BASE_URL } from './api.js';
import { readStoredAuth } from './authStorage.js';

// One connection per identity, created lazily on first use and authenticated the same
// way the REST calls are: the provider/admin JWT, or — for an anonymous customer — the
// access token of the request whose chat is open.
const sockets = new Map();

export function getSocket({ requestToken } = {}) {
  const key = requestToken ? `request:${requestToken}` : 'account';

  if (!sockets.has(key)) {
    sockets.set(
      key,
      io(API_BASE_URL, {
        autoConnect: false,
        auth: (callback) =>
          callback(requestToken ? { requestToken } : { token: readStoredAuth()?.accessToken || null }),
      }),
    );
  }

  return sockets.get(key);
}

export function disconnectSocket() {
  for (const socket of sockets.values()) {
    socket.disconnect();
  }

  sockets.clear();
}
