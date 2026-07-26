import type { Server as SocketIOServer, Socket } from 'socket.io';
import { WATCH_POLICY, isWatchReaction } from './policy.js';
import {
  emitToWatchers,
  getSnapshot,
  joinWatchRoom,
  leaveAllWatchRooms,
  leaveWatchRoom,
  tryReaction,
} from './spectator.js';

type AuthedSocket = Socket & {
  data: { userId: string; nickname?: string; role?: string; typ?: string };
};

/**
 * 관전 소켓.
 * - 관전자는 CHOICE_SUBMIT / 결과 변경 이벤트를 보낼 수 없음 (핸들러 미등록)
 * - 게스트는 데모 경기만 구독 가능
 */
export function registerWatchSocketHandlers(_io: SocketIOServer, socket: AuthedSocket) {
  socket.on('WATCH_SUBSCRIBE', (payload: { matchId?: string }) => {
    void (async () => {
      const matchId = payload?.matchId?.trim();
      if (!matchId) {
        socket.emit('error_event', { code: 'BAD_REQUEST', message: 'matchId가 필요합니다.' });
        return;
      }

      const isGuest = socket.data.typ === 'guest';
      if (isGuest && matchId !== WATCH_POLICY.demoMatchId) {
        socket.emit('error_event', {
          code: 'GUEST_DEMO_ONLY',
          message: '게스트는 공개 데모 경기만 관전할 수 있습니다.',
        });
        return;
      }

      const count = await joinWatchRoom(socket, matchId);
      const state = getSnapshot(matchId);
      socket.emit('WATCH_STATE', {
        event: 'WATCH_STATE',
        timestamp: Date.now(),
        payload: state
          ? { ...state, viewerCount: count }
          : {
              matchId,
              isDemo: matchId === WATCH_POLICY.demoMatchId,
              phase: 'WAITING',
              statusLabel: '경기 대기 중',
              viewerCount: count,
              player1Chosen: false,
              player2Chosen: false,
              player1Choice: null,
              player2Choice: null,
            },
      });
      socket.emit('WATCH_VIEWER_COUNT', {
        event: 'WATCH_VIEWER_COUNT',
        timestamp: Date.now(),
        payload: { matchId, viewerCount: count },
      });
      if (socket.data.typ === 'user' && socket.data.userId) {
        const { afterSpectate } = await import('../progression/after-match.js');
        void afterSpectate(socket.data.userId).catch(() => undefined);
      }
    })();
  });

  socket.on('WATCH_UNSUBSCRIBE', (payload: { matchId?: string }) => {
    void (async () => {
      if (!payload?.matchId) return;
      await leaveWatchRoom(socket, payload.matchId);
    })();
  });

  socket.on('WATCH_REACTION', (payload: { matchId?: string; kind?: string }) => {
    const matchId = payload?.matchId?.trim();
    const kind = payload?.kind?.trim() ?? '';
    if (!matchId || !isWatchReaction(kind)) {
      socket.emit('error_event', {
        code: 'BAD_REQUEST',
        message: '허용된 이모티콘만 사용할 수 있습니다.',
      });
      return;
    }
    if (socket.data.typ === 'guest' && matchId !== WATCH_POLICY.demoMatchId) {
      socket.emit('error_event', {
        code: 'GUEST_DEMO_ONLY',
        message: '게스트는 데모 경기에만 리액션할 수 있습니다.',
      });
      return;
    }
    const result = tryReaction(socket.data.userId, matchId, kind);
    if (!result.ok) {
      socket.emit('error_event', {
        code: 'RATE_LIMITED',
        message: '리액션이 너무 빠릅니다. 잠시 후 다시 시도해 주세요.',
      });
      return;
    }
    socket.emit('WATCH_REACTION_ACK', {
      event: 'WATCH_REACTION_ACK',
      timestamp: Date.now(),
      payload: { matchId, kind, totals: result.totals },
    });
  });

  // 관전자 선택 제출 시도 차단 (명시적 거부)
  socket.on('WATCH_CHOICE_SUBMIT', () => {
    socket.emit('error_event', {
      code: 'SPECTATOR_FORBIDDEN',
      message: '관전자는 선택을 제출할 수 없습니다.',
    });
  });

  socket.on('disconnect', () => {
    leaveAllWatchRooms(socket);
  });
}

export function notifyWatchersNextMatch(fromMatchId: string, nextMatchId: string) {
  emitToWatchers(fromMatchId, 'WATCH_NEXT_MATCH', {
    fromMatchId,
    nextMatchId,
  });
}
