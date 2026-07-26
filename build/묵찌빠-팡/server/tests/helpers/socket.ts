/**
 * Socket.IO 테스트 헬퍼.
 */
import { io, type Socket } from 'socket.io-client';

export function connectSocket(baseUrl: string, token: string): Promise<Socket> {
  return new Promise((resolve, reject) => {
    const socket = io(baseUrl, {
      path: '/socket.io',
      transports: ['websocket'],
      auth: { token },
      forceNew: true,
      reconnection: false,
    });
    const timer = setTimeout(() => reject(new Error('socket connect timeout')), 10_000);
    socket.on('connect', () => {
      clearTimeout(timer);
      resolve(socket);
    });
    socket.on('connect_error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

export function onceEvent<T = unknown>(
  socket: Socket,
  event: string,
  timeoutMs = 15_000
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timeout waiting for ${event}`)), timeoutMs);
    socket.once(event, (msg: any) => {
      clearTimeout(timer);
      resolve((msg?.payload ?? msg) as T);
    });
  });
}

export async function disconnectSocket(socket: Socket | null | undefined) {
  if (!socket) return;
  socket.removeAllListeners();
  socket.disconnect();
}
