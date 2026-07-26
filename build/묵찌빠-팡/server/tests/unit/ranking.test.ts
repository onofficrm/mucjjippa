import { describe, expect, it } from 'vitest';
import {
  assignRanks,
  computeTournamentScore,
  computeWinRate,
  sortRankable,
} from '../../src/modules/rankings/calc.js';
import { periodBounds } from '../../src/modules/rankings/policy.js';

describe('랭킹 계산', () => {
  it('승률 계산 (소수점 1자리)', () => {
    expect(computeWinRate(0, 0, 0)).toBe(0);
    expect(computeWinRate(7, 3, 0)).toBe(70);
    expect(computeWinRate(1, 1, 1)).toBe(33.3);
  });

  it('토너먼트 점수 가중치', () => {
    expect(
      computeTournamentScore({ wins: 2, seconds: 1, thirds: 1, fourths: 2 })
    ).toBe(2 * 100 + 1 * 50 + 1 * 25 + 2 * 10);
  });

  it('점수·타이브레이크·닉네임 순 정렬 및 순차 랭크', () => {
    const ranked = assignRanks([
      { id: '1', nickname: '나을', score: 10, tiebreak: [1] },
      { id: '2', nickname: '가을', score: 20, tiebreak: [0] },
      { id: '3', nickname: '다를', score: 10, tiebreak: [5] },
      { id: '4', nickname: '라을', score: 10, tiebreak: [5] },
    ]);
    expect(ranked.map((r) => r.id)).toEqual(['2', '3', '4', '1']);
    // 동점(score+tiebreak)이면 닉네임 ko — 다를 < 라을
    expect(ranked[0].rank).toBe(1);
    expect(ranked[3].rank).toBe(4);
  });

  it('periodBounds 주간/월간', () => {
    const now = new Date('2026-07-26T12:00:00Z');
    const weekly = periodBounds('weekly', now);
    expect(weekly.end).toEqual(now);
    expect(weekly.start.getTime()).toBe(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const monthly = periodBounds('monthly', now);
    expect(monthly.start.getMonth()).toBe((now.getMonth() - 1 + 12) % 12);
  });

  it('sortRankable는 원본을 변경하지 않음', () => {
    const input = [
      { id: 'a', nickname: 'b', score: 1, tiebreak: [] },
      { id: 'c', nickname: 'a', score: 2, tiebreak: [] },
    ];
    const copy = [...input];
    sortRankable(input);
    expect(input).toEqual(copy);
  });
});
