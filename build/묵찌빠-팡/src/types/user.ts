import { RPSChoice } from './match';

export interface User {
  id: string;
  nickname: string;
  avatar: string;
  title: string;
  level: number;
  exp: number;
  maxExp: number;
  isOnline?: boolean;
}

export interface UserProfile extends User {
  points: number;
  tickets: number;
  wins: number;
  losses: number;
  draws: number;
  currentStreak: number;
  maxStreak: number;
  maxLossStreak?: number;
  tournamentBestRecord?: string;
  tournamentRecord?: string;
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
  /** 게스트 체험 세션 */
  isGuest?: boolean;
  loginId?: string;
  email?: string | null;
  avatarId?: string | null;
  titleId?: string | null;
}

/** 사운드·접근성 설정 (localStorage `rps_settings`) */
export interface UserSettings {
  masterVolume: number;
  bgmVolume: number;
  sfxVolume: number;
  bgmEnabled: boolean;
  hapticEnabled: boolean;
  reduceMotion: boolean;
  largeFont: boolean;
  audioSubtitlesEnabled: boolean;
}

export interface Avatar {
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

export interface Title {
  id: string;
  name: string;
  requirement: string;
  isUnlocked: boolean;
  tagColor: string;
}

/** 기존 이름 유지 */
export type AvatarItem = Avatar;
export type TitleItem = Title;

export type EquipSlot =
  | 'border'
  | 'entrance'
  | 'victory'
  | 'color'
  | 'emote'
  | 'title'
  | 'avatar';
