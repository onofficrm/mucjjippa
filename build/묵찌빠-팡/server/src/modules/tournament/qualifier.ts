/**
 * 예선 소수결 — 순수 집계 함수.
 * 가장 적은 손을 고른 그룹이 통과. 동률(최소 그룹 2개 이상)이면 재라운드.
 */
import type { RpsChoice } from '@prisma/client';

export type QualifierTally = Record<RpsChoice, number>;

export interface MinorityResult {
  /** 동률이면 null → 재라운드 */
  minorityChoice: RpsChoice | null;
  tallies: QualifierTally;
  isTie: boolean;
  survivors: string[];
  eliminated: string[];
}

export function emptyTally(): QualifierTally {
  return { ROCK: 0, PAPER: 0, SCISSORS: 0 };
}

export function determineMinorityPass(
  choices: Array<{ userId: string; choice: RpsChoice }>
): MinorityResult {
  const tallies = emptyTally();
  for (const item of choices) {
    tallies[item.choice] += 1;
  }

  const counts = [tallies.ROCK, tallies.PAPER, tallies.SCISSORS].filter((n) => n > 0);
  if (counts.length === 0) {
    return {
      minorityChoice: null,
      tallies,
      isTie: true,
      survivors: [],
      eliminated: choices.map((c) => c.userId),
    };
  }

  const min = Math.min(...counts);
  const minorities = (['ROCK', 'PAPER', 'SCISSORS'] as RpsChoice[]).filter(
    (hand) => tallies[hand] === min && tallies[hand] > 0
  );

  if (minorities.length !== 1) {
    return {
      minorityChoice: null,
      tallies,
      isTie: true,
      survivors: choices.map((c) => c.userId),
      eliminated: [],
    };
  }

  const minorityChoice = minorities[0];
  const survivors: string[] = [];
  const eliminated: string[] = [];
  for (const item of choices) {
    if (item.choice === minorityChoice) survivors.push(item.userId);
    else eliminated.push(item.userId);
  }

  return { minorityChoice, tallies, isTie: false, survivors, eliminated };
}
