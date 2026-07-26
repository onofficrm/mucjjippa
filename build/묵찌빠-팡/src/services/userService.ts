import { UserProfile } from '../types';
import { initialUserProfile, mockUsers } from '../data/mockData';

export interface UserService {
  getUserProfile: (userId: string) => Promise<UserProfile>;
  getAllUsers: () => Promise<UserProfile[]>;
  updateUserStats: (
    userId: string,
    isWin: boolean,
    isDraw?: boolean
  ) => Promise<UserProfile>;
  updateEquippedItem: (
    type: 'border' | 'entrance' | 'victory' | 'color' | 'emote' | 'title' | 'avatar',
    value: string
  ) => Promise<UserProfile>;
}

class MockUserService implements UserService {
  private users: UserProfile[] = [...mockUsers];
  private me: UserProfile = { ...initialUserProfile };

  public async getUserProfile(userId: string): Promise<UserProfile> {
    await new Promise((res) => setTimeout(res, 100));
    if (userId === this.me.id || userId === 'me') {
      return { ...this.me };
    }
    const found = this.users.find((u) => u.id === userId);
    return found ? { ...found } : { ...this.me };
  }

  public async getAllUsers(): Promise<UserProfile[]> {
    await new Promise((res) => setTimeout(res, 150));
    return [...this.users];
  }

  public async updateUserStats(
    userId: string,
    isWin: boolean,
    isDraw: boolean = false
  ): Promise<UserProfile> {
    await new Promise((res) => setTimeout(res, 150));
    if (isDraw) {
      this.me.draws += 1;
    } else if (isWin) {
      this.me.wins += 1;
      this.me.currentStreak += 1;
      if (this.me.currentStreak > this.me.maxStreak) {
        this.me.maxStreak = this.me.currentStreak;
      }
    } else {
      this.me.losses += 1;
      this.me.currentStreak = 0;
    }
    const total = this.me.wins + this.me.losses;
    this.me.winRate = total > 0 ? parseFloat(((this.me.wins / total) * 100).toFixed(1)) : 0;
    return { ...this.me };
  }

  public async updateEquippedItem(
    type: 'border' | 'entrance' | 'victory' | 'color' | 'emote' | 'title' | 'avatar',
    value: string
  ): Promise<UserProfile> {
    await new Promise((res) => setTimeout(res, 100));
    if (type === 'border') this.me.equippedBorder = value;
    if (type === 'entrance') this.me.equippedEntrance = value;
    if (type === 'victory') this.me.equippedVictory = value;
    if (type === 'color') this.me.equippedNicknameColor = value;
    if (type === 'emote') this.me.equippedEmote = value;
    if (type === 'title') this.me.title = value;
    if (type === 'avatar') this.me.avatar = value;
    return { ...this.me };
  }
}

export const userService = new MockUserService();
