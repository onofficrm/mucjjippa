import { useCallback, useEffect, useRef, useState } from 'react';
import { GameRoom, Match } from '../types';
import { useMockTransport } from '../api/config';
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
 * - 실서버: MATCH_FOUND 소켓 대기
 * - Mock: readyAt 타이머 후 confirm
 */
export function useMatchmaking(options: UseMatchmakingOptions = {}): UseMatchmakingResult {
  const [ticket, setTicket] = useState<QueueTicket | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const ticketRef = useRef<QueueTicket | null>(null);
  const callbacksRef = useRef(options);
  const confirmTimerRef = useRef<number | null>(null);
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
    if (useMockTransport) return;

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

  useEffect(() => {
    return () => {
      if (confirmTimerRef.current !== null) {
        window.clearTimeout(confirmTimerRef.current);
      }
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

      if (useMockTransport) {
        const delay = Math.max(0, result.ticket.readyAt - Date.now());
        if (confirmTimerRef.current !== null) window.clearTimeout(confirmTimerRef.current);
        confirmTimerRef.current = window.setTimeout(() => {
          void matchService
            .confirmMatch(result.ticket.id)
            .then((match) => {
              if (ticketRef.current?.id !== result.ticket.id) return;
              setTicket(null);
              callbacksRef.current.onMatched?.(match, result.ticket);
            })
            .catch((error) => {
              callbacksRef.current.onError?.(error);
            });
        }, delay);
      }

      return true;
    } catch (error) {
      callbacksRef.current.onError?.(error);
      return false;
    }
  }, []);

  const cancel = useCallback(async () => {
    const current = ticketRef.current;
    if (!current) return;
    if (confirmTimerRef.current !== null) {
      window.clearTimeout(confirmTimerRef.current);
      confirmTimerRef.current = null;
    }
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
