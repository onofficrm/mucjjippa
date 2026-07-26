/**
 * 관리자 권한·작업 정책.
 * - ADMIN / SUPER_ADMIN 만 접근
 * - 특별 권한(SUPER_ADMIN) 작업과 재확인 필수 작업을 분리
 */
export const ADMIN_ROLES = ['ADMIN', 'SUPER_ADMIN'] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

/** SUPER_ADMIN 전용 작업 */
export const SUPER_ADMIN_ACTIONS = [
  'TOURNAMENT_FORCE_COMPLETE',
  'TOURNAMENT_CANCEL',
  'USER_BAN',
  'ROLE_CHANGE',
] as const;
export type SuperAdminAction = (typeof SUPER_ADMIN_ACTIONS)[number];

/**
 * 중요 작업 — 클라이언트가 confirm 토큰을 함께 보내야 실행된다.
 * (UI 재확인 모달을 우회한 단순 호출 방지)
 */
export const CRITICAL_ACTIONS = [
  'USER_SUSPEND',
  'USER_BAN',
  'USER_UNSUSPEND',
  'WALLET_CREDIT',
  'WALLET_DEBIT',
  'TOURNAMENT_CANCEL',
  'TOURNAMENT_POSTPONE',
  'TOURNAMENT_FORCE_COMPLETE',
  'TOURNAMENT_START',
  'NOTICE_PUBLISH',
  'ROLE_CHANGE',
] as const;
export type CriticalAction = (typeof CRITICAL_ACTIONS)[number];

export const ADMIN_POLICY = {
  /** 사유 최소/최대 길이 */
  reason: { min: 4, max: 255 },
  pagination: { defaultLimit: 20, maxLimit: 100 },
  /** 재확인 문구 — 클라이언트가 그대로 보내야 함 */
  confirmPhrase: 'CONFIRM',
  /** 대시보드 최근 활동 개수 */
  dashboardRecent: 10,
  /** 중복 거래 탐지 윈도우 (분) */
  duplicateWindowMinutes: 10,
} as const;

export function isSuperAdminAction(action: string): action is SuperAdminAction {
  return (SUPER_ADMIN_ACTIONS as readonly string[]).includes(action);
}

export function isCriticalAction(action: string): action is CriticalAction {
  return (CRITICAL_ACTIONS as readonly string[]).includes(action);
}
