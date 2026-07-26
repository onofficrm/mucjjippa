import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActiveMatchState,
  Match,
  MatchChoice,
  RPSChoice,
  RoundResultPayload,
} from '../types';
import { useMockTransport } from '../api/config';
import { matchService } from '../services/matchService';
import { gameSocket } from '../api/socket';

export const GAME_ROUND_TIMINGS = {
  showdownMs: 1200,
  finishDelayMs: 1800,
  nextRoundMs: 2000,
} as const;

export interface UseGameRoundOptions {
  onChoiceSubmitted?: (choice: MatchChoice) => void;
  onRoundRevealed?: (payload: RoundResultPayload) => void;
  onMatchFinished?: (payload: RoundResultPayload) => void;
  onError?: (error: unknown) => void;
}

export interface UseGameRoundResult {
  activeMatch: ActiveMatchState | null;
  setActiveMatch: React.Dispatch<React.SetStateAction<ActiveMatchState | null>>;
  beginMatch: (match: Match) => void;
  submitChoice: (choice: RPSChoice) => Promise<void>;
  resetMatch: () => void;
  choiceEndsAt: number | null;
}

function toActiveMatch(match: Match): ActiveMatchState {
  return {
    matchId: match.id,
    roomId: match.roomId,
    roomName: match.roomName,
    stakePoints: match.stakePoints,
    round: match.round,
    maxRounds: match.maxRounds,
    playerScore: match.playerScore,
    opponentScore: match.opponentScore,
    opponent: match.opponent,
    playerChoice: null,
    opponentChoice: null,
    roundResult: null,
    matchWinner: null,
    phase: 'waiting',
  };
}

/**
 * 서버 라운드 훅.
 * Mock 상대 선택/판정 제거 — ROUND_STARTED / ROUND_RESULT / MATCH_FINISHED 사용.
 */
export function useGameRound(options: UseGameRoundOptions = {}): UseGameRoundResult {
  const { onChoiceSubmitted, onRoundRevealed, onMatchFinished, onError } = options;

  const [activeMatch, setActiveMatch] = useState<ActiveMatchState | null>(null);
  const [choiceEndsAt, setChoiceEndsAt] = useState<number | null>(null);
  const timersRef = useRef<number[]>([]);
  const submittingRef = useRef(false);
  const matchIdRef = useRef<string | null>(null);

  const callbacksRef = useRef(options);
  callbacksRef.current = { onChoiceSubmitted, onRoundRevealed, onMatchFinished, onError };

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  const schedule = useCallback((callback: () => void, delayMs: number) => {
    const id = window.setTimeout(callback, delayMs);
    timersRef.current.push(id);
  }, []);

  const beginMatch = useCallback(
    (match: Match) => {
      clearTimers();
      submittingRef.current = false;
      matchIdRef.current = match.id;
      setChoiceEndsAt(null);
      setActiveMatch(toActiveMatch(match));
      matchService.ensureSocket();
    },
    [clearTimers]
  );

  const resetMatch = useCallback(() => {
    clearTimers();
    submittingRef.current = false;
    matchIdRef.current = null;
    setChoiceEndsAt(null);
    setActiveMatch(null);
  }, [clearTimers]);

  useEffect(() => {
    if (useMockTransport) return;

    const offRoundStarted = gameSocket.on('ROUND_STARTED', (payload) => {
      const data = payload as {
        matchId: string;
        round: number;
        endsAt: number;
        playerScore: number;
        opponentScore: number;
      };
      if (matchIdRef.current && data.matchId !== matchIdRef.current) return;
      matchIdRef.current = data.matchId;
      submittingRef.current = false;
      setChoiceEndsAt(data.endsAt);
      setActiveMatch((prev) =>
        prev
          ? {
              ...prev,
              matchId: data.matchId,
              round: data.round,
              playerScore: data.playerScore,
              opponentScore: data.opponentScore,
              playerChoice: null,
              opponentChoice: null,
              roundResult: null,
              matchWinner: null,
              phase: 'waiting',
            }
          : prev
      );
    });

    const offAccepted = gameSocket.on('CHOICE_ACCEPTED', (payload) => {
      const data = payload as { matchId: string; choice: MatchChoice };
      if (matchIdRef.current && data.matchId !== matchIdRef.current) return;
      setActiveMatch((prev) =>
        prev ? { ...prev, playerChoice: data.choice, phase: 'countdown' } : prev
      );
    });

    const offRoundResult = gameSocket.on('ROUND_RESULT', (payload) => {
      const data = payload as RoundResultPayload & { isDraw?: boolean };
      if (matchIdRef.current && data.matchId !== matchIdRef.current) return;

      setChoiceEndsAt(null);
      setActiveMatch((prev) =>
        prev
          ? {
              ...prev,
              playerChoice: data.playerChoice,
              opponentChoice: data.opponentChoice,
              phase: 'showdown',
            }
          : prev
      );

      schedule(() => {
        callbacksRef.current.onRoundRevealed?.(data);
        setActiveMatch((prev) =>
          prev
            ? {
                ...prev,
                playerScore: data.playerScore,
                opponentScore: data.opponentScore,
                roundResult: data.outcome,
                matchWinner: data.matchWinner,
                phase: 'result',
              }
            : prev
        );

        if (data.matchWinner) {
          schedule(() => {
            callbacksRef.current.onMatchFinished?.(data);
          }, GAME_ROUND_TIMINGS.finishDelayMs);
        } else {
          // 무승부/다음 라운드는 서버 ROUND_STARTED 대기
          submittingRef.current = false;
        }
      }, GAME_ROUND_TIMINGS.showdownMs);
    });

    const offFinished = gameSocket.on('MATCH_FINISHED', (payload) => {
      const data = payload as {
        matchId: string;
        winner: 'player' | 'opponent';
        playerScore: number;
        opponentScore: number;
        rewardPoints: number;
      };
      if (matchIdRef.current && data.matchId !== matchIdRef.current) return;

      const synthetic: RoundResultPayload = {
        matchId: data.matchId,
        round: activeMatch?.round ?? 1,
        playerChoice: (activeMatch?.playerChoice as MatchChoice) ?? 'rock',
        opponentChoice: (activeMatch?.opponentChoice as MatchChoice) ?? 'scissors',
        outcome: data.winner === 'player' ? 'win' : 'loss',
        playerScore: data.playerScore,
        opponentScore: data.opponentScore,
        matchWinner: data.winner,
      };

      setActiveMatch((prev) =>
        prev
          ? {
              ...prev,
              playerScore: data.playerScore,
              opponentScore: data.opponentScore,
              matchWinner: data.winner,
              rewardPoints: data.rewardPoints,
              phase: 'result',
            }
          : prev
      );

      schedule(() => {
        callbacksRef.current.onMatchFinished?.(synthetic);
      }, GAME_ROUND_TIMINGS.finishDelayMs);
    });

    const offResumed = gameSocket.on('MATCH_RESUMED', (payload) => {
      const data = payload as {
        matchId: string;
        roomId: string;
        roomName: string;
        stakePoints: number;
        opponent: Match['opponent'];
        round: number;
        endsAt: number | null;
        yourChoice: MatchChoice | null;
        opponentChoice: MatchChoice | null;
        playerScore: number;
        opponentScore: number;
        state: string;
      };
      matchIdRef.current = data.matchId;
      setChoiceEndsAt(data.endsAt);
      setActiveMatch({
        matchId: data.matchId,
        roomId: data.roomId,
        roomName: data.roomName,
        stakePoints: data.stakePoints,
        round: data.round || 1,
        maxRounds: 99,
        playerScore: data.playerScore,
        opponentScore: data.opponentScore,
        opponent: data.opponent,
        playerChoice: data.yourChoice,
        opponentChoice: data.opponentChoice,
        roundResult: null,
        matchWinner: null,
        phase: data.opponentChoice ? 'result' : data.yourChoice ? 'countdown' : 'waiting',
      });
    });

    return () => {
      offRoundStarted();
      offAccepted();
      offRoundResult();
      offFinished();
      offResumed();
    };
  }, [schedule]);

  const submitChoice = useCallback(
    async (choice: RPSChoice) => {
      if (!choice) return;
      const current = activeMatch;
      if (!current || current.phase !== 'waiting' || !current.matchId) return;
      if (submittingRef.current) return;
      submittingRef.current = true;

      callbacksRef.current.onChoiceSubmitted?.(choice);
      setActiveMatch((prev) =>
        prev ? { ...prev, playerChoice: choice, phase: 'countdown' } : prev
      );

      try {
        if (useMockTransport) {
          const data = await matchService.submitChoice({
            matchId: current.matchId,
            round: current.round,
            choice,
          });
          setActiveMatch((prev) =>
            prev
              ? {
                  ...prev,
                  playerChoice: data.playerChoice,
                  opponentChoice: data.opponentChoice,
                  phase: 'showdown',
                }
              : prev
          );
          schedule(() => {
            callbacksRef.current.onRoundRevealed?.(data);
            setActiveMatch((prev) =>
              prev
                ? {
                    ...prev,
                    playerScore: data.playerScore,
                    opponentScore: data.opponentScore,
                    roundResult: data.outcome,
                    matchWinner: data.matchWinner,
                    phase: 'result',
                  }
                : prev
            );
            if (data.matchWinner) {
              schedule(() => {
                callbacksRef.current.onMatchFinished?.(data);
              }, GAME_ROUND_TIMINGS.finishDelayMs);
            } else {
              submittingRef.current = false;
              schedule(() => {
                setActiveMatch((prev) =>
                  prev
                    ? {
                        ...prev,
                        round: prev.round + 1,
                        playerChoice: null,
                        opponentChoice: null,
                        roundResult: null,
                        phase: 'waiting',
                      }
                    : prev
                );
              }, GAME_ROUND_TIMINGS.nextRoundMs);
            }
          }, GAME_ROUND_TIMINGS.showdownMs);
          return;
        }

        gameSocket.emit('CHOICE_SUBMIT', {
          matchId: current.matchId,
          choice,
          round: current.round,
        });
        // 결과는 ROUND_RESULT 이벤트로 수신 — 상대 패는 그때까지 미노출
      } catch (error) {
        submittingRef.current = false;
        setActiveMatch((prev) => (prev ? { ...prev, phase: 'waiting', playerChoice: null } : prev));
        callbacksRef.current.onError?.(error);
      }
    },
    [activeMatch, schedule]
  );

  return {
    activeMatch,
    setActiveMatch,
    beginMatch,
    submitChoice,
    resetMatch,
    choiceEndsAt,
  };
}
