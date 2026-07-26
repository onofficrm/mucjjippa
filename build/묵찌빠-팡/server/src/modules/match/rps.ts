export type RpsChoice = 'ROCK' | 'PAPER' | 'SCISSORS';
export type RpsWinner = 'player1' | 'player2' | 'draw';

const BEATS: Record<RpsChoice, RpsChoice> = {
  ROCK: 'SCISSORS',
  PAPER: 'ROCK',
  SCISSORS: 'PAPER',
};

/**
 * 순수 가위바위보 판정 — 부작용 없음, 단위 테스트 가능.
 */
export function determineRpsWinner(
  player1Choice: RpsChoice,
  player2Choice: RpsChoice
): RpsWinner {
  if (player1Choice === player2Choice) return 'draw';
  if (BEATS[player1Choice] === player2Choice) return 'player1';
  return 'player2';
}

export function randomRpsChoice(seed?: number): RpsChoice {
  const choices: RpsChoice[] = ['ROCK', 'PAPER', 'SCISSORS'];
  if (seed === undefined) {
    return choices[Math.floor(Math.random() * choices.length)];
  }
  const x = Math.abs(Math.sin(seed) * 10_000);
  return choices[Math.floor(x) % 3];
}

export function toClientChoice(choice: RpsChoice): 'rock' | 'paper' | 'scissors' {
  return choice.toLowerCase() as 'rock' | 'paper' | 'scissors';
}

export function fromClientChoice(choice: string): RpsChoice | null {
  const normalized = choice.trim().toUpperCase();
  if (normalized === 'ROCK' || normalized === 'PAPER' || normalized === 'SCISSORS') {
    return normalized;
  }
  return null;
}
