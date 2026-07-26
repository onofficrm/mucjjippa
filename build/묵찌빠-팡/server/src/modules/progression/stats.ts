/**
 * 사용자 통계 집계 응답.
 */
import { prisma } from '../../lib/prisma.js';
import { periodBounds } from '../rankings/policy.js';
import { notFound } from '../../lib/errors.js';

function winRate(wins: number, losses: number, draws: number) {
  const total = wins + losses + draws;
  if (total <= 0) return 0;
  return Number(((wins / total) * 100).toFixed(1));
}

function bestTournamentRank(u: {
  tournamentWins: number;
  tournamentSeconds: number;
  tournamentThirds: number;
  tournamentFourths: number;
}) {
  if (u.tournamentWins > 0) return '우승 (1위)';
  if (u.tournamentSeconds > 0) return '준우승 (2위)';
  if (u.tournamentThirds > 0) return '3위';
  if (u.tournamentFourths > 0) return '4위';
  return '기록 없음';
}

export async function getUserStats(userId: string) {
  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    include: {
      avatar: true,
      title: true,
      wallet: true,
    },
  });
  if (!user) throw notFound('사용자를 찾을 수 없습니다');

  const { start: weekStart } = periodBounds('weekly');
  const { start: monthStart } = periodBounds('monthly');

  const [weeklyGames, monthlyGames, recentMatches] = await Promise.all([
    prisma.match.count({
      where: {
        status: 'COMPLETED',
        completedAt: { gte: weekStart },
        OR: [{ player1Id: userId }, { player2Id: userId }],
      },
    }),
    prisma.match.count({
      where: {
        status: 'COMPLETED',
        completedAt: { gte: monthStart },
        OR: [{ player1Id: userId }, { player2Id: userId }],
      },
    }),
    prisma.match.findMany({
      where: {
        status: 'COMPLETED',
        OR: [{ player1Id: userId }, { player2Id: userId }],
      },
      orderBy: { completedAt: 'desc' },
      take: 10,
      select: { winnerId: true, player1Id: true, player2Id: true },
    }),
  ]);

  const recent10Results = recentMatches.map((m) => {
    if (!m.winnerId) return 'D' as const;
    return m.winnerId === userId ? ('W' as const) : ('L' as const);
  });

  const totalGames = user.wins + user.losses + user.draws;

  return {
    id: user.id,
    nickname: user.nickname,
    avatar: user.avatar?.imageUrl ?? '✊',
    title: user.title?.name ?? '새싹 플레이어',
    level: user.level,
    experience: user.experience,
    points: user.wallet?.pointBalance ?? 0,
    tickets: user.wallet?.ticketBalance ?? 0,
    totalGames,
    wins: user.wins,
    losses: user.losses,
    draws: user.draws,
    winRate: winRate(user.wins, user.losses, user.draws),
    currentStreak: user.currentStreak,
    maxStreak: user.maxStreak,
    currentLossStreak: user.currentLossStreak,
    maxLossStreak: user.maxLossStreak,
    rockCount: user.rockCount,
    paperCount: user.paperCount,
    scissorsCount: user.scissorsCount,
    weeklyGames,
    monthlyGames,
    tournamentParticipations: user.tournamentParticipations,
    tournamentQualifierPasses: user.tournamentQualifierPasses,
    tournamentBracketEntries: user.tournamentBracketEntries,
    tournamentWins: user.tournamentWins,
    tournamentSeconds: user.tournamentSeconds,
    tournamentThirds: user.tournamentThirds,
    tournamentFourths: user.tournamentFourths,
    tournamentBestRank: bestTournamentRank(user),
    recent10Results,
  };
}

/** 매치 라운드 선택 집계 */
export function countChoicesFromRounds(
  rounds: Array<{ player1Choice: string | null; player2Choice: string | null }>,
  userId: string,
  player1Id: string | null,
  player2Id: string | null
) {
  let rock = 0;
  let paper = 0;
  let scissors = 0;
  for (const r of rounds) {
    const choice =
      userId === player1Id ? r.player1Choice : userId === player2Id ? r.player2Choice : null;
    if (choice === 'ROCK') rock += 1;
    else if (choice === 'PAPER') paper += 1;
    else if (choice === 'SCISSORS') scissors += 1;
  }
  return { rock, paper, scissors };
}
