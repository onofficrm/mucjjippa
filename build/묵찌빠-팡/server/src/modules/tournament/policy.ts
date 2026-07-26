/**
 * 토너먼트 정책 — 첫 버전 안정 범위.
 * 초보자: 최대 32, 정규: 최대 128, 256+ 비활성(COMING SOON)
 */
export const TOURNAMENT_POLICY = {
  tiers: {
    BEGINNER: { maxParticipants: 32, defaultBracketTarget: 16, enabled: true },
    REGULAR: { maxParticipants: 128, defaultBracketTarget: 64, enabled: true },
    MEGA: { maxParticipants: 256, defaultBracketTarget: 128, enabled: false },
  },

  /** 예선 선택 제한 시간 */
  qualifierChoiceMs: 10_000,
  /** 예선 라운드 결과 공개 후 다음 라운드까지 */
  qualifierNextRoundMs: 3_000,
  /** 본선 단판 선택 시간 */
  bracketChoiceMs: 5_000,
  /** 준결승·결승 3판2승 선택 시간 */
  finalsChoiceMs: 5_000,
  /** 본선 경기 간 대기 */
  matchGapMs: 1_500,
  /** 카운트다운(READY) 표시 */
  countdownMs: 10_000,

  /** 인원 미달 시 초기 정책: 티켓 자동 환불 */
  refundOnPostponeDefault: true,

  /** 스케줄러 폴링 */
  schedulerPollMs: 1_000,

  /** Redis job key */
  redisJobKey: 'tournament:jobs',
} as const;

export function isTierEnabled(tier: keyof typeof TOURNAMENT_POLICY.tiers): boolean {
  return TOURNAMENT_POLICY.tiers[tier].enabled;
}

export function nextPowerOfTwo(n: number): number {
  if (n <= 1) return 1;
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

export function roundLabelForSize(size: number): string {
  if (size <= 2) return '결승';
  if (size === 4) return '준결승';
  return `${size}강`;
}

export function winsRequiredForRound(roundLabel: string, isThirdPlace = false): number {
  if (isThirdPlace) return 2;
  if (roundLabel === '준결승' || roundLabel === '결승') return 2;
  return 1;
}
