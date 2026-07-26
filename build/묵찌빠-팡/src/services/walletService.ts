import { PointHistoryLog } from '../types';
import { mockPointHistory } from '../data/mockData';

export interface WalletService {
  getBalance: () => Promise<{ points: number; tickets: number }>;
  getPointHistory: () => Promise<PointHistoryLog[]>;
  topUpPoints: (amount: number, reason: string) => Promise<{ points: number }>;
  spendPoints: (amount: number, reason: string) => Promise<{ points: number }>;
  exchangeTickets: (ticketCount: number, costPoints: number) => Promise<{ points: number; tickets: number }>;
}

class MockWalletService implements WalletService {
  private points: number = 100000;
  private tickets: number = 13;
  private history: PointHistoryLog[] = [...mockPointHistory];

  public async getBalance(): Promise<{ points: number; tickets: number }> {
    await new Promise((res) => setTimeout(res, 80));
    return { points: this.points, tickets: this.tickets };
  }

  public async getPointHistory(): Promise<PointHistoryLog[]> {
    await new Promise((res) => setTimeout(res, 120));
    return [...this.history];
  }

  public async topUpPoints(amount: number, reason: string): Promise<{ points: number }> {
    await new Promise((res) => setTimeout(res, 150));
    this.points += amount;
    this.history.unshift({
      id: `log_${Date.now()}`,
      title: reason,
      amount: amount,
      type: 'earn',
      date: new Date().toLocaleString(),
      category: 'charge',
      balance: this.points,
    });
    return { points: this.points };
  }

  public async spendPoints(amount: number, reason: string): Promise<{ points: number }> {
    await new Promise((res) => setTimeout(res, 150));
    if (this.points < amount) {
      throw new Error('포인트가 부족합니다.');
    }
    this.points -= amount;
    this.history.unshift({
      id: `log_${Date.now()}`,
      title: reason,
      amount: -amount,
      type: 'spend',
      date: new Date().toLocaleString(),
      category: 'shop',
      balance: this.points,
    });
    return { points: this.points };
  }

  public async exchangeTickets(
    ticketCount: number,
    costPoints: number
  ): Promise<{ points: number; tickets: number }> {
    await new Promise((res) => setTimeout(res, 150));
    if (this.points < costPoints) {
      throw new Error('포인트가 부족합니다.');
    }
    this.points -= costPoints;
    this.tickets += ticketCount;
    this.history.unshift({
      id: `log_${Date.now()}`,
      title: `토너먼트 티켓 ${ticketCount}장 교환`,
      amount: -costPoints,
      type: 'spend',
      date: new Date().toLocaleString(),
      category: 'shop',
      balance: this.points,
    });
    return { points: this.points, tickets: this.tickets };
  }
}

export const walletService = new MockWalletService();
