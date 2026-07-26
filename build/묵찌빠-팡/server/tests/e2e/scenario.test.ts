/**
 * 주요 E2E 시나리오 (API + Socket).
 * 회원가입 → 로그인 → 10P 대전 → 포인트 반영 → 토너먼트 참가 → 랭킹 확인
 */
import { afterAll, describe, expect, it } from 'vitest';
import { TournamentStatus, TournamentTier, TournamentType } from '@prisma/client';
import { prisma } from '../../src/lib/prisma.js';
import { cleanupUsers, uniqueSuffix } from '../helpers/fixtures.js';
import { api, closeApp, getListeningApp } from '../helpers/http.js';
import { connectSocket, disconnectSocket, onceEvent } from '../helpers/socket.js';

describe('E2E 시나리오', () => {
  const userIds: string[] = [];
  let tournamentId = '';

  afterAll(async () => {
    if (tournamentId) {
      await prisma.tournamentParticipant.deleteMany({ where: { tournamentId } });
      await prisma.tournament.deleteMany({ where: { id: tournamentId } });
    }
    await cleanupUsers(userIds);
    await closeApp();
  });

  it('회원가입 → 로그인 → 10P 대전 → 포인트 → 토너먼트 → 랭킹', async () => {
    const { baseUrl } = await getListeningApp();
    const suffix = uniqueSuffix();

    // 1) 회원가입 (플레이어 A/B)
    const players = [];
    for (const tag of ['a', 'b'] as const) {
      const loginId = `e2e_${tag}_${suffix}`;
      const nickname = `E2E${tag}${suffix.slice(-5)}`;
      const signup = await api('POST', '/auth/signup', {
        body: {
          loginId,
          password: 'Test1234!',
          nickname,
          agreeTerms: true,
          agreePrivacy: true,
        },
      });
      expect(signup.json.success).toBe(true);
      userIds.push(signup.json.data.user.id);
      players.push({
        loginId,
        token: signup.json.data.accessToken as string,
        userId: signup.json.data.user.id as string,
      });
    }

    // 2) 로그인 재확인
    const reLogin = await api('POST', '/auth/login', {
      body: { loginId: players[0].loginId, password: 'Test1234!' },
    });
    expect(reLogin.json.success).toBe(true);
    players[0].token = reLogin.json.data.accessToken;

    const wallet0 = await api('GET', '/wallet', { token: players[0].token });
    const pointsBefore = wallet0.json.data.points as number;

    // 3) 10P 매칭 · 게임 결과
    const sockA = await connectSocket(baseUrl, players[0].token);
    const sockB = await connectSocket(baseUrl, players[1].token);
    try {
      const found = onceEvent<{ matchId: string }>(sockA, 'MATCH_FOUND');
      sockA.emit('MATCH_QUEUE_JOIN', { stake: 10 });
      sockB.emit('MATCH_QUEUE_JOIN', { stake: 10 });
      const match = await found;
      await Promise.all([
        onceEvent(sockA, 'ROUND_STARTED'),
        onceEvent(sockB, 'ROUND_STARTED'),
      ]);

      const resultA = onceEvent<{ outcome: string }>(sockA, 'ROUND_RESULT');
      sockA.emit('CHOICE_SUBMIT', { matchId: match.matchId, choice: 'paper' });
      sockB.emit('CHOICE_SUBMIT', { matchId: match.matchId, choice: 'rock' });
      expect((await resultA).outcome).toBe('win');

      await Promise.race([
        onceEvent(sockA, 'MATCH_FINISHED'),
        onceEvent(sockB, 'MATCH_FINISHED'),
      ]);
    } finally {
      await disconnectSocket(sockA);
      await disconnectSocket(sockB);
    }

    // 4) 포인트 반영 (입장 -10 + 승리 +20)
    const wallet1 = await api('GET', '/wallet', { token: players[0].token });
    expect(wallet1.json.data.points).toBe(pointsBefore - 10 + 20);

    // 5) 토너먼트 참가 (대기실 = REGISTRATION)
    // 티켓이 부족할 수 있어 직접 충전
    await prisma.wallet.update({
      where: { userId: players[0].userId },
      data: { ticketBalance: { increment: 2 } },
    });
    const tournament = await prisma.tournament.create({
      data: {
        name: `E2E토너먼트_${suffix}`,
        type: TournamentType.SPECIAL,
        tier: TournamentTier.BEGINNER,
        status: TournamentStatus.REGISTRATION,
        minParticipants: 2,
        maxParticipants: 16,
        bracketTarget: 8,
        entryTicket: 1,
        totalPrize: 500,
        startsAt: new Date(Date.now() + 3600_000),
        registrationEndsAt: new Date(Date.now() + 1800_000),
      },
    });
    tournamentId = tournament.id;

    const join = await api('POST', `/tournaments/${tournamentId}/join`, {
      token: players[0].token,
    });
    expect(join.json.success).toBe(true);
    expect(join.json.data.registered).toBe(true);

    const detail = await api('GET', `/tournaments/${tournamentId}`, {
      token: players[0].token,
    });
    expect(detail.json.success).toBe(true);

    // 6) 랭킹 확인
    await prisma.user.update({
      where: { id: players[0].userId },
      data: { wins: { increment: 10 }, losses: 2 },
    });
    const ranking = await api('GET', '/rankings/win-rate?limit=50', {
      token: players[0].token,
    });
    expect(ranking.json.success).toBe(true);
    expect(Array.isArray(ranking.json.data.items)).toBe(true);
  }, 60_000);
});
