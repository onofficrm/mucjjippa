/**
 * 1:1 매치 정책 — 설정으로 분리 (코드 변경 없이 튜닝 가능하도록 상수 집약).
 */
export const MATCH_POLICY = {
  /** 허용 입장료 큐 */
  stakes: [10, 100, 300] as const,

  /** 선택 제한 시간 (ms) */
  choiceTimeoutMs: 5_000,

  /** 결과 공개 연출 후 다음 라운드까지 (ms) */
  revealHoldMs: 1_200,

  /** 무승부 후 다음 라운드 시작까지 (ms) */
  drawNextRoundMs: 2_000,

  /** 매치 확정 후 READY → CHOOSING 전환 (ms) */
  readyDelayMs: 800,

  /** 연결 끊김 유예 (ms) — 이 안에 재접속하면 복구 */
  disconnectGraceMs: 20_000,

  /** 유예 초과 후 자동 선택으로 진행할지, 패배 처리할지 */
  disconnectPolicy: 'auto_choice' as 'auto_choice' | 'forfeit',

  /** 선택 전 연결 종료 시 */
  disconnectBeforeChoicePolicy: 'auto_choice' as 'auto_choice' | 'forfeit',

  /** 승리 보상 = 입장료 × 배수 (양쪽 참가비 합 ≈ 2배) */
  winMultiplier: 2,

  /** 매칭: 초기 레벨 차이 허용 → 대기 시간에 따라 확대 */
  matching: {
    initialLevelDelta: 2,
    expandEveryMs: 5_000,
    expandByLevels: 3,
    maxLevelDelta: 50,
    pollIntervalMs: 500,
  },

  /** 고의 종료 반복 기록 임계 (최근 N분 내 M회) */
  abuse: {
    windowMs: 30 * 60_000,
    disconnectThreshold: 5,
  },

  /** 300P 3선택 전략 대전 */
  strategy: {
    stake: 300,
    choiceCount: 3,
    /** 3개를 모두 제출할 제한 시간 (ms) */
    submitTimeoutMs: 10_000,
    /** 양쪽 잠금 후 첫 공개까지 (ms) */
    revealStartDelayMs: 800,
    /** 순번별 공개 간격 (ms) */
    revealStepMs: 1_200,
    /** 매치 무승부 시 새 세트까지 (ms) */
    rematchDelayMs: 2_500,
  },

  rooms: [
    {
      id: 'room_10p',
      title: '10포인트 대전',
      entryFee: 10,
      minTier: '초보자 추천',
      rewardPoints: 20,
      bgGradient: 'from-blue-900/60 via-slate-900 to-indigo-950',
      accentColor: 'border-blue-500/50 shadow-blue-500/20',
    },
    {
      id: 'room_100p',
      title: '100포인트 대전',
      entryFee: 100,
      minTier: '일반 대전',
      rewardPoints: 200,
      bgGradient: 'from-cyan-900/60 via-slate-900 to-blue-950',
      accentColor: 'border-cyan-400/50 shadow-cyan-400/20',
    },
    {
      id: 'room_300p',
      title: '300포인트 대전',
      entryFee: 300,
      minTier: '전략 대전 (고수 추천)',
      rewardPoints: 600,
      bgGradient: 'from-purple-900/60 via-slate-900 to-purple-950',
      accentColor: 'border-purple-500/50 shadow-purple-500/20',
    },
  ],
} as const;

export type MatchStake = (typeof MATCH_POLICY.stakes)[number];

export function isAllowedStake(fee: number): fee is MatchStake {
  return (MATCH_POLICY.stakes as readonly number[]).includes(fee);
}

export function rewardForStake(entryFee: number): number {
  return Math.floor(entryFee * MATCH_POLICY.winMultiplier);
}

export function roomByStake(entryFee: number) {
  return MATCH_POLICY.rooms.find((room) => room.entryFee === entryFee) ?? null;
}

export function levelDeltaAllowed(waitMs: number): number {
  const { initialLevelDelta, expandEveryMs, expandByLevels, maxLevelDelta } =
    MATCH_POLICY.matching;
  const steps = Math.floor(waitMs / expandEveryMs);
  return Math.min(maxLevelDelta, initialLevelDelta + steps * expandByLevels);
}
