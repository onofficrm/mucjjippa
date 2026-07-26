/**
 * 본선 대진표 생성 — 랜덤 시드, 부전승, nextMatch 연결.
 */
import { nextPowerOfTwo, roundLabelForSize, winsRequiredForRound } from './policy.js';

export interface BracketPlayer {
  userId: string;
  seed: number;
}

export interface BracketMatchPlan {
  round: number;
  bracketPosition: number;
  roundLabel: string;
  player1Id: string | null;
  player2Id: string | null;
  winsRequired: number;
  isThirdPlace: boolean;
  nextKey: string | null;
  key: string;
  autoWinnerId: string | null;
}

function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * 싱글 엘리미네이션.
 * - players 랜덤 배치
 * - 2^n 슬롯, 빈칸은 부전승
 * - 준결승이 있으면 3·4위전 노드 추가
 */
export function buildBracketPlan(players: BracketPlayer[]): BracketMatchPlan[] {
  if (players.length < 2) return [];

  const shuffled = shuffle(players);
  const size = nextPowerOfTwo(shuffled.length);
  let slots: Array<string | null> = Array.from({ length: size }, () => null);
  shuffled.forEach((p, i) => {
    slots[i] = p.userId;
  });

  const plans: BracketMatchPlan[] = [];
  let round = 1;

  while (slots.length >= 2) {
    const label = roundLabelForSize(slots.length);
    const matchCount = slots.length / 2;
    const isFinal = matchCount === 1;

    for (let i = 0; i < matchCount; i += 1) {
      const p1 = slots[i * 2] ?? null;
      const p2 = slots[i * 2 + 1] ?? null;
      const key = `r${round}-p${i + 1}`;
      let autoWinnerId: string | null = null;
      if (p1 && !p2) autoWinnerId = p1;
      else if (!p1 && p2) autoWinnerId = p2;

      plans.push({
        round,
        bracketPosition: i + 1,
        roundLabel: label,
        player1Id: p1,
        player2Id: p2,
        winsRequired: winsRequiredForRound(label),
        isThirdPlace: false,
        nextKey: isFinal ? null : `r${round + 1}-p${Math.floor(i / 2) + 1}`,
        key,
        autoWinnerId,
      });
    }

    if (isFinal) break;
    slots = Array.from({ length: matchCount }, () => null);
    round += 1;
  }

  const semis = plans.filter((p) => p.roundLabel === '준결승');
  if (semis.length === 2) {
    plans.push({
      round: Math.max(...plans.map((p) => p.round)) + 1,
      bracketPosition: 1,
      roundLabel: '3·4위',
      player1Id: null,
      player2Id: null,
      winsRequired: winsRequiredForRound('3·4위', true),
      isThirdPlace: true,
      nextKey: null,
      key: 'third-place',
      autoWinnerId: null,
    });
  }

  return plans;
}
