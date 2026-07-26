import { AdOffer, Mission, WalletMutationResult } from '../types';
import { apiClient } from '../api';
import { mockRewards } from '../mocks';
import { walletService } from './walletService';
import { walletStore } from '../stores/walletStore';

export type CheckInDay = (typeof mockRewards.dailyCheckIn)[number];

export interface AdClaimResult {
  rewardPoints: number;
  rewardTickets: number;
  duplicated?: boolean;
}

export interface RewardService {
  getAdOffers: () => Promise<AdOffer[]>;
  getCheckInDays: () => Promise<CheckInDay[]>;
  getMissions: () => Promise<Mission[]>;
  claimAdReward: (offer: AdOffer) => Promise<AdClaimResult>;
  topUpPoints: (amount: number, title: string) => Promise<WalletMutationResult>;
}

/**
 * 보상 서비스. 지급 금액은 서비스가 결정하고 walletService로만 반영한다.
 */
class RewardServiceImpl implements RewardService {
  public async getAdOffers(): Promise<AdOffer[]> {
    return apiClient.get<AdOffer[]>('/rewards/ads');
  }

  public async getCheckInDays(): Promise<CheckInDay[]> {
    return apiClient.get<CheckInDay[]>('/rewards/check-in');
  }

  public async getMissions(): Promise<Mission[]> {
    return apiClient.get<Mission[]>('/missions');
  }

  public async claimMission(missionId: string) {
    const { missionService } = await import('./missionService');
    return missionService.claim(missionId);
  }

  public async claimAdReward(offer: AdOffer): Promise<AdClaimResult> {
    void offer;
    const claim = await this.claimDevReward('mission_video');
    return claim;
  }

  public async topUpPoints(amount: number, title: string): Promise<WalletMutationResult> {
    void amount;
    const offerId =
      title.includes('앱 체험')
        ? 'mission_app'
        : title.includes('설문')
          ? 'mission_survey'
          : title.includes('출석')
            ? 'mission_attendance'
            : title.includes('일일')
              ? 'mission_daily'
              : title.includes('친구')
                ? 'mission_invite'
                : 'mission_video';
    const result = await this.claimDevReward(offerId);
    return {
      success: true,
      balance: walletStore.getBalance(),
      transaction: null,
      duplicated: result.duplicated,
    };
  }

  private async claimDevReward(offerId: string): Promise<AdClaimResult & { duplicated: boolean }> {
    const result = await apiClient.post<{
      rewardPoints: number;
      rewardTickets: number;
      duplicated: boolean;
      wallet: { points: number; tickets: number };
    }>('/dev/rewards/claim', { offerId });
    walletStore.applyServerState(result.wallet);
    await walletService.getTransactions();
    return result;
  }
}

export const rewardService = new RewardServiceImpl();
