export type RPSChoice = 'rock' | 'paper' | 'scissors' | null;

/** 실제로 제출된 손 (null 없음) — 서버 제출 payload에 사용 */
export type MatchChoice = Exclude<RPSChoice, null>;

export type MatchOutcome = 'win' | 'loss' | 'draw';

export type MatchStatus = 'queued' | 'ready' | 'playing' | 'finished' | 'cancelled';

export type MatchPhase = 'waiting' | 'countdown' | 'showdown' | 'result';

export interface GameRoom {
  id: string;
  title: string;
  entryFee: number;
  minTier: string;
  rewardPoints: number;
  activePlayers: number;
  maxPlayers: number;
  isVip?: boolean;
  bgGradient: string;
  accentColor: string;
}

export interface MatchPlayer {
  id: string;
  nickname: string;
  avatar: string;
  title: string;
  wins: number;
  losses: number;
  winRate: number;
  maxStreak: number;
  recentLastHand: RPSChoice;
  greeting: string;
}

/** 한 라운드의 확정된 결과 (Mock에서도 서비스가 결정한다) */
export interface MatchRound {
  round: number;
  playerChoice: MatchChoice;
  opponentChoice: MatchChoice;
  outcome: MatchOutcome;
  playerScore: number;
  opponentScore: number;
  decidedAt: number;
}

/** 매치 종료 시 정산 정보 — 보상 금액은 서비스(향후 서버)가 계산 */
export interface MatchResult {
  matchId: string;
  roomId: string;
  roomName: string;
  stakePoints: number;
  winner: 'player' | 'opponent' | null;
  playerScore: number;
  opponentScore: number;
  rewardPoints: number;
  rounds: MatchRound[];
  finishedAt: number;
}

export interface Match {
  id: string;
  roomId: string;
  roomName: string;
  stakePoints: number;
  status: MatchStatus;
  maxRounds: number;
  round: number;
  playerScore: number;
  opponentScore: number;
  opponent: MatchPlayer;
  rounds: MatchRound[];
  createdAt: number;
}

/** 화면이 사용하는 진행 중 매치 상태 (기존 UI 계약 유지) */
export interface ActiveMatchState {
  matchId?: string;
  roomId: string;
  roomName: string;
  stakePoints: number;
  round: number;
  maxRounds: number;
  playerScore: number;
  opponentScore: number;
  opponent: MatchPlayer;
  playerChoice: RPSChoice;
  opponentChoice: RPSChoice;
  roundResult: MatchOutcome | null;
  matchWinner: 'player' | 'opponent' | null;
  phase: MatchPhase;
  /** 서버가 확정한 승리 보상 (MATCH_FINISHED 수신 시 채워짐) */
  rewardPoints?: number;
}

export interface LiveGameItem {
  id: string;
  timestamp: string;
  winnerName: string;
  winnerAvatar: string;
  loserName: string;
  loserAvatar: string;
  winnerChoice: RPSChoice;
  loserChoice: RPSChoice;
  pointsWon: number;
  roomName: string;
}

/** 관전 화면 상태 */
export interface SpectateMatch {
  /** 서버 매치/토너먼트 매치 ID (없으면 데모) */
  matchId?: string;
  id?: string;
  player1: string;
  player2: string;
  p1Avatar?: string;
  p2Avatar?: string;
  p1Choice: RPSChoice;
  p2Choice: RPSChoice;
  p1Score: number;
  p2Score: number;
  status?: string;
  viewerCount?: number | string;
  isDemo?: boolean;
  kind?: 'CASUAL' | 'STRATEGY' | 'TOURNAMENT' | 'DEMO';
  phase?: string;
  roomName?: string;
  stakePoints?: number;
  round?: number;
  endsAt?: number | null;
  player1Chosen?: boolean;
  player2Chosen?: boolean;
  reactions?: { like: number; flame: number; thumb: number };
}
