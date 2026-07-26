import { useCallback, useSyncExternalStore } from 'react';
import { WalletBalance, WalletTransaction } from '../types';
import { walletStore } from '../stores/walletStore';
import { walletService } from '../services/walletService';

export interface UseWalletResult extends WalletBalance {
  transactions: WalletTransaction[];
  refresh: () => Promise<void>;
  canAfford: (amount: number, currency?: 'points' | 'tickets') => boolean;
}

/**
 * 전역 wallet store 구독 훅.
 * 잔액은 서버 응답만 반영한다. 클라이언트에는 임의 debit/credit API를 노출하지 않는다.
 */
export function useWallet(): UseWalletResult {
  const state = useSyncExternalStore(
    walletStore.subscribe,
    walletStore.getState,
    walletStore.getState
  );

  const refresh = useCallback(async () => {
    await walletService.getBalance();
  }, []);

  const canAfford = useCallback(
    (amount: number, currency: 'points' | 'tickets' = 'points') =>
      (currency === 'points' ? state.points : state.tickets) >= amount,
    [state.points, state.tickets]
  );

  return {
    points: state.points,
    tickets: state.tickets,
    transactions: state.transactions,
    refresh,
    canAfford,
  };
}
