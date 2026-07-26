/**
 * 300P 3선택 전략 대전 판정 — 순수 함수.
 *
 * 기획 규칙 (프론트 프로토타입 유지):
 *  1) 각자 가위/바위/보를 "순서대로" 3개 제출한다.
 *  2) 같은 순번끼리 비교한다. (1번 vs 1번, 2번 vs 2번, 3번 vs 3번)
 *  3) 각 순번의 승패는 프로토타입과 동일한 클래식 가위바위보 규칙을 쓴다.
 *  4) 3회 결과에서 더 많이 이긴 쪽이 매치 승자다. (aggregation)
 *  5) 승수가 같으면 매치 무승부이며, 추가 참가비 없이 새 세트를 진행한다. (tiebreak)
 *
 * 규칙은 STRATEGY_RULES 로 교체 가능하다.
 */
import { determineRpsWinner, type RpsChoice, type RpsWinner } from './rps.js';

export const CHOICE_COUNT = 3;

export enum StrategyAggregation {
  /** 3회 중 더 많이 이긴 쪽이 승자 */
  MOST_ROUND_WINS = 'MOST_ROUND_WINS',
  /** 먼저 2승에 도달한 쪽이 승자 (남은 순번은 결과에 영향 없음) */
  FIRST_TO_TWO = 'FIRST_TO_TWO',
}

export enum StrategyTiebreak {
  /** 승수 동일 → 매치 무승부, 새 세트 재대결 */
  REMATCH = 'REMATCH',
  /** 승수 동일 → 마지막 순번 승자를 매치 승자로 (없으면 무승부) */
  LAST_ROUND_WINS = 'LAST_ROUND_WINS',
}

export interface StrategyRules {
  aggregation: StrategyAggregation;
  tiebreak: StrategyTiebreak;
  choiceCount: number;
}

export const STRATEGY_RULES: StrategyRules = {
  aggregation: StrategyAggregation.MOST_ROUND_WINS,
  tiebreak: StrategyTiebreak.REMATCH,
  choiceCount: CHOICE_COUNT,
};

export interface StrategySubRound {
  index: number;
  player1Choice: RpsChoice;
  player2Choice: RpsChoice;
  winner: RpsWinner;
}

export interface StrategyOutcome {
  rounds: StrategySubRound[];
  player1Wins: number;
  player2Wins: number;
  draws: number;
  /** 'draw' 는 매치 무승부(재대결 대상) */
  winner: RpsWinner;
}

export class InvalidStrategyChoicesError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidStrategyChoicesError';
  }
}

/** 정확히 N개 · 유효한 값만 허용. 순서는 그대로 보존한다. */
export function validateChoices(
  raw: unknown,
  rules: StrategyRules = STRATEGY_RULES
): RpsChoice[] {
  if (!Array.isArray(raw)) {
    throw new InvalidStrategyChoicesError('choices 는 배열이어야 합니다');
  }
  if (raw.length !== rules.choiceCount) {
    throw new InvalidStrategyChoicesError(
      `choices 는 정확히 ${rules.choiceCount}개여야 합니다`
    );
  }
  return raw.map((value, index) => {
    if (typeof value !== 'string') {
      throw new InvalidStrategyChoicesError(`${index + 1}번째 선택이 올바르지 않습니다`);
    }
    const normalized = value.trim().toUpperCase();
    if (normalized !== 'ROCK' && normalized !== 'PAPER' && normalized !== 'SCISSORS') {
      throw new InvalidStrategyChoicesError(`${index + 1}번째 선택이 올바르지 않습니다`);
    }
    return normalized;
  });
}

/**
 * 3선택 전략 대전 판정.
 * 부작용 없음 — 같은 입력이면 항상 같은 결과.
 */
export function determineThreeChoiceWinner(
  player1Choices: RpsChoice[],
  player2Choices: RpsChoice[],
  rules: StrategyRules = STRATEGY_RULES
): StrategyOutcome {
  if (
    player1Choices.length !== rules.choiceCount ||
    player2Choices.length !== rules.choiceCount
  ) {
    throw new InvalidStrategyChoicesError(
      `양쪽 모두 ${rules.choiceCount}개의 선택이 필요합니다`
    );
  }

  const rounds: StrategySubRound[] = [];
  let player1Wins = 0;
  let player2Wins = 0;
  let draws = 0;
  let decidedWinner: RpsWinner | null = null;

  for (let index = 0; index < rules.choiceCount; index += 1) {
    const winner = determineRpsWinner(player1Choices[index], player2Choices[index]);
    rounds.push({
      index: index + 1,
      player1Choice: player1Choices[index],
      player2Choice: player2Choices[index],
      winner,
    });

    if (winner === 'player1') player1Wins += 1;
    else if (winner === 'player2') player2Wins += 1;
    else draws += 1;

    if (
      rules.aggregation === StrategyAggregation.FIRST_TO_TWO &&
      decidedWinner === null
    ) {
      if (player1Wins >= 2) decidedWinner = 'player1';
      else if (player2Wins >= 2) decidedWinner = 'player2';
    }
  }

  let winner: RpsWinner;
  if (rules.aggregation === StrategyAggregation.FIRST_TO_TWO && decidedWinner) {
    winner = decidedWinner;
  } else if (player1Wins > player2Wins) {
    winner = 'player1';
  } else if (player2Wins > player1Wins) {
    winner = 'player2';
  } else if (rules.tiebreak === StrategyTiebreak.LAST_ROUND_WINS) {
    winner = rounds[rounds.length - 1]?.winner ?? 'draw';
  } else {
    winner = 'draw';
  }

  return { rounds, player1Wins, player2Wins, draws, winner };
}
