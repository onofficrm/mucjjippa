const env: ImportMetaEnv = import.meta.env ?? ({} as ImportMetaEnv);

const fallbackApiBaseUrl = 'http://localhost:4000/api';
const fallbackWsUrl = 'http://localhost:4000';

export const apiConfig = {
  baseUrl: (env.VITE_API_BASE_URL ?? fallbackApiBaseUrl).replace(/\/+$/, ''),
  wsUrl: env.VITE_WS_URL ?? fallbackWsUrl,
  appEnv: env.VITE_APP_ENV ?? 'development',
  defaultTimeoutMs: 10000,
} as const;

export const isDevEnv = apiConfig.appEnv !== 'production';

/**
 * 전송 모드.
 * - VITE_USE_MOCK=true  → 전부 Mock
 * - VITE_USE_MOCK=false → 전부 HTTP
 * - 미지정(기본)       → 인증/유저/지갑/상점/개발 보상은 실제 서버, 게임은 Mock
 */
export const useMockTransport = env.VITE_USE_MOCK === 'true';
export const useFullHttpTransport = env.VITE_USE_MOCK === 'false';

export function shouldUseMock(path: string): boolean {
  if (useFullHttpTransport) return false;
  if (useMockTransport) return true;
  const normalized = path.replace(/^\//, '');
  if (
    normalized.startsWith('auth/') ||
    normalized.startsWith('users/') ||
    normalized === 'wallet' ||
    normalized.startsWith('wallet/') ||
    normalized.startsWith('admin/') ||
    normalized === 'admin' ||
    normalized.startsWith('notices') ||
    normalized.startsWith('shop/') ||
    normalized.startsWith('dev/rewards/') ||
    normalized.startsWith('matches/') ||
    normalized.startsWith('tournaments') ||
    normalized.startsWith('watch/') ||
    normalized.startsWith('watch') ||
    normalized.startsWith('rankings') ||
    normalized.startsWith('missions') ||
    normalized.startsWith('rewards/missions')
  ) {
    return false;
  }
  return true;
}

/** access token — sessionStorage (탭 새로고침 유지, 탭 종료 시 제거). refresh는 HTTP-only cookie. */
export const ACCESS_TOKEN_STORAGE_KEY = 'rps_access_token';
export const AUTH_MODE_STORAGE_KEY = 'rps_auth_mode'; // 'user' | 'guest'
