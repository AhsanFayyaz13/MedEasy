import { io } from 'socket.io-client';

let socket = null;

export function initSocket(token) {
  if (socket) return socket;
  const defaultUrl = import.meta.env.VITE_SOCKET_URL || `${window.location.protocol}//${window.location.hostname}:5000`;
  socket = io(defaultUrl, {
    autoConnect: true,
    transports: ['websocket'],
    auth: token ? { token } : undefined,
  });

  socket.on('connect_error', (err) => {
    // eslint-disable-next-line no-console
    console.warn('Socket connect_error', err?.message || err);
  });

  return socket;
}

export function getSocket() {
  if (!socket) throw new Error('Socket not initialized');
  return socket;
}

export function disconnectSocket() {
  if (!socket) return;
  try { socket.disconnect(); } catch {};
  socket = null;
}
