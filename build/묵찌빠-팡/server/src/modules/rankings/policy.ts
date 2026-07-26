/** Stage 10 랭킹·진행 정책 */
export const RANKING_POLICY = {
  /** 비정상 사용자 제외 */
  excludedStatuses: ['SUSPENDED', 'BANNED', 'DELETED'] as const,
  excludeAdmins: true,
  pagination: { defaultLimit: 20, maxLimit: 50 },
  minGames: {
    weekly: 3,
    monthly: 5,
    winRate: 10,
    streak: 3,
    tournament: 1,
    aroundMe: 0,
  },
  aroundMeRadius: 2,
  rewards: {
    weekly: (rank: number) =>
      rank === 1 ? '500,000P + [무적의] 칭호' : rank <= 3 ? '100,000P' : '20,000P',
    monthly: (rank: number) =>
      rank === 1 ? '2,000,000P + 전설 프레임' : rank <= 10 ? '100,000P' : '30,000P',
    winRate: (rank: number) => (rank === 1 ? '300,000P' : '50,000P'),
    streak: (rank: number) =>
      rank === 1 ? '500,000P + [10연승] 칭호' : '50,000P',
    tournament: (rank: number) =>
      rank === 1 ? '1,000,000P + [토너먼트 챔피언]' : '50,000P',
  },
} as const;

export type RankingKind = 'weekly' | 'monthly' | 'win-rate' | 'streak' | 'tournament';

export function periodBounds(kind: 'weekly' | 'monthly', now = new Date()) {
  const end = now;
  const start = new Date(now);
  if (kind === 'weekly') start.setDate(start.getDate() - 7);
  else start.setMonth(start.getMonth() - 1);
  return { start, end };
}
