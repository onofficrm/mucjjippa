import { afterAll, describe, expect, it } from 'vitest';
import { cleanupUsers, createTestUser } from '../helpers/fixtures.js';
import { api, closeApp } from '../helpers/http.js';

describe('통합: 랭킹 조회', () => {
  const userIds: string[] = [];

  afterAll(async () => {
    await cleanupUsers(userIds);
    await closeApp();
  });

  it('랭킹 API가 목록을 반환한다', async () => {
    const { user, password, loginId } = await createTestUser({
      points: 1000,
    });
    // 최소 게임 수 충족을 위해 스탯 업데이트
    const { prisma } = await import('../../src/lib/prisma.js');
    await prisma.user.update({
      where: { id: user.id },
      data: { wins: 12, losses: 3, draws: 0, currentStreak: 3, maxStreak: 5 },
    });
    userIds.push(user.id);

    const login = await api('POST', '/auth/login', {
      body: { loginId, password },
    });
    const token = login.json.data.accessToken as string;

    const ranking = await api('GET', '/rankings/win-rate?page=1&limit=20', { token });
    expect(ranking.json.success).toBe(true);
    expect(Array.isArray(ranking.json.data.items)).toBe(true);
  });
});
