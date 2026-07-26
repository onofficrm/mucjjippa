/**
 * 토너먼트 예선·본선·결승·보상 흐름 (서비스 레벨 통합).
 * 소켓 라이브 타이머 대신 순수 판정 + 엔진 공개 API / DB 상태를 검증한다.
 */
import { afterAll, describe, expect, it } from 'vitest';
import {
  TournamentMatchStatus,
  TournamentParticipantStatus,
  TournamentStatus,
  TournamentTier,
  TournamentType,
} from '@prisma/client';
import { determineMinorityPass } from '../../src/modules/tournament/qualifier.js';
import { buildBracketPlan } from '../../src/modules/tournament/bracket.js';
import { advanceWinner } from '../../src/modules/tournament/advance.js';
import { prisma } from '../../src/lib/prisma.js';
import { cleanupUsers, createTestUser, uniqueSuffix } from '../helpers/fixtures.js';
import { joinTournament } from '../../src/modules/tournament/service.js';

describe('통합: 토너먼트 예선→본선→결승→보상 시나리오', () => {
  const userIds: string[] = [];
  let tournamentId = '';

  afterAll(async () => {
    if (tournamentId) {
      await prisma.tournamentReward.deleteMany({ where: { tournamentId } });
      await prisma.tournamentMatch.deleteMany({ where: { tournamentId } });
      await prisma.tournamentParticipant.deleteMany({ where: { tournamentId } });
      await prisma.tournament.deleteMany({ where: { id: tournamentId } });
    }
    await cleanupUsers(userIds);
  });

  it('소수결 예선 → 대진표 → 승자 전진 → 보상표 적용', async () => {
    const players = await Promise.all(
      Array.from({ length: 4 }, () => createTestUser({ tickets: 3, points: 1000 }))
    );
    userIds.push(...players.map((p) => p.user.id));

    const tournament = await prisma.tournament.create({
      data: {
        name: `시나리오_${uniqueSuffix()}`,
        type: TournamentType.SPECIAL,
        tier: TournamentTier.BEGINNER,
        status: TournamentStatus.REGISTRATION,
        minParticipants: 4,
        maxParticipants: 8,
        bracketTarget: 4,
        entryTicket: 1,
        totalPrize: 400,
        startsAt: new Date(Date.now() + 3600_000),
        registrationEndsAt: new Date(Date.now() + 1800_000),
        rewards: {
          create: [
            { rankFrom: 1, rankTo: 1, pointReward: 200, label: '우승' },
            { rankFrom: 2, rankTo: 2, pointReward: 100, label: '준우승' },
            { rankFrom: 3, rankTo: 4, pointReward: 50, label: '4강' },
          ],
        },
      },
      include: { rewards: true },
    });
    tournamentId = tournament.id;

    for (const p of players) {
      const joined = await joinTournament(tournament.id, p.user.id);
      expect(joined.registered).toBe(true);
    }

    // 예선: ROCK 3 · PAPER 1 → PAPER 소수 생존
    const minority = determineMinorityPass([
      { userId: players[0].user.id, choice: 'ROCK' },
      { userId: players[1].user.id, choice: 'ROCK' },
      { userId: players[2].user.id, choice: 'PAPER' },
      { userId: players[3].user.id, choice: 'ROCK' },
    ]);
    expect(minority.isTie).toBe(false);
    expect(minority.survivors).toEqual([players[2].user.id]);

    // 본선 대진(4인) — 전원 통과했다고 가정
    const plan = buildBracketPlan(
      players.map((p, i) => ({ userId: p.user.id, seed: i + 1 }))
    );
    expect(plan.some((m) => m.roundLabel === '결승')).toBe(true);

    // 승자 전진 시뮬레이션
    let state = plan.map((m) => ({
      key: m.key,
      player1Id: m.player1Id,
      player2Id: m.player2Id,
      nextKey: m.nextKey,
    }));
    const semis = plan.filter((m) => m.roundLabel === '준결승');
    if (semis.length === 2) {
      const w1 = semis[0].player1Id!;
      const w2 = semis[1].player1Id!;
      state = advanceWinner(state, semis[0].key, w1).matches;
      state = advanceWinner(state, semis[1].key, w2).matches;
      const final = state.find((m) => m.key === semis[0].nextKey);
      expect(final?.player1Id).toBeTruthy();
      expect(final?.player2Id).toBeTruthy();
    }

    // 보상표 존재 확인
    expect(tournament.rewards).toHaveLength(3);
    expect(tournament.rewards.find((r) => r.rankFrom === 1)?.pointReward).toBe(200);

    // DB 참가자 4명
    const count = await prisma.tournamentParticipant.count({
      where: {
        tournamentId,
        status: TournamentParticipantStatus.REGISTERED,
      },
    });
    expect(count).toBe(4);

    // 매치 행을 수동으로 만들고 COMPLETED + 보상 지급 키 멱등 검증은 concurrency 스위트에서 커버
    await prisma.tournamentMatch.create({
      data: {
        tournamentId,
        round: 99,
        bracketPosition: 1,
        roundLabel: '결승',
        status: TournamentMatchStatus.COMPLETED,
        player1Id: players[0].user.id,
        player2Id: players[1].user.id,
        winnerId: players[0].user.id,
        winsRequired: 2,
        player1Wins: 2,
        player2Wins: 0,
        completedAt: new Date(),
      },
    });
  });
});
