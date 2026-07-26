export type PageType =
  | 'home'
  | 'versus_rooms'
  | 'matchmaking_wait'
  | 'versus_game'
  | 'practice_game'
  | 'game_result'
  | 'tournament_lobby'
  | 'tournament_wait'
  | 'tournament_game'
  | 'tournament_bracket'
  | 'spectate'
  | 'ranking'
  | 'my_profile'
  | 'game_stats'
  | 'point_history'
  | 'avatar'
  | 'title'
  | 'point_topup'
  | 'ad_detail'
  | 'item_shop'
  | 'point_exchange'
  | 'settings'
  | 'dev_test'
  | 'development_status';

export type RPSChoice = 'rock' | 'paper' | 'scissors' | null;

export interface UserProfile {
  id: string;
  nickname: string;
  avatar: string;
  title: string;
  points: number;
  tickets: number;
  level: number;
  exp: number;
  maxExp: number;
  wins: number;
  losses: number;
  draws: number;
  currentStreak: number;
  maxStreak: number;
  maxLossStreak?: number;
  tournamentBestRecord?: string;
  tournamentRecord?: string;
  isOnline?: boolean;
  recentChoices?: RPSChoice[];
  winRate?: number;
  rockCount: number;
  paperCount: number;
  scissorsCount: number;
  weeklyGames?: number;
  monthlyGames?: number;
  tournamentParticipations?: number;
  tournamentBestRank?: string;
  recent10Results?: Array<'W' | 'L' | 'D'>;
  equippedBorder?: string;
  equippedEntrance?: string;
  equippedVictory?: string;
  equippedNicknameColor?: string;
  equippedEmote?: string;
  ownedCosmetics?: string[];
}

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
  startTime: string; // ISO or formatted
  startTimeEpoch: number;
  status: TournamentStatus;
  currentRound: string; // e.g. "64강", "32강", "결승"
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

export interface BracketNode {
  id: string;
  roundName: string;
  player1: { name: string; avatar: string; score: number; isWinner?: boolean } | null;
  player2: { name: string; avatar: string; score: number; isWinner?: boolean } | null;
  nextMatchId?: string;
  isLive?: boolean;
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

export interface RankItem {
  rank: number;
  id: string;
  nickname: string;
  avatar: string;
  title: string;
  points: number;
  winRate: number;
  streak: number;
  wins: number;
  losses?: number;
  rewardText?: string;
}

export interface AvatarItem {
  id: string;
  name: string;
  emoji: string;
  category: 'basic' | 'rare' | 'legendary';
  price: number;
  currency: 'points' | 'tickets';
  isUnlocked: boolean;
  description: string;
  borderColor: string;
  type?: 'avatar' | 'border' | 'entrance' | 'victory' | 'color' | 'emote';
}

export interface CosmeticItem {
  id: string;
  category: 'avatar' | 'border' | 'entrance' | 'victory' | 'color' | 'emote' | 'ticket' | 'decoration';
  categoryLabel: string;
  name: string;
  description: string;
  preview: string;
  price: number;
  currency: 'points' | 'tickets';
  isOwned: boolean;
  isEquipped: boolean;
}

export interface TitleItem {
  id: string;
  name: string;
  requirement: string;
  isUnlocked: boolean;
  tagColor: string;
}

export interface ShopItem {
  id: string;
  name: string;
  description: string;
  icon: string;
  price: number;
  currency: 'points' | 'tickets';
  type: 'avatar' | 'border' | 'victory' | 'entrance' | 'emoji' | 'ticket' | 'decoration' | 'booster' | 'shield';
  category?: 'cosmetic' | 'ticket' | 'booster';
  categoryLabel?: string;
  preview?: string;
  quantity?: number;
  isOwned?: boolean;
  isEquipped?: boolean;
}

export interface PointHistoryLog {
  id: string;
  title: string;
  amount: number; // positive for gain, negative for spent
  type: 'earn' | 'spend';
  date: string;
  category: 'match' | 'tournament' | 'ad' | 'shop' | 'admin' | 'charge';
  balance: number;
}

export interface AdOffer {
  id: string;
  title: string;
  rewardPoints: number;
  rewardTickets: number;
  sponsor: string;
  durationSeconds: number;
  badge: string;
  bannerGradient: string;
}

export interface CouponItem {
  id: string;
  title: string;
  brand: string;
  pricePoints: number;
  image: string;
  stock: number;
}

export interface ActiveMatchState {
  roomId: string;
  roomName: string;
  stakePoints: number;
  round: number;
  maxRounds: number;
  playerScore: number;
  opponentScore: number;
  opponent: {
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
  };
  playerChoice: RPSChoice;
  opponentChoice: RPSChoice;
  roundResult: 'win' | 'loss' | 'draw' | null;
  matchWinner: 'player' | 'opponent' | null;
  phase: 'waiting' | 'countdown' | 'showdown' | 'result';
}
