import { prisma } from '../../lib/prisma.js';
import { WATCH_POLICY } from './policy.js';
import { getSnapshot, listLiveSnapshots, type WatchPublicState } from './spectator.js';

function toClientCard(state: WatchPublicState) {
  return {
    matchId: state.matchId,
    id: state.matchId,
    player1: state.player1.nickname,
    player2: state.player2.nickname,
    p1Avatar: state.player1.avatar,
    p2Avatar: state.player2.avatar,
    p1Choice: state.player1Choice,
    p2Choice: state.player2Choice,
    p1Score: state.player1Score,
    p2Score: state.player2Score,
    status: state.statusLabel,
    viewerCount: state.viewerCount,
    isDemo: state.isDemo,
    kind: state.kind,
    phase: state.phase,
    roomName: state.roomName,
    stakePoints: state.stakePoints,
    round: state.round,
    endsAt: state.endsAt,
    player1Chosen: state.player1Chosen,
    player2Chosen: state.player2Chosen,
    reactions: state.reactions,
  };
}

/** GET /api/watch/live — 진행 중 경기 + (없을 때) 데모 */
export function getLiveWatchList() {
  const live = listLiveSnapshots().map(toClientCard);
  const demo = getSnapshot(WATCH_POLICY.demoMatchId);
  if (live.length === 0 && demo) {
    return { items: [toClientCard(demo)], featured: toClientCard(demo), hasReal: false };
  }
  const featured = live[0] ?? (demo ? toClientCard(demo) : null);
  return {
    items: live.length ? live : demo ? [toClientCard(demo)] : [],
    featured,
    hasReal: live.length > 0,
  };
}

export function getWatchMatch(matchId: string) {
  const snap = getSnapshot(matchId);
  if (snap) return toClientCard(snap);
  return null;
}

export async function getWatchTournament(tournamentId: string) {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: {
      id: true,
      name: true,
      status: true,
      currentRoundLabel: true,
      bracketMatches: {
        where: { status: { in: ['READY', 'PLAYING'] } },
        take: 20,
        include: {
          player1: {
            select: { id: true, nickname: true, avatar: { select: { imageUrl: true } } },
          },
          player2: {
            select: { id: true, nickname: true, avatar: { select: { imageUrl: true } } },
          },
        },
        orderBy: [{ round: 'asc' }, { bracketPosition: 'asc' }],
      },
    },
  });
  if (!tournament) return null;

  const liveFromMemory = listLiveSnapshots().filter((s) => s.kind === 'TOURNAMENT');

  return {
    tournamentId: tournament.id,
    title: tournament.name,
    status: tournament.status,
    currentRound: tournament.currentRoundLabel,
    liveMatches: liveFromMemory.map(toClientCard),
    bracketLive: tournament.bracketMatches.map((m) => ({
      matchId: m.id,
      roundLabel: m.roundLabel,
      player1: m.player1?.nickname ?? '대기',
      player2: m.player2?.nickname ?? '대기',
      p1Avatar: m.player1?.avatar?.imageUrl ?? '❓',
      p2Avatar: m.player2?.avatar?.imageUrl ?? '❓',
      p1Score: m.player1Wins,
      p2Score: m.player2Wins,
      status: m.status,
      isDemo: false,
    })),
  };
}

/** 호환: featured / queue */
export function getFeaturedWatch() {
  return getLiveWatchList().featured;
}

export function getWatchQueue() {
  return getLiveWatchList().items;
}
