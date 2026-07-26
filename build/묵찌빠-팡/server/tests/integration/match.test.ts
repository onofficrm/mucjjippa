import { afterAll, describe, expect, it } from 'vitest';
import { cleanupUsers, createTestUser } from '../helpers/fixtures.js';
import { api, closeApp, getListeningApp } from '../helpers/http.js';
import { connectSocket, disconnectSocket, onceEvent } from '../helpers/socket.js';

describe('통합: 매칭·게임·보상', () => {
  const userIds: string[] = [];

  afterAll(async () => {
    await cleanupUsers(userIds);
    await closeApp();
  });

  it('매칭 참가 → 게임 완료 → 승리 보상 포인트 반영', async () => {
    const { baseUrl } = await getListeningApp();

    const a = await createTestUser({ points: 1000, tickets: 0, nickname: undefined });
    const b = await createTestUser({ points: 1000, tickets: 0 });
    userIds.push(a.user.id, b.user.id);

    const loginA = await api('POST', '/auth/login', {
      body: { loginId: a.loginId, password: a.password },
    });
    const loginB = await api('POST', '/auth/login', {
      body: { loginId: b.loginId, password: b.password },
    });
    const tokenA = loginA.json.data.accessToken as string;
    const tokenB = loginB.json.data.accessToken as string;

    const walletBefore = await api('GET', '/wallet', { token: tokenA });
    const pointsBefore = walletBefore.json.data.points as number;

    const sockA = await connectSocket(baseUrl, tokenA);
    const sockB = await connectSocket(baseUrl, tokenB);

    try {
      const foundA = onceEvent<{ matchId: string }>(sockA, 'MATCH_FOUND');
      const foundB = onceEvent<{ matchId: string }>(sockB, 'MATCH_FOUND');
      sockA.emit('MATCH_QUEUE_JOIN', { stake: 10 });
      sockB.emit('MATCH_QUEUE_JOIN', { stake: 10 });

      const [matchA] = await Promise.all([foundA, foundB]);
      expect(matchA.matchId).toBeTruthy();

      await Promise.all([
        onceEvent(sockA, 'ROUND_STARTED'),
        onceEvent(sockB, 'ROUND_STARTED'),
      ]);

      const resultA = onceEvent<{ outcome: string }>(sockA, 'ROUND_RESULT');
      const resultB = onceEvent<{ outcome: string }>(sockB, 'ROUND_RESULT');
      sockA.emit('CHOICE_SUBMIT', { matchId: matchA.matchId, choice: 'rock' });
      sockB.emit('CHOICE_SUBMIT', { matchId: matchA.matchId, choice: 'scissors' });

      const [ra, rb] = await Promise.all([resultA, resultB]);
      expect(ra.outcome).toBe('win');
      expect(rb.outcome).toBe('loss');

      await Promise.race([
        onceEvent(sockA, 'MATCH_FINISHED'),
        onceEvent(sockB, 'MATCH_FINISHED'),
      ]);

      // 입장료 10 차감 + 보상 20 → 순 +10 (양쪽 입장 후 승자만 +20)
      const walletAfter = await api('GET', '/wallet', { token: tokenA });
      expect(walletAfter.json.data.points).toBe(pointsBefore - 10 + 20);
    } finally {
      await disconnectSocket(sockA);
      await disconnectSocket(sockB);
    }
  }, 45_000);

  it('매칭 취소', async () => {
    const { baseUrl } = await getListeningApp();
    const a = await createTestUser({ points: 500 });
    userIds.push(a.user.id);
    const login = await api('POST', '/auth/login', {
      body: { loginId: a.loginId, password: a.password },
    });
    const token = login.json.data.accessToken as string;
    const sock = await connectSocket(baseUrl, token);
    try {
      const started = onceEvent(sock, 'MATCH_SEARCH_STARTED');
      sock.emit('MATCH_QUEUE_JOIN', { stake: 10 });
      await started;
      const cancelled = onceEvent<{ reason: string }>(sock, 'MATCH_CANCELLED');
      sock.emit('MATCH_QUEUE_LEAVE', {});
      const payload = await cancelled;
      expect(['USER_CANCELLED', 'NOT_IN_QUEUE']).toContain(payload.reason);
    } finally {
      await disconnectSocket(sock);
    }
  }, 20_000);
});
