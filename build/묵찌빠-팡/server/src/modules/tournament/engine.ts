/**
 * 토너먼트 상태 머신 + 예선/본선/보상 엔진.
 */
import {
  Prisma,
  QualifierRoundStatus,
  RpsChoice,
  TournamentMatchStatus,
  TournamentParticipantStatus,
  TournamentStatus,
  AssetType,
  WalletTransactionReason,
  WalletTransactionType,
} from '@prisma/client';
import type { Server as SocketIOServer } from 'socket.io';
import { applyWalletMutation } from '../../lib/wallet.js';
import { prisma } from '../../lib/prisma.js';
import { randomRpsChoice } from '../match/rps.js';
import { buildBracketPlan } from './bracket.js';
import { determineMinorityPass } from './qualifier.js';
import {
  ensureDefaultRewards,
  refundAllParticipants,
  rewardKey,
  TOURNAMENT_POLICY,
} from './service.js';
import { watchOnTournamentMatchReady } from '../watch/bridge.js';
import {
  emitToWatchers,
  patchWatchState,
  toClientChoice,
} from '../watch/spectator.js';

type EmitFn = (tournamentId: string, event: string, payload: unknown) => void;

let emitFn: EmitFn = () => undefined;
let ioRef: SocketIOServer | null = null;

export function bindTournamentEmitter(io: SocketIOServer) {
  ioRef = io;
  emitFn = (tournamentId, event, payload) => {
    io.to(`tournament:${tournamentId}`).emit(event, {
      event,
      timestamp: Date.now(),
      payload,
    });
  };
}

function emit(tournamentId: string, event: string, payload: unknown) {
  emitFn(tournamentId, event, payload);
}

async function setStatus(
  tournamentId: string,
  from: TournamentStatus[],
  to: TournamentStatus,
  extra: Prisma.TournamentUpdateManyMutationInput = {}
) {
  const updated = await prisma.tournament.updateMany({
    where: { id: tournamentId, status: { in: from } },
    data: {
      status: to,
      version: { increment: 1 },
      ...extra,
    },
  });
  return updated.count === 1;
}

export async function transitionRegistrationToReady(tournamentId: string) {
  const ok = await setStatus(
    tournamentId,
    [TournamentStatus.REGISTRATION],
    TournamentStatus.READY,
    {
      nextTransitionAt: new Date(Date.now() + TOURNAMENT_POLICY.countdownMs),
      currentRoundLabel: '시작 대기',
    }
  );
  if (!ok) return;
  emit(tournamentId, 'TOURNAMENT_UPDATED', { tournamentId, status: 'READY' });
  emit(tournamentId, 'TOURNAMENT_COUNTDOWN', {
    tournamentId,
    endsAt: Date.now() + TOURNAMENT_POLICY.countdownMs,
  });
}

export async function startTournament(tournamentId: string) {
  const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });
  if (!tournament) return;

  const count = await prisma.tournamentParticipant.count({
    where: {
      tournamentId,
      status: { not: TournamentParticipantStatus.CANCELLED },
    },
  });

  if (count < tournament.minParticipants) {
    await postponeTournament(tournamentId);
    return;
  }

  await ensureDefaultRewards(prisma, tournamentId, tournament.totalPrize);

  const ok = await setStatus(
    tournamentId,
    [TournamentStatus.READY, TournamentStatus.REGISTRATION],
    TournamentStatus.QUALIFIER,
    {
      currentRoundLabel: '예선',
      nextTransitionAt: null,
    }
  );
  if (!ok) return;

  emit(tournamentId, 'TOURNAMENT_STARTED', { tournamentId, participants: count });
  emit(tournamentId, 'QUALIFIER_STARTED', { tournamentId });
  await startQualifierRound(tournamentId);
}

export async function postponeTournament(tournamentId: string) {
  const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });
  if (!tournament) return;

  const ok = await setStatus(
    tournamentId,
    [TournamentStatus.READY, TournamentStatus.REGISTRATION],
    TournamentStatus.POSTPONED,
    {
      currentRoundLabel: '인원 미달 연기',
      nextTransitionAt: null,
    }
  );
  if (!ok) return;

  const shouldRefund = tournament.refundOnPostpone ?? TOURNAMENT_POLICY.refundOnPostponeDefault;
  if (shouldRefund) {
    await refundAllParticipants(tournamentId, `${tournament.name} 인원 미달 자동 환불`);
  }

  emit(tournamentId, 'TOURNAMENT_UPDATED', {
    tournamentId,
    status: 'POSTPONED',
    refunded: shouldRefund,
  });
}

export async function startQualifierRound(tournamentId: string) {
  const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });
  if (!tournament || tournament.status !== TournamentStatus.QUALIFIER) return;

  const alive = await prisma.tournamentParticipant.findMany({
    where: {
      tournamentId,
      status: {
        in: [
          TournamentParticipantStatus.REGISTERED,
          TournamentParticipantStatus.CHECKED_IN,
          TournamentParticipantStatus.PLAYING,
        ],
      },
    },
  });

  if (alive.length <= tournament.bracketTarget) {
    await createBracketFromQualifier(tournamentId);
    return;
  }

  const last = await prisma.tournamentQualifierRound.findFirst({
    where: { tournamentId },
    orderBy: { roundNumber: 'desc' },
  });
  const roundNumber = (last?.roundNumber ?? 0) + 1;
  const endsAt = new Date(Date.now() + TOURNAMENT_POLICY.qualifierChoiceMs);

  const round = await prisma.tournamentQualifierRound.create({
    data: {
      tournamentId,
      roundNumber,
      status: QualifierRoundStatus.CHOOSING,
      endsAt,
      aliveBefore: alive.length,
      choices: {
        create: alive.map((p) => ({ userId: p.userId })),
      },
    },
  });

  await prisma.tournament.update({
    where: { id: tournamentId },
    data: {
      currentRoundLabel: `예선 ${roundNumber}라운드`,
      nextTransitionAt: endsAt,
      version: { increment: 1 },
    },
  });

  emit(tournamentId, 'QUALIFIER_STARTED', {
    tournamentId,
    roundId: round.id,
    roundNumber,
    endsAt: endsAt.getTime(),
    alive: alive.length,
    choiceCount: 1,
  });
}

export async function submitQualifierChoice(
  tournamentId: string,
  userId: string,
  choiceRaw: string
) {
  const normalized = choiceRaw.trim().toUpperCase();
  if (normalized !== 'ROCK' && normalized !== 'PAPER' && normalized !== 'SCISSORS') {
    throw new Error('INVALID_CHOICE');
  }
  const choice = normalized as RpsChoice;

  const round = await prisma.tournamentQualifierRound.findFirst({
    where: { tournamentId, status: QualifierRoundStatus.CHOOSING },
    orderBy: { roundNumber: 'desc' },
  });
  if (!round || !round.endsAt || Date.now() > round.endsAt.getTime()) {
    throw new Error('NOT_CHOOSING');
  }

  await prisma.tournamentQualifierChoice.updateMany({
    where: { roundId: round.id, userId },
    data: { choice, autoFilled: false, submittedAt: new Date() },
  });

  return { roundId: round.id, choice: choice.toLowerCase() };
}

export async function resolveQualifierRound(tournamentId: string) {
  const round = await prisma.tournamentQualifierRound.findFirst({
    where: { tournamentId, status: QualifierRoundStatus.CHOOSING },
    orderBy: { roundNumber: 'desc' },
    include: { choices: true },
  });
  if (!round) return;

  // 미선택 자동 입력
  for (const c of round.choices) {
    if (!c.choice) {
      const auto = randomRpsChoice(Date.now() + c.userId.length);
      await prisma.tournamentQualifierChoice.update({
        where: { id: c.id },
        data: { choice: auto, autoFilled: true, submittedAt: new Date() },
      });
      c.choice = auto;
    }
  }

  const result = determineMinorityPass(
    round.choices.map((c) => ({ userId: c.userId, choice: c.choice! }))
  );

  if (result.isTie || !result.minorityChoice) {
    await prisma.tournamentQualifierRound.update({
      where: { id: round.id },
      data: {
        status: QualifierRoundStatus.RESOLVED,
        resolvedAt: new Date(),
        aliveAfter: round.aliveBefore,
        minorityChoice: null,
      },
    });
    emit(tournamentId, 'QUALIFIER_RESULT', {
      tournamentId,
      roundNumber: round.roundNumber,
      isTie: true,
      tallies: result.tallies,
      message: '최소 그룹 동률 — 재라운드',
    });
    setTimeout(() => {
      void startQualifierRound(tournamentId);
    }, TOURNAMENT_POLICY.qualifierNextRoundMs);
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.tournamentQualifierRound.update({
      where: { id: round.id },
      data: {
        status: QualifierRoundStatus.RESOLVED,
        resolvedAt: new Date(),
        minorityChoice: result.minorityChoice,
        aliveAfter: result.survivors.length,
      },
    });

    if (result.eliminated.length) {
      await tx.tournamentParticipant.updateMany({
        where: { tournamentId, userId: { in: result.eliminated } },
        data: {
          status: TournamentParticipantStatus.ELIMINATED,
          eliminatedAt: new Date(),
        },
      });
    }
    await tx.tournamentParticipant.updateMany({
      where: { tournamentId, userId: { in: result.survivors } },
      data: { status: TournamentParticipantStatus.PLAYING },
    });
  });

  emit(tournamentId, 'QUALIFIER_RESULT', {
    tournamentId,
    roundNumber: round.roundNumber,
    isTie: false,
    minorityChoice: result.minorityChoice.toLowerCase(),
    tallies: result.tallies,
    survivors: result.survivors.length,
    eliminated: result.eliminated.length,
  });

  for (const userId of result.eliminated) {
    emit(tournamentId, 'PLAYER_ELIMINATED', {
      tournamentId,
      userId,
      phase: 'QUALIFIER',
    });
  }

  setTimeout(() => {
    void startQualifierRound(tournamentId);
  }, TOURNAMENT_POLICY.qualifierNextRoundMs);
}

export async function createBracketFromQualifier(tournamentId: string) {
  const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });
  if (!tournament) return;

  const alive = await prisma.tournamentParticipant.findMany({
    where: {
      tournamentId,
      status: {
        in: [
          TournamentParticipantStatus.REGISTERED,
          TournamentParticipantStatus.CHECKED_IN,
          TournamentParticipantStatus.PLAYING,
        ],
      },
    },
  });

  if (alive.length < 2) {
    await completeTournamentWithRanks(tournamentId);
    return;
  }

  // 시드 부여 (랜덤 순서)
  const shuffled = [...alive].sort(() => Math.random() - 0.5);
  for (let i = 0; i < shuffled.length; i += 1) {
    await prisma.tournamentParticipant.update({
      where: { id: shuffled[i].id },
      data: { seed: i + 1, status: TournamentParticipantStatus.PLAYING },
    });
  }

  const plans = buildBracketPlan(
    shuffled.map((p, i) => ({ userId: p.userId, seed: i + 1 }))
  );

  await prisma.tournamentMatch.deleteMany({ where: { tournamentId } });

  const idByKey = new Map<string, string>();
  for (const plan of plans) {
    const created = await prisma.tournamentMatch.create({
      data: {
        tournamentId,
        round: plan.round,
        bracketPosition: plan.bracketPosition,
        roundLabel: plan.roundLabel,
        player1Id: plan.player1Id,
        player2Id: plan.player2Id,
        winsRequired: plan.winsRequired,
        isThirdPlace: plan.isThirdPlace,
        status: plan.autoWinnerId
          ? TournamentMatchStatus.BYE
          : plan.player1Id && plan.player2Id
            ? TournamentMatchStatus.READY
            : TournamentMatchStatus.PENDING,
        winnerId: plan.autoWinnerId,
        completedAt: plan.autoWinnerId ? new Date() : null,
      },
    });
    idByKey.set(plan.key, created.id);
  }

  for (const plan of plans) {
    if (!plan.nextKey) continue;
    const id = idByKey.get(plan.key);
    const nextId = idByKey.get(plan.nextKey);
    if (id && nextId) {
      await prisma.tournamentMatch.update({
        where: { id },
        data: { nextMatchId: nextId },
      });
    }
  }

  // BYE 승자 진출
  for (const plan of plans) {
    if (!plan.autoWinnerId || !plan.nextKey) continue;
    const nextId = idByKey.get(plan.nextKey);
    if (!nextId) continue;
    await advanceWinnerToMatch(nextId, plan.autoWinnerId);
  }

  const firstLabel = plans[0]?.roundLabel ?? '본선';
  const status =
    firstLabel === '준결승'
      ? TournamentStatus.SEMIFINAL
      : firstLabel === '결승'
        ? TournamentStatus.FINAL
        : TournamentStatus.BRACKET;

  await setStatus(tournamentId, [TournamentStatus.QUALIFIER], status, {
    currentRoundLabel: firstLabel,
    nextTransitionAt: new Date(Date.now() + TOURNAMENT_POLICY.matchGapMs),
  });

  emit(tournamentId, 'BRACKET_CREATED', {
    tournamentId,
    matchCount: plans.length,
    players: shuffled.length,
  });
  emit(tournamentId, 'BRACKET_UPDATED', { tournamentId });

  const { afterBracketEntry, afterQualifierPass } = await import('../progression/after-match.js');
  for (const p of shuffled) {
    void afterQualifierPass(p.userId).catch(() => undefined);
    void afterBracketEntry(p.userId).catch(() => undefined);
  }

  setTimeout(() => {
    void openReadyBracketMatches(tournamentId);
  }, TOURNAMENT_POLICY.matchGapMs);
}

async function advanceWinnerToMatch(matchId: string, winnerId: string) {
  const match = await prisma.tournamentMatch.findUnique({ where: { id: matchId } });
  if (!match) return;
  if (!match.player1Id) {
    await prisma.tournamentMatch.update({
      where: { id: matchId },
      data: {
        player1Id: winnerId,
        status:
          match.player2Id || match.isThirdPlace
            ? TournamentMatchStatus.READY
            : TournamentMatchStatus.PENDING,
      },
    });
  } else if (!match.player2Id && match.player1Id !== winnerId) {
    await prisma.tournamentMatch.update({
      where: { id: matchId },
      data: { player2Id: winnerId, status: TournamentMatchStatus.READY },
    });
  }
}

/** 본선 경기 인메모리 진행 상태 */
interface LiveBracketGame {
  tournamentMatchId: string;
  tournamentId: string;
  endsAt: number;
  player1Choice: RpsChoice | null;
  player2Choice: RpsChoice | null;
  timer?: NodeJS.Timeout;
}

const liveGames = new Map<string, LiveBracketGame>();

export async function openReadyBracketMatches(tournamentId: string) {
  const ready = await prisma.tournamentMatch.findMany({
    where: {
      tournamentId,
      status: TournamentMatchStatus.READY,
      player1Id: { not: null },
      player2Id: { not: null },
    },
  });

  for (const match of ready) {
    await startBracketGame(match.id);
  }

  // 모든 READY가 없고 PENDING만 남았으면 대기
  if (ready.length === 0) {
    const pending = await prisma.tournamentMatch.count({
      where: { tournamentId, status: { in: [TournamentMatchStatus.PENDING, TournamentMatchStatus.PLAYING, TournamentMatchStatus.READY] } },
    });
    if (pending === 0) {
      await finalizeBracketIfDone(tournamentId);
    }
  }
}

async function startBracketGame(tournamentMatchId: string) {
  const match = await prisma.tournamentMatch.findUnique({ where: { id: tournamentMatchId } });
  if (!match || match.status === TournamentMatchStatus.COMPLETED || match.status === TournamentMatchStatus.BYE) {
    return;
  }
  if (!match.player1Id || !match.player2Id) return;
  if (liveGames.has(tournamentMatchId)) return;

  await prisma.tournamentMatch.update({
    where: { id: tournamentMatchId },
    data: { status: TournamentMatchStatus.PLAYING, startedAt: new Date() },
  });

  const timeout =
    match.winsRequired >= 2
      ? TOURNAMENT_POLICY.finalsChoiceMs
      : TOURNAMENT_POLICY.bracketChoiceMs;
  const endsAt = Date.now() + timeout;

  const game: LiveBracketGame = {
    tournamentMatchId,
    tournamentId: match.tournamentId,
    endsAt,
    player1Choice: null,
    player2Choice: null,
  };
  liveGames.set(tournamentMatchId, game);

  const users = await prisma.user.findMany({
    where: { id: { in: [match.player1Id, match.player2Id] } },
    select: {
      id: true,
      nickname: true,
      avatar: { select: { imageUrl: true } },
      title: { select: { name: true } },
    },
  });
  const u1 = users.find((u) => u.id === match.player1Id)!;
  const u2 = users.find((u) => u.id === match.player2Id)!;

  watchOnTournamentMatchReady({
    matchId: match.id,
    tournamentId: match.tournamentId,
    roundLabel: match.roundLabel,
    player1: {
      id: u1.id,
      nickname: u1.nickname,
      avatar: u1.avatar?.imageUrl ?? '✊',
      title: u1.title?.name,
    },
    player2: {
      id: u2.id,
      nickname: u2.nickname,
      avatar: u2.avatar?.imageUrl ?? '✊',
      title: u2.title?.name,
    },
    player1Wins: match.player1Wins,
    player2Wins: match.player2Wins,
    endsAt,
  });

  emit(match.tournamentId, 'TOURNAMENT_MATCH_READY', {
    tournamentId: match.tournamentId,
    matchId: match.id,
    roundLabel: match.roundLabel,
    player1Id: match.player1Id,
    player2Id: match.player2Id,
    winsRequired: match.winsRequired,
    player1Wins: match.player1Wins,
    player2Wins: match.player2Wins,
    endsAt,
  });

  if (match.roundLabel === '결승') {
    emit(match.tournamentId, 'FINAL_STARTED', { tournamentId: match.tournamentId, matchId: match.id });
  }

  game.timer = setTimeout(() => {
    void resolveBracketGame(tournamentMatchId);
  }, timeout);
}

export async function submitBracketChoice(
  tournamentMatchId: string,
  userId: string,
  choiceRaw: string
) {
  const game = liveGames.get(tournamentMatchId);
  if (!game) throw new Error('NOT_PLAYING');
  if (Date.now() > game.endsAt) throw new Error('TIMEOUT');

  const match = await prisma.tournamentMatch.findUnique({ where: { id: tournamentMatchId } });
  if (!match) throw new Error('NOT_FOUND');

  const normalized = choiceRaw.trim().toUpperCase();
  if (normalized !== 'ROCK' && normalized !== 'PAPER' && normalized !== 'SCISSORS') {
    throw new Error('INVALID_CHOICE');
  }
  const choice = normalized as RpsChoice;

  if (match.player1Id === userId) game.player1Choice = choice;
  else if (match.player2Id === userId) game.player2Choice = choice;
  else throw new Error('FORBIDDEN');

  patchWatchState(tournamentMatchId, {
    phase: 'CHOOSING',
    player1Chosen: !!game.player1Choice,
    player2Chosen: !!game.player2Choice,
    player1Choice: null,
    player2Choice: null,
  });

  if (game.player1Choice && game.player2Choice) {
    if (game.timer) clearTimeout(game.timer);
    await resolveBracketGame(tournamentMatchId);
  }

  return { accepted: true, choice: choice.toLowerCase() };
}

async function resolveBracketGame(tournamentMatchId: string) {
  const game = liveGames.get(tournamentMatchId);
  if (!game) return;
  liveGames.delete(tournamentMatchId);
  if (game.timer) clearTimeout(game.timer);

  const match = await prisma.tournamentMatch.findUnique({ where: { id: tournamentMatchId } });
  if (!match || match.status === TournamentMatchStatus.COMPLETED) return;
  if (!match.player1Id || !match.player2Id) return;

  const p1 = game.player1Choice ?? randomRpsChoice(Date.now() + 1);
  const p2 = game.player2Choice ?? randomRpsChoice(Date.now() + 2);

  const { determineRpsWinner } = await import('../match/rps.js');
  const winnerSide = determineRpsWinner(p1, p2);

  patchWatchState(tournamentMatchId, {
    phase: 'ROUND_RESULT',
    player1Chosen: true,
    player2Chosen: true,
    player1Choice: toClientChoice(p1),
    player2Choice: toClientChoice(p2),
    roundOutcome:
      winnerSide === 'draw' ? 'draw' : winnerSide === 'player1' ? 'p1' : 'p2',
    player1Score: match.player1Wins + (winnerSide === 'player1' ? 1 : 0),
    player2Score: match.player2Wins + (winnerSide === 'player2' ? 1 : 0),
  });
  emitToWatchers(tournamentMatchId, 'WATCH_ROUND_RESULT', {
    matchId: tournamentMatchId,
    player1Choice: toClientChoice(p1),
    player2Choice: toClientChoice(p2),
    outcome: winnerSide,
  });

  let player1Wins = match.player1Wins;
  let player2Wins = match.player2Wins;
  if (winnerSide === 'player1') player1Wins += 1;
  else if (winnerSide === 'player2') player2Wins += 1;

  const needed = match.winsRequired;
  const decided =
    winnerSide !== 'draw' && (player1Wins >= needed || player2Wins >= needed);

  if (!decided) {
    await prisma.tournamentMatch.update({
      where: { id: match.id },
      data: { player1Wins, player2Wins, status: TournamentMatchStatus.READY },
    });
    emit(match.tournamentId, 'BRACKET_UPDATED', {
      tournamentId: match.tournamentId,
      matchId: match.id,
      player1Wins,
      player2Wins,
      last: {
        player1Choice: p1.toLowerCase(),
        player2Choice: p2.toLowerCase(),
        outcome: winnerSide,
      },
    });
    setTimeout(() => {
      void startBracketGame(match.id);
    }, TOURNAMENT_POLICY.matchGapMs);
    return;
  }

  const winnerId = player1Wins >= needed ? match.player1Id : match.player2Id;
  const loserId = winnerId === match.player1Id ? match.player2Id : match.player1Id;

  // 완료 경기 재처리 금지
  const updated = await prisma.tournamentMatch.updateMany({
    where: {
      id: match.id,
      status: { in: [TournamentMatchStatus.PLAYING, TournamentMatchStatus.READY] },
    },
    data: {
      player1Wins,
      player2Wins,
      winnerId,
      status: TournamentMatchStatus.COMPLETED,
      completedAt: new Date(),
    },
  });
  if (updated.count !== 1) return;

  await prisma.tournamentParticipant.updateMany({
    where: { tournamentId: match.tournamentId, userId: loserId! },
    data: {
      status: TournamentParticipantStatus.ELIMINATED,
      eliminatedAt: new Date(),
    },
  });

  if (match.nextMatchId) {
    await advanceWinnerToMatch(match.nextMatchId, winnerId!);
  }

  // 준결승 패자 → 3·4위전
  if (match.roundLabel === '준결승') {
    const third = await prisma.tournamentMatch.findFirst({
      where: { tournamentId: match.tournamentId, isThirdPlace: true },
    });
    if (third) await advanceWinnerToMatch(third.id, loserId!);
  }

  emit(match.tournamentId, 'BRACKET_UPDATED', {
    tournamentId: match.tournamentId,
    matchId: match.id,
    winnerId,
    player1Wins,
    player2Wins,
  });
  emit(match.tournamentId, 'PLAYER_ELIMINATED', {
    tournamentId: match.tournamentId,
    userId: loserId,
    phase: 'BRACKET',
  });

  // 상태 라벨 갱신
  if (match.roundLabel === '준결승') {
    await prisma.tournament.updateMany({
      where: { id: match.tournamentId, status: TournamentStatus.BRACKET },
      data: { status: TournamentStatus.SEMIFINAL, currentRoundLabel: '준결승' },
    });
  }
  if (match.roundLabel === '결승') {
    await prisma.tournament.updateMany({
      where: {
        id: match.tournamentId,
        status: { in: [TournamentStatus.BRACKET, TournamentStatus.SEMIFINAL] },
      },
      data: { status: TournamentStatus.FINAL, currentRoundLabel: '결승' },
    });
  }

  setTimeout(() => {
    void openReadyBracketMatches(match.tournamentId);
  }, TOURNAMENT_POLICY.matchGapMs);
}

async function finalizeBracketIfDone(tournamentId: string) {
  const unfinished = await prisma.tournamentMatch.count({
    where: {
      tournamentId,
      status: {
        in: [
          TournamentMatchStatus.PENDING,
          TournamentMatchStatus.READY,
          TournamentMatchStatus.PLAYING,
        ],
      },
    },
  });
  if (unfinished > 0) return;
  await completeTournamentWithRanks(tournamentId);
}

async function completeTournamentWithRanks(tournamentId: string) {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: { rewards: true },
  });
  if (!tournament) return;
  if (tournament.status === TournamentStatus.COMPLETED) return;

  const final = await prisma.tournamentMatch.findFirst({
    where: {
      tournamentId,
      roundLabel: '결승',
      status: TournamentMatchStatus.COMPLETED,
    },
  });
  const third = await prisma.tournamentMatch.findFirst({
    where: {
      tournamentId,
      isThirdPlace: true,
      status: TournamentMatchStatus.COMPLETED,
    },
  });

  const ranks = new Map<string, number>();
  if (final?.winnerId) {
    ranks.set(final.winnerId, 1);
    const runner =
      final.player1Id === final.winnerId ? final.player2Id : final.player1Id;
    if (runner) ranks.set(runner, 2);
  }
  if (third?.winnerId) {
    ranks.set(third.winnerId, 3);
    const fourth =
      third.player1Id === third.winnerId ? third.player2Id : third.player1Id;
    if (fourth) ranks.set(fourth, 4);
  }

  // 나머지 탈락자: seed 기반 대략 순위
  const eliminated = await prisma.tournamentParticipant.findMany({
    where: {
      tournamentId,
      status: TournamentParticipantStatus.ELIMINATED,
      finalRank: null,
    },
    orderBy: { eliminatedAt: 'desc' },
  });
  let nextRank = 5;
  for (const p of eliminated) {
    if (ranks.has(p.userId)) continue;
    ranks.set(p.userId, nextRank);
    nextRank += 1;
  }

  await prisma.$transaction(async (tx) => {
    for (const [userId, rank] of ranks) {
      await tx.tournamentParticipant.updateMany({
        where: { tournamentId, userId },
        data: {
          finalRank: rank,
          status:
            rank === 1
              ? TournamentParticipantStatus.WINNER
              : TournamentParticipantStatus.ELIMINATED,
        },
      });

      const reward = tournament.rewards.find(
        (r) => rank >= r.rankFrom && rank <= r.rankTo
      );
      if (!reward || reward.pointReward <= 0) continue;

      await applyWalletMutation(tx, {
        userId,
        transactionKey: rewardKey(tournamentId, userId, rank),
        assetType: AssetType.POINT,
        transactionType: WalletTransactionType.CREDIT,
        reason: WalletTransactionReason.TOURNAMENT_REWARD,
        amount: reward.pointReward,
        referenceType: 'Tournament',
        referenceId: tournamentId,
        description: `${tournament.name} ${rank}위 보상`,
        metadata: { rank },
      });
    }

    await tx.tournament.update({
      where: { id: tournamentId },
      data: {
        status: TournamentStatus.COMPLETED,
        completedAt: new Date(),
        currentRoundLabel: '종료',
        nextTransitionAt: null,
        version: { increment: 1 },
      },
    });
  });

  emit(tournamentId, 'TOURNAMENT_COMPLETED', {
    tournamentId,
    winnerId: final?.winnerId ?? null,
  });
  emit(tournamentId, 'TOURNAMENT_UPDATED', {
    tournamentId,
    status: 'COMPLETED',
  });

  const { afterTournamentRanked } = await import('../progression/after-match.js');
  for (const [userId, rank] of ranks) {
    void afterTournamentRanked(userId, rank).catch(() => undefined);
  }
}

/** 스케줄러가 호출 — nextTransitionAt 이 지난 토너먼트 처리 */
export async function processDueTournaments() {
  const now = new Date();
  const due = await prisma.tournament.findMany({
    where: {
      nextTransitionAt: { lte: now },
      status: {
        in: [
          TournamentStatus.REGISTRATION,
          TournamentStatus.READY,
          TournamentStatus.QUALIFIER,
        ],
      },
    },
    take: 20,
  });

  for (const t of due) {
    try {
      if (t.status === TournamentStatus.REGISTRATION) {
        await transitionRegistrationToReady(t.id);
      } else if (t.status === TournamentStatus.READY) {
        await startTournament(t.id);
      } else if (t.status === TournamentStatus.QUALIFIER) {
        await resolveQualifierRound(t.id);
      }
    } catch (error) {
      console.error('[tournament] processDue failed', t.id, error);
    }
  }

  // 등록 마감이 지났는데 REGISTRATION 인 경우 READY 로
  const closed = await prisma.tournament.findMany({
    where: {
      status: TournamentStatus.REGISTRATION,
      registrationEndsAt: { lte: now },
      nextTransitionAt: null,
    },
    take: 10,
  });
  for (const t of closed) {
    await prisma.tournament.update({
      where: { id: t.id },
      data: {
        nextTransitionAt: new Date(Math.min(Date.now() + 1000, t.startsAt.getTime())),
      },
    });
  }
}

/** 서버 재시작 복구 — DB 의 nextTransitionAt / 진행 중 예선·본선 재개 */
export async function recoverTournaments() {
  const choosing = await prisma.tournamentQualifierRound.findMany({
    where: { status: QualifierRoundStatus.CHOOSING },
  });
  for (const round of choosing) {
    const endsAt = round.endsAt?.getTime() ?? Date.now();
    const delay = Math.max(0, endsAt - Date.now());
    setTimeout(() => {
      void resolveQualifierRound(round.tournamentId);
    }, delay);
  }

  const playing = await prisma.tournamentMatch.findMany({
    where: {
      status: {
        in: [TournamentMatchStatus.PLAYING, TournamentMatchStatus.READY],
      },
    },
  });
  for (const match of playing) {
    if (match.status === TournamentMatchStatus.PLAYING) {
      // 강제 리셋 후 재시작
      await prisma.tournamentMatch.update({
        where: { id: match.id },
        data: { status: TournamentMatchStatus.READY },
      });
    }
    setTimeout(() => {
      void startBracketGame(match.id);
    }, 500);
  }

  void processDueTournaments();
}

export function getIo() {
  return ioRef;
}

// ─────────────────────────────────────────────
// 관리자 전용 조작 (Stage 11)
// ─────────────────────────────────────────────

/** 모집 시작 — DRAFT → REGISTRATION */
export async function adminOpenRegistration(tournamentId: string) {
  const ok = await setStatus(
    tournamentId,
    [TournamentStatus.DRAFT, TournamentStatus.POSTPONED],
    TournamentStatus.REGISTRATION,
    { currentRoundLabel: '모집 중' }
  );
  if (ok) emit(tournamentId, 'TOURNAMENT_UPDATED', { tournamentId, status: 'REGISTRATION' });
  return ok;
}

/** 모집 종료 — REGISTRATION → READY */
export async function adminCloseRegistration(tournamentId: string) {
  await transitionRegistrationToReady(tournamentId);
  const t = await prisma.tournament.findUnique({ where: { id: tournamentId } });
  return t?.status === TournamentStatus.READY;
}

/** 관리자 연기 (인원과 무관) */
export async function adminPostpone(tournamentId: string, reason: string) {
  const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });
  if (!tournament) return false;
  const ok = await setStatus(
    tournamentId,
    [TournamentStatus.DRAFT, TournamentStatus.REGISTRATION, TournamentStatus.READY],
    TournamentStatus.POSTPONED,
    { currentRoundLabel: '운영 연기', nextTransitionAt: null }
  );
  if (!ok) return false;
  if (tournament.refundOnPostpone) {
    await refundAllParticipants(tournamentId, `${tournament.name} 연기 환불 — ${reason}`);
  }
  emit(tournamentId, 'TOURNAMENT_UPDATED', {
    tournamentId,
    status: 'POSTPONED',
    refunded: tournament.refundOnPostpone,
  });
  return true;
}

/** 관리자 취소 — 참가비 전액 환불 (SUPER_ADMIN) */
export async function adminCancel(tournamentId: string, reason: string) {
  const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });
  if (!tournament) return false;
  if (tournament.status === TournamentStatus.COMPLETED) return false;

  for (const game of liveGames.values()) {
    if (game.tournamentId === tournamentId && game.timer) clearTimeout(game.timer);
  }
  for (const [key, game] of [...liveGames.entries()]) {
    if (game.tournamentId === tournamentId) liveGames.delete(key);
  }

  const ok = await setStatus(
    tournamentId,
    [
      TournamentStatus.DRAFT,
      TournamentStatus.REGISTRATION,
      TournamentStatus.READY,
      TournamentStatus.QUALIFIER,
      TournamentStatus.BRACKET,
      TournamentStatus.SEMIFINAL,
      TournamentStatus.FINAL,
      TournamentStatus.POSTPONED,
    ],
    TournamentStatus.CANCELLED,
    { currentRoundLabel: '운영 취소', nextTransitionAt: null, completedAt: new Date() }
  );
  if (!ok) return false;

  await refundAllParticipants(tournamentId, `${tournament.name} 취소 환불 — ${reason}`);
  emit(tournamentId, 'TOURNAMENT_UPDATED', { tournamentId, status: 'CANCELLED', refunded: true });
  return true;
}

/** 강제 종료 — 현재 대진 기준으로 순위 확정·보상 지급 (SUPER_ADMIN) */
export async function adminForceComplete(tournamentId: string) {
  for (const [key, game] of [...liveGames.entries()]) {
    if (game.tournamentId !== tournamentId) continue;
    if (game.timer) clearTimeout(game.timer);
    liveGames.delete(key);
  }
  await prisma.tournamentMatch.updateMany({
    where: {
      tournamentId,
      status: {
        in: [
          TournamentMatchStatus.PENDING,
          TournamentMatchStatus.READY,
          TournamentMatchStatus.PLAYING,
        ],
      },
    },
    data: { status: TournamentMatchStatus.CANCELLED, completedAt: new Date() },
  });
  await completeTournamentWithRanks(tournamentId);
  const t = await prisma.tournament.findUnique({ where: { id: tournamentId } });
  return t?.status === TournamentStatus.COMPLETED;
}

/** 관리자 시작 (예선 즉시 개시) */
export async function adminStart(tournamentId: string) {
  await startTournament(tournamentId);
  const t = await prisma.tournament.findUnique({ where: { id: tournamentId } });
  return t?.status === TournamentStatus.QUALIFIER;
}

/** 진행 중 본선 경기 스냅샷 — 결과 전 선택값은 노출하지 않는다 */
export function getLiveBracketGamesForAdmin(tournamentId?: string) {
  return [...liveGames.values()]
    .filter((game) => !tournamentId || game.tournamentId === tournamentId)
    .map((game) => ({
      tournamentMatchId: game.tournamentMatchId,
      tournamentId: game.tournamentId,
      endsAt: game.endsAt,
      player1Submitted: game.player1Choice !== null,
      player2Submitted: game.player2Choice !== null,
    }));
}

export function getLiveBracketGameCount() {
  return liveGames.size;
}
