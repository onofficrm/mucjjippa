import { afterAll, describe, expect, it } from 'vitest';
import { TournamentStatus, TournamentTier, TournamentType } from '@prisma/client';
import { prisma } from '../../src/lib/prisma.js';
import { cleanupUsers, createTestUser, uniqueSuffix } from '../helpers/fixtures.js';
import { api, closeApp } from '../helpers/http.js';

describe('통합: 토너먼트 참가·취소', () => {
  const userIds: string[] = [];
  let tournamentId = '';

  afterAll(async () => {
    if (tournamentId) {
      await prisma.tournamentParticipant.deleteMany({ where: { tournamentId } });
      await prisma.tournamentReward.deleteMany({ where: { tournamentId } });
      await prisma.tournamentMatch.deleteMany({ where: { tournamentId } });
      await prisma.tournament.deleteMany({ where: { id: tournamentId } });
    }
    await cleanupUsers(userIds);
    await closeApp();
  });

  it('참가 → 중복 참가 → 취소(환불)', async () => {
    const { user, password, loginId } = await createTestUser({ tickets: 5, points: 1000 });
    userIds.push(user.id);

    const startsAt = new Date(Date.now() + 60 * 60_000);
    const registrationEndsAt = new Date(Date.now() + 30 * 60_000);
    const tournament = await prisma.tournament.create({
      data: {
        name: `테스트토너먼트_${uniqueSuffix()}`,
        type: TournamentType.SPECIAL,
        tier: TournamentTier.BEGINNER,
        status: TournamentStatus.REGISTRATION,
        minParticipants: 2,
        maxParticipants: 16,
        bracketTarget: 8,
        entryTicket: 1,
        totalPrize: 1000,
        startsAt,
        registrationEndsAt,
      },
    });
    tournamentId = tournament.id;

    const login = await api('POST', '/auth/login', {
      body: { loginId, password },
    });
    const token = login.json.data.accessToken as string;

    const join1 = await api('POST', `/tournaments/${tournamentId}/join`, { token });
    expect(join1.json.success).toBe(true);
    expect(join1.json.data.registered).toBe(true);
    expect(join1.json.data.reason).toBeUndefined();

    const walletAfterJoin = await api('GET', '/wallet', { token });
    expect(walletAfterJoin.json.data.tickets).toBe(4);

    const join2 = await api('POST', `/tournaments/${tournamentId}/join`, { token });
    expect(join2.json.success).toBe(true);
    expect(join2.json.data.registered).toBe(true);
    expect(join2.json.data.reason).toBe('ALREADY_REGISTERED');

    const walletDup = await api('GET', '/wallet', { token });
    expect(walletDup.json.data.tickets).toBe(4);

    const cancel = await api('POST', `/tournaments/${tournamentId}/cancel`, { token });
    expect(cancel.json.success).toBe(true);
    const wallet = await api('GET', '/wallet', { token });
    expect(wallet.json.data.tickets).toBe(5);
  });
});
