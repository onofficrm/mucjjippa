import { describe, expect, it } from 'vitest';
import {
  determineThreeChoiceWinner,
  InvalidStrategyChoicesError,
  StrategyAggregation,
  StrategyTiebreak,
  validateChoices,
} from '../../src/modules/match/strategy.js';

describe('3선택 판정 함수', () => {
  it('다승 쪽이 매치 승자', () => {
    const outcome = determineThreeChoiceWinner(
      ['ROCK', 'ROCK', 'PAPER'],
      ['SCISSORS', 'PAPER', 'ROCK']
    );
    // P1: win, loss, win → 2:1
    expect(outcome.player1Wins).toBe(2);
    expect(outcome.player2Wins).toBe(1);
    expect(outcome.winner).toBe('player1');
  });

  it('승수 동률이면 재대결(draw)', () => {
    const outcome = determineThreeChoiceWinner(
      ['ROCK', 'PAPER', 'SCISSORS'],
      ['ROCK', 'PAPER', 'SCISSORS']
    );
    expect(outcome.winner).toBe('draw');
    expect(outcome.draws).toBe(3);
  });

  it('LAST_ROUND_WINS — 1:1 후 마지막 순번 승자', () => {
    // R1 P1(ROCK>SCISSORS), R2 P2(ROCK<PAPER), R3 P1(PAPER>ROCK) → 2:1
    const decided = determineThreeChoiceWinner(
      ['ROCK', 'ROCK', 'PAPER'],
      ['SCISSORS', 'PAPER', 'ROCK'],
      {
        aggregation: StrategyAggregation.MOST_ROUND_WINS,
        tiebreak: StrategyTiebreak.LAST_ROUND_WINS,
        choiceCount: 3,
      }
    );
    expect(decided.player1Wins).toBe(2);
    expect(decided.player2Wins).toBe(1);
    expect(decided.winner).toBe('player1');

    // R1 P1, R2 P2, R3 draw → 1:1 last=draw → draw
    const equalLast = determineThreeChoiceWinner(
      ['ROCK', 'ROCK', 'PAPER'],
      ['SCISSORS', 'PAPER', 'PAPER'],
      {
        aggregation: StrategyAggregation.MOST_ROUND_WINS,
        tiebreak: StrategyTiebreak.LAST_ROUND_WINS,
        choiceCount: 3,
      }
    );
    expect(equalLast.player1Wins).toBe(1);
    expect(equalLast.player2Wins).toBe(1);
    expect(equalLast.winner).toBe('draw');

    // R1 P1, R2 P2, R3 P2 → 1:2
    const p2Wins = determineThreeChoiceWinner(
      ['ROCK', 'ROCK', 'ROCK'],
      ['SCISSORS', 'PAPER', 'PAPER'],
      {
        aggregation: StrategyAggregation.MOST_ROUND_WINS,
        tiebreak: StrategyTiebreak.LAST_ROUND_WINS,
        choiceCount: 3,
      }
    );
    expect(p2Wins.player1Wins).toBe(1);
    expect(p2Wins.player2Wins).toBe(2);
    expect(p2Wins.winner).toBe('player2');
  });

  it('입력 검증', () => {
    expect(() => validateChoices(['ROCK', 'PAPER'])).toThrow(InvalidStrategyChoicesError);
    expect(validateChoices(['rock', 'paper', 'scissors'])).toEqual([
      'ROCK',
      'PAPER',
      'SCISSORS',
    ]);
  });
});
