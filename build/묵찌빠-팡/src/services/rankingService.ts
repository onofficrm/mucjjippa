import { RankingEntry } from '../types';
import { apiClient } from '../api';

export type RankingKind = 'weekly' | 'monthly' | 'win-rate' | 'streak' | 'tournament';

export type RankingResponse = {
  kind: RankingKind;
  items: RankingEntry[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  myRank: RankingEntry | null;
  top: RankingEntry | null;
};

export type AroundMeResponse = {
  kind: RankingKind;
  items: RankingEntry[];
  myRank: RankingEntry | null;
  message?: string;
};

export interface RankingService {
  getRankings: (kind: RankingKind, page?: number, limit?: number) => Promise<RankingResponse>;
  getAroundMe: (kind?: RankingKind) => Promise<AroundMeResponse>;
  getTopRankings: (period?: string) => Promise<RankingEntry[]>;
}

class RankingServiceImpl implements RankingService {
  public async getRankings(kind: RankingKind, page = 1, limit = 20): Promise<RankingResponse> {
    return apiClient.get<RankingResponse>(`/rankings/${kind}`, {
      query: { page, limit },
    });
  }

  public async getAroundMe(kind: RankingKind = 'weekly'): Promise<AroundMeResponse> {
    return apiClient.get<AroundMeResponse>('/rankings/around-me', {
      query: { kind },
    });
  }

  /** 하위 호환 */
  public async getTopRankings(period: string = 'weekly'): Promise<RankingEntry[]> {
    const kind = (period === 'all' ? 'win-rate' : period) as RankingKind;
    const data = await this.getRankings(
      ['weekly', 'monthly', 'win-rate', 'streak', 'tournament'].includes(kind) ? kind : 'weekly'
    );
    return data.items;
  }
}

export const rankingService = new RankingServiceImpl();
