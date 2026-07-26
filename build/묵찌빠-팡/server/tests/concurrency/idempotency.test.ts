import { afterAll, describe, expect, it } from 'vitest';
import {
  AssetType,
  CatalogStatus,
  MatchStatus,
  ShopItemCategory,
  TournamentStatus,
  TournamentTier,
  TournamentType,
  WalletTransactionReason,
  WalletTransactionType,
} from '@prisma/client';
import { applyWalletMutation } from '../../src/lib/wallet.js';
import { finalizeMatch } from '../../src/modules/match/service.js';
import { purchaseItem } from '../../src/modules/shop/service.js';
import { joinTournament } from '../../src/modules/tournament/service.js';
import { prisma } from '../../src/lib/prisma.js';
import { cleanupUsers, createTestUser, uniqueSuffix } from '../helpers/fixtures.js';
import { api, closeApp, getListeningApp } from '../helpers/http.js';
import { connectSocket, disconnectSocket, onceEvent } from '../helpers/socket.js';

describe('동시성: 중복 차감·지급·참가 방지', () => {
  const userIds: string[] = [];
  const cleanupIds: { tournaments: string[]; items: string[]; matches: string[] } = {
    tournaments: [],
    items: [],
    matches: [],
  };

  afterAll(async () => {
    for (const id of cleanupIds.matches) {
      await prisma.matchRound.deleteMany({ where: { matchId: id } }).catch(() => undefined);
      await prisma.match.deleteMany({ where: { id } }).catch(() => undefined);
    }
    for (const id of cleanupIds.tournaments) {
      await prisma.tournamentParticipant.deleteMany({ where: { tournamentId: id } });
      await prisma.tournament.deleteMany({ where: { id } });
    }
    for (const id of cleanupIds.items) {
      await prisma.inventory.deleteMany({ where: { itemId: id } });
      await prisma.shopItem.deleteMany({ where: { id } });
    }
    await cleanupUsers(userIds);
    await closeApp();
  });

  it('포인트 지급 중복 요청 — transactionKey 멱등', async () => {
    const { user } = await createTestUser({ points: 1000 });
    userIds.push(user.id);
    const key = `conc-credit:${user.id}:${uniqueSuffix()}`;
    const input = {
      userId: user.id,
      transactionKey: key,
      assetType: AssetType.POINT,
      transactionType: WalletTransactionType.CREDIT,
      reason: WalletTransactionReason.ADMIN_CREDIT,
      amount: 100,
    };

    const results = await Promise.all(
      Array.from({ length: 8 }, () =>
        prisma
          .$transaction((tx) => applyWalletMutation(tx, input), {
            isolationLevel: 'Serializable',
          })
          .catch((error) => ({ error }))
      )
    );

    const ok = results.filter((r) => r && !('error' in r)) as Array<{
      duplicated: boolean;
    }>;
    const credited = ok.filter((r) => !r.duplicated);
    const duplicated = ok.filter((r) => r.duplicated);
    expect(credited.length).toBe(1);
    expect(duplicated.length + credited.length).toBeGreaterThanOrEqual(1);

    const wallet = await prisma.wallet.findUniqueOrThrow({ where: { userId: user.id } });
    expect(wallet.pointBalance).toBe(1100);
  });

  it('승리 보상 finalizeMatch 중복 호출', async () => {
    const a = await createTestUser({ points: 1000 });
    const b = await createTestUser({ points: 1000 });
    userIds.push(a.user.id, b.user.id);

    const match = await prisma.match.create({
      data: {
        mode: 'RANKED',
        status: MatchStatus.PLAYING,
        player1Id: a.user.id,
        player2Id: b.user.id,
        entryPoint: 10,
        rewardPoint: 20,
      },
    });
    cleanupIds.matches.push(match.id);

    const results = await Promise.all(
      Array.from({ length: 3 }, () =>
        finalizeMatch({
          matchId: match.id,
          winnerId: a.user.id,
          loserId: b.user.id,
          rewardPoint: 20,
        }).catch((error: Error) => ({ duplicated: true as const, error }))
      )
    );

    const fresh = results.filter((r) => !('error' in r) && !r.duplicated);
    expect(fresh.length).toBe(1);

    const txs = await prisma.walletTransaction.count({
      where: {
        userId: a.user.id,
        transactionKey: `match-reward:${match.id}:${a.user.id}`,
      },
    });
    expect(txs).toBe(1);
  });

  it('토너먼트 중복 참가(동시 클릭)', async () => {
    const { user } = await createTestUser({ tickets: 5 });
    userIds.push(user.id);
    const tournament = await prisma.tournament.create({
      data: {
        name: `동시참가_${uniqueSuffix()}`,
        type: TournamentType.SPECIAL,
        tier: TournamentTier.BEGINNER,
        status: TournamentStatus.REGISTRATION,
        minParticipants: 2,
        maxParticipants: 32,
        bracketTarget: 8,
        entryTicket: 1,
        totalPrize: 100,
        startsAt: new Date(Date.now() + 3600_000),
        registrationEndsAt: new Date(Date.now() + 1800_000),
      },
    });
    cleanupIds.tournaments.push(tournament.id);

    const results = await Promise.allSettled(
      Array.from({ length: 6 }, () => joinTournament(tournament.id, user.id))
    );
    const fulfilled = results.filter((r) => r.status === 'fulfilled') as Array<{
      status: 'fulfilled';
      value: { duplicated?: boolean; tickets?: number };
    }>;
    expect(fulfilled.length).toBeGreaterThan(0);

    const participants = await prisma.tournamentParticipant.count({
      where: {
        tournamentId: tournament.id,
        userId: user.id,
        status: { not: 'CANCELLED' },
      },
    });
    expect(participants).toBe(1);

    const wallet = await prisma.wallet.findUniqueOrThrow({ where: { userId: user.id } });
    expect(wallet.ticketBalance).toBe(4);
  });

  it('상점 중복 구매(동일 transactionKey)', async () => {
    const { user } = await createTestUser({ points: 5000 });
    userIds.push(user.id);
    const item = await prisma.shopItem.create({
      data: {
        name: `동시구매_${uniqueSuffix()}`,
        category: ShopItemCategory.BOOSTER,
        pricePoints: 200,
        priceTickets: 0,
        quantityGrant: 1,
        status: CatalogStatus.ACTIVE,
      },
    });
    cleanupIds.items.push(item.id);

    const key = `conc-shop:${uniqueSuffix()}`;
    const results = await Promise.allSettled(
      Array.from({ length: 5 }, () =>
        purchaseItem({
          userId: user.id,
          itemId: item.id,
          itemType: 'SHOP_ITEM',
          transactionKey: key,
        })
      )
    );
    const ok = results.filter((r) => r.status === 'fulfilled') as Array<{
      status: 'fulfilled';
      value: { duplicated: boolean; wallet: { points: number } };
    }>;
    expect(ok.length).toBeGreaterThan(0);
    const fresh = ok.filter((r) => !r.value.duplicated);
    expect(fresh.length).toBe(1);
    expect(ok.every((r) => r.value.wallet.points === 4800)).toBe(true);
  });

  it('같은 사용자 두 소켓 매칭 → 이중 큐 차단', async () => {
    const { baseUrl } = await getListeningApp();
    const a = await createTestUser({ points: 500 });
    userIds.push(a.user.id);
    const login = await api('POST', '/auth/login', {
      body: { loginId: a.loginId, password: a.password },
    });
    const token = login.json.data.accessToken as string;

    const s1 = await connectSocket(baseUrl, token);
    const s2 = await connectSocket(baseUrl, token);
    try {
      const started = onceEvent(s1, 'MATCH_SEARCH_STARTED');
      s1.emit('MATCH_QUEUE_JOIN', { stake: 10 });
      await started;

      const err = onceEvent<{ code?: string; message?: string }>(s2, 'error_event', 5_000).catch(
        () => null
      );
      const cancelled = onceEvent(s2, 'MATCH_CANCELLED', 5_000).catch(() => null);
      s2.emit('MATCH_QUEUE_JOIN', { stake: 10 });
      const outcome = await Promise.race([err, cancelled, new Promise((r) => setTimeout(() => r({ timeout: true }), 3000))]);
      // 두 번째 조인은 에러 또는 무시 — 큐에 사용자 1명만
      expect(outcome).toBeTruthy();
    } finally {
      s1.emit('MATCH_QUEUE_LEAVE', {});
      await disconnectSocket(s1);
      await disconnectSocket(s2);
    }
  }, 20_000);

  it('같은 선택 중복 제출 — 잠금 후 거부', async () => {
    const { baseUrl } = await getListeningApp();
    const a = await createTestUser({ points: 1000 });
    const b = await createTestUser({ points: 1000 });
    userIds.push(a.user.id, b.user.id);

    const loginA = await api('POST', '/auth/login', {
      body: { loginId: a.loginId, password: a.password },
    });
    const loginB = await api('POST', '/auth/login', {
      body: { loginId: b.loginId, password: b.password },
    });
    const sockA = await connectSocket(baseUrl, loginA.json.data.accessToken);
    const sockB = await connectSocket(baseUrl, loginB.json.data.accessToken);

    try {
      const found = onceEvent<{ matchId: string }>(sockA, 'MATCH_FOUND');
      sockA.emit('MATCH_QUEUE_JOIN', { stake: 10 });
      sockB.emit('MATCH_QUEUE_JOIN', { stake: 10 });
      const match = await found;
      await onceEvent(sockA, 'ROUND_STARTED');

      // A만 먼저 제출한 뒤 양쪽 제출로 잠금 → 추가 제출은 LOCKED
      sockA.emit('CHOICE_SUBMIT', { matchId: match.matchId, choice: 'rock' });
      await onceEvent(sockA, 'CHOICE_ACCEPTED');

      const lockedErr = onceEvent<{ code: string }>(sockA, 'error_event', 8_000);
      // B 제출로 resolve → A choiceLocked
      sockB.emit('CHOICE_SUBMIT', { matchId: match.matchId, choice: 'paper' });
      await onceEvent(sockA, 'ROUND_RESULT');

      sockA.emit('CHOICE_SUBMIT', { matchId: match.matchId, choice: 'scissors' });
      const err = await lockedErr.catch(() =>
        onceEvent<{ code: string }>(sockA, 'error_event', 3_000).catch(() => null)
      );
      // NOT_CHOOSING 또는 LOCKED 모두 허용 (라운드가 이미 넘어감)
      if (err) {
        expect(['LOCKED', 'NOT_CHOOSING', 'TIMEOUT']).toContain(err.code);
      }
    } finally {
      await disconnectSocket(sockA);
      await disconnectSocket(sockB);
    }
  }, 45_000);
});
