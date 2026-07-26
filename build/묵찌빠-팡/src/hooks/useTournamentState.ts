import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';
import { Tournament } from '../types';
import { RegisterTournamentOutcome, tournamentService } from '../services/tournamentService';
import { tournamentStore } from '../stores/tournamentStore';

export type RegisterResult = RegisterTournamentOutcome;

export interface UseTournamentStateResult {
  registeredIds: string[];
  isRegistered: (tournamentId: string) => boolean;
  register: (tournament: Tournament) => Promise<RegisterResult>;
  cancel: (tournament: Tournament) => Promise<boolean>;
  refresh: () => Promise<void>;
}

/**
 * 토너먼트 참가 상태 훅.
 * 티켓 차감·환불은 tournamentService → walletService 경로만 사용한다.
 */
export function useTournamentState(): UseTournamentStateResult {
  const state = useSyncExternalStore(
    tournamentStore.subscribe,
    tournamentStore.getState,
    tournamentStore.getState
  );
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    const ids = await tournamentService.getRegisteredTournamentIds();
    if (mountedRef.current) tournamentStore.setRegisteredIds(ids);
  }, []);

  useEffect(() => {
    refresh().catch(() => {
      /* 캐시된 값으로 계속 동작 */
    });
  }, [refresh]);

  const isRegistered = useCallback(
    (tournamentId: string) => state.registeredIds.includes(tournamentId),
    [state.registeredIds]
  );

  const register = useCallback(
    async (tournament: Tournament): Promise<RegisterResult> => {
      const outcome = await tournamentService.registerTournament(tournament);
      if (outcome.status === 'registered' || outcome.status === 'already_registered') {
        await refresh();
      }
      return outcome;
    },
    [refresh]
  );

  const cancel = useCallback(
    async (tournament: Tournament) => {
      const ok = await tournamentService.cancelRegistration(tournament);
      if (ok) await refresh();
      return ok;
    },
    [refresh]
  );

  return {
    registeredIds: state.registeredIds,
    isRegistered,
    register,
    cancel,
    refresh,
  };
}
