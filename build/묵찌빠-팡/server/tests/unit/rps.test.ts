import { describe, expect, it } from 'vitest';
import {
  determineRpsWinner,
  fromClientChoice,
  randomRpsChoice,
  toClientChoice,
} from '../../src/modules/match/rps.js';

describe('가위바위보 승패 함수', () => {
  it('같은 손이면 무승부', () => {
    expect(determineRpsWinner('ROCK', 'ROCK')).toBe('draw');
    expect(determineRpsWinner('PAPER', 'PAPER')).toBe('draw');
    expect(determineRpsWinner('SCISSORS', 'SCISSORS')).toBe('draw');
  });

  it('클래식 승패 규칙', () => {
    expect(determineRpsWinner('ROCK', 'SCISSORS')).toBe('player1');
    expect(determineRpsWinner('SCISSORS', 'PAPER')).toBe('player1');
    expect(determineRpsWinner('PAPER', 'ROCK')).toBe('player1');
    expect(determineRpsWinner('SCISSORS', 'ROCK')).toBe('player2');
    expect(determineRpsWinner('PAPER', 'SCISSORS')).toBe('player2');
    expect(determineRpsWinner('ROCK', 'PAPER')).toBe('player2');
  });

  it('클라이언트 선택 정규화', () => {
    expect(fromClientChoice('rock')).toBe('ROCK');
    expect(fromClientChoice(' Paper ')).toBe('PAPER');
    expect(fromClientChoice('invalid')).toBeNull();
    expect(toClientChoice('ROCK')).toBe('rock');
  });

  it('시드 기반 랜덤은 결정적', () => {
    expect(randomRpsChoice(42)).toBe(randomRpsChoice(42));
  });
});
