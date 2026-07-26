import { afterAll, describe, expect, it } from 'vitest';
import { cleanupUsers, uniqueSuffix } from '../helpers/fixtures.js';
import { api, closeApp } from '../helpers/http.js';

describe('통합: 회원가입·로그인·포인트 조회', () => {
  const userIds: string[] = [];

  afterAll(async () => {
    await cleanupUsers(userIds);
    await closeApp();
  });

  it('회원가입 → 로그인 → 지갑 조회', async () => {
    const suffix = uniqueSuffix();
    const loginId = `reg_${suffix}`;
    const nickname = `가입_${suffix.slice(-6)}`;
    const password = 'Test1234!';

    const signup = await api('POST', '/auth/signup', {
      body: {
        loginId,
        password,
        nickname,
        agreeTerms: true,
        agreePrivacy: true,
      },
    });
    expect(signup.status).toBeLessThan(400);
    expect(signup.json.success).toBe(true);
    expect(signup.json.data.accessToken).toBeTruthy();
    const userId = signup.json.data.user.id as string;
    userIds.push(userId);

    const login = await api('POST', '/auth/login', {
      body: { loginId, password },
    });
    expect(login.json.success).toBe(true);
    const token = login.json.data.accessToken as string;

    const wallet = await api('GET', '/wallet', { token });
    expect(wallet.json.success).toBe(true);
    expect(typeof wallet.json.data.points).toBe('number');
    expect(typeof wallet.json.data.tickets).toBe('number');
  });

  it('잘못된 비밀번호는 로그인 실패', async () => {
    const suffix = uniqueSuffix();
    const loginId = `bad_${suffix}`;
    const signup = await api('POST', '/auth/signup', {
      body: {
        loginId,
        password: 'Test1234!',
        nickname: `실패_${suffix.slice(-6)}`,
        agreeTerms: true,
        agreePrivacy: true,
      },
    });
    userIds.push(signup.json.data.user.id);

    const fail = await api('POST', '/auth/login', {
      body: { loginId, password: 'WrongPass9!' },
    });
    expect(fail.json.success).toBe(false);
    expect(fail.status).toBeGreaterThanOrEqual(400);
  });
});
