import { afterAll, describe, expect, it } from 'vitest';
import {
  AssetType,
  WalletTransactionReason,
  WalletTransactionType,
} from '@prisma/client';
import { applyWalletMutation } from '../../src/lib/wallet.js';
import { prisma } from '../../src/lib/prisma.js';
import { cleanupUsers, createTestUser } from '../helpers/fixtures.js';

describe('포인트·티켓 원장', () => {
  const userIds: string[] = [];

  afterAll(async () => {
    await cleanupUsers(userIds);
  });

  it('포인트 차감', async () => {
    const { user } = await createTestUser({ points: 1000, tickets: 0 });
    userIds.push(user.id);
    const result = await prisma.$transaction((tx) =>
      applyWalletMutation(tx, {
        userId: user.id,
        transactionKey: `test-debit-point:${user.id}`,
        assetType: AssetType.POINT,
        transactionType: WalletTransactionType.DEBIT,
        reason: WalletTransactionReason.MATCH_ENTRY,
        amount: 100,
      })
    );
    expect(result.duplicated).toBe(false);
    if (result.duplicated) return;
    expect(result.transaction.balanceAfter).toBe(900);
    const wallet = await prisma.wallet.findUniqueOrThrow({ where: { userId: user.id } });
    expect(wallet.pointBalance).toBe(900);
  });

  it('포인트 지급', async () => {
    const { user } = await createTestUser({ points: 500, tickets: 0 });
    userIds.push(user.id);
    const result = await prisma.$transaction((tx) =>
      applyWalletMutation(tx, {
        userId: user.id,
        transactionKey: `test-credit-point:${user.id}`,
        assetType: AssetType.POINT,
        transactionType: WalletTransactionType.CREDIT,
        reason: WalletTransactionReason.MATCH_WIN_REWARD,
        amount: 200,
      })
    );
    expect(result.duplicated).toBe(false);
    if (result.duplicated) return;
    expect(result.transaction.balanceAfter).toBe(700);
  });

  it('중복 transaction key 는 멱등(두 번째 호출 duplicated)', async () => {
    const { user } = await createTestUser({ points: 1000 });
    userIds.push(user.id);
    const key = `test-idempotent:${user.id}`;
    const input = {
      userId: user.id,
      transactionKey: key,
      assetType: AssetType.POINT,
      transactionType: WalletTransactionType.CREDIT,
      reason: WalletTransactionReason.ADMIN_CREDIT,
      amount: 50,
    };
    const first = await prisma.$transaction((tx) => applyWalletMutation(tx, input));
    const second = await prisma.$transaction((tx) => applyWalletMutation(tx, input));
    expect(first.duplicated).toBe(false);
    expect(second.duplicated).toBe(true);
    const wallet = await prisma.wallet.findUniqueOrThrow({ where: { userId: user.id } });
    expect(wallet.pointBalance).toBe(1050);
  });

  it('잔액 부족 시 포인트 차감 거부', async () => {
    const { user } = await createTestUser({ points: 10 });
    userIds.push(user.id);
    await expect(
      prisma.$transaction((tx) =>
        applyWalletMutation(tx, {
          userId: user.id,
          transactionKey: `test-insuff:${user.id}`,
          assetType: AssetType.POINT,
          transactionType: WalletTransactionType.DEBIT,
          reason: WalletTransactionReason.MATCH_ENTRY,
          amount: 100,
        })
      )
    ).rejects.toThrow();
  });

  it('티켓 차감', async () => {
    const { user } = await createTestUser({ points: 0, tickets: 3 });
    userIds.push(user.id);
    const result = await prisma.$transaction((tx) =>
      applyWalletMutation(tx, {
        userId: user.id,
        transactionKey: `test-debit-ticket:${user.id}`,
        assetType: AssetType.TICKET,
        transactionType: WalletTransactionType.DEBIT,
        reason: WalletTransactionReason.TOURNAMENT_ENTRY,
        amount: 1,
      })
    );
    expect(result.duplicated).toBe(false);
    if (result.duplicated) return;
    expect(result.transaction.balanceAfter).toBe(2);
  });

  it('티켓 환불', async () => {
    const { user } = await createTestUser({ points: 0, tickets: 1 });
    userIds.push(user.id);
    const result = await prisma.$transaction((tx) =>
      applyWalletMutation(tx, {
        userId: user.id,
        transactionKey: `test-refund-ticket:${user.id}`,
        assetType: AssetType.TICKET,
        transactionType: WalletTransactionType.REFUND,
        reason: WalletTransactionReason.TOURNAMENT_REFUND,
        amount: 1,
      })
    );
    expect(result.duplicated).toBe(false);
    if (result.duplicated) return;
    expect(result.transaction.balanceAfter).toBe(2);
    const wallet = await prisma.wallet.findUniqueOrThrow({ where: { userId: user.id } });
    expect(wallet.ticketBalance).toBe(2);
  });
});
