/**
 * 랭킹 순수 계산 헬퍼 — 단위 테스트용.
 * 서비스 레이어의 정렬·승률·토너먼트 점수 규칙을 부작용 없이 검증한다.
 */

export function computeWinRate(wins: number, losses: number, draws: number): number {
  const total = wins + losses + draws;
  if (total <= 0) return 0;
  return Number(((wins / total) * 100).toFixed(1));
}

export function computeTournamentScore(input: {
  wins: number;
  seconds: number;
  thirds: number;
  fourths: number;
}): number {
  return input.wins * 100 + input.seconds * 50 + input.thirds * 25 + input.fourths * 10;
}

export type RankableRow = {
  id: string;
  nickname: string;
  score: number;
  tiebreak: number[];
};

/** 점수 → 타이브레이크 → 닉네임(ko) 순 정렬. 동점도 순차 순위. */
export function sortRankable(rows: RankableRow[]): RankableRow[] {
  return [...rows].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    for (let i = 0; i < Math.max(a.tiebreak.length, b.tiebreak.length); i += 1) {
      const d = (b.tiebreak[i] ?? 0) - (a.tiebreak[i] ?? 0);
      if (d !== 0) return d;
    }
    return a.nickname.localeCompare(b.nickname, 'ko');
  });
}

export function assignRanks(rows: RankableRow[]): Array<RankableRow & { rank: number }> {
  return sortRankable(rows).map((row, index) => ({ ...row, rank: index + 1 }));
}
