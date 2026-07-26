/** 관전 정책 */
export const WATCH_POLICY = {
  demoMatchId: 'demo',
  /** 리액션: 사용자당 초당 최대 횟수 */
  reactionPerSecond: 2,
  /** 허용 이모티콘 종류 */
  reactions: ['like', 'flame', 'thumb'] as const,
  /** Redis 관전자 수 키 prefix */
  redisViewerPrefix: 'watch:viewers:',
  /** 데모 라운드 타이밍 */
  demo: {
    selectionMs: 2_500,
    revealMs: 1_500,
    resultMs: 2_000,
    betweenMatchesMs: 5_000,
  },
} as const;

export type WatchReactionKind = (typeof WATCH_POLICY.reactions)[number];

export function isWatchReaction(value: string): value is WatchReactionKind {
  return (WATCH_POLICY.reactions as readonly string[]).includes(value);
}
