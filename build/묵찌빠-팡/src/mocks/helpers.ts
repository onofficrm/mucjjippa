let sequence = 0;

/** Mock 상태에서도 중복 거래를 막기 위한 거래·요청 식별자 */
export function createTransactionId(prefix: string): string {
  sequence += 1;
  return `${prefix}_${Date.now().toString(36)}_${sequence.toString(36)}`;
}

export function createRequestId(prefix: string): string {
  return createTransactionId(prefix);
}

export function pickRandom<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

export function nowLabel(): string {
  return new Date().toLocaleString();
}
