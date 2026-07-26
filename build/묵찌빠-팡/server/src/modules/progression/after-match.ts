/**
 * 경기/토너먼트 이후 진행 파이프라인:
 * 통계 반영 → 미션 진행 → 칭호 자동 해제
 */
import { MissionMetric, type Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { applyMissionProgress } from './missions.js';
import { unlockEligibleTitles } from './titles.js';
import { countChoicesFromRounds } from './stats.js';

export async function afterMatchSettled(input: {
  matchId: string;
  winnerId: string;
  loserId: string;
}) {
  const match = await prisma.match.findUnique({
    where: { id: input.matchId },
    include: { rounds: true },
  });
  if (!match) return;

  for (const userId of [input.winnerId, input.loserId]) {
    const counts = countChoicesFromRounds(
      match.rounds,
      userId,
      match.player1Id,
      match.player2Id
    );
    const isWinner = userId === input.winnerId;
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

    const nextLossStreak = isWinner ? 0 : user.currentLossStreak + 1;
    await prisma.user.update({
      where: { id: userId },
      data: {
        rockCount: { increment: counts.rock },
        paperCount: { increment: counts.paper },
        scissorsCount: { increment: counts.scissors },
        currentLossStreak: nextLossStreak,
        maxLossStreak: Math.max(user.maxLossStreak, nextLossStreak),
      },
    });

    const events: Array<{ metric: MissionMetric; amount?: number; absolute?: number }> = [
      { metric: MissionMetric.MATCH_PLAY, amount: 1 },
      { metric: MissionMetric.ROCK_USE, amount: counts.rock },
      { metric: MissionMetric.PAPER_USE, amount: counts.paper },
      { metric: MissionMetric.SCISSORS_USE, amount: counts.scissors },
    ];
    if (isWinner) {
      events.push({ metric: MissionMetric.MATCH_WIN, amount: 1 });
      const refreshed = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
      events.push({
        metric: MissionMetric.STREAK_REACH,
        absolute: refreshed.currentStreak,
      });
    }
    await applyMissionProgress(userId, events);
    await unlockEligibleTitles(userId);
  }
}

export async function afterTournamentJoined(userId: string) {
  await prisma.user.update({
    where: { id: userId },
    data: { tournamentParticipations: { increment: 1 } },
  });
  await applyMissionProgress(userId, [{ metric: MissionMetric.TOURNAMENT_JOIN, amount: 1 }]);
  await unlockEligibleTitles(userId);
}

export async function afterQualifierPass(userId: string) {
  await prisma.user.update({
    where: { id: userId },
    data: { tournamentQualifierPasses: { increment: 1 } },
  });
  await unlockEligibleTitles(userId);
}

export async function afterBracketEntry(userId: string) {
  await prisma.user.update({
    where: { id: userId },
    data: { tournamentBracketEntries: { increment: 1 } },
  });
  await unlockEligibleTitles(userId);
}

export async function afterTournamentRanked(userId: string, finalRank: number) {
  const data: Prisma.UserUpdateInput = {};
  if (finalRank === 1) data.tournamentWins = { increment: 1 };
  else if (finalRank === 2) data.tournamentSeconds = { increment: 1 };
  else if (finalRank === 3) data.tournamentThirds = { increment: 1 };
  else if (finalRank === 4) data.tournamentFourths = { increment: 1 };

  if (Object.keys(data).length) {
    await prisma.user.update({ where: { id: userId }, data });
  }
  if (finalRank === 1) {
    await applyMissionProgress(userId, [{ metric: MissionMetric.TOURNAMENT_WIN, amount: 1 }]);
  }
  await unlockEligibleTitles(userId);
}

export async function afterSpectate(userId: string) {
  await prisma.user.update({
    where: { id: userId },
    data: { spectateCount: { increment: 1 } },
  });
  await unlockEligibleTitles(userId);
}

export async function afterPurchase(userId: string) {
  await prisma.user.update({
    where: { id: userId },
    data: { purchaseCount: { increment: 1 } },
  });
  await unlockEligibleTitles(userId);
}
