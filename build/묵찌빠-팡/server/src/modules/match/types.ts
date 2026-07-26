import type { RpsChoice } from './rps.js';
import type { MatchStake } from './policy.js';

export type MatchRuntimeState =
  | 'IDLE'
  | 'SEARCHING'
  | 'MATCHED'
  | 'READY'
  | 'CHOOSING'
  | 'LOCKED'
  | 'REVEALING'
  | 'DRAW'
  | 'FINISHED'
  | 'CANCELLED'
  | 'DISCONNECTED';

export interface QueueEntry {
  userId: string;
  socketId: string;
  stake: MatchStake;
  roomId: string;
  roomName: string;
  level: number;
  nickname: string;
  avatar: string;
  title: string;
  wins: number;
  losses: number;
  maxStreak: number;
  enqueuedAt: number;
}

export interface RuntimePlayer {
  userId: string;
  socketId: string | null;
  nickname: string;
  avatar: string;
  title: string;
  wins: number;
  losses: number;
  maxStreak: number;
  level: number;
  connected: boolean;
  disconnectedAt: number | null;
  choice: RpsChoice | null;
  choiceLocked: boolean;
}

export interface RuntimeRound {
  roundNumber: number;
  startedAt: number;
  endsAt: number;
  player1Choice: RpsChoice | null;
  player2Choice: RpsChoice | null;
  winnerUserId: string | null;
  isDraw: boolean;
  revealed: boolean;
}

export interface RuntimeMatch {
  matchId: string;
  stake: MatchStake;
  roomId: string;
  roomName: string;
  entryPoint: number;
  rewardPoint: number;
  state: MatchRuntimeState;
  player1: RuntimePlayer;
  player2: RuntimePlayer;
  roundNumber: number;
  currentRound: RuntimeRound | null;
  player1Score: number;
  player2Score: number;
  winnerId: string | null;
  feesDeducted: boolean;
  createdAt: number;
  finishedAt: number | null;
  timers: {
    choice?: NodeJS.Timeout;
    reveal?: NodeJS.Timeout;
    disconnect?: Map<string, NodeJS.Timeout>;
  };
}

export interface PublicOpponent {
  id: string;
  nickname: string;
  avatar: string;
  title: string;
  wins: number;
  losses: number;
  winRate: number;
  maxStreak: number;
  recentLastHand: 'rock' | 'paper' | 'scissors' | null;
  greeting: string;
}
