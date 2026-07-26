import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  MatchChoice,
  MatchOutcome,
  StrategyChoicesLockedPayload,
  StrategyMatchResultPayload,
  StrategyRoundRevealedPayload,
  StrategyRoundStartedPayload,
} from '../types';
import { gameSocket } from '../api/socket';

export const STRATEGY_CHOICE_COUNT = 3;

/** 제출 마감 직전 남은 슬롯을 채워 보내는 여유 시간 */
const AUTO_SUBMIT_LEAD_MS = 900;

export type StrategyPhase =
  | 'IDLE'
  | 'SUBMITTING'
  | 'LOCKED'
  | 'REVEALING'
  | 'SET_RESULT'
  | 'FINISHED';

export interface StrategyReveal {
  index: number;
  playerChoice: MatchChoice;
  opponentChoice: MatchChoice;
  outcome: MatchOutcome;
}

export interface StrategyRoundState {
  matchId: string;
  setNumber: number;
  choiceCount: number;
  endsAt: number | null;
  phase: StrategyPhase;
  /** 서버가 받아준 내 선택 (순서 유지) */
  submittedChoices: MatchChoice[];
  autoFilled: boolean;
  opponentSubmitted: boolean;
  opponentCommitHash: string | null;
  reveals: StrategyReveal[];
  totalRounds: number;
  revealedPlayerWins: number;
  revealedOpponentWins: number;
  setWins: number;
  opponentSetWins: number;
  isDraw: boolean;
  matchWinner: 'player' | 'opponent' | null;
  rewardPoints: number;
}

export interface UseStrategyRoundOptions {
  onSetRevealed?: (payload: StrategyMatchResultPayload) => void;
  onMatchFinished?: (payload: StrategyMatchResultPayload) => void;
  onError?: (message: string) => void;
}

export interface UseStrategyRoundResult {
  strategy: StrategyRoundState | null;
  submitChoices: (choices: MatchChoice[]) => boolean;
  reset: () => void;
}

function initialState(payload: StrategyRoundStartedPayload): StrategyRoundState {
  return {
    matchId: payload.matchId,
    setNumber: payload.setNumber,
    choiceCount: payload.choiceCount,
    endsAt: payload.endsAt,
    phase: 'SUBMITTING',
    submittedChoices: [],
    autoFilled: false,
    opponentSubmitted: false,
    opponentCommitHash: null,
    reveals: [],
    totalRounds: payload.choiceCount,
    revealedPlayerWins: 0,
    revealedOpponentWins: 0,
    setWins: payload.playerScore,
    opponentSetWins: payload.opponentScore,
    isDraw: false,
    matchWinner: null,
    rewardPoints: 0,
  };
}

function randomChoice(): MatchChoice {
  const pool: MatchChoice[] = ['rock', 'paper', 'scissors'];
  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * 300P 3선택 전략 대전 훅.
 * 일반 대전(useGameRound) 상태와 완전히 분리된 STRATEGY_* 이벤트만 다룬다.
 */
export function useStrategyRound(
  options: UseStrategyRoundOptions = {}
): UseStrategyRoundResult {
  const [strategy, setStrategy] = useState<StrategyRoundState | null>(null);
  const callbacksRef = useRef(options);
  callbacksRef.current = options;

  const stateRef = useRef<StrategyRoundState | null>(null);
  stateRef.current = strategy;

  const pendingRef = useRef<MatchChoice[]>([]);
  const autoSubmitRef = useRef<number | null>(null);

  const clearAutoSubmit = useCallback(() => {
    if (autoSubmitRef.current !== null) {
      window.clearTimeout(autoSubmitRef.current);
      autoSubmitRef.current = null;
    }
  }, []);

  const emitChoices = useCallback((matchId: string, choices: MatchChoice[]) => {
    gameSocket.emit('STRATEGY_CHOICES_SUBMIT', { matchId, choices });
  }, []);

  const submitChoices = useCallback(
    (choices: MatchChoice[]) => {
      const current = stateRef.current;
      if (!current || current.phase !== 'SUBMITTING') return false;
      if (choices.length !== current.choiceCount) return false;
      pendingRef.current = choices;
      emitChoices(current.matchId, choices);
      return true;
    },
    [emitChoices]
  );

  const reset = useCallback(() => {
    clearAutoSubmit();
    pendingRef.current = [];
    setStrategy(null);
  }, [clearAutoSubmit]);

  useEffect(() => clearAutoSubmit, [clearAutoSubmit]);

  useEffect(() => {
    const offStarted = gameSocket.on('STRATEGY_ROUND_STARTED', (raw) => {
      const payload = raw as StrategyRoundStartedPayload;
      pendingRef.current = [];
      setStrategy(initialState(payload));

      // 시간이 끝나기 전에 비어 있는 슬롯을 채워 서버로 보낸다.
      clearAutoSubmit();
      const delay = Math.max(0, payload.endsAt - Date.now() - AUTO_SUBMIT_LEAD_MS);
      autoSubmitRef.current = window.setTimeout(() => {
        const current = stateRef.current;
        if (!current || current.phase !== 'SUBMITTING') return;
        const filled = Array.from({ length: current.choiceCount }, (_, index) =>
          pendingRef.current[index] ?? randomChoice()
        );
        emitChoices(current.matchId, filled);
      }, delay);
    });

    const offSubmitted = gameSocket.on('STRATEGY_CHOICES_SUBMITTED', (raw) => {
      const payload = raw as {
        matchId: string;
        setNumber: number;
        choices: MatchChoice[];
        accepted: boolean;
      };
      pendingRef.current = payload.choices;
      setStrategy((prev) =>
        prev && prev.matchId === payload.matchId
          ? { ...prev, submittedChoices: payload.choices }
          : prev
      );
    });

    const offOpponentSubmitted = gameSocket.on('STRATEGY_OPPONENT_SUBMITTED', (raw) => {
      const payload = raw as { matchId: string; commitHash: string };
      setStrategy((prev) =>
        prev && prev.matchId === payload.matchId
          ? { ...prev, opponentSubmitted: true, opponentCommitHash: payload.commitHash }
          : prev
      );
    });

    const offLocked = gameSocket.on('STRATEGY_CHOICES_LOCKED', (raw) => {
      const payload = raw as StrategyChoicesLockedPayload;
      clearAutoSubmit();
      pendingRef.current = payload.yourChoices;
      setStrategy((prev) =>
        prev && prev.matchId === payload.matchId
          ? {
              ...prev,
              phase: 'LOCKED',
              endsAt: null,
              submittedChoices: payload.yourChoices,
              autoFilled: payload.yourChoicesAutoFilled,
              opponentCommitHash: payload.opponentCommitHash,
              opponentSubmitted: true,
            }
          : prev
      );
    });

    const offRevealStarted = gameSocket.on('STRATEGY_REVEAL_STARTED', (raw) => {
      const payload = raw as { matchId: string; totalRounds: number };
      setStrategy((prev) =>
        prev && prev.matchId === payload.matchId
          ? { ...prev, phase: 'REVEALING', totalRounds: payload.totalRounds, reveals: [] }
          : prev
      );
    });

    const offRevealed = gameSocket.on('STRATEGY_ROUND_REVEALED', (raw) => {
      const payload = raw as StrategyRoundRevealedPayload;
      setStrategy((prev) => {
        if (!prev || prev.matchId !== payload.matchId) return prev;
        if (prev.reveals.some((item) => item.index === payload.index)) return prev;
        return {
          ...prev,
          phase: 'REVEALING',
          totalRounds: payload.totalRounds,
          revealedPlayerWins: payload.revealedPlayerWins,
          revealedOpponentWins: payload.revealedOpponentWins,
          reveals: [
            ...prev.reveals,
            {
              index: payload.index,
              playerChoice: payload.playerChoice,
              opponentChoice: payload.opponentChoice,
              outcome: payload.outcome,
            },
          ],
        };
      });
    });

    const offResult = gameSocket.on('STRATEGY_MATCH_RESULT', (raw) => {
      const payload = raw as StrategyMatchResultPayload;
      setStrategy((prev) => {
        if (!prev || prev.matchId !== payload.matchId) return prev;
        return {
          ...prev,
          phase: payload.isDraw ? 'SET_RESULT' : 'FINISHED',
          reveals: prev.reveals.length ? prev.reveals : payload.rounds,
          isDraw: payload.isDraw,
          matchWinner: payload.winner,
          rewardPoints: payload.rewardPoints,
          setWins: payload.playerScore,
          opponentSetWins: payload.opponentScore,
        };
      });

      callbacksRef.current.onSetRevealed?.(payload);
      if (!payload.isDraw) {
        callbacksRef.current.onMatchFinished?.(payload);
      }
    });

    const offError = gameSocket.on('error_event', (raw) => {
      const payload = raw as { code?: string; message?: string };
      if (!payload.code) return;
      if (
        payload.code === 'INVALID_CHOICES' ||
        payload.code === 'NOT_STRATEGY_MATCH' ||
        payload.code === 'LOCKED' ||
        payload.code === 'TIMEOUT'
      ) {
        callbacksRef.current.onError?.(payload.message ?? '선택을 처리할 수 없습니다.');
      }
    });

    return () => {
      offStarted();
      offSubmitted();
      offOpponentSubmitted();
      offLocked();
      offRevealStarted();
      offRevealed();
      offResult();
      offError();
    };
  }, [clearAutoSubmit, emitChoices]);

  return { strategy, submitChoices, reset };
}
