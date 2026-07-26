import type { Server as SocketIOServer, Socket } from 'socket.io';
import { MATCH_POLICY, isAllowedStake, rewardForStake, roomByStake } from './policy.js';
import { matchQueue } from './queue.js';
import {
  determineRpsWinner,
  fromClientChoice,
  randomRpsChoice,
  toClientChoice,
  type RpsChoice,
} from './rps.js';
import {
  createMatchedGame,
  finalizeMatch,
  findActiveMatchForUser,
  loadMatchUser,
  markMatchPlaying,
  persistRound,
} from './service.js';
import {
  dropStrategyGame,
  getStrategyStateFor,
  hasStrategyGame,
  isStrategyStake,
  startStrategyMatch,
  submitStrategyChoices,
  type StrategyDeps,
} from './strategy-runtime.js';
import {
  watchOnChoiceProgress,
  watchOnMatchFinished,
  watchOnMatchReady,
  watchOnRoundReveal,
  watchOnRoundStarted,
} from '../watch/bridge.js';
import type {
  MatchRuntimeState,
  PublicOpponent,
  QueueEntry,
  RuntimeMatch,
  RuntimePlayer,
  RuntimeRound,
} from './types.js';
import { recordFraudSignal } from '../security/fraud.js';
import { SECURITY_POLICY } from '../security/policy.js';
import { FraudSeverity, FraudSignalType } from '@prisma/client';

type AuthedSocket = Socket & {
  data: {
    userId: string;
    nickname: string;
    role?: string;
  };
};

const runtimes = new Map<string, RuntimeMatch>();
const userMatchIndex = new Map<string, string>();
const disconnectAbuse = new Map<string, number[]>();

function clearTimer(timer?: NodeJS.Timeout) {
  if (timer) clearTimeout(timer);
}

function toOpponent(player: RuntimePlayer): PublicOpponent {
  const total = player.wins + player.losses;
  return {
    id: player.userId,
    nickname: player.nickname,
    avatar: player.avatar,
    title: player.title,
    wins: player.wins,
    losses: player.losses,
    winRate: total > 0 ? Math.round((player.wins / total) * 1000) / 10 : 0,
    maxStreak: player.maxStreak,
    recentLastHand: null,
    greeting: '승부합시다!',
  };
}

function walletPayload(points: number, tickets: number, transactionId: string) {
  return { points, tickets, transactionId };
}

function getRuntimeByUser(userId: string): RuntimeMatch | null {
  const matchId = userMatchIndex.get(userId);
  if (!matchId) return null;
  return runtimes.get(matchId) ?? null;
}

function sideOf(match: RuntimeMatch, userId: string): 'player1' | 'player2' | null {
  if (match.player1.userId === userId) return 'player1';
  if (match.player2.userId === userId) return 'player2';
  return null;
}

function scoresFor(match: RuntimeMatch, userId: string) {
  const side = sideOf(match, userId);
  if (side === 'player1') {
    return { playerScore: match.player1Score, opponentScore: match.player2Score };
  }
  return { playerScore: match.player2Score, opponentScore: match.player1Score };
}

function opponentOf(match: RuntimeMatch, userId: string): RuntimePlayer {
  return match.player1.userId === userId ? match.player2 : match.player1;
}

function emitToPlayers(
  io: SocketIOServer,
  match: RuntimeMatch,
  event: string,
  payloadFor: (userId: string) => unknown
) {
  for (const player of [match.player1, match.player2]) {
    if (!player.socketId) continue;
    io.to(player.socketId).emit(event, {
      event,
      timestamp: Date.now(),
      payload: payloadFor(player.userId),
    });
  }
}

async function emitWalletUpdates(
  io: SocketIOServer,
  match: RuntimeMatch,
  winnerId: string
) {
  for (const player of [match.player1, match.player2]) {
    if (!player.socketId) continue;
    const loaded = await loadMatchUser(player.userId);
    io.to(player.socketId).emit('WALLET_UPDATED', {
      event: 'WALLET_UPDATED',
      timestamp: Date.now(),
      payload: walletPayload(
        loaded.wallet?.pointBalance ?? 0,
        loaded.wallet?.ticketBalance ?? 0,
        player.userId === winnerId
          ? `match-reward:${match.matchId}:${player.userId}`
          : `match-entry:${match.matchId}:${player.userId}`
      ),
    });
  }
}

function releaseMatch(match: RuntimeMatch) {
  clearTimer(match.timers.choice);
  clearTimer(match.timers.reveal);
  match.timers.disconnect?.forEach((timer) => clearTimer(timer));
  userMatchIndex.delete(match.player1.userId);
  userMatchIndex.delete(match.player2.userId);
  setTimeout(() => {
    runtimes.delete(match.matchId);
    dropStrategyGame(match.matchId);
  }, 60_000);
}

/** 전략 대전 런타임에 넘겨줄 공용 헬퍼 — 상태 저장은 전략 모듈이 독립적으로 관리한다. */
function strategyDeps(io: SocketIOServer): StrategyDeps {
  return {
    emitToPlayers: (match, event, payloadFor) => emitToPlayers(io, match, event, payloadFor),
    sideOf,
    opponentOf,
    emitWallets: (match, winnerId) => emitWalletUpdates(io, match, winnerId),
    onFinished: (match) => releaseMatch(match),
  };
}

function recordDisconnectAbuse(userId: string) {
  const now = Date.now();
  const windowStart = now - MATCH_POLICY.abuse.windowMs;
  const list = (disconnectAbuse.get(userId) ?? []).filter((ts) => ts >= windowStart);
  list.push(now);
  disconnectAbuse.set(userId, list);
  return list.length;
}

async function buildQueueEntry(socket: AuthedSocket, stake: number): Promise<QueueEntry> {
  if (!isAllowedStake(stake)) {
    throw new Error('UNSUPPORTED_STAKE');
  }
  const room = roomByStake(stake);
  if (!room) throw new Error('ROOM_NOT_FOUND');

  const user = await loadMatchUser(socket.data.userId);
  if ((user.wallet?.pointBalance ?? 0) < stake) {
    throw new Error('INSUFFICIENT_FUNDS');
  }

  const active = await findActiveMatchForUser(user.id);
  if (active) throw new Error('ACTIVE_MATCH_EXISTS');

  if (matchQueue.hasUser(user.id) || getRuntimeByUser(user.id)) {
    throw new Error('ALREADY_QUEUED');
  }

  return {
    userId: user.id,
    socketId: socket.id,
    stake,
    roomId: room.id,
    roomName: room.title,
    level: user.level,
    nickname: user.nickname,
    avatar: user.avatar?.imageUrl ?? '✊',
    title: user.title?.name ?? '새싹 플레이어',
    wins: user.wins,
    losses: user.losses,
    maxStreak: user.maxStreak,
    enqueuedAt: Date.now(),
  };
}

function makePlayer(entry: QueueEntry): RuntimePlayer {
  return {
    userId: entry.userId,
    socketId: entry.socketId,
    nickname: entry.nickname,
    avatar: entry.avatar,
    title: entry.title,
    wins: entry.wins,
    losses: entry.losses,
    maxStreak: entry.maxStreak,
    level: entry.level,
    connected: true,
    disconnectedAt: null,
    choice: null,
    choiceLocked: false,
  };
}

async function pairIfPossible(io: SocketIOServer, stake: (typeof MATCH_POLICY.stakes)[number]) {
  const pair = matchQueue.tryMatch(stake);
  if (!pair) return;

  const [a, b] = pair;
  try {
    const dbMatch = await createMatchedGame({ player1: a, player2: b, stake });
    const runtime: RuntimeMatch = {
      matchId: dbMatch.id,
      stake,
      roomId: a.roomId,
      roomName: a.roomName,
      entryPoint: stake,
      rewardPoint: rewardForStake(stake),
      state: 'MATCHED',
      player1: makePlayer(a),
      player2: makePlayer(b),
      roundNumber: 0,
      currentRound: null,
      player1Score: 0,
      player2Score: 0,
      winnerId: null,
      feesDeducted: true,
      createdAt: Date.now(),
      finishedAt: null,
      timers: { disconnect: new Map() },
    };

    runtimes.set(runtime.matchId, runtime);
    userMatchIndex.set(a.userId, runtime.matchId);
    userMatchIndex.set(b.userId, runtime.matchId);

    for (const player of [runtime.player1, runtime.player2]) {
      if (player.socketId) {
        io.sockets.sockets.get(player.socketId)?.join(`match:${runtime.matchId}`);
      }
    }

    emitToPlayers(io, runtime, 'MATCH_FOUND', (userId) => {
      const opp = opponentOf(runtime, userId);
      return {
        matchId: runtime.matchId,
        roomId: runtime.roomId,
        roomName: runtime.roomName,
        stakePoints: runtime.entryPoint,
        rewardPoints: runtime.rewardPoint,
        opponent: toOpponent(opp),
        state: runtime.state,
      };
    });

    // WALLET_UPDATED after fee debit
    for (const player of [runtime.player1, runtime.player2]) {
      if (!player.socketId) continue;
      const user = await loadMatchUser(player.userId);
      io.to(player.socketId).emit('WALLET_UPDATED', {
        event: 'WALLET_UPDATED',
        timestamp: Date.now(),
        payload: walletPayload(
          user.wallet?.pointBalance ?? 0,
          user.wallet?.ticketBalance ?? 0,
          `match-entry:${runtime.matchId}:${player.userId}`
        ),
      });
    }

    runtime.state = 'READY';
    const strategyMode = isStrategyStake(stake);
    watchOnMatchReady(runtime, strategyMode ? 'STRATEGY' : 'CASUAL');
    emitToPlayers(io, runtime, 'MATCH_READY', () => ({
      matchId: runtime.matchId,
      startsInMs: MATCH_POLICY.readyDelayMs,
      mode: strategyMode ? 'STRATEGY_300P' : 'NORMAL',
      choiceCount: strategyMode ? MATCH_POLICY.strategy.choiceCount : 1,
    }));

    clearTimer(runtime.timers.reveal);
    runtime.timers.reveal = setTimeout(() => {
      if (strategyMode) {
        startStrategyMatch(io, runtime, strategyDeps(io));
        return;
      }
      void startRound(io, runtime.matchId);
    }, MATCH_POLICY.readyDelayMs);
  } catch (error) {
    // 실패 시 큐 복구
    try {
      matchQueue.enqueue(a);
      matchQueue.enqueue(b);
    } catch {
      /* ignore */
    }
    for (const entry of [a, b]) {
      io.to(entry.socketId).emit('MATCH_CANCELLED', {
        event: 'MATCH_CANCELLED',
        timestamp: Date.now(),
        payload: {
          reason: error instanceof Error ? error.message : 'MATCH_CREATE_FAILED',
          refunded: false,
        },
      });
    }
  }
}

function startRound(io: SocketIOServer, matchId: string) {
  const match = runtimes.get(matchId);
  if (!match || match.state === 'FINISHED' || match.state === 'CANCELLED') return;

  void markMatchPlaying(matchId).catch(() => null);

  match.roundNumber += 1;
  match.player1.choice = null;
  match.player1.choiceLocked = false;
  match.player2.choice = null;
  match.player2.choiceLocked = false;

  const startedAt = Date.now();
  const endsAt = startedAt + MATCH_POLICY.choiceTimeoutMs;
  const round: RuntimeRound = {
    roundNumber: match.roundNumber,
    startedAt,
    endsAt,
    player1Choice: null,
    player2Choice: null,
    winnerUserId: null,
    isDraw: false,
    revealed: false,
  };
  match.currentRound = round;
  match.state = 'CHOOSING';

  emitToPlayers(io, match, 'ROUND_STARTED', (userId) => ({
    matchId: match.matchId,
    round: round.roundNumber,
    endsAt,
    timeoutMs: MATCH_POLICY.choiceTimeoutMs,
    ...scoresFor(match, userId),
    // 상대 선택은 절대 포함하지 않음
  }));
  watchOnRoundStarted(match, endsAt, 'CASUAL');

  clearTimer(match.timers.choice);
  match.timers.choice = setTimeout(() => {
    void lockAndResolve(io, matchId);
  }, MATCH_POLICY.choiceTimeoutMs);
}

function bothChosen(match: RuntimeMatch): boolean {
  return Boolean(match.player1.choice && match.player2.choice);
}

async function lockAndResolve(io: SocketIOServer, matchId: string) {
  const match = runtimes.get(matchId);
  if (!match || !match.currentRound) return;
  if (match.state === 'REVEALING' || match.state === 'FINISHED' || match.state === 'LOCKED') {
    return;
  }

  clearTimer(match.timers.choice);
  match.state = 'LOCKED';

  if (!match.player1.choice) match.player1.choice = randomRpsChoice(Date.now() + 1);
  if (!match.player2.choice) match.player2.choice = randomRpsChoice(Date.now() + 2);

  match.player1.choiceLocked = true;
  match.player2.choiceLocked = true;
  match.currentRound.player1Choice = match.player1.choice;
  match.currentRound.player2Choice = match.player2.choice;

  emitToPlayers(io, match, 'CHOICE_LOCKED', (userId) => {
    const me = match.player1.userId === userId ? match.player1 : match.player2;
    return {
      matchId: match.matchId,
      round: match.roundNumber,
      yourChoice: me.choice ? toClientChoice(me.choice) : null,
      // 상대 패 미공개
    };
  });

  const winner = determineRpsWinner(match.player1.choice!, match.player2.choice!);
  const isDraw = winner === 'draw';
  const winnerUserId =
    winner === 'player1'
      ? match.player1.userId
      : winner === 'player2'
        ? match.player2.userId
        : null;

  match.currentRound.isDraw = isDraw;
  match.currentRound.winnerUserId = winnerUserId;
  match.state = isDraw ? 'DRAW' : 'REVEALING';

  await persistRound({
    matchId: match.matchId,
    roundNumber: match.roundNumber,
    player1Choice: match.player1.choice!,
    player2Choice: match.player2.choice!,
    winnerId: winnerUserId,
  });

  if (!isDraw) {
    if (winnerUserId === match.player1.userId) match.player1Score += 1;
    else match.player2Score += 1;
  }

  emitToPlayers(io, match, 'ROUND_RESULT', (userId) => {
    const mySide = sideOf(match, userId)!;
    const myChoice = mySide === 'player1' ? match.player1.choice! : match.player2.choice!;
    const oppChoice = mySide === 'player1' ? match.player2.choice! : match.player1.choice!;
    let outcome: 'win' | 'loss' | 'draw' = 'draw';
    if (!isDraw) {
      outcome = winnerUserId === userId ? 'win' : 'loss';
    }
    const scores = scoresFor(match, userId);
    return {
      matchId: match.matchId,
      round: match.roundNumber,
      playerChoice: toClientChoice(myChoice),
      opponentChoice: toClientChoice(oppChoice),
      outcome,
      playerScore: scores.playerScore,
      opponentScore: scores.opponentScore,
      matchWinner: null,
      isDraw,
    };
  });

  watchOnRoundReveal(match, {
    p1Choice: match.player1.choice!,
    p2Choice: match.player2.choice!,
    winnerUserId,
    isDraw,
  });

  match.currentRound.revealed = true;

  if (isDraw) {
    clearTimer(match.timers.reveal);
    match.timers.reveal = setTimeout(() => {
      void startRound(io, matchId);
    }, MATCH_POLICY.drawNextRoundMs);
    return;
  }

  clearTimer(match.timers.reveal);
  match.timers.reveal = setTimeout(() => {
    void finishMatch(io, matchId, winnerUserId!);
  }, MATCH_POLICY.revealHoldMs);
}

async function finishMatch(io: SocketIOServer, matchId: string, winnerId: string) {
  const match = runtimes.get(matchId);
  if (!match || match.state === 'FINISHED') return;

  const loserId =
    match.player1.userId === winnerId ? match.player2.userId : match.player1.userId;

  const result = await finalizeMatch({
    matchId,
    winnerId,
    loserId,
    rewardPoint: match.rewardPoint,
  });

  match.state = 'FINISHED';
  match.winnerId = winnerId;
  match.finishedAt = Date.now();

  emitToPlayers(io, match, 'MATCH_RESULT', (userId) => {
    const scores = scoresFor(match, userId);
    return {
      matchId: match.matchId,
      roomId: match.roomId,
      roomName: match.roomName,
      stakePoints: match.entryPoint,
      winner: winnerId === userId ? 'player' : 'opponent',
      playerScore: scores.playerScore,
      opponentScore: scores.opponentScore,
      rewardPoints: winnerId === userId ? match.rewardPoint : 0,
      duplicatedReward: result.duplicated,
    };
  });

  emitToPlayers(io, match, 'MATCH_FINISHED', (userId) => {
    const scores = scoresFor(match, userId);
    return {
      matchId: match.matchId,
      roomId: match.roomId,
      roomName: match.roomName,
      stakePoints: match.entryPoint,
      winner: winnerId === userId ? 'player' : 'opponent',
      playerScore: scores.playerScore,
      opponentScore: scores.opponentScore,
      rewardPoints: winnerId === userId ? match.rewardPoint : 0,
      finishedAt: match.finishedAt,
    };
  });

  await emitWalletUpdates(io, match, winnerId);
  watchOnMatchFinished(match, winnerId);
  releaseMatch(match);
}

function submitChoice(
  io: SocketIOServer,
  socket: AuthedSocket,
  raw: { matchId?: string; choice?: string }
) {
  const matchId = raw.matchId;
  const choice = fromClientChoice(raw.choice ?? '');
  if (!matchId || !choice) {
    socket.emit('error_event', { code: 'BAD_REQUEST', message: '잘못된 선택입니다.' });
    return;
  }

  const match = runtimes.get(matchId);
  if (!match || match.state !== 'CHOOSING' || !match.currentRound) {
    socket.emit('error_event', { code: 'NOT_CHOOSING', message: '선택 시간이 아닙니다.' });
    return;
  }

  const side = sideOf(match, socket.data.userId);
  if (!side) {
    socket.emit('error_event', { code: 'FORBIDDEN', message: '이 매치의 참가자가 아닙니다.' });
    return;
  }

  if (Date.now() > match.currentRound.endsAt) {
    socket.emit('error_event', { code: 'TIMEOUT', message: '선택 시간이 종료되었습니다.' });
    return;
  }

  const player = side === 'player1' ? match.player1 : match.player2;
  if (player.choiceLocked) {
    socket.emit('error_event', { code: 'LOCKED', message: '이미 선택이 확정되었습니다.' });
    return;
  }

  // 부정 이용 로깅: 라운드 시작 직후(사람이 반응 불가능한 시간) 제출 감지
  const roundStartedAt = match.currentRound.endsAt - MATCH_POLICY.choiceTimeoutMs;
  const reactionMs = Date.now() - roundStartedAt;
  if (reactionMs >= 0 && reactionMs < SECURITY_POLICY.rapidChoiceMs) {
    const day = new Date().toISOString().slice(0, 10);
    void recordFraudSignal({
      type: FraudSignalType.RAPID_CHOICE,
      severity: FraudSeverity.WARN,
      userId: socket.data.userId,
      dedupeKey: `rapid_choice:${socket.data.userId}:${day}`,
      message: `지나치게 빠른 선택 (${reactionMs}ms)`,
      context: { matchId, round: match.roundNumber, reactionMs },
    });
  }

  // 마지막 제출 선택을 사용
  player.choice = choice as RpsChoice;
  watchOnChoiceProgress(match);
  socket.emit('CHOICE_ACCEPTED', {
    event: 'CHOICE_ACCEPTED',
    timestamp: Date.now(),
    payload: {
      matchId,
      round: match.roundNumber,
      choice: toClientChoice(choice),
    },
  });

  if (bothChosen(match)) {
    void lockAndResolve(io, matchId);
  }
}

async function leaveQueue(_io: SocketIOServer, socket: AuthedSocket) {
  const removed = matchQueue.remove(socket.data.userId);
  if (!removed) {
    socket.emit('MATCH_CANCELLED', {
      event: 'MATCH_CANCELLED',
      timestamp: Date.now(),
      payload: { reason: 'NOT_IN_QUEUE', refunded: false },
    });
    return;
  }

  socket.emit('MATCH_CANCELLED', {
    event: 'MATCH_CANCELLED',
    timestamp: Date.now(),
    payload: { reason: 'USER_CANCELLED', refunded: false, stakePoints: removed.stake },
  });
}

async function joinQueue(io: SocketIOServer, socket: AuthedSocket, raw: { stake?: number; roomId?: string }) {
  try {
    const stake = Number(raw.stake);
    const entry = await buildQueueEntry(socket, stake);
    matchQueue.enqueue(entry);

    socket.emit('MATCH_SEARCH_STARTED', {
      event: 'MATCH_SEARCH_STARTED',
      timestamp: Date.now(),
      payload: {
        stake: entry.stake,
        roomId: entry.roomId,
        roomName: entry.roomName,
        queuedAt: entry.enqueuedAt,
      },
    });

    // 동일 이벤트명 요청 스펙 호환
    socket.emit('MATCH_QUEUE_JOIN_ACK', {
      event: 'MATCH_QUEUE_JOIN_ACK',
      timestamp: Date.now(),
      payload: {
        stake: entry.stake,
        roomId: entry.roomId,
        roomName: entry.roomName,
      },
    });

    await pairIfPossible(io, entry.stake);
  } catch (error) {
    const code = error instanceof Error ? error.message : 'QUEUE_FAILED';
    socket.emit('error_event', {
      code,
      message:
        code === 'INSUFFICIENT_FUNDS'
          ? '포인트가 부족합니다.'
          : code === 'ALREADY_QUEUED'
            ? '이미 매칭 대기 중입니다.'
            : code === 'ACTIVE_MATCH_EXISTS'
              ? '진행 중인 경기가 있습니다.'
              : code === 'UNSUPPORTED_STAKE'
                ? '지원하지 않는 대전 모드입니다.'
                : '매칭 등록에 실패했습니다.',
      requiredPoints: isAllowedStake(Number(raw.stake)) ? Number(raw.stake) : undefined,
    });
  }
}

function restorePayload(match: RuntimeMatch, userId: string) {
  const opp = opponentOf(match, userId);
  const me = match.player1.userId === userId ? match.player1 : match.player2;
  const scores = scoresFor(match, userId);
  return {
    matchId: match.matchId,
    state: match.state,
    roomId: match.roomId,
    roomName: match.roomName,
    stakePoints: match.entryPoint,
    rewardPoints: match.rewardPoint,
    mode: isStrategyStake(match.stake) ? 'STRATEGY_300P' : 'NORMAL',
    strategy: getStrategyStateFor(match, userId),
    opponent: toOpponent(opp),
    round: match.roundNumber,
    endsAt: match.currentRound?.endsAt ?? null,
    yourChoice: me.choice && match.state !== 'CHOOSING' ? toClientChoice(me.choice) : me.choice ? toClientChoice(me.choice) : null,
    // CHOOSING 중에도 내 선택은 복구 가능, 상대는 미공개
    opponentChoice:
      match.currentRound?.revealed && match.player1.choice && match.player2.choice
        ? toClientChoice(
            match.player1.userId === userId ? match.player2.choice! : match.player1.choice!
          )
        : null,
    ...scores,
  };
}

async function handleDisconnect(io: SocketIOServer, socket: AuthedSocket) {
  matchQueue.updateSocket(socket.data.userId, '');
  // 큐에 있으면 유지하되 socketId 비움 — 재접속 시 갱신. 또는 큐 제거?
  // 정책: 검색 중 연결 종료 → 큐에서 제거 (짧은 재접속은 MATCH 중만)
  if (matchQueue.hasUser(socket.data.userId)) {
    matchQueue.remove(socket.data.userId);
    return;
  }

  const match = getRuntimeByUser(socket.data.userId);
  if (!match || match.state === 'FINISHED' || match.state === 'CANCELLED') return;

  const side = sideOf(match, socket.data.userId);
  if (!side) return;
  const player = side === 'player1' ? match.player1 : match.player2;
  player.connected = false;
  player.disconnectedAt = Date.now();
  player.socketId = null;
  // 전략 대전은 남은 플레이어가 계속 제출할 수 있어야 하므로 상태를 바꾸지 않는다.
  if (!hasStrategyGame(match.matchId)) {
    match.state = match.state === 'CHOOSING' ? 'DISCONNECTED' : match.state;
  }

  const abuseCount = recordDisconnectAbuse(socket.data.userId);
  if (abuseCount >= MATCH_POLICY.abuse.disconnectThreshold) {
    // 초기 정책: 차단하지 않고 신호만 기록 → 관리자 검토
    const window = Math.floor(Date.now() / MATCH_POLICY.abuse.windowMs);
    void recordFraudSignal({
      type: FraudSignalType.REPEATED_DISCONNECT,
      severity: FraudSeverity.WARN,
      userId: socket.data.userId,
      dedupeKey: `repeated_disconnect:${socket.data.userId}:${window}`,
      message: `반복 접속 종료 ${abuseCount}회 (최근 ${Math.round(MATCH_POLICY.abuse.windowMs / 60000)}분)`,
      context: { matchId: match.matchId, count: abuseCount },
    });
  }

  const grace = MATCH_POLICY.disconnectGraceMs;
  clearTimer(match.timers.disconnect?.get(player.userId));
  const timer = setTimeout(() => {
    void onDisconnectGraceExpired(io, match.matchId, player.userId);
  }, grace);
  match.timers.disconnect?.set(player.userId, timer);

  const opp = opponentOf(match, player.userId);
  if (opp.socketId) {
    io.to(opp.socketId).emit('OPPONENT_DISCONNECTED', {
      event: 'OPPONENT_DISCONNECTED',
      timestamp: Date.now(),
      payload: { matchId: match.matchId, graceMs: grace },
    });
  }
}

async function onDisconnectGraceExpired(
  io: SocketIOServer,
  matchId: string,
  userId: string
) {
  const match = runtimes.get(matchId);
  if (!match || match.state === 'FINISHED' || match.state === 'CANCELLED') return;
  const side = sideOf(match, userId);
  if (!side) return;
  const player = side === 'player1' ? match.player1 : match.player2;
  if (player.connected) return;

  // 전략 대전은 제출 마감 타이머가 부족한 선택을 서버 자동 입력으로 채운다.
  if (hasStrategyGame(matchId)) return;

  const policy =
    match.state === 'CHOOSING' || match.state === 'DISCONNECTED'
      ? MATCH_POLICY.disconnectBeforeChoicePolicy
      : MATCH_POLICY.disconnectPolicy;

  if (policy === 'forfeit') {
    const winnerId = opponentOf(match, userId).userId;
    await finishMatch(io, matchId, winnerId);
    return;
  }

  // auto_choice: 미선택이면 랜덤, 이후 정상 판정 흐름
  if (match.state === 'CHOOSING' || match.state === 'DISCONNECTED') {
    if (!player.choice) player.choice = randomRpsChoice(Date.now());
    match.state = 'CHOOSING';
    if (bothChosen(match) || Date.now() >= (match.currentRound?.endsAt ?? 0)) {
      await lockAndResolve(io, matchId);
    }
  }
}

async function handleReconnect(io: SocketIOServer, socket: AuthedSocket) {
  matchQueue.updateSocket(socket.data.userId, socket.id);

  const match = getRuntimeByUser(socket.data.userId);
  if (!match) {
    const dbActive = await findActiveMatchForUser(socket.data.userId);
    if (!dbActive) return;
    // 서버 재시작 등으로 런타임 유실 시 — 클라이언트에 안내
    socket.emit('MATCH_RESUME_UNAVAILABLE', {
      event: 'MATCH_RESUME_UNAVAILABLE',
      timestamp: Date.now(),
      payload: { matchId: dbActive.id, status: dbActive.status },
    });
    return;
  }

  const side = sideOf(match, socket.data.userId);
  if (!side) return;
  const player = side === 'player1' ? match.player1 : match.player2;
  player.connected = true;
  player.disconnectedAt = null;
  player.socketId = socket.id;
  clearTimer(match.timers.disconnect?.get(player.userId));
  match.timers.disconnect?.delete(player.userId);
  socket.join(`match:${match.matchId}`);

  if (match.state === 'DISCONNECTED') {
    if (hasStrategyGame(match.matchId)) {
      const strategy = getStrategyStateFor(match, player.userId);
      match.state = strategy && !strategy.locked ? 'CHOOSING' : 'REVEALING';
    } else {
      match.state = match.currentRound && !match.currentRound.revealed ? 'CHOOSING' : 'READY';
    }
  }

  socket.emit('MATCH_RESUMED', {
    event: 'MATCH_RESUMED',
    timestamp: Date.now(),
    payload: restorePayload(match, socket.data.userId),
  });

  const opp = opponentOf(match, player.userId);
  if (opp.socketId) {
    io.to(opp.socketId).emit('OPPONENT_RECONNECTED', {
      event: 'OPPONENT_RECONNECTED',
      timestamp: Date.now(),
      payload: { matchId: match.matchId },
    });
  }
}

export function registerMatchSocketHandlers(io: SocketIOServer, socket: AuthedSocket) {
  void handleReconnect(io, socket);

  socket.on('MATCH_QUEUE_JOIN', (payload) => {
    void joinQueue(io, socket, payload ?? {});
  });
  socket.on('MATCH_QUEUE_LEAVE', () => {
    void leaveQueue(io, socket);
  });
  socket.on('CHOICE_SUBMIT', (payload) => {
    submitChoice(io, socket, payload ?? {});
  });
  socket.on('STRATEGY_CHOICES_SUBMIT', (payload) => {
    const match = getRuntimeByUser(socket.data.userId);
    if (!match || !hasStrategyGame(match.matchId)) {
      socket.emit('error_event', {
        code: 'NOT_STRATEGY_MATCH',
        message: '진행 중인 전략 대전이 없습니다.',
      });
      return;
    }
    submitStrategyChoices(io, socket, match, strategyDeps(io), payload ?? {});
  });
  socket.on('MATCH_STATE_REQUEST', () => {
    const match = getRuntimeByUser(socket.data.userId);
    if (!match) {
      socket.emit('MATCH_STATE', {
        event: 'MATCH_STATE',
        timestamp: Date.now(),
        payload: { state: 'IDLE' },
      });
      return;
    }
    socket.emit('MATCH_STATE', {
      event: 'MATCH_STATE',
      timestamp: Date.now(),
      payload: restorePayload(match, socket.data.userId),
    });
  });

  socket.on('disconnect', () => {
    void handleDisconnect(io, socket);
  });
}

/** 주기적 매칭 폴링 — 대기 시간 확대 매칭 */
export function startMatchmakingLoop(io: SocketIOServer) {
  return setInterval(() => {
    for (const stake of MATCH_POLICY.stakes) {
      void pairIfPossible(io, stake);
    }
  }, MATCH_POLICY.matching.pollIntervalMs);
}

export function getMatchRoomsPublic() {
  return MATCH_POLICY.rooms.map((room) => ({
    ...room,
    activePlayers: matchQueue.size(room.entryFee as (typeof MATCH_POLICY.stakes)[number]),
    maxPlayers: 100,
    rewardPoints: rewardForStake(room.entryFee),
  }));
}

/**
 * 관리자 모니터링용 진행 중 매치 스냅샷.
 * 결과 공개 전에는 실제 선택값을 노출하지 않고 제출 여부만 준다.
 */
export function getLiveMatchesForAdmin() {
  const revealed = new Set<MatchRuntimeState>(['REVEALING', 'DRAW', 'FINISHED']);
  return [...runtimes.values()].map((match) => {
    const isRevealed = revealed.has(match.state) || Boolean(match.currentRound?.revealed);
    return {
      matchId: match.matchId,
      roomName: match.roomName,
      stake: match.stake,
      state: match.state,
      round: match.roundNumber,
      endsAt: match.currentRound?.endsAt ?? null,
      player1: {
        userId: match.player1.userId,
        nickname: match.player1.nickname,
        connected: match.player1.connected,
        choiceSubmitted: match.player1.choice !== null,
        choiceLocked: match.player1.choiceLocked,
        // 공개 전에는 절대 노출하지 않는다
        choice: isRevealed ? (match.currentRound?.player1Choice ?? null) : null,
        score: match.player1Score,
      },
      player2: {
        userId: match.player2.userId,
        nickname: match.player2.nickname,
        connected: match.player2.connected,
        choiceSubmitted: match.player2.choice !== null,
        choiceLocked: match.player2.choiceLocked,
        choice: isRevealed ? (match.currentRound?.player2Choice ?? null) : null,
        score: match.player2Score,
      },
      revealed: isRevealed,
      winnerId: match.winnerId,
      feesDeducted: match.feesDeducted,
      createdAt: match.createdAt,
      finishedAt: match.finishedAt,
    };
  });
}

export function getQueueSnapshotForAdmin() {
  return matchQueue.snapshot().map((group) => ({
    stake: group.stake,
    waiting: group.entries.length,
    players: group.entries.map((entry) => ({
      userId: entry.userId,
      nickname: entry.nickname,
      level: entry.level,
      waitingMs: Date.now() - entry.enqueuedAt,
    })),
  }));
}

export function getLiveMatchCount() {
  return runtimes.size;
}

export function getWaitingPlayerCount() {
  return matchQueue.totalWaiting();
}
