export type WSEventType =
  | 'MATCH_SEARCH_STARTED'
  | 'MATCH_FOUND'
  | 'MATCH_CANCELLED'
  | 'MATCH_READY'
  | 'ROUND_STARTED'
  | 'CHOICE_SUBMITTED'
  | 'CHOICE_LOCKED'
  | 'ROUND_RESULT'
  | 'MATCH_FINISHED'
  | 'TOURNAMENT_STARTED'
  | 'QUALIFIER_RESULT'
  | 'BRACKET_UPDATED'
  | 'TOURNAMENT_FINISHED'
  | 'WALLET_UPDATED';

export interface WSMessage<T = unknown> {
  event: WSEventType;
  timestamp: number;
  payload: T;
}

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
