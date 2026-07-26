/**
 * 랭킹 집계.
 * - 최소 게임 수 / 동점 처리 / 페이지네이션 / 내 순위
 * - 비정상 사용자(정지·탈퇴·관리자) 제외
 */
import { Prisma, UserRole, UserStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { periodBounds, RANKING_POLICY, type RankingKind } from './policy.js';
import { computeWinRate, computeTournamentScore } from './calc.js';

export type { RankingKind };
export { computeWinRate, computeTournamentScore, sortRankable, assignRanks } from './calc.js';

export type RankingEntryDto = {
  rank: number;
  id: string;
  nickname: string;
  avatar: string;
  title: string;
  points: number;
  winRate: number;
  streak: number;
  wins: number;
  losses: number;
  draws: number;
  games: number;
  score: number;
  rewardText?: string;
};

type EligibleUser = {
  id: string;
  nickname: string;
  wins: number;
  losses: number;
  draws: number;
  currentStreak: number;
  maxStreak: number;
  tournamentWins: number;
  tournamentSeconds: number;
  tournamentThirds: number;
  tournamentFourths: number;
  tournamentParticipations: number;
  avatar: { imageUrl: string } | null;
  title: { name: string } | null;
  wallet: { pointBalance: number } | null;
  periodWins?: number;
  periodGames?: number;
};

function eligibleWhere(): Prisma.UserWhereInput {
  return {
    status: UserStatus.ACTIVE,
    deletedAt: null,
    ...(RANKING_POLICY.excludeAdmins
        ? { role: { notIn: [UserRole.ADMIN, UserRole.SUPER_ADMIN] } }
        : {}),
  };
}

function winRate(wins: number, losses: number, draws: number) {
  return computeWinRate(wins, losses, draws);
}

function toEntry(
  u: EligibleUser,
  rank: number,
  kind: RankingKind,
  score: number
): RankingEntryDto {
  const games = u.wins + u.losses + u.draws;
  const rewardFn = {
    weekly: RANKING_POLICY.rewards.weekly,
    monthly: RANKING_POLICY.rewards.monthly,
    'win-rate': RANKING_POLICY.rewards.winRate,
    streak: RANKING_POLICY.rewards.streak,
    tournament: RANKING_POLICY.rewards.tournament,
  }[kind];
  return {
    rank,
    id: u.id,
    nickname: u.nickname,
    avatar: u.avatar?.imageUrl ?? '✊',
    title: u.title?.name ?? '새싹 플레이어',
    points: u.wallet?.pointBalance ?? 0,
    winRate: winRate(u.wins, u.losses, u.draws),
    streak: u.currentStreak,
    wins: u.wins,
    losses: u.losses,
    draws: u.draws,
    games,
    score,
    rewardText: rewardFn(rank),
  };
}

async function loadBaseUsers() {
  return prisma.user.findMany({
    where: eligibleWhere(),
    select: {
      id: true,
      nickname: true,
      wins: true,
      losses: true,
      draws: true,
      currentStreak: true,
      maxStreak: true,
      tournamentWins: true,
      tournamentSeconds: true,
      tournamentThirds: true,
      tournamentFourths: true,
      tournamentParticipations: true,
      avatar: { select: { imageUrl: true } },
      title: { select: { name: true } },
      wallet: { select: { pointBalance: true } },
    },
  });
}

async function attachPeriodWins(users: EligibleUser[], kind: 'weekly' | 'monthly') {
  const { start, end } = periodBounds(kind);
  const rows = await prisma.match.groupBy({
    by: ['winnerId'],
    where: {
      status: 'COMPLETED',
      completedAt: { gte: start, lte: end },
      winnerId: { not: null },
    },
    _count: { _all: true },
  });
  const winMap = new Map(rows.map((r) => [r.winnerId!, r._count._all]));

  const played = await prisma.$queryRaw<Array<{ user_id: string; games: bigint }>>`
    SELECT user_id, COUNT(*)::bigint AS games FROM (
      SELECT "player1_id" AS user_id FROM matches
        WHERE status = 'COMPLETED' AND completed_at >= ${start} AND completed_at <= ${end}
          AND "player1_id" IS NOT NULL
      UNION ALL
      SELECT "player2_id" AS user_id FROM matches
        WHERE status = 'COMPLETED' AND completed_at >= ${start} AND completed_at <= ${end}
          AND "player2_id" IS NOT NULL
    ) t
    GROUP BY user_id
  `;
  const gameMap = new Map(played.map((r) => [r.user_id, Number(r.games)]));

  return users.map((u) => ({
    ...u,
    periodWins: winMap.get(u.id) ?? 0,
    periodGames: gameMap.get(u.id) ?? 0,
  }));
}

type Scored = { user: EligibleUser; score: number; tiebreak: number[] };

function sortScored(list: Scored[]) {
  return list.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    for (let i = 0; i < Math.max(a.tiebreak.length, b.tiebreak.length); i++) {
      const d = (b.tiebreak[i] ?? 0) - (a.tiebreak[i] ?? 0);
      if (d !== 0) return d;
    }
    return a.user.nickname.localeCompare(b.user.nickname, 'ko');
  });
}

async function buildLadder(kind: RankingKind): Promise<Scored[]> {
  let users = (await loadBaseUsers()) as EligibleUser[];

  if (kind === 'weekly' || kind === 'monthly') {
    users = await attachPeriodWins(users, kind);
    const min = RANKING_POLICY.minGames[kind];
    return sortScored(
      users
        .filter((u) => (u.periodGames ?? 0) >= min)
        .map((u) => ({
          user: u,
          score: u.periodWins ?? 0,
          tiebreak: [u.periodGames ?? 0, u.wins, winRate(u.wins, u.losses, u.draws)],
        }))
    );
  }

  if (kind === 'win-rate') {
    const min = RANKING_POLICY.minGames.winRate;
    return sortScored(
      users
        .filter((u) => u.wins + u.losses + u.draws >= min)
        .map((u) => ({
          user: u,
          score: winRate(u.wins, u.losses, u.draws),
          tiebreak: [u.wins, u.currentStreak],
        }))
    );
  }

  if (kind === 'streak') {
    const min = RANKING_POLICY.minGames.streak;
    return sortScored(
      users
        .filter((u) => u.wins + u.losses + u.draws >= min)
        .map((u) => ({
          user: u,
          score: Math.max(u.currentStreak, u.maxStreak),
          tiebreak: [u.currentStreak, u.wins],
        }))
    );
  }

  // tournament
  const min = RANKING_POLICY.minGames.tournament;
  return sortScored(
    users
      .filter((u) => u.tournamentParticipations >= min)
      .map((u) => ({
        user: u,
        score: computeTournamentScore({
          wins: u.tournamentWins,
          seconds: u.tournamentSeconds,
          thirds: u.tournamentThirds,
          fourths: u.tournamentFourths,
        }),
        tiebreak: [u.tournamentWins, u.tournamentParticipations],
      }))
  );
}

function paginate(list: Scored[], page: number, limit: number, kind: RankingKind) {
  const total = list.length;
  const start = (page - 1) * limit;
  const slice = list.slice(start, start + limit);
  const items = slice.map((row, i) => toEntry(row.user, start + i + 1, kind, row.score));
  return { items, total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) };
}

function findMyRank(list: Scored[], userId: string, kind: RankingKind) {
  const idx = list.findIndex((row) => row.user.id === userId);
  if (idx < 0) return null;
  return toEntry(list[idx].user, idx + 1, kind, list[idx].score);
}

export async function getRanking(kind: RankingKind, opts: { page?: number; limit?: number; userId?: string }) {
  const page = Math.max(1, opts.page ?? 1);
  const limit = Math.min(
    RANKING_POLICY.pagination.maxLimit,
    Math.max(1, opts.limit ?? RANKING_POLICY.pagination.defaultLimit)
  );
  const ladder = await buildLadder(kind);
  const pageData = paginate(ladder, page, limit, kind);
  const myRank = opts.userId ? findMyRank(ladder, opts.userId, kind) : null;
  return {
    kind,
    ...pageData,
    myRank,
    top: ladder[0] ? toEntry(ladder[0].user, 1, kind, ladder[0].score) : null,
  };
}

export async function getAroundMe(userId: string, opts?: { kind?: RankingKind }) {
  const kind = opts?.kind ?? 'weekly';
  const ladder = await buildLadder(kind);
  const idx = ladder.findIndex((row) => row.user.id === userId);
  const radius = RANKING_POLICY.aroundMeRadius;
  if (idx < 0) {
    return {
      kind,
      items: [] as RankingEntryDto[],
      myRank: null,
      message: '랭킹 조건을 충족하지 않아 주변에 표시할 순위가 없습니다.',
    };
  }
  const start = Math.max(0, idx - radius);
  const end = Math.min(ladder.length, idx + radius + 1);
  const items = ladder.slice(start, end).map((row, i) =>
    toEntry(row.user, start + i + 1, kind, row.score)
  );
  return {
    kind,
    items,
    myRank: toEntry(ladder[idx].user, idx + 1, kind, ladder[idx].score),
  };
}

export async function getTop1UserId(): Promise<string | null> {
  const ladder = await buildLadder('weekly');
  return ladder[0]?.user.id ?? null;
}
