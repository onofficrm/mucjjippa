import assert from 'node:assert/strict';
import { determineMinorityPass } from './qualifier.js';
import { buildBracketPlan } from './bracket.js';

// 소수결: 가장 적은 손 통과
{
  const result = determineMinorityPass([
    { userId: 'a', choice: 'ROCK' },
    { userId: 'b', choice: 'ROCK' },
    { userId: 'c', choice: 'PAPER' },
    { userId: 'd', choice: 'SCISSORS' },
    { userId: 'e', choice: 'SCISSORS' },
  ]);
  // PAPER=1 최소
  assert.equal(result.minorityChoice, 'PAPER');
  assert.deepEqual(result.survivors, ['c']);
  assert.equal(result.isTie, false);
}

// 최소 그룹 동률 → 재라운드
{
  const result = determineMinorityPass([
    { userId: 'a', choice: 'ROCK' },
    { userId: 'b', choice: 'PAPER' },
    { userId: 'c', choice: 'SCISSORS' },
  ]);
  assert.equal(result.isTie, true);
  assert.equal(result.minorityChoice, null);
  assert.equal(result.survivors.length, 3);
}

// 대진표: 5명 → 8슬롯, 부전승 포함, nextKey 연결
{
  const plans = buildBracketPlan([
    { userId: 'u1', seed: 1 },
    { userId: 'u2', seed: 2 },
    { userId: 'u3', seed: 3 },
    { userId: 'u4', seed: 4 },
    { userId: 'u5', seed: 5 },
  ]);
  assert.ok(plans.length >= 7); // 8강 4 + 준결승 2 + 결승 1 + 3·4위
  const byes = plans.filter((p) => p.autoWinnerId);
  assert.ok(byes.length >= 1);
  const semis = plans.filter((p) => p.roundLabel === '준결승');
  assert.equal(semis.length, 2);
  assert.equal(semis[0].winsRequired, 2);
  const final = plans.find((p) => p.roundLabel === '결승');
  assert.ok(final);
  assert.equal(final!.winsRequired, 2);
  assert.ok(plans.some((p) => p.isThirdPlace));
}

console.log('tournament unit checks passed');
