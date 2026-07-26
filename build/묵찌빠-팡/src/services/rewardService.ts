import { AdOffer } from '../types';
import { mockRewards } from '../data/mockData';

export interface RewardService {
  getAdOffers: () => Promise<AdOffer[]>;
  watchAdAndClaim: (adId: string) => Promise<{ rewardPoints: number; rewardTickets: number }>;
  getCheckInDays: () => Promise<typeof mockRewards.dailyCheckIn>;
}

class MockRewardService implements RewardService {
  public async getAdOffers(): Promise<AdOffer[]> {
    await new Promise((res) => setTimeout(res, 100));
    return [...mockRewards.adOffers];
  }

  public async watchAdAndClaim(adId: string): Promise<{ rewardPoints: number; rewardTickets: number }> {
    await new Promise((res) => setTimeout(res, 500));
    const offer = mockRewards.adOffers.find((a) => a.id === adId);
    if (offer) {
      return { rewardPoints: offer.rewardPoints, rewardTickets: offer.rewardTickets };
    }
    return { rewardPoints: 1000, rewardTickets: 0 };
  }

  public async getCheckInDays() {
    await new Promise((res) => setTimeout(res, 80));
    return [...mockRewards.dailyCheckIn];
  }
}

export const rewardService = new MockRewardService();
