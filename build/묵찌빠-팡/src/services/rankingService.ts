import { RankItem } from '../types';
import { mockRankings } from '../data/mockData';

export interface RankingService {
  getTopRankings: (period?: 'daily' | 'weekly' | 'all') => Promise<RankItem[]>;
}

class MockRankingService implements RankingService {
  public async getTopRankings(period: 'daily' | 'weekly' | 'all' = 'weekly'): Promise<RankItem[]> {
    await new Promise((res) => setTimeout(res, 100));
    return [...mockRankings];
  }
}

export const rankingService = new MockRankingService();
