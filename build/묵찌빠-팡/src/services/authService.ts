import { UserProfile } from '../types';
import { apiClient } from '../api';
import { AUTH_MODE_STORAGE_KEY } from '../api/config';
import { walletStore } from '../stores/walletStore';

export type AuthMode = 'user' | 'guest' | null;

export interface AuthSessionResult {
  accessToken: string;
  guest?: boolean;
  profile: UserProfile;
  user?: Record<string, unknown>;
}

export interface SignupInput {
  loginId: string;
  password: string;
  nickname: string;
  email?: string;
  agreeTerms: boolean;
  agreePrivacy: boolean;
}

export interface LoginInput {
  loginId: string;
  password: string;
}

export interface ServerUserSettings {
  language: string;
  bgmVolume: number;
  effectVolume: number;
  vibration: boolean;
  tournamentNotification: boolean;
  reducedMotion: boolean;
  autoChoice: boolean;
  watchAutoNext: boolean;
}

function setAuthMode(mode: AuthMode) {
  if (typeof window === 'undefined') return;
  try {
    if (mode) window.sessionStorage.setItem(AUTH_MODE_STORAGE_KEY, mode);
    else window.sessionStorage.removeItem(AUTH_MODE_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function getAuthMode(): AuthMode {
  if (typeof window === 'undefined') return null;
  try {
    const value = window.sessionStorage.getItem(AUTH_MODE_STORAGE_KEY);
    if (value === 'user' || value === 'guest') return value;
    return null;
  } catch {
    return null;
  }
}

function applyProfileToWallet(profile: UserProfile) {
  walletStore.applyServerState({
    points: profile.points ?? 0,
    tickets: profile.tickets ?? 0,
  });
}

function normalizeProfile(raw: Partial<UserProfile> & { id: string; nickname: string }): UserProfile {
  return {
    id: raw.id,
    nickname: raw.nickname,
    avatar: raw.avatar ?? '✊',
    title: raw.title ?? '새싹 플레이어',
    level: raw.level ?? 1,
    exp: raw.exp ?? 0,
    maxExp: raw.maxExp ?? 100,
    points: raw.points ?? 0,
    tickets: raw.tickets ?? 0,
    wins: raw.wins ?? 0,
    losses: raw.losses ?? 0,
    draws: raw.draws ?? 0,
    currentStreak: raw.currentStreak ?? 0,
    maxStreak: raw.maxStreak ?? 0,
    rockCount: raw.rockCount ?? 0,
    paperCount: raw.paperCount ?? 0,
    scissorsCount: raw.scissorsCount ?? 0,
    isOnline: raw.isOnline ?? true,
    ...(raw as object),
  } as UserProfile;
}

class AuthServiceImpl {
  public async signup(input: SignupInput): Promise<AuthSessionResult> {
    const data = await apiClient.post<AuthSessionResult>('/auth/signup', input, {
      skipAuth: true,
    });
    apiClient.setAccessToken(data.accessToken);
    setAuthMode('user');
    const profile = normalizeProfile(data.profile);
    applyProfileToWallet(profile);
    return { ...data, profile };
  }

  public async login(input: LoginInput): Promise<AuthSessionResult> {
    const data = await apiClient.post<AuthSessionResult>('/auth/login', input, {
      skipAuth: true,
    });
    apiClient.setAccessToken(data.accessToken);
    setAuthMode('user');
    const profile = normalizeProfile(data.profile);
    applyProfileToWallet(profile);
    return { ...data, profile };
  }

  public async loginAsGuest(): Promise<AuthSessionResult> {
    const data = await apiClient.post<AuthSessionResult>('/auth/guest', {}, { skipAuth: true });
    apiClient.setAccessToken(data.accessToken);
    setAuthMode('guest');
    const profile = normalizeProfile({ ...data.profile, isGuest: true } as UserProfile & {
      isGuest?: boolean;
    });
    applyProfileToWallet(profile);
    return { ...data, guest: true, profile };
  }

  public async refresh(): Promise<AuthSessionResult | null> {
    try {
      const data = await apiClient.post<AuthSessionResult>('/auth/refresh', {}, {
        skipAuth: true,
        // request path handles skipRefresh internally via refreshAccessToken
      } as never);
      apiClient.setAccessToken(data.accessToken);
      setAuthMode('user');
      const profile = normalizeProfile(data.profile);
      applyProfileToWallet(profile);
      return { ...data, profile };
    } catch {
      return null;
    }
  }

  public async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout', {}, { skipAuth: false });
    } catch {
      /* 네트워크 실패여도 로컬 세션은 정리 */
    } finally {
      apiClient.setAccessToken(null);
      setAuthMode(null);
    }
  }

  public async getCurrentUser(): Promise<{
    guest: boolean;
    profile: UserProfile;
    user?: Record<string, unknown>;
  }> {
    const data = await apiClient.get<{
      guest: boolean;
      profile: UserProfile;
      user?: Record<string, unknown>;
    }>('/auth/me');
    const profile = normalizeProfile(data.profile);
    if (!data.guest) applyProfileToWallet(profile);
    setAuthMode(data.guest ? 'guest' : 'user');
    return { ...data, profile };
  }

  public async getMySettings(): Promise<ServerUserSettings> {
    return apiClient.get<ServerUserSettings>('/users/me/settings');
  }

  public async updateMySettings(
    patch: Partial<ServerUserSettings>
  ): Promise<ServerUserSettings> {
    return apiClient.patch<ServerUserSettings>('/users/me/settings', patch);
  }

  public async updateMyProfile(patch: {
    nickname?: string;
    avatarId?: string | null;
    titleId?: string | null;
  }): Promise<{ profile: UserProfile }> {
    const data = await apiClient.patch<{ profile: UserProfile }>('/users/me', patch);
    return { profile: normalizeProfile(data.profile) };
  }

  /**
   * 앱 부트스트랩: access token 또는 refresh cookie로 세션 복구.
   * 게스트는 refresh가 없으므로 access token이 있을 때만 유지된다.
   */
  public async bootstrapSession(): Promise<{
    authenticated: boolean;
    guest: boolean;
    profile: UserProfile | null;
  }> {
    const mode = getAuthMode();
    const token = apiClient.getAccessToken();

    if (token) {
      try {
        const me = await this.getCurrentUser();
        return { authenticated: true, guest: me.guest, profile: me.profile };
      } catch {
        /* fall through to refresh */
      }
    }

    if (mode === 'guest') {
      apiClient.setAccessToken(null);
      setAuthMode(null);
      return { authenticated: false, guest: false, profile: null };
    }

    const refreshed = await this.refresh();
    if (refreshed) {
      return { authenticated: true, guest: false, profile: refreshed.profile };
    }

    apiClient.setAccessToken(null);
    setAuthMode(null);
    return { authenticated: false, guest: false, profile: null };
  }
}

export const authService = new AuthServiceImpl();

/** @deprecated nickname-only mock login — 개발 페이지 호환용 래퍼 */
export async function legacyMockLogin(nickname: string): Promise<UserProfile> {
  if (import.meta.env.DEV) {
    console.warn('[auth] legacyMockLogin is disabled in Stage 4. Use login/signup/guest.');
  }
  void nickname;
  throw new Error('Mock 로그인은 제거되었습니다. 로그인 또는 게스트 체험을 이용해 주세요.');
}
