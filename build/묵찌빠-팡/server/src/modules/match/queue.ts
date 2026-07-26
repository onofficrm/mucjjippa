import { levelDeltaAllowed, type MatchStake } from './policy.js';
import type { QueueEntry } from './types.js';

/** 스테이크별 매칭 큐. 동일 유저 중복 등록 금지. */
class MatchQueue {
  private queues = new Map<MatchStake, QueueEntry[]>();
  private byUser = new Map<string, MatchStake>();

  private list(stake: MatchStake): QueueEntry[] {
    let entries = this.queues.get(stake);
    if (!entries) {
      entries = [];
      this.queues.set(stake, entries);
    }
    return entries;
  }

  public hasUser(userId: string): boolean {
    return this.byUser.has(userId);
  }

  public getUserStake(userId: string): MatchStake | undefined {
    return this.byUser.get(userId);
  }

  public enqueue(entry: QueueEntry): void {
    if (this.byUser.has(entry.userId)) {
      throw new Error('ALREADY_QUEUED');
    }
    this.list(entry.stake).push(entry);
    this.byUser.set(entry.userId, entry.stake);
  }

  public remove(userId: string): QueueEntry | null {
    const stake = this.byUser.get(userId);
    if (!stake) return null;
    const entries = this.list(stake);
    const index = entries.findIndex((entry) => entry.userId === userId);
    if (index < 0) {
      this.byUser.delete(userId);
      return null;
    }
    const [removed] = entries.splice(index, 1);
    this.byUser.delete(userId);
    return removed ?? null;
  }

  public updateSocket(userId: string, socketId: string): void {
    const stake = this.byUser.get(userId);
    if (!stake) return;
    const entry = this.list(stake).find((item) => item.userId === userId);
    if (entry) entry.socketId = socketId;
  }

  /**
   * 같은 큐에서 실력(레벨) 가까운 상대를 찾는다.
   * 대기 시간이 길수록 levelDeltaAllowed 가 커진다.
   */
  public tryMatch(stake: MatchStake): [QueueEntry, QueueEntry] | null {
    const entries = this.list(stake);
    if (entries.length < 2) return null;

    const now = Date.now();
    for (let i = 0; i < entries.length; i += 1) {
      const a = entries[i];
      const waitA = now - a.enqueuedAt;
      const deltaA = levelDeltaAllowed(waitA);

      for (let j = i + 1; j < entries.length; j += 1) {
        const b = entries[j];
        const waitB = now - b.enqueuedAt;
        const deltaB = levelDeltaAllowed(waitB);
        const allowed = Math.max(deltaA, deltaB);
        if (Math.abs(a.level - b.level) <= allowed) {
          entries.splice(j, 1);
          entries.splice(i, 1);
          this.byUser.delete(a.userId);
          this.byUser.delete(b.userId);
          return [a, b];
        }
      }
    }
    return null;
  }

  public size(stake: MatchStake): number {
    return this.list(stake).length;
  }

  /** 운영 모니터링용 스냅샷 (읽기 전용 복사) */
  public snapshot(): Array<{ stake: MatchStake; entries: QueueEntry[] }> {
    return [...this.queues.entries()].map(([stake, entries]) => ({
      stake,
      entries: entries.map((entry) => ({ ...entry })),
    }));
  }

  public totalWaiting(): number {
    let total = 0;
    for (const entries of this.queues.values()) total += entries.length;
    return total;
  }
}

export const matchQueue = new MatchQueue();
