import { describe, expect, it, vi } from 'vitest';
import { buildBracketPlan } from '../../src/modules/tournament/bracket.js';
import { advanceWinner } from '../../src/modules/tournament/advance.js';

describe('대진표 생성', () => {
  it('4명 → 준결승 2 + 결승 1 + 3·4위 1', () => {
    // shuffle 고정
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const plans = buildBracketPlan([
      { userId: 'u1', seed: 1 },
      { userId: 'u2', seed: 2 },
      { userId: 'u3', seed: 3 },
      { userId: 'u4', seed: 4 },
    ]);
    vi.restoreAllMocks();

    expect(plans.filter((p) => p.roundLabel === '준결승')).toHaveLength(2);
    expect(plans.filter((p) => p.roundLabel === '결승')).toHaveLength(1);
    expect(plans.filter((p) => p.isThirdPlace)).toHaveLength(1);

    const semis = plans.filter((p) => p.roundLabel === '준결승');
    for (const semi of semis) {
      expect(semi.nextKey).toBe('r2-p1'); // both feed final
      expect(semi.player1Id).toBeTruthy();
      expect(semi.player2Id).toBeTruthy();
    }
  });

  it('3명 → 부전승 포함 4강 슬롯', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const plans = buildBracketPlan([
      { userId: 'a', seed: 1 },
      { userId: 'b', seed: 2 },
      { userId: 'c', seed: 3 },
    ]);
    vi.restoreAllMocks();
    const byes = plans.filter((p) => p.autoWinnerId);
    expect(byes.length).toBeGreaterThanOrEqual(1);
  });

  it('2명 미만은 빈 배열', () => {
    expect(buildBracketPlan([{ userId: 'solo', seed: 1 }])).toEqual([]);
  });
});

describe('승자 다음 경기 이동', () => {
  it('준결승 승자를 결승 player1/player2에 순차 배치', () => {
    const matches = [
      {
        key: 'r1-p1',
        player1Id: 'a',
        player2Id: 'b',
        nextKey: 'r2-p1',
      },
      {
        key: 'r1-p2',
        player1Id: 'c',
        player2Id: 'd',
        nextKey: 'r2-p1',
      },
      {
        key: 'r2-p1',
        player1Id: null,
        player2Id: null,
        nextKey: null,
      },
    ];

    const first = advanceWinner(matches, 'r1-p1', 'a');
    expect(first.placed).toBe(true);
    expect(first.slot).toBe('player1');
    expect(first.matches.find((m) => m.key === 'r2-p1')?.player1Id).toBe('a');

    const second = advanceWinner(first.matches, 'r1-p2', 'c');
    expect(second.placed).toBe(true);
    expect(second.slot).toBe('player2');
    const final = second.matches.find((m) => m.key === 'r2-p1');
    expect(final?.player1Id).toBe('a');
    expect(final?.player2Id).toBe('c');
  });

  it('결승(nextKey 없음)은 배치하지 않음', () => {
    const result = advanceWinner(
      [{ key: 'final', player1Id: 'a', player2Id: 'b', nextKey: null }],
      'final',
      'a'
    );
    expect(result.placed).toBe(false);
    expect(result.matches[0].winnerId).toBe('a');
  });
});
