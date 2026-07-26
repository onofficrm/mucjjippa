/**
 * WebSocket 타입은 `src/types/socket.ts`로 이동했다.
 * 기존 import 경로를 유지하기 위해 여기서 다시 내보낸다.
 */
export type {
  SocketEvent,
  SocketEventType,
  WSEventType,
  WSMessage,
  ChoiceSubmitPayload,
  RoundResultPayload,
  WalletUpdatedPayload,
} from '../types/socket';

/**
 * Server Integration Guidelines & Handshake Specification
 * Note: These definitions prepare the frontend for production WebSocket
 * connectivity with server authoritative validation.
 */
export const SERVER_INTEGRATION_DOCS = {
  architecture: 'Server-Authoritative Game State Engine with Local State Mirroring',
  realtimeTransport: 'WebSocket (wss://) with Auto-reconnection & Fallback Polling',
  security: 'JWT Token Authentication in Connection Handshake',
};
