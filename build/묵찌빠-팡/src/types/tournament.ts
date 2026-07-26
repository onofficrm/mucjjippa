export type TournamentStatus =
  | 'open'
  | 'applied'
  | 'waiting'
  | 'imminent'
  | 'in_progress'
  | 'ended'
  | 'deferred'
  | 'coming_soon'
  | 'REGISTRATION'
  | 'STARTING_SOON'
  | 'IN_PROGRESS'
  | 'LACK_OF_PLAYERS'
  | 'FINISHED'
  | 'COMING_SOON';

export interface Tournament {
  id: string;
  title: string;
  subTitle?: string;
  type: 'daily' | 'weekly' | 'hourly';
  totalPrize: number;
  ticketCost: number;
  maxParticipants: number;
  currentParticipants: number;
  startTime: string;
  startTimeEpoch: number;
  status: TournamentStatus;
  currentRound: string;
  description?: string;
  rules?: {
    preliminary: string;
    main: string;
    finals: string;
  };
  prizes?: {
    rank: string;
    prize: string;
  }[];
}

export interface TournamentParticipant {
  id: string;
  nickname: string;
  avatar: string;
  title?: string;
  seed?: number;
  isMe?: boolean;
  eliminatedAtRound?: string | null;
}

export interface BracketPlayerSlot {
  name: string;
  avatar: string;
  score: number;
  isWinner?: boolean;
}

export interface BracketNode {
  id: string;
  roundName: string;
  player1: BracketPlayerSlot | null;
  player2: BracketPlayerSlot | null;
  nextMatchId?: string;
  isLive?: boolean;
}

/** 대진표의 한 경기 */
export type TournamentMatch = BracketNode;

/** 라운드 단위 묶음 (예선 / 64강 / … / 결승) */
export interface TournamentRound {
  id: string;
  name: string;
  order: number;
  matches: TournamentMatch[];
  isCurrent?: boolean;
}

export interface TournamentBracket {
  tournamentId: string;
  rounds: TournamentRound[];
  nodes?: BracketNode[];
  updatedAt: number;
}

export type TournamentRegistrationReason =
  | 'ALREADY_REGISTERED'
  | 'NOT_ENOUGH_TICKETS'
  | 'NOT_REGISTERED'
  | 'CLOSED';

export interface TournamentRegistrationResult {
  success: boolean;
  tournamentId: string;
  registered: boolean;
  reason?: TournamentRegistrationReason;
}
