/**
 * 대진표 승자 전진 — 순수 함수.
 * engine.advanceWinnerToMatch 의 인메모리/플랜 버전.
 * 다음 매치의 빈 슬롯(player1 → player2)에 승자를 배치한다.
 */

export type AdvanceableMatch = {
  key: string;
  player1Id: string | null;
  player2Id: string | null;
  nextKey: string | null;
  winnerId?: string | null;
  status?: string;
};

export type AdvanceResult = {
  matches: AdvanceableMatch[];
  placed: boolean;
  nextKey: string | null;
  slot: 'player1' | 'player2' | null;
};

/**
 * fromKey 매치의 winnerId 를 nextKey 매치로 전진시킨다.
 * - next 가 없으면 placed=false (결승 등)
 * - player1 비어 있으면 player1, 아니면 player2 (동일 승자 중복 배치 방지)
 */
export function advanceWinner(
  matches: AdvanceableMatch[],
  fromKey: string,
  winnerId: string
): AdvanceResult {
  const source = matches.find((m) => m.key === fromKey);
  if (!source) {
    return { matches: [...matches], placed: false, nextKey: null, slot: null };
  }

  const updated = matches.map((m) =>
    m.key === fromKey ? { ...m, winnerId } : { ...m }
  );

  if (!source.nextKey) {
    return { matches: updated, placed: false, nextKey: null, slot: null };
  }

  let placed = false;
  let slot: 'player1' | 'player2' | null = null;
  const next = updated.map((m) => {
    if (m.key !== source.nextKey) return m;
    if (!m.player1Id) {
      placed = true;
      slot = 'player1';
      return { ...m, player1Id: winnerId };
    }
    if (!m.player2Id && m.player1Id !== winnerId) {
      placed = true;
      slot = 'player2';
      return { ...m, player2Id: winnerId };
    }
    return m;
  });

  return { matches: next, placed, nextKey: source.nextKey, slot };
}
