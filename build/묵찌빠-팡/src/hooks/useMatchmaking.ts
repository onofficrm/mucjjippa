import { useCallback, useEffect, useRef, useState } from 'react';
import { GameRoom, Match } from '../types';
import { QueueTicket, matchService } from '../services/matchService';
import { gameSocket } from '../api/socket';

export interface UseMatchmakingOptions {
  onQueued?: (ticket: QueueTicket) => void;
  onMatched?: (match: Match, ticket: QueueTicket) => void;
  onInsufficientPoints?: (requiredPoints: number) => void;
  onCancelled?: (ticket: QueueTicket, refunded: boolean) => void;
  onError?: (error: unknown) => void;
}

export interface UseMatchmakingResult {
  ticket: QueueTicket | null;
  isSearching: boolean;
  remainingSeconds: number;
  start: (room: GameRoom) => Promise<boolean>;
  cancel: () => Promise<void>;
}

/**
 * 서버 매칭 큐 훅.
 * Mock 타이머 대신 MATCH_FOUND / MATCH_CANCELLED 소켓 이벤트를 대기한다.
 */
export function useMatchmaking(options: UseMatchmakingOptions = {}): UseMatchmakingResult {
  const [ticket, setTicket] = useState<QueueTicket | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const ticketRef = useRef<QueueTicket | null>(null);
  const callbacksRef = useRef(options);
  callbacksRef.current = options;

  useEffect(() => {
    ticketRef.current = ticket;
  }, [ticket]);

  useEffect(() => {
    if (!ticket) {
      setElapsed(0);
      return;
    }
    const started = ticket.createdAt;
    const id = window.setInterval(() => {
      setElapsed(Math.floor((Date.now() - started) / 1000));
    }, 500);
    return () => window.clearInterval(id);
  }, [ticket]);

  useEffect(() => {
    matchService.ensureSocket();

    const offFound = gameSocket.on('MATCH_FOUND', (payload) => {
      const current = ticketRef.current;
      if (!current) return;
      const data = payload as {
        matchId: string;
        roomId: string;
        roomName: string;
        stakePoints: number;
        opponent: Match['opponent'];
      };
      const match: Match = {
        id: data.matchId,
        roomId: data.roomId,
        roomName: data.roomName,
        stakePoints: data.stakePoints,
        status: 'playing',
        maxRounds: 99,
        round: 1,
        playerScore: 0,
        opponentScore: 0,
        opponent: data.opponent,
        rounds: [],
        createdAt: Date.now(),
      };
      setTicket(null);
      callbacksRef.current.onMatched?.(match, current);
    });

    const offCancel = gameSocket.on('MATCH_CANCELLED', () => {
      const current = ticketRef.current;
      if (!current) return;
      setTicket(null);
      callbacksRef.current.onCancelled?.(current, false);
    });

    return () => {
      offFound();
      offCancel();
    };
  }, []);

  const start = useCallback(async (room: GameRoom) => {
    try {
      matchService.ensureSocket();
      const result = await matchService.startMatch(room);

      if (result.status === 'insufficient_funds') {
        callbacksRef.current.onInsufficientPoints?.(result.requiredPoints);
        return false;
      }

      setTicket(result.ticket);
      callbacksRef.current.onQueued?.(result.ticket);
      return true;
    } catch (error) {
      callbacksRef.current.onError?.(error);
      return false;
    }
  }, []);

  const cancel = useCallback(async () => {
    const current = ticketRef.current;
    if (!current) return;
    setTicket(null);
    try {
      await matchService.cancelMatch(current);
      callbacksRef.current.onCancelled?.(current, false);
    } catch (error) {
      callbacksRef.current.onError?.(error);
    }
  }, []);

  return {
    ticket,
    isSearching: ticket !== null,
    remainingSeconds: elapsed,
    start,
    cancel,
  };
}
