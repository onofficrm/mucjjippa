import { createHash, randomBytes } from 'node:crypto';
import type { Server as SocketIOServer, Socket } from 'socket.io';
import { MATCH_POLICY } from './policy.js';
import { randomRpsChoice, toClientChoice, type RpsChoice } from './rps.js';
import {
  InvalidStrategyChoicesError,
  STRATEGY_RULES,
  determineThreeChoiceWinner,
  validateChoices,
  type StrategyOutcome,
} from './strategy.js';
import { finalizeMatch, markMatchPlaying, persistRound } from './service.js';
import type { RuntimeMatch, RuntimePlayer } from './types.js';
import {
  watchOnMatchFinished,
  watchOnStrategyLocked,
  watchOnStrategyReveal,
  watchOnStrategyStarted,
} from '../watch/bridge.js';

type AuthedSocket = Socket & { data: { userId: string } };

export interface StrategyDeps {
  emitToPlayers: (
    match: RuntimeMatch,
    event: string,
    payloadFor: (userId: string) => unknown
  ) => void;
  sideOf: (match: RuntimeMatch, userId: string) => 'player1' | 'player2' | null;
  opponentOf: (match: RuntimeMatch, userId: string) => RuntimePlayer;
  emitWallets: (match: RuntimeMatch, winnerId: string) => Promise<void>;
  onFinished: (match: RuntimeMatch, winnerId: string) => void;
}

interface StrategySet {
  setNumber: number;
  endsAt: number;
  locked: boolean;
  resolved: boolean;
  /** userId → 제출한 선택 배열. 서버 메모리에만 보관하고 상대에게 전송하지 않는다. */
  submissions: Map<string, RpsChoice[]>;
  /** userId → 제출 무결성 확인용 커밋 해시 (상대에게는 해시만 공개) */
  commits: Map<string, string>;
  autoFilled: Set<string>;
  timer?: NodeJS.Timeout;
  revealTimers: NodeJS.Timeout[];
}

interface StrategyGame {
  matchId: string;
  set: StrategySet;
  player1SetWins: number;
  player2SetWins: number;
  persistedRounds: number;
}

const games = new Map<string, StrategyGame>();

export function isStrategyStake(stake: number): boolean {
  return stake === MATCH_POLICY.strategy.stake;
}

function newSet(setNumber: number): StrategySet {
  return {
    setNumber,
    endsAt: Date.now() + MATCH_POLICY.strategy.submitTimeoutMs,
    locked: false,
    resolved: false,
    submissions: new Map(),
    commits: new Map(),
    autoFilled: new Set(),
    revealTimers: [],
  };
}

function commitHash(choices: RpsChoice[]): string {
  const salt = randomBytes(8).toString('hex');
  return createHash('sha256').update(`${salt}:${choices.join('|')}`).digest('hex').slice(0, 16);
}

function clearSetTimers(set: StrategySet) {
  if (set.timer) clearTimeout(set.timer);
  set.revealTimers.forEach((timer) => clearTimeout(timer));
  set.revealTimers = [];
}

function setWinsFor(game: StrategyGame, match: RuntimeMatch, userId: string) {
  const isPlayer1 = match.player1.userId === userId;
  return {
    playerScore: isPlayer1 ? game.player1SetWins : game.player2SetWins,
    opponentScore: isPlayer1 ? game.player2SetWins : game.player1SetWins,
  };
}

/** 전략 대전 시작 — 일반 대전 라운드 루프와 완전히 분리된 흐름. */
export function startStrategyMatch(
  io: SocketIOServer,
  match: RuntimeMatch,
  deps: StrategyDeps
) {
  const game: StrategyGame = {
    matchId: match.matchId,
    set: newSet(1),
    player1SetWins: 0,
    player2SetWins: 0,
    persistedRounds: 0,
  };
  games.set(match.matchId, game);
  void markMatchPlaying(match.matchId).catch(() => null);
  startSet(io, match, game, deps);
}

function startSet(
  io: SocketIOServer,
  match: RuntimeMatch,
  game: StrategyGame,
  deps: StrategyDeps
) {
  match.state = 'CHOOSING';
  match.roundNumber = game.set.setNumber;

  deps.emitToPlayers(match, 'STRATEGY_ROUND_STARTED', (userId) => ({
    matchId: match.matchId,
    mode: 'STRATEGY_300P',
    setNumber: game.set.setNumber,
    choiceCount: STRATEGY_RULES.choiceCount,
    endsAt: game.set.endsAt,
    timeoutMs: MATCH_POLICY.strategy.submitTimeoutMs,
    ...setWinsFor(game, match, userId),
  }));
  watchOnStrategyStarted(match, game.set.setNumber, game.set.endsAt);

  clearSetTimers(game.set);
  game.set.timer = setTimeout(() => {
    void lockAndReveal(io, match, game, deps);
  }, MATCH_POLICY.strategy.submitTimeoutMs);
}

export function submitStrategyChoices(
  io: SocketIOServer,
  socket: AuthedSocket,
  match: RuntimeMatch,
  deps: StrategyDeps,
  raw: { matchId?: string; choices?: unknown }
) {
  const game = games.get(match.matchId);
  if (!game) {
    socket.emit('error_event', { code: 'NOT_STRATEGY_MATCH', message: '전략 대전이 아닙니다.' });
    return;
  }
  if (raw.matchId && raw.matchId !== match.matchId) {
    socket.emit('error_event', { code: 'BAD_REQUEST', message: '매치 정보가 올바르지 않습니다.' });
    return;
  }
  if (!deps.sideOf(match, socket.data.userId)) {
    socket.emit('error_event', { code: 'FORBIDDEN', message: '이 매치의 참가자가 아닙니다.' });
    return;
  }
  if (game.set.locked || match.state !== 'CHOOSING') {
    socket.emit('error_event', { code: 'LOCKED', message: '선택이 이미 확정되었습니다.' });
    return;
  }
  if (Date.now() > game.set.endsAt) {
    socket.emit('error_event', { code: 'TIMEOUT', message: '선택 시간이 종료되었습니다.' });
    return;
  }

  let choices: RpsChoice[];
  try {
    choices = validateChoices(raw.choices);
  } catch (error) {
    socket.emit('error_event', {
      code: 'INVALID_CHOICES',
      message:
        error instanceof InvalidStrategyChoicesError
          ? error.message
          : '선택이 올바르지 않습니다.',
    });
    return;
  }

  // 제한 시간 안에서는 마지막 제출을 사용한다.
  game.set.submissions.set(socket.data.userId, choices);
  const hash = commitHash(choices);
  game.set.commits.set(socket.data.userId, hash);

  socket.emit('STRATEGY_CHOICES_SUBMITTED', {
    event: 'STRATEGY_CHOICES_SUBMITTED',
    timestamp: Date.now(),
    payload: {
      matchId: match.matchId,
      setNumber: game.set.setNumber,
      choices: choices.map(toClientChoice),
      commitHash: hash,
      accepted: true,
    },
  });

  const opponent = deps.opponentOf(match, socket.data.userId);
  if (opponent.socketId) {
    io.to(opponent.socketId).emit('STRATEGY_OPPONENT_SUBMITTED', {
      event: 'STRATEGY_OPPONENT_SUBMITTED',
      timestamp: Date.now(),
      payload: { matchId: match.matchId, setNumber: game.set.setNumber, commitHash: hash },
    });
  }

  if (game.set.submissions.size >= 2) {
    void lockAndReveal(io, match, game, deps);
  }
}

function ensureChoices(game: StrategyGame, userId: string): RpsChoice[] {
  const existing = game.set.submissions.get(userId) ?? [];
  if (existing.length === STRATEGY_RULES.choiceCount) return existing;

  // 부족한 선택은 서버가 자동 입력한다.
  const filled = [...existing];
  for (let index = filled.length; index < STRATEGY_RULES.choiceCount; index += 1) {
    filled.push(randomRpsChoice(Date.now() + index));
  }
  game.set.autoFilled.add(userId);
  game.set.submissions.set(userId, filled);
  return filled;
}

async function lockAndReveal(
  io: SocketIOServer,
  match: RuntimeMatch,
  game: StrategyGame,
  deps: StrategyDeps
) {
  if (game.set.locked) return;
  game.set.locked = true;
  clearSetTimers(game.set);
  match.state = 'LOCKED';

  const player1Choices = ensureChoices(game, match.player1.userId);
  const player2Choices = ensureChoices(game, match.player2.userId);

  deps.emitToPlayers(match, 'STRATEGY_CHOICES_LOCKED', (userId) => {
    const mine = game.set.submissions.get(userId) ?? [];
    const opponentId = deps.opponentOf(match, userId).userId;
    return {
      matchId: match.matchId,
      setNumber: game.set.setNumber,
      yourChoices: mine.map(toClientChoice),
      yourChoicesAutoFilled: game.set.autoFilled.has(userId),
      opponentCommitHash: game.set.commits.get(opponentId) ?? null,
      // 상대 선택은 공개 단계에서만 전달한다.
    };
  });
  watchOnStrategyLocked(match, game.set.setNumber);

  const outcome = determineThreeChoiceWinner(player1Choices, player2Choices);
  match.state = 'REVEALING';

  const baseRound = game.persistedRounds;
  for (const round of outcome.rounds) {
    const winnerId =
      round.winner === 'player1'
        ? match.player1.userId
        : round.winner === 'player2'
          ? match.player2.userId
          : null;
    await persistRound({
      matchId: match.matchId,
      roundNumber: baseRound + round.index,
      player1Choice: round.player1Choice,
      player2Choice: round.player2Choice,
      winnerId,
    });
  }
  game.persistedRounds = baseRound + outcome.rounds.length;

  deps.emitToPlayers(match, 'STRATEGY_REVEAL_STARTED', () => ({
    matchId: match.matchId,
    setNumber: game.set.setNumber,
    totalRounds: outcome.rounds.length,
    stepMs: MATCH_POLICY.strategy.revealStepMs,
  }));

  outcome.rounds.forEach((round, order) => {
    const timer = setTimeout(
      () => {
        deps.emitToPlayers(match, 'STRATEGY_ROUND_REVEALED', (userId) => {
          const isPlayer1 = match.player1.userId === userId;
          const myChoice = isPlayer1 ? round.player1Choice : round.player2Choice;
          const oppChoice = isPlayer1 ? round.player2Choice : round.player1Choice;
          let outcomeForUser: 'win' | 'loss' | 'draw' = 'draw';
          if (round.winner !== 'draw') {
            const iWon =
              (round.winner === 'player1' && isPlayer1) ||
              (round.winner === 'player2' && !isPlayer1);
            outcomeForUser = iWon ? 'win' : 'loss';
          }
          const revealed = outcome.rounds.slice(0, order + 1);
          const myWins = revealed.filter((item) =>
            isPlayer1 ? item.winner === 'player1' : item.winner === 'player2'
          ).length;
          const oppWins = revealed.filter((item) =>
            isPlayer1 ? item.winner === 'player2' : item.winner === 'player1'
          ).length;
          return {
            matchId: match.matchId,
            setNumber: game.set.setNumber,
            index: round.index,
            totalRounds: outcome.rounds.length,
            playerChoice: toClientChoice(myChoice),
            opponentChoice: toClientChoice(oppChoice),
            outcome: outcomeForUser,
            revealedPlayerWins: myWins,
            revealedOpponentWins: oppWins,
          };
        });
        watchOnStrategyReveal(match, {
          setNumber: game.set.setNumber,
          index: round.index,
          p1: round.player1Choice,
          p2: round.player2Choice,
          winner: round.winner,
          p1Wins: outcome.rounds
            .slice(0, order + 1)
            .filter((item) => item.winner === 'player1').length,
          p2Wins: outcome.rounds
            .slice(0, order + 1)
            .filter((item) => item.winner === 'player2').length,
        });
      },
      MATCH_POLICY.strategy.revealStartDelayMs + order * MATCH_POLICY.strategy.revealStepMs
    );
    game.set.revealTimers.push(timer);
  });

  const finishAt =
    MATCH_POLICY.strategy.revealStartDelayMs +
    outcome.rounds.length * MATCH_POLICY.strategy.revealStepMs;

  const finishTimer = setTimeout(() => {
    void resolveSet(io, match, game, deps, outcome);
  }, finishAt);
  game.set.revealTimers.push(finishTimer);
}

async function resolveSet(
  io: SocketIOServer,
  match: RuntimeMatch,
  game: StrategyGame,
  deps: StrategyDeps,
  outcome: StrategyOutcome
) {
  if (game.set.resolved) return;
  game.set.resolved = true;

  if (outcome.winner === 'player1') game.player1SetWins += 1;
  else if (outcome.winner === 'player2') game.player2SetWins += 1;

  if (outcome.winner === 'draw') {
    match.state = 'DRAW';
    deps.emitToPlayers(match, 'STRATEGY_MATCH_RESULT', (userId) => ({
      matchId: match.matchId,
      setNumber: game.set.setNumber,
      isDraw: true,
      winner: null,
      rewardPoints: 0,
      ...setWinsFor(game, match, userId),
      rounds: revealedRoundsFor(match, userId, outcome),
    }));

    const timer = setTimeout(() => {
      game.set = newSet(game.set.setNumber + 1);
      startSet(io, match, game, deps);
    }, MATCH_POLICY.strategy.rematchDelayMs);
    game.set.revealTimers.push(timer);
    return;
  }

  const winnerId =
    outcome.winner === 'player1' ? match.player1.userId : match.player2.userId;
  const loserId = outcome.winner === 'player1' ? match.player2.userId : match.player1.userId;

  const result = await finalizeMatch({
    matchId: match.matchId,
    winnerId,
    loserId,
    rewardPoint: match.rewardPoint,
  });

  match.state = 'FINISHED';
  match.winnerId = winnerId;
  match.finishedAt = Date.now();

  deps.emitToPlayers(match, 'STRATEGY_MATCH_RESULT', (userId) => ({
    matchId: match.matchId,
    setNumber: game.set.setNumber,
    isDraw: false,
    winner: winnerId === userId ? 'player' : 'opponent',
    rewardPoints: winnerId === userId ? match.rewardPoint : 0,
    duplicatedReward: result.duplicated,
    ...setWinsFor(game, match, userId),
    rounds: revealedRoundsFor(match, userId, outcome),
  }));

  deps.emitToPlayers(match, 'MATCH_FINISHED', (userId) => ({
    matchId: match.matchId,
    roomId: match.roomId,
    roomName: match.roomName,
    stakePoints: match.entryPoint,
    mode: 'STRATEGY_300P',
    winner: winnerId === userId ? 'player' : 'opponent',
    playerScore: setWinsFor(game, match, userId).playerScore,
    opponentScore: setWinsFor(game, match, userId).opponentScore,
    rewardPoints: winnerId === userId ? match.rewardPoint : 0,
    finishedAt: match.finishedAt,
  }));

  await deps.emitWallets(match, winnerId);
  watchOnMatchFinished(match, winnerId);
  deps.onFinished(match, winnerId);

  clearSetTimers(game.set);
  setTimeout(() => games.delete(match.matchId), 60_000);
}

function revealedRoundsFor(
  match: RuntimeMatch,
  userId: string,
  outcome: StrategyOutcome
) {
  const isPlayer1 = match.player1.userId === userId;
  return outcome.rounds.map((round) => ({
    index: round.index,
    playerChoice: toClientChoice(isPlayer1 ? round.player1Choice : round.player2Choice),
    opponentChoice: toClientChoice(isPlayer1 ? round.player2Choice : round.player1Choice),
    outcome:
      round.winner === 'draw'
        ? 'draw'
        : (round.winner === 'player1') === isPlayer1
          ? 'win'
          : 'loss',
  }));
}

export function getStrategyStateFor(match: RuntimeMatch, userId: string) {
  const game = games.get(match.matchId);
  if (!game) return null;
  return {
    mode: 'STRATEGY_300P' as const,
    setNumber: game.set.setNumber,
    choiceCount: STRATEGY_RULES.choiceCount,
    endsAt: game.set.endsAt,
    locked: game.set.locked,
    yourChoices: (game.set.submissions.get(userId) ?? []).map(toClientChoice),
    ...setWinsFor(game, match, userId),
  };
}

export function hasStrategyGame(matchId: string): boolean {
  return games.has(matchId);
}

export function dropStrategyGame(matchId: string) {
  const game = games.get(matchId);
  if (game) clearSetTimers(game.set);
  games.delete(matchId);
}
