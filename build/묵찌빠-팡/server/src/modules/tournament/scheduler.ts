import type { Server as SocketIOServer } from 'socket.io';
import { getRedis, connectRedis } from '../../lib/redis.js';
import { TOURNAMENT_POLICY } from './policy.js';
import {
  bindTournamentEmitter,
  processDueTournaments,
  recoverTournaments,
  submitBracketChoice,
  submitQualifierChoice,
} from './engine.js';

let pollTimer: NodeJS.Timeout | null = null;

/**
 * Redis ZSET 기반 durable job + DB nextTransitionAt 폴백.
 * 서버 재시작 시 recoverTournaments 로 복구.
 */
export async function scheduleTournamentJob(
  tournamentId: string,
  action: string,
  runAt: number
) {
  try {
    await connectRedis();
    const redis = getRedis();
    await redis.zadd(
      TOURNAMENT_POLICY.redisJobKey,
      runAt,
      `${tournamentId}:${action}:${runAt}`
    );
  } catch {
    // Redis 불가 시 DB nextTransitionAt 만으로도 동작
  }
}

async function drainRedisJobs() {
  try {
    const redis = getRedis();
    if (redis.status !== 'ready') return;
    const now = Date.now();
    const jobs = await redis.zrangebyscore(
      TOURNAMENT_POLICY.redisJobKey,
      0,
      now,
      'LIMIT',
      0,
      50
    );
    if (jobs.length) {
      await redis.zrem(TOURNAMENT_POLICY.redisJobKey, ...jobs);
    }
    // 실제 전이는 processDueTournaments(DB)가 담당 — Redis 는 중복 트리거용
  } catch {
    /* ignore */
  }
}

export function startTournamentScheduler(io: SocketIOServer) {
  bindTournamentEmitter(io);
  void recoverTournaments();

  pollTimer = setInterval(() => {
    void drainRedisJobs();
    void processDueTournaments();
  }, TOURNAMENT_POLICY.schedulerPollMs);

  return () => {
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = null;
  };
}

type AuthedSocket = {
  id: string;
  data: { userId: string };
  join: (room: string) => void;
  emit: (event: string, payload: unknown) => void;
  on: (event: string, handler: (...args: any[]) => void) => void;
};

export function registerTournamentSocketHandlers(
  _io: SocketIOServer,
  socket: AuthedSocket
) {
  socket.on('TOURNAMENT_SUBSCRIBE', (payload: { tournamentId?: string }) => {
    if (!payload?.tournamentId) return;
    socket.join(`tournament:${payload.tournamentId}`);
    socket.emit('TOURNAMENT_UPDATED', {
      event: 'TOURNAMENT_UPDATED',
      timestamp: Date.now(),
      payload: { tournamentId: payload.tournamentId, subscribed: true },
    });
  });

  socket.on(
    'QUALIFIER_CHOICE_SUBMIT',
    (payload: { tournamentId?: string; choice?: string }) => {
      void (async () => {
        try {
          if (!payload?.tournamentId || !payload.choice) {
            socket.emit('error_event', {
              code: 'BAD_REQUEST',
              message: '잘못된 예선 선택입니다.',
            });
            return;
          }
          const result = await submitQualifierChoice(
            payload.tournamentId,
            socket.data.userId,
            payload.choice
          );
          socket.emit('QUALIFIER_CHOICE_ACCEPTED', {
            event: 'QUALIFIER_CHOICE_ACCEPTED',
            timestamp: Date.now(),
            payload: result,
          });
        } catch (error) {
          socket.emit('error_event', {
            code: error instanceof Error ? error.message : 'QUALIFIER_FAILED',
            message: '예선 선택을 처리할 수 없습니다.',
          });
        }
      })();
    }
  );

  socket.on(
    'TOURNAMENT_CHOICE_SUBMIT',
    (payload: { matchId?: string; choice?: string }) => {
      void (async () => {
        try {
          if (!payload?.matchId || !payload.choice) {
            socket.emit('error_event', {
              code: 'BAD_REQUEST',
              message: '잘못된 본선 선택입니다.',
            });
            return;
          }
          const result = await submitBracketChoice(
            payload.matchId,
            socket.data.userId,
            payload.choice
          );
          socket.emit('CHOICE_ACCEPTED', {
            event: 'CHOICE_ACCEPTED',
            timestamp: Date.now(),
            payload: result,
          });
        } catch (error) {
          socket.emit('error_event', {
            code: error instanceof Error ? error.message : 'BRACKET_FAILED',
            message: '본선 선택을 처리할 수 없습니다.',
          });
        }
      })();
    }
  );
}
