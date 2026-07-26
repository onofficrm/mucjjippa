export type RankingPeriod = 'daily' | 'weekly' | 'all';

export interface RankingEntry {
  rank: number;
  id: string;
  nickname: string;
  avatar: string;
  title: string;
  points: number;
  winRate: number;
  streak: number;
  wins: number;
  losses?: number;
  rewardText?: string;
}

/** 기존 이름 유지 */
export type RankItem = RankingEntry;
