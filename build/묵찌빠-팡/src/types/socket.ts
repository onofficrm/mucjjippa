import { MatchChoice, MatchOutcome } from './match';
import { WalletBalance } from './wallet';

export type SocketEventType =
  | 'MATCH_QUEUE_JOIN'
  | 'MATCH_QUEUE_LEAVE'
  | 'MATCH_SEARCH_STARTED'
  | 'MATCH_FOUND'
  | 'MATCH_CANCELLED'
  | 'MATCH_READY'
  | 'MATCH_RESUMED'
  | 'ROUND_STARTED'
  | 'CHOICE_SUBMIT'
  | 'CHOICE_ACCEPTED'
  | 'CHOICE_LOCKED'
  | 'ROUND_RESULT'
  | 'MATCH_RESULT'
  | 'MATCH_FINISHED'
  | 'OPPONENT_DISCONNECTED'
  | 'OPPONENT_RECONNECTED'
  | 'STRATEGY_ROUND_STARTED'
  | 'STRATEGY_CHOICES_SUBMIT'
  | 'STRATEGY_CHOICES_SUBMITTED'
  | 'STRATEGY_OPPONENT_SUBMITTED'
  | 'STRATEGY_CHOICES_LOCKED'
  | 'STRATEGY_REVEAL_STARTED'
  | 'STRATEGY_ROUND_REVEALED'
  | 'STRATEGY_MATCH_RESULT'
  | 'TOURNAMENT_UPDATED'
  | 'PARTICIPANT_JOINED'
  | 'TOURNAMENT_COUNTDOWN'
  | 'TOURNAMENT_STARTED'
  | 'QUALIFIER_STARTED'
  | 'QUALIFIER_CHOICE_SUBMIT'
  | 'QUALIFIER_CHOICE_ACCEPTED'
  | 'QUALIFIER_RESULT'
  | 'BRACKET_CREATED'
  | 'TOURNAMENT_MATCH_READY'
  | 'BRACKET_UPDATED'
  | 'PLAYER_ELIMINATED'
  | 'FINAL_STARTED'
  | 'TOURNAMENT_COMPLETED'
  | 'TOURNAMENT_FINISHED'
  | 'TOURNAMENT_SUBSCRIBE'
  | 'WALLET_UPDATED'
  | 'WATCH_SUBSCRIBE'
  | 'WATCH_UNSUBSCRIBE'
  | 'WATCH_REACTION'
  | 'WATCH_CHOICE_SUBMIT'
  | 'WATCH_STATE'
  | 'WATCH_VIEWER_COUNT'
  | 'WATCH_COUNTDOWN'
  | 'WATCH_CHOICE_STATUS'
  | 'WATCH_REVEAL'
  | 'WATCH_ROUND_RESULT'
  | 'WATCH_MATCH_FINISHED'
  | 'WATCH_NEXT_MATCH'
  | 'WATCH_REACTION_ACK';

export interface SocketEvent<T = unknown> {
  event: SocketEventType;
  timestamp: number;
  payload: T;
}

/** 클라이언트 → 서버: 손 제출 (승패는 서버가 결정) */
export interface ChoiceSubmitPayload {
  matchId: string;
  round: number;
  choice: MatchChoice;
  requestId: string;
}

/** 서버 → 클라이언트: 라운드 확정 결과 */
export interface RoundResultPayload {
  matchId: string;
  round: number;
  playerChoice: MatchChoice;
  opponentChoice: MatchChoice;
  outcome: MatchOutcome;
  playerScore: number;
  opponentScore: number;
  matchWinner: 'player' | 'opponent' | null;
}

/** 300P 3선택 전략 대전 — 클라이언트 → 서버 */
export interface StrategyChoicesSubmitPayload {
  matchId: string;
  /** 순서 그대로 3개 */
  choices: MatchChoice[];
}

export interface StrategyRoundStartedPayload {
  matchId: string;
  mode: 'STRATEGY_300P';
  setNumber: number;
  choiceCount: number;
  endsAt: number;
  timeoutMs: number;
  playerScore: number;
  opponentScore: number;
}

export interface StrategyChoicesLockedPayload {
  matchId: string;
  setNumber: number;
  yourChoices: MatchChoice[];
  yourChoicesAutoFilled: boolean;
  /** 상대 선택은 공개 단계 전까지 해시만 전달된다 */
  opponentCommitHash: string | null;
}

export interface StrategyRoundRevealedPayload {
  matchId: string;
  setNumber: number;
  index: number;
  totalRounds: number;
  playerChoice: MatchChoice;
  opponentChoice: MatchChoice;
  outcome: MatchOutcome;
  revealedPlayerWins: number;
  revealedOpponentWins: number;
}

export interface StrategyMatchResultPayload {
  matchId: string;
  setNumber: number;
  isDraw: boolean;
  winner: 'player' | 'opponent' | null;
  rewardPoints: number;
  duplicatedReward?: boolean;
  playerScore: number;
  opponentScore: number;
  rounds: Array<{
    index: number;
    playerChoice: MatchChoice;
    opponentChoice: MatchChoice;
    outcome: MatchOutcome;
  }>;
}

export interface WalletUpdatedPayload extends WalletBalance {
  transactionId: string;
}

/** 기존 이름 유지 */
export type WSEventType = SocketEventType;
export type WSMessage<T = unknown> = SocketEvent<T>;
