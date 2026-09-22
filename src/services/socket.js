import { io } from 'socket.io-client';
import { API_BASE_URL } from './api.js';
import { readStoredAuth } from './authStorage.js';

let socket = null;

// One shared connection for the whole app, created lazily on first use and
// authenticated the same way every REST call is (the stored access token).
export function getSocket() {
  if (socket) {
    return socket;
  }

  socket = io(API_BASE_URL, {
    autoConnect: false,
    auth: (callback) => callback({ token: readStoredAuth()?.accessToken || null }),
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
