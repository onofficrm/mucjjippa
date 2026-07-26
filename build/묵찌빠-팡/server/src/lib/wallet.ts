/**
 * 지갑 원장 헬퍼.
 * - transactionKey UNIQUE 로 멱등성 보장
 * - wallet.version 낙관적 락
 * - 잔액 음수 차단 (앱 + DB CHECK)
 *
 * 3단계에서는 seed/테스트용으로만 사용. 게임 API 연결은 다음 단계.
 */
import {
  AssetType,
  Prisma,
  WalletTransactionReason,
  WalletTransactionType,
  type PrismaClient,
} from '@prisma/client';
import { conflict, badRequest } from './errors.js';

export type WalletMutationInput = {
  userId: string;
  transactionKey: string;
  assetType: AssetType;
  transactionType: WalletTransactionType;
  reason: WalletTransactionReason;
  amount: number;
  referenceType?: string;
  referenceId?: string;
  description?: string;
  metadata?: Prisma.InputJsonValue;
};

export async function applyWalletMutation(
  db: PrismaClient | Prisma.TransactionClient,
  input: WalletMutationInput
) {
  if (!Number.isInteger(input.amount) || input.amount === 0) {
    throw badRequest('amount must be a non-zero integer');
  }

  const existing = await db.walletTransaction.findUnique({
    where: { transactionKey: input.transactionKey },
  });
  if (existing) {
    return { duplicated: true as const, transaction: existing };
  }

  const wallet = await db.wallet.findUnique({ where: { userId: input.userId } });
  if (!wallet) throw badRequest('Wallet not found');

  const isCredit =
    input.transactionType === WalletTransactionType.CREDIT ||
    input.transactionType === WalletTransactionType.REFUND ||
    (input.transactionType === WalletTransactionType.ADJUST && input.amount > 0);

  const delta = isCredit ? Math.abs(input.amount) : -Math.abs(input.amount);

  const balanceBefore =
    input.assetType === AssetType.POINT ? wallet.pointBalance : wallet.ticketBalance;
  const balanceAfter = balanceBefore + delta;

  if (balanceAfter < 0) {
    throw conflict('Insufficient balance', {
      assetType: input.assetType,
      balanceBefore,
      requested: input.amount,
    });
  }

  const updated = await db.wallet.updateMany({
    where: { userId: input.userId, version: wallet.version },
    data: {
      pointBalance: input.assetType === AssetType.POINT ? balanceAfter : undefined,
      ticketBalance: input.assetType === AssetType.TICKET ? balanceAfter : undefined,
      version: { increment: 1 },
    },
  });

  if (updated.count !== 1) {
    throw conflict('Wallet version conflict — retry the request');
  }

  const transaction = await db.walletTransaction.create({
    data: {
      userId: input.userId,
      transactionKey: input.transactionKey,
      assetType: input.assetType,
      transactionType: input.transactionType,
      reason: input.reason,
      amount: Math.abs(input.amount),
      balanceBefore,
      balanceAfter,
      referenceType: input.referenceType,
      referenceId: input.referenceId,
      description: input.description,
      metadata: input.metadata,
    },
  });

  return { duplicated: false as const, transaction };
}
