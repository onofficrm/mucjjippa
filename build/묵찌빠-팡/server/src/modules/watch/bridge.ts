/**
 * 매치/전략/토너먼트 런타임 → 관전 스트림 브리지.
 * 결과 공개 전에는 패를 null 로 유지한다.
 */
import type { RuntimeMatch } from '../match/types.js';
import {
  emitToWatchers,
  listLiveSnapshots,
  publishWatchState,
  removeSnapshot,
  toClientChoice,
  type PublicPlayer,
} from './spectator.js';

function playerPublic(p: {
  userId: string;
  nickname: string;
  avatar: string;
  title?: string;
}): PublicPlayer {
  return {
    id: p.userId,
    nickname: p.nickname,
    avatar: p.avatar,
    title: p.title,
  };
}

export function watchOnMatchReady(match: RuntimeMatch, mode: 'CASUAL' | 'STRATEGY' = 'CASUAL') {
  publishWatchState({
    matchId: match.matchId,
    kind: mode,
    isDemo: false,
    phase: 'WAITING',
    statusLabel: `${match.roomName} 관전`,
    roomName: match.roomName,
    stakePoints: match.entryPoint,
    round: match.roundNumber || 1,
    endsAt: null,
    player1: playerPublic(match.player1),
    player2: playerPublic(match.player2),
    player1Score: match.player1Score,
    player2Score: match.player2Score,
    player1Chosen: false,
    player2Chosen: false,
    player1Choice: null,
    player2Choice: null,
    roundOutcome: null,
    matchWinner: null,
    viewerCount: 0,
    reactions: { like: 0, flame: 0, thumb: 0 },
  });
}

export function watchOnRoundStarted(
  match: RuntimeMatch,
  endsAt: number,
  mode: 'CASUAL' | 'STRATEGY' = 'CASUAL'
) {
  publishWatchState({
    matchId: match.matchId,
    kind: mode,
    isDemo: false,
    phase: 'CHOOSING',
    statusLabel: `${match.roomName} · ${match.roundNumber}라운드 선택 중`,
    roomName: match.roomName,
    stakePoints: match.entryPoint,
    round: match.roundNumber,
    endsAt,
    player1: playerPublic(match.player1),
    player2: playerPublic(match.player2),
    player1Score: match.player1Score,
    player2Score: match.player2Score,
    player1Chosen: false,
    player2Chosen: false,
    player1Choice: null,
    player2Choice: null,
    roundOutcome: null,
    matchWinner: null,
    viewerCount: 0,
    reactions: { like: 0, flame: 0, thumb: 0 },
  });
  emitToWatchers(match.matchId, 'WATCH_COUNTDOWN', {
    matchId: match.matchId,
    endsAt,
    phase: 'CHOOSING',
  });
}

export function watchOnChoiceProgress(match: RuntimeMatch) {
  const p1 = Boolean(match.player1.choice);
  const p2 = Boolean(match.player2.choice);
  emitToWatchers(match.matchId, 'WATCH_CHOICE_STATUS', {
    matchId: match.matchId,
    player1Chosen: p1,
    player2Chosen: p2,
  });
  publishWatchState({
    matchId: match.matchId,
    kind: 'CASUAL',
    isDemo: false,
    phase: p1 && p2 ? 'LOCKED' : 'CHOOSING',
    statusLabel: `${match.roomName} · 선택 ${p1 && p2 ? '확정' : '중'}`,
    roomName: match.roomName,
    stakePoints: match.entryPoint,
    round: match.roundNumber,
    endsAt: match.currentRound?.endsAt ?? null,
    player1: playerPublic(match.player1),
    player2: playerPublic(match.player2),
    player1Score: match.player1Score,
    player2Score: match.player2Score,
    player1Chosen: p1,
    player2Chosen: p2,
    player1Choice: null,
    player2Choice: null,
    roundOutcome: null,
    matchWinner: null,
    viewerCount: 0,
    reactions: { like: 0, flame: 0, thumb: 0 },
  });
}

export function watchOnRoundReveal(
  match: RuntimeMatch,
  input: {
    p1Choice: string;
    p2Choice: string;
    winnerUserId: string | null;
    isDraw: boolean;
  }
) {
  const c1 = toClientChoice(input.p1Choice);
  const c2 = toClientChoice(input.p2Choice);
  let roundOutcome: 'p1' | 'p2' | 'draw' = 'draw';
  if (!input.isDraw && input.winnerUserId) {
    roundOutcome = input.winnerUserId === match.player1.userId ? 'p1' : 'p2';
  }

  publishWatchState({
    matchId: match.matchId,
    kind: 'CASUAL',
    isDemo: false,
    phase: 'ROUND_RESULT',
    statusLabel: `${match.roomName} · 결과 공개`,
    roomName: match.roomName,
    stakePoints: match.entryPoint,
    round: match.roundNumber,
    endsAt: null,
    player1: playerPublic(match.player1),
    player2: playerPublic(match.player2),
    player1Score: match.player1Score,
    player2Score: match.player2Score,
    player1Chosen: true,
    player2Chosen: true,
    player1Choice: c1,
    player2Choice: c2,
    roundOutcome,
    matchWinner: null,
    viewerCount: 0,
    reactions: { like: 0, flame: 0, thumb: 0 },
  });

  emitToWatchers(match.matchId, 'WATCH_REVEAL', {
    matchId: match.matchId,
    player1Choice: c1,
    player2Choice: c2,
    roundOutcome,
  });
  emitToWatchers(match.matchId, 'WATCH_ROUND_RESULT', {
    matchId: match.matchId,
    round: match.roundNumber,
    player1Score: match.player1Score,
    player2Score: match.player2Score,
    roundOutcome,
  });
}

export function watchOnMatchFinished(match: RuntimeMatch, winnerId: string) {
  const matchWinner = winnerId === match.player1.userId ? 'p1' : 'p2';
  publishWatchState({
    matchId: match.matchId,
    kind: 'CASUAL',
    isDemo: false,
    phase: 'FINISHED',
    statusLabel: `${match.roomName} · 경기 종료`,
    roomName: match.roomName,
    stakePoints: match.entryPoint,
    round: match.roundNumber,
    endsAt: null,
    player1: playerPublic(match.player1),
    player2: playerPublic(match.player2),
    player1Score: match.player1Score,
    player2Score: match.player2Score,
    player1Chosen: true,
    player2Chosen: true,
    player1Choice: null,
    player2Choice: null,
    roundOutcome: null,
    matchWinner,
    viewerCount: 0,
    reactions: { like: 0, flame: 0, thumb: 0 },
  });
  emitToWatchers(match.matchId, 'WATCH_MATCH_FINISHED', {
    matchId: match.matchId,
    matchWinner,
    player1Score: match.player1Score,
    player2Score: match.player2Score,
    isDemo: false,
    rewardPoints: match.rewardPoint,
  });
  // 다음 라이브 경기가 있으면 안내
  const next = listLiveSnapshots().find((s) => s.matchId !== match.matchId);
  if (next) {
    emitToWatchers(match.matchId, 'WATCH_NEXT_MATCH', {
      fromMatchId: match.matchId,
      nextMatchId: next.matchId,
    });
  }
  setTimeout(() => removeSnapshot(match.matchId), 60_000);
}

export function watchOnStrategyStarted(
  match: RuntimeMatch,
  setNumber: number,
  endsAt: number
) {
  publishWatchState({
    matchId: match.matchId,
    kind: 'STRATEGY',
    isDemo: false,
    phase: 'CHOOSING',
    statusLabel: `${match.roomName} · 전략 ${setNumber}세트 선택 중`,
    roomName: match.roomName,
    stakePoints: match.entryPoint,
    round: setNumber,
    endsAt,
    player1: playerPublic(match.player1),
    player2: playerPublic(match.player2),
    player1Score: 0,
    player2Score: 0,
    player1Chosen: false,
    player2Chosen: false,
    player1Choice: null,
    player2Choice: null,
    roundOutcome: null,
    matchWinner: null,
    viewerCount: 0,
    reactions: { like: 0, flame: 0, thumb: 0 },
  });
  emitToWatchers(match.matchId, 'WATCH_COUNTDOWN', {
    matchId: match.matchId,
    endsAt,
    phase: 'CHOOSING',
  });
}

export function watchOnStrategyLocked(match: RuntimeMatch, setNumber: number) {
  emitToWatchers(match.matchId, 'WATCH_CHOICE_STATUS', {
    matchId: match.matchId,
    player1Chosen: true,
    player2Chosen: true,
  });
  publishWatchState({
    matchId: match.matchId,
    kind: 'STRATEGY',
    isDemo: false,
    phase: 'LOCKED',
    statusLabel: `${match.roomName} · 전략 선택 확정`,
    roomName: match.roomName,
    stakePoints: match.entryPoint,
    round: setNumber,
    endsAt: null,
    player1: playerPublic(match.player1),
    player2: playerPublic(match.player2),
    player1Score: 0,
    player2Score: 0,
    player1Chosen: true,
    player2Chosen: true,
    player1Choice: null,
    player2Choice: null,
    roundOutcome: null,
    matchWinner: null,
    viewerCount: 0,
    reactions: { like: 0, flame: 0, thumb: 0 },
  });
}

export function watchOnStrategyReveal(
  match: RuntimeMatch,
  input: {
    setNumber: number;
    index: number;
    p1: string;
    p2: string;
    winner: 'player1' | 'player2' | 'draw';
    p1Wins: number;
    p2Wins: number;
  }
) {
  const c1 = toClientChoice(input.p1);
  const c2 = toClientChoice(input.p2);
  const roundOutcome =
    input.winner === 'draw' ? 'draw' : input.winner === 'player1' ? 'p1' : 'p2';
  publishWatchState({
    matchId: match.matchId,
    kind: 'STRATEGY',
    isDemo: false,
    phase: 'REVEALING',
    statusLabel: `${match.roomName} · ${input.index}번째 공개`,
    roomName: match.roomName,
    stakePoints: match.entryPoint,
    round: input.setNumber,
    endsAt: null,
    player1: playerPublic(match.player1),
    player2: playerPublic(match.player2),
    player1Score: input.p1Wins,
    player2Score: input.p2Wins,
    player1Chosen: true,
    player2Chosen: true,
    player1Choice: c1,
    player2Choice: c2,
    roundOutcome,
    matchWinner: null,
    viewerCount: 0,
    reactions: { like: 0, flame: 0, thumb: 0 },
  });
  emitToWatchers(match.matchId, 'WATCH_REVEAL', {
    matchId: match.matchId,
    index: input.index,
    player1Choice: c1,
    player2Choice: c2,
    roundOutcome,
  });
}

export function watchOnTournamentMatchReady(input: {
  matchId: string;
  tournamentId: string;
  roundLabel: string | null;
  player1: PublicPlayer;
  player2: PublicPlayer;
  player1Wins: number;
  player2Wins: number;
  endsAt: number;
}) {
  publishWatchState({
    matchId: input.matchId,
    kind: 'TOURNAMENT',
    isDemo: false,
    phase: 'CHOOSING',
    statusLabel: `토너먼트 · ${input.roundLabel ?? '본선'}`,
    roomName: input.roundLabel ?? '토너먼트',
    round: 1,
    endsAt: input.endsAt,
    player1: input.player1,
    player2: input.player2,
    player1Score: input.player1Wins,
    player2Score: input.player2Wins,
    player1Chosen: false,
    player2Chosen: false,
    player1Choice: null,
    player2Choice: null,
    roundOutcome: null,
    matchWinner: null,
    viewerCount: 0,
    reactions: { like: 0, flame: 0, thumb: 0 },
  });
  emitToWatchers(input.matchId, 'WATCH_COUNTDOWN', {
    matchId: input.matchId,
    endsAt: input.endsAt,
    phase: 'CHOOSING',
  });
}
