import { Mission } from '../types';
import { apiClient } from '../api';
import { walletStore } from '../stores/walletStore';
import { walletService } from './walletService';

export type UserStatsDto = {
  totalGames: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  currentStreak: number;
  maxStreak: number;
  currentLossStreak: number;
  maxLossStreak: number;
  rockCount: number;
  paperCount: number;
  scissorsCount: number;
  weeklyGames: number;
  monthlyGames: number;
  tournamentParticipations: number;
  tournamentQualifierPasses: number;
  tournamentBracketEntries: number;
  tournamentWins: number;
  tournamentSeconds: number;
  tournamentThirds: number;
  tournamentFourths: number;
  tournamentBestRank: string;
  recent10Results: Array<'W' | 'L' | 'D'>;
};

export interface MissionService {
  list: () => Promise<Mission[]>;
  claim: (missionId: string) => Promise<{
    duplicated: boolean;
    rewards: { points: number; tickets: number };
    wallet?: { points: number; tickets: number };
  }>;
  getMyStats: () => Promise<UserStatsDto>;
}

class MissionServiceImpl implements MissionService {
  public async list(): Promise<Mission[]> {
    return apiClient.get<Mission[]>('/missions');
  }

  public async claim(missionId: string) {
    const data = await apiClient.post<{
      duplicated: boolean;
      rewards: { points: number; tickets: number };
      wallet?: { points: number; tickets: number };
    }>(`/missions/${missionId}/claim`, {});
    if (data.wallet) {
      walletStore.applyServerState(data.wallet);
      await walletService.getTransactions().catch(() => null);
    }
    return data;
  }

  public async getMyStats(): Promise<UserStatsDto> {
    return apiClient.get<UserStatsDto>('/users/me/stats');
  }
}

export const missionService = new MissionServiceImpl();
