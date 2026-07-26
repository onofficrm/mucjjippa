import { UserProfile } from '../types';
import { initialUserProfile } from '../data/mockData';

export interface AuthService {
  login: (nickname: string) => Promise<UserProfile>;
  logout: () => Promise<boolean>;
  getCurrentUser: () => Promise<UserProfile>;
  updateNickname: (newNickname: string) => Promise<UserProfile>;
}

class MockAuthService implements AuthService {
  private currentUser: UserProfile = { ...initialUserProfile };

  public async login(nickname: string): Promise<UserProfile> {
    // Simulated REST delay
    await new Promise((res) => setTimeout(res, 200));
    this.currentUser = {
      ...this.currentUser,
      nickname,
      isOnline: true,
    };
    return { ...this.currentUser };
  }

  public async logout(): Promise<boolean> {
    await new Promise((res) => setTimeout(res, 150));
    this.currentUser = {
      ...this.currentUser,
      isOnline: false,
    };
    return true;
  }

  public async getCurrentUser(): Promise<UserProfile> {
    await new Promise((res) => setTimeout(res, 100));
    return { ...this.currentUser };
  }

  public async updateNickname(newNickname: string): Promise<UserProfile> {
    await new Promise((res) => setTimeout(res, 200));
    this.currentUser.nickname = newNickname;
    return { ...this.currentUser };
  }
}

export const authService = new MockAuthService();
