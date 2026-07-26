import { EquipSlot, MatchOutcome, UserProfile } from '../types';
import { apiClient } from '../api';

export interface UserService {
  getUserProfile: (userId: string) => Promise<UserProfile>;
  getAllUsers: () => Promise<UserProfile[]>;
  updateProfile: (patch: Partial<UserProfile>) => Promise<UserProfile>;
  updateEquippedItem: (
    slot: EquipSlot,
    itemId: string
  ) => Promise<{ avatar?: string; title?: string }>;
}

/** 대전 결과에 따른 전적 변화 — 서버 이관 시 그대로 서버 계산으로 대체된다. */
export function applyMatchOutcomeToProfile(
  profile: UserProfile,
  outcome: MatchOutcome,
  expGain = 50
): UserProfile {
  if (outcome === 'draw') {
    return { ...profile, draws: profile.draws + 1 };
  }

  if (outcome === 'loss') {
    return { ...profile, losses: profile.losses + 1, currentStreak: 0 };
  }

  const nextStreak = profile.currentStreak + 1;
  const leveledUp = profile.exp + expGain >= profile.maxExp;

  return {
    ...profile,
    wins: profile.wins + 1,
    currentStreak: nextStreak,
    maxStreak: Math.max(profile.maxStreak, nextStreak),
    exp: leveledUp ? profile.exp + expGain - profile.maxExp : profile.exp + expGain,
    level: leveledUp ? profile.level + 1 : profile.level,
  };
}

export function applyChoiceToProfile(
  profile: UserProfile,
  choice: 'rock' | 'paper' | 'scissors'
): UserProfile {
  return {
    ...profile,
    rockCount: profile.rockCount + (choice === 'rock' ? 1 : 0),
    paperCount: profile.paperCount + (choice === 'paper' ? 1 : 0),
    scissorsCount: profile.scissorsCount + (choice === 'scissors' ? 1 : 0),
  };
}

class UserServiceImpl implements UserService {
  public async getUserProfile(userId: string): Promise<UserProfile> {
    return apiClient.get<UserProfile>(`/users/${userId}`);
  }

  public async getAllUsers(): Promise<UserProfile[]> {
    return apiClient.get<UserProfile[]>('/users');
  }

  public async updateProfile(patch: Partial<UserProfile>): Promise<UserProfile> {
    return apiClient.patch<UserProfile>('/users/me/profile', patch);
  }

  public async updateEquippedItem(
    slot: EquipSlot,
    itemId: string
  ): Promise<{ avatar?: string; title?: string }> {
    if (slot !== 'avatar' && slot !== 'title') {
      throw new Error('현재 서버 장착은 아바타와 칭호만 지원합니다.');
    }
    return apiClient.post<{ avatar?: string; title?: string }>('/users/me/equip', {
      itemType: slot.toUpperCase(),
      itemId,
    });
  }
}

export const userService = new UserServiceImpl();
