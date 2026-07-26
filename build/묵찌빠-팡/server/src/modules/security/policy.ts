/**
 * Stage 12 보안·부정 이용 정책.
 * 초기 정책: **차단이 아닌 로그·관리자 경고 중심**. 임계값 초과 시 FraudSignal 기록.
 */
export const SECURITY_POLICY = {
  /** 선택이 지나치게 빠름 (라운드 시작 후 이 시간 미만 제출) */
  rapidChoiceMs: 250,
  /** rapid choice 하루 누적 임계 (이상 시 CRITICAL 승격) */
  rapidChoiceDailyThreshold: 10,

  /** 반복 접속 종료: 최근 windowMs 내 disconnectThreshold 회 */
  disconnect: {
    windowMs: 30 * 60_000,
    threshold: 5,
  },

  /** 동일 상대 반복 매칭: 최근 windowMs 내 동일 페어 threshold 회 */
  sameOpponent: {
    windowMs: 60 * 60_000,
    threshold: 4,
  },

  /** 동일 IP 다계정 의심: 최근 windowMs 내 distinct user threshold 이상 */
  multiAccountIp: {
    windowMs: 24 * 60 * 60_000,
    threshold: 4,
  },

  /** 비정상 승률: 최소 게임 수 이상에서 승률 임계 초과 */
  winRate: {
    minGames: 20,
    threshold: 0.9,
  },

  /** 비정상 포인트 증가: 최근 windowMs 내 순증가 임계 초과 */
  pointGain: {
    windowMs: 60 * 60_000,
    threshold: 5_000_000,
  },

  /** 보상 반복 요청: 동일 reference 로 window 내 threshold 초과 */
  repeatedReward: {
    windowMs: 60 * 60_000,
    threshold: 3,
  },

  pagination: { defaultLimit: 30, maxLimit: 100 },
} as const;
