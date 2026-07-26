import { io, type Socket } from 'socket.io-client';
import { apiConfig, ACCESS_TOKEN_STORAGE_KEY } from './config';

type Handler = (payload: unknown) => void;

function readAccessToken(): string | null {
  try {
    return window.sessionStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

/**
 * Socket.IO 싱글톤. JWT는 handshake.auth.token 으로 전달한다.
 */
class GameSocket {
  private socket: Socket | null = null;
  private handlers = new Map<string, Set<Handler>>();

  public connect(token?: string | null) {
    const accessToken = token ?? readAccessToken();
    if (!accessToken) {
      this.disconnect();
      return null;
    }

    if (this.socket?.connected) {
      return this.socket;
    }

    if (this.socket) {
      this.socket.auth = { token: accessToken };
      this.socket.connect();
      return this.socket;
    }

    this.socket = io(apiConfig.wsUrl, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 12,
      reconnectionDelay: 800,
      auth: { token: accessToken },
    });

    this.socket.onAny((event, message) => {
      const payload =
        message && typeof message === 'object' && 'payload' in message
          ? (message as { payload: unknown }).payload
          : message;
      this.handlers.get(event)?.forEach((handler) => handler(payload));
    });

    this.socket.on('connect_error', (error) => {
      // eslint-disable-next-line no-console
      console.warn('[socket] connect_error', error.message);
    });

    return this.socket;
  }

  public disconnect() {
    this.socket?.disconnect();
    this.socket = null;
  }

  public get connected() {
    return Boolean(this.socket?.connected);
  }

  public emit(event: string, payload?: unknown) {
    if (!this.socket) this.connect();
    this.socket?.emit(event, payload ?? {});
  }

  public on(event: string, handler: Handler) {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set());
    this.handlers.get(event)!.add(handler);
    return () => this.off(event, handler);
  }

  public off(event: string, handler: Handler) {
    this.handlers.get(event)?.delete(handler);
  }

  public once(event: string, predicate?: (payload: unknown) => boolean): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const timeout = window.setTimeout(() => {
        cleanup();
        reject(new Error(`Socket timeout: ${event}`));
      }, 30_000);

      const handler = (payload: unknown) => {
        if (predicate && !predicate(payload)) return;
        cleanup();
        resolve(payload);
      };

      const errHandler = (payload: unknown) => {
        cleanup();
        reject(payload instanceof Error ? payload : new Error(String((payload as { message?: string })?.message ?? 'socket error')));
      };

      const cleanup = () => {
        window.clearTimeout(timeout);
        this.off(event, handler);
        this.off('error_event', errHandler);
      };

      this.on(event, handler);
      this.on('error_event', errHandler);
    });
  }
}

export const gameSocket = new GameSocket();
