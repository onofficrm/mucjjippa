import {
  AssetType,
  Prisma,
  WalletTransactionReason,
  WalletTransactionType,
  type Wallet,
  type WalletTransaction,
} from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { applyWalletMutation, type WalletMutationInput } from '../../lib/wallet.js';
import { badRequest, conflict } from '../../lib/errors.js';

export const TICKET_PRICE_POINTS = 2_000;

export function toWalletResponse(wallet: Wallet) {
  return {
    id: wallet.id,
    points: wallet.pointBalance,
    tickets: wallet.ticketBalance,
    version: wallet.version,
    updatedAt: wallet.updatedAt.toISOString(),
  };
}

export function toTransactionResponse(transaction: WalletTransaction) {
  const credit =
    transaction.transactionType === WalletTransactionType.CREDIT ||
    transaction.transactionType === WalletTransactionType.REFUND ||
    (transaction.transactionType === WalletTransactionType.ADJUST &&
      transaction.balanceAfter >= transaction.balanceBefore);
  return {
    id: transaction.id,
    transactionKey: transaction.transactionKey,
    asset: transaction.assetType,
    reason: transaction.reason,
    direction: credit ? 'CREDIT' : 'DEBIT',
    amount: credit ? transaction.amount : -transaction.amount,
    balanceBefore: transaction.balanceBefore,
    balanceAfter: transaction.balanceAfter,
    description: transaction.description,
    referenceType: transaction.referenceType,
    referenceId: transaction.referenceId,
    metadata: transaction.metadata,
    createdAt: transaction.createdAt.toISOString(),
  };
}

export async function getWallet(userId: string) {
  const wallet = await prisma.wallet.findUnique({ where: { userId } });
  if (!wallet) throw badRequest('지갑을 찾을 수 없습니다');
  return wallet;
}

export async function getTransactions(input: {
  userId: string;
  asset?: AssetType;
  cursor?: string;
  limit: number;
}) {
  const rows = await prisma.walletTransaction.findMany({
    where: { userId: input.userId, assetType: input.asset },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: input.limit + 1,
    ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
  });
  const hasMore = rows.length > input.limit;
  const items = hasMore ? rows.slice(0, input.limit) : rows;
  return {
    items: items.map(toTransactionResponse),
    nextCursor: hasMore ? items.at(-1)?.id ?? null : null,
  };
}

async function runWalletTransaction<T>(
  operation: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await prisma.$transaction(operation, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error) {
      const retryable =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === 'P2034' || error.code === 'P2002');
      if (!retryable || attempt === 2) throw error;
    }
  }
  throw conflict('지갑 처리 충돌이 발생했습니다. 다시 시도해 주세요.');
}

export async function exchangeTickets(input: {
  userId: string;
  quantity: number;
  transactionKey: string;
}) {
  const pointKey = `${input.transactionKey}:point`;
  const ticketKey = `${input.transactionKey}:ticket`;

  return runWalletTransaction(async (tx) => {
    const existing = await tx.walletTransaction.findUnique({
      where: { transactionKey: pointKey },
    });
    if (!existing) {
      await applyWalletMutation(tx, {
        userId: input.userId,
        transactionKey: pointKey,
        assetType: AssetType.POINT,
        transactionType: WalletTransactionType.DEBIT,
        reason: WalletTransactionReason.TICKET_EXCHANGE,
        amount: input.quantity * TICKET_PRICE_POINTS,
        referenceType: 'ticket_exchange',
        referenceId: input.transactionKey,
        description: `티켓 ${input.quantity}장 교환`,
      });
      await applyWalletMutation(tx, {
        userId: input.userId,
        transactionKey: ticketKey,
        assetType: AssetType.TICKET,
        transactionType: WalletTransactionType.CREDIT,
        reason: WalletTransactionReason.TICKET_EXCHANGE,
        amount: input.quantity,
        referenceType: 'ticket_exchange',
        referenceId: input.transactionKey,
        description: `티켓 ${input.quantity}장 지급`,
      });
    }

    const wallet = await tx.wallet.findUniqueOrThrow({ where: { userId: input.userId } });
    const transactions = await tx.walletTransaction.findMany({
      where: { transactionKey: { in: [pointKey, ticketKey] } },
      orderBy: { createdAt: 'asc' },
    });
    return {
      duplicated: Boolean(existing),
      wallet: toWalletResponse(wallet),
      transactions: transactions.map(toTransactionResponse),
    };
  });
}

export async function adminMutateWallet(
  input: Omit<WalletMutationInput, 'transactionType' | 'reason'> & {
    credit: boolean;
    adminUserId: string;
    reasonText: string;
  }
) {
  return runWalletTransaction(async (tx) => {
    const result = await applyWalletMutation(tx, {
      userId: input.userId,
      transactionKey: input.transactionKey,
      assetType: input.assetType,
      transactionType: input.credit
        ? WalletTransactionType.CREDIT
        : WalletTransactionType.DEBIT,
      reason: input.credit
        ? WalletTransactionReason.ADMIN_CREDIT
        : WalletTransactionReason.ADMIN_DEBIT,
      amount: input.amount,
      referenceType: 'admin',
      referenceId: input.adminUserId,
      description: input.reasonText,
    });
    const wallet = await tx.wallet.findUniqueOrThrow({ where: { userId: input.userId } });
    if (!result.duplicated) {
      await tx.auditLog.create({
        data: {
          adminUserId: input.adminUserId,
          action: input.credit ? 'WALLET_CREDIT' : 'WALLET_DEBIT',
          targetType: 'USER_WALLET',
          targetId: input.userId,
          reason: input.reasonText,
          afterData: {
            asset: input.assetType,
            amount: input.amount,
            transactionKey: input.transactionKey,
          },
        },
      });
    }
    return {
      duplicated: result.duplicated,
      wallet: toWalletResponse(wallet),
      transaction: toTransactionResponse(result.transaction),
    };
  });
}
