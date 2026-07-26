/**
 * 300P 3선택 전략 대전 판정 규칙 문서 겸 테스트.
 * 실행: npm run check:strategy
 */
import assert from 'node:assert/strict';
import {
  InvalidStrategyChoicesError,
  StrategyAggregation,
  StrategyTiebreak,
  determineThreeChoiceWinner,
  validateChoices,
  type StrategyRules,
} from './strategy.js';

const cases: Array<[string, () => void]> = [];
function test(name: string, fn: () => void) {
  cases.push([name, fn]);
}

// ── 규칙 1: 같은 순번끼리 비교하며, 순서는 절대 뒤바뀌지 않는다 ──────────────
test('같은 순번끼리 비교한다', () => {
  const outcome = determineThreeChoiceWinner(
    ['ROCK', 'PAPER', 'SCISSORS'],
    ['SCISSORS', 'ROCK', 'PAPER']
  );
  assert.deepEqual(
    outcome.rounds.map((round) => round.winner),
    ['player1', 'player1', 'player1']
  );
  assert.equal(outcome.winner, 'player1');
  assert.equal(outcome.player1Wins, 3);
});

test('순서가 다르면 결과도 다르다 (순서 유지 확인)', () => {
  const forward = determineThreeChoiceWinner(
    ['ROCK', 'PAPER', 'SCISSORS'],
    ['PAPER', 'ROCK', 'ROCK']
  );
  const reordered = determineThreeChoiceWinner(
    ['SCISSORS', 'PAPER', 'ROCK'],
    ['PAPER', 'ROCK', 'ROCK']
  );
  assert.equal(forward.winner, 'player2');
  assert.equal(reordered.winner, 'player1');
});

// ── 규칙 2: 순번별 승패는 클래식 가위바위보 (프로토타입 judge 와 동일) ──────
test('각 순번 판정은 클래식 가위바위보', () => {
  const outcome = determineThreeChoiceWinner(
    ['ROCK', 'SCISSORS', 'PAPER'],
    ['SCISSORS', 'PAPER', 'ROCK']
  );
  assert.deepEqual(
    outcome.rounds.map((round) => round.winner),
    ['player1', 'player1', 'player1']
  );
});

test('같은 패는 해당 순번 무승부이며 승수에 반영되지 않는다', () => {
  const outcome = determineThreeChoiceWinner(
    ['ROCK', 'ROCK', 'ROCK'],
    ['ROCK', 'ROCK', 'ROCK']
  );
  assert.equal(outcome.draws, 3);
  assert.equal(outcome.player1Wins, 0);
  assert.equal(outcome.player2Wins, 0);
  assert.equal(outcome.winner, 'draw');
});

// ── 규칙 3: 3회 결과에서 더 많이 이긴 쪽이 매치 승자 ────────────────────────
test('2승 1패면 승자', () => {
  const outcome = determineThreeChoiceWinner(
    ['ROCK', 'ROCK', 'SCISSORS'],
    ['SCISSORS', 'SCISSORS', 'ROCK']
  );
  assert.equal(outcome.player1Wins, 2);
  assert.equal(outcome.player2Wins, 1);
  assert.equal(outcome.winner, 'player1');
});

test('1승 0패 2무도 승자', () => {
  const outcome = determineThreeChoiceWinner(
    ['ROCK', 'ROCK', 'PAPER'],
    ['ROCK', 'ROCK', 'ROCK']
  );
  assert.equal(outcome.player1Wins, 1);
  assert.equal(outcome.draws, 2);
  assert.equal(outcome.winner, 'player1');
});

// ── 규칙 4 (예외): 승수가 같으면 매치 무승부 → 추가 참가비 없이 새 세트 ─────
test('1승 1패 1무는 매치 무승부', () => {
  const outcome = determineThreeChoiceWinner(
    ['ROCK', 'SCISSORS', 'PAPER'],
    ['SCISSORS', 'ROCK', 'PAPER']
  );
  assert.equal(outcome.player1Wins, 1);
  assert.equal(outcome.player2Wins, 1);
  assert.equal(outcome.draws, 1);
  assert.equal(outcome.winner, 'draw');
});

test('전부 무승부도 매치 무승부', () => {
  const outcome = determineThreeChoiceWinner(
    ['ROCK', 'PAPER', 'SCISSORS'],
    ['ROCK', 'PAPER', 'SCISSORS']
  );
  assert.equal(outcome.winner, 'draw');
});

// ── 규칙 5: 판정 규칙은 설정으로 교체 가능하다 ──────────────────────────────
test('tiebreak LAST_ROUND_WINS 로 교체 가능', () => {
  const rules: StrategyRules = {
    aggregation: StrategyAggregation.MOST_ROUND_WINS,
    tiebreak: StrategyTiebreak.LAST_ROUND_WINS,
    choiceCount: 3,
  };
  const outcome = determineThreeChoiceWinner(
    ['ROCK', 'SCISSORS', 'ROCK'],
    ['SCISSORS', 'ROCK', 'SCISSORS'],
    rules
  );
  assert.equal(outcome.player1Wins, 2);
  assert.equal(outcome.winner, 'player1');

  const tied = determineThreeChoiceWinner(
    ['ROCK', 'SCISSORS', 'PAPER'],
    ['SCISSORS', 'ROCK', 'SCISSORS'],
    rules
  );
  assert.equal(tied.player1Wins, 1);
  assert.equal(tied.player2Wins, 2);
  assert.equal(tied.winner, 'player2');
});

test('aggregation FIRST_TO_TWO 로 교체 가능', () => {
  const rules: StrategyRules = {
    aggregation: StrategyAggregation.FIRST_TO_TWO,
    tiebreak: StrategyTiebreak.REMATCH,
    choiceCount: 3,
  };
  // 1,2번에서 player1 2승 → 3번을 지더라도 player1 승
  const outcome = determineThreeChoiceWinner(
    ['ROCK', 'ROCK', 'SCISSORS'],
    ['SCISSORS', 'SCISSORS', 'ROCK'],
    rules
  );
  assert.equal(outcome.winner, 'player1');
  assert.equal(outcome.rounds.length, 3, '모든 순번은 공개용으로 계산된다');
});

// ── 규칙 6: 입력 검증 (정확히 3개 · 유효한 값만) ────────────────────────────
test('정확히 3개만 허용', () => {
  assert.deepEqual(validateChoices(['ROCK', 'PAPER', 'SCISSORS']), [
    'ROCK',
    'PAPER',
    'SCISSORS',
  ]);
  assert.throws(() => validateChoices(['ROCK', 'PAPER']), InvalidStrategyChoicesError);
  assert.throws(
    () => validateChoices(['ROCK', 'PAPER', 'ROCK', 'ROCK']),
    InvalidStrategyChoicesError
  );
});

test('유효하지 않은 값 거부', () => {
  assert.throws(
    () => validateChoices(['ROCK', 'PAPER', 'LIZARD']),
    InvalidStrategyChoicesError
  );
  assert.throws(() => validateChoices(['ROCK', 'PAPER', 3]), InvalidStrategyChoicesError);
  assert.throws(() => validateChoices('ROCK'), InvalidStrategyChoicesError);
  assert.throws(() => validateChoices(null), InvalidStrategyChoicesError);
});

test('소문자·공백은 정규화해서 받는다 (프론트 rock/paper/scissors 호환)', () => {
  assert.deepEqual(validateChoices([' rock ', 'Paper', 'SCISSORS']), [
    'ROCK',
    'PAPER',
    'SCISSORS',
  ]);
});

test('양쪽 선택 개수가 다르면 판정 거부', () => {
  assert.throws(
    () => determineThreeChoiceWinner(['ROCK', 'PAPER'], ['ROCK', 'PAPER', 'ROCK']),
    InvalidStrategyChoicesError
  );
});

// ── 규칙 7: 판정은 순수 함수 (같은 입력 → 같은 결과) ────────────────────────
test('같은 입력이면 항상 같은 결과', () => {
  const a = determineThreeChoiceWinner(
    ['ROCK', 'PAPER', 'SCISSORS'],
    ['PAPER', 'SCISSORS', 'ROCK']
  );
  const b = determineThreeChoiceWinner(
    ['ROCK', 'PAPER', 'SCISSORS'],
    ['PAPER', 'SCISSORS', 'ROCK']
  );
  assert.deepEqual(a, b);
  assert.equal(a.winner, 'player2');
});

let failed = 0;
for (const [name, fn] of cases) {
  try {
    fn();
    console.log(`  ok  ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`  FAIL ${name}`);
    console.error(error instanceof Error ? error.message : error);
  }
}

if (failed > 0) {
  console.error(`\nstrategy checks failed: ${failed}/${cases.length}`);
  process.exit(1);
}
console.log(`\nstrategy unit checks passed (${cases.length})`);
