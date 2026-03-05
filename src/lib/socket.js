'use client';
import { io } from 'socket.io-client';

let socket = null;

export function getSocket() {
  if (!socket) {
    // If NEXT_PUBLIC_SOCKET_URL is defined, use it. Otherwise, connect to self (local/Render).
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || '';
    
    socket = io(socketUrl, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      transports: ['websocket', 'polling'],
    });
  }
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
