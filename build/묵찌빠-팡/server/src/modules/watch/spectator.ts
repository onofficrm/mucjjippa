/**
 * 관전 room · 관전자 수 · 공개 페이로드 헬퍼.
 * 결과 공개 전에는 실제 선택값을 절대 넣지 않는다.
 */
import type { Server as SocketIOServer, Socket } from 'socket.io';
import { getRedis } from '../../lib/redis.js';
import { WATCH_POLICY, type WatchReactionKind } from './policy.js';

export type PublicPlayer = {
  id: string;
  nickname: string;
  avatar: string;
  title?: string;
};

export type WatchPhase =
  | 'IDLE'
  | 'WAITING'
  | 'COUNTDOWN'
  | 'CHOOSING'
  | 'LOCKED'
  | 'REVEALING'
  | 'ROUND_RESULT'
  | 'FINISHED'
  | 'DEMO';

export type WatchPublicState = {
  matchId: string;
  kind: 'CASUAL' | 'STRATEGY' | 'TOURNAMENT' | 'DEMO';
  isDemo: boolean;
  phase: WatchPhase;
  statusLabel: string;
  roomName?: string;
  stakePoints?: number;
  round: number;
  endsAt: number | null;
  player1: PublicPlayer;
  player2: PublicPlayer;
  player1Score: number;
  player2Score: number;
  /** 선택 완료 여부만 — 패는 비공개 */
  player1Chosen: boolean;
  player2Chosen: boolean;
  /** 공개 후에만 채움 */
  player1Choice: 'rock' | 'paper' | 'scissors' | null;
  player2Choice: 'rock' | 'paper' | 'scissors' | null;
  roundOutcome: 'p1' | 'p2' | 'draw' | null;
  matchWinner: 'p1' | 'p2' | null;
  viewerCount: number;
  reactions: { like: number; flame: number; thumb: number };
};

const viewerSockets = new Map<string, Set<string>>(); // matchId → socketIds
const reactionTotals = new Map<string, { like: number; flame: number; thumb: number }>();
const reactionRate = new Map<string, { windowStart: number; count: number }>(); // userId:matchId
const snapshots = new Map<string, WatchPublicState>();

let ioRef: SocketIOServer | null = null;

export function bindWatchIo(io: SocketIOServer) {
  ioRef = io;
}

export function watchRoom(matchId: string) {
  return `watch:match:${matchId}`;
}

export function getSnapshot(matchId: string): WatchPublicState | null {
  return snapshots.get(matchId) ?? null;
}

export function listLiveSnapshots(): WatchPublicState[] {
  return [...snapshots.values()].filter(
    (s) => !s.isDemo && s.phase !== 'FINISHED' && s.phase !== 'IDLE'
  );
}

function emptyReactions() {
  return { like: 0, flame: 0, thumb: 0 };
}

export function upsertSnapshot(partial: WatchPublicState) {
  const prev = snapshots.get(partial.matchId);
  const next: WatchPublicState = {
    ...partial,
    viewerCount: prev?.viewerCount ?? partial.viewerCount,
    reactions: reactionTotals.get(partial.matchId) ?? partial.reactions ?? emptyReactions(),
  };
  // 결과 전 패 강제 비공개
  if (next.phase === 'CHOOSING' || next.phase === 'LOCKED' || next.phase === 'COUNTDOWN' || next.phase === 'WAITING') {
    next.player1Choice = null;
    next.player2Choice = null;
    next.roundOutcome = null;
  }
  snapshots.set(partial.matchId, next);
  return next;
}

export function removeSnapshot(matchId: string) {
  if (matchId === WATCH_POLICY.demoMatchId) return;
  snapshots.delete(matchId);
}

async function redisIncrViewers(matchId: string, delta: number) {
  try {
    const redis = getRedis();
    if (redis.status !== 'ready') return null;
    const key = `${WATCH_POLICY.redisViewerPrefix}${matchId}`;
    const n = await redis.incrby(key, delta);
    if (n < 0) {
      await redis.set(key, '0');
      return 0;
    }
    await redis.expire(key, 3600);
    return n;
  } catch {
    return null;
  }
}

export async function joinWatchRoom(socket: Socket, matchId: string) {
  const room = watchRoom(matchId);
  await socket.join(room);
  let set = viewerSockets.get(matchId);
  if (!set) {
    set = new Set();
    viewerSockets.set(matchId, set);
  }
  set.add(socket.id);

  const redisCount = await redisIncrViewers(matchId, 1);
  const count = redisCount ?? set.size;

  const snap = snapshots.get(matchId);
  if (snap) {
    snap.viewerCount = count;
    snapshots.set(matchId, snap);
  }

  emitToWatchers(matchId, 'WATCH_VIEWER_COUNT', { matchId, viewerCount: count });
  return count;
}

export async function leaveWatchRoom(socket: Socket, matchId: string) {
  const room = watchRoom(matchId);
  await socket.leave(room);
  const set = viewerSockets.get(matchId);
  if (set) {
    set.delete(socket.id);
    if (set.size === 0) viewerSockets.delete(matchId);
  }
  const redisCount = await redisIncrViewers(matchId, -1);
  const count = redisCount ?? set?.size ?? 0;
  const snap = snapshots.get(matchId);
  if (snap) {
    snap.viewerCount = Math.max(0, count);
    snapshots.set(matchId, snap);
  }
  emitToWatchers(matchId, 'WATCH_VIEWER_COUNT', {
    matchId,
    viewerCount: Math.max(0, count),
  });
}

export function leaveAllWatchRooms(socket: Socket) {
  for (const [matchId, set] of viewerSockets) {
    if (set.has(socket.id)) {
      void leaveWatchRoom(socket, matchId);
    }
  }
}

export function emitToWatchers(matchId: string, event: string, payload: unknown) {
  if (!ioRef) return;
  ioRef.to(watchRoom(matchId)).emit(event, {
    event,
    timestamp: Date.now(),
    payload,
  });
}

/** 스냅샷 갱신 + WATCH_STATE 브로드캐스트 */
export function publishWatchState(partial: WatchPublicState) {
  const state = upsertSnapshot(partial);
  emitToWatchers(partial.matchId, 'WATCH_STATE', state);
  return state;
}

/** 기존 스냅샷에 부분 갱신 (없으면 no-op) */
export function patchWatchState(
  matchId: string,
  patch: Partial<Omit<WatchPublicState, 'matchId'>> & {
    phase?: WatchPhase;
  }
) {
  const prev = snapshots.get(matchId);
  if (!prev) return null;
  return publishWatchState({
    ...prev,
    ...patch,
    matchId,
  });
}

export function tryReaction(
  userId: string,
  matchId: string,
  kind: WatchReactionKind
): { ok: boolean; totals?: { like: number; flame: number; thumb: number }; reason?: string } {
  const key = `${userId}:${matchId}`;
  const now = Date.now();
  const bucket = reactionRate.get(key) ?? { windowStart: now, count: 0 };
  if (now - bucket.windowStart >= 1000) {
    bucket.windowStart = now;
    bucket.count = 0;
  }
  if (bucket.count >= WATCH_POLICY.reactionPerSecond) {
    reactionRate.set(key, bucket);
    return { ok: false, reason: 'RATE_LIMITED' };
  }
  bucket.count += 1;
  reactionRate.set(key, bucket);

  const totals = reactionTotals.get(matchId) ?? emptyReactions();
  totals[kind] += 1;
  reactionTotals.set(matchId, totals);

  const snap = snapshots.get(matchId);
  if (snap) {
    snap.reactions = { ...totals };
    snapshots.set(matchId, snap);
  }

  emitToWatchers(matchId, 'WATCH_REACTION', {
    matchId,
    kind,
    totals,
    viewerCount: snap?.viewerCount ?? 0,
  });

  return { ok: true, totals };
}

export function toClientChoice(choice: string | null | undefined): 'rock' | 'paper' | 'scissors' | null {
  if (!choice) return null;
  const c = choice.toUpperCase();
  if (c === 'ROCK') return 'rock';
  if (c === 'PAPER') return 'paper';
  if (c === 'SCISSORS') return 'scissors';
  if (choice === 'rock' || choice === 'paper' || choice === 'scissors') return choice;
  return null;
}
