import { describe, expect, it } from 'vitest';
import { determineMinorityPass } from '../../src/modules/tournament/qualifier.js';

describe('소수결 판정 · 동률 재라운드', () => {
  it('가장 적은 손을 고른 그룹이 통과', () => {
    const result = determineMinorityPass([
      { userId: 'a', choice: 'ROCK' },
      { userId: 'b', choice: 'ROCK' },
      { userId: 'c', choice: 'PAPER' },
      { userId: 'd', choice: 'SCISSORS' },
      { userId: 'e', choice: 'SCISSORS' },
    ]);
    // ROCK2 PAPER1 SCISSORS2 → PAPER 소수
    expect(result.isTie).toBe(false);
    expect(result.minorityChoice).toBe('PAPER');
    expect(result.survivors).toEqual(['c']);
    expect(result.eliminated).toEqual(['a', 'b', 'd', 'e']);
  });

  it('최소 그룹이 2개 이상이면 동률 → 전원 생존(재라운드)', () => {
    const result = determineMinorityPass([
      { userId: 'a', choice: 'ROCK' },
      { userId: 'b', choice: 'PAPER' },
      { userId: 'c', choice: 'SCISSORS' },
    ]);
    expect(result.isTie).toBe(true);
    expect(result.minorityChoice).toBeNull();
    expect(result.survivors).toEqual(['a', 'b', 'c']);
    expect(result.eliminated).toEqual([]);
  });

  it('빈 입력은 동률 처리', () => {
    const result = determineMinorityPass([]);
    expect(result.isTie).toBe(true);
    expect(result.survivors).toEqual([]);
  });
});
