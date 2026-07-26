import {
  AssetType,
  MatchMode,
  MatchRoundStatus,
  MatchStatus,
  Prisma,
  RpsChoice,
  WalletTransactionReason,
  WalletTransactionType,
} from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { applyWalletMutation } from '../../lib/wallet.js';
import { badRequest, conflict, notFound } from '../../lib/errors.js';
import { rewardForStake, type MatchStake } from './policy.js';
import type { RpsChoice as DomainChoice } from './rps.js';
import type { QueueEntry } from './types.js';

function toDbChoice(choice: DomainChoice): RpsChoice {
  return choice as RpsChoice;
}

export async function loadMatchUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { avatar: true, title: true, wallet: true },
  });
  if (!user || user.status !== 'ACTIVE' || user.deletedAt) {
    throw badRequest('활성 사용자만 매칭에 참여할 수 있습니다');
  }
  return user;
}

export async function findActiveMatchForUser(userId: string) {
  return prisma.match.findFirst({
    where: {
      status: { in: [MatchStatus.READY, MatchStatus.PLAYING] },
      OR: [{ player1Id: userId }, { player2Id: userId }],
    },
    include: {
      rounds: { orderBy: { roundNumber: 'asc' } },
      player1: { include: { avatar: true, title: true } },
      player2: { include: { avatar: true, title: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function createMatchedGame(input: {
  player1: QueueEntry;
  player2: QueueEntry;
  stake: MatchStake;
}) {
  const rewardPoint = rewardForStake(input.stake);

  return prisma.$transaction(
    async (tx) => {
      const match = await tx.match.create({
        data: {
          mode: MatchMode.CASUAL,
          status: MatchStatus.READY,
          entryPoint: input.stake,
          rewardPoint,
          player1Id: input.player1.userId,
          player2Id: input.player2.userId,
          startedAt: new Date(),
        },
      });

      for (const player of [input.player1, input.player2]) {
        const debit = await applyWalletMutation(tx, {
          userId: player.userId,
          transactionKey: `match-entry:${match.id}:${player.userId}`,
          assetType: AssetType.POINT,
          transactionType: WalletTransactionType.DEBIT,
          reason: WalletTransactionReason.MATCH_ENTRY,
          amount: input.stake,
          referenceType: 'match',
          referenceId: match.id,
          description: `${input.player1.roomName} 참가비`,
        });
        if (debit.duplicated) {
          throw conflict('참가비 중복 차감이 감지되었습니다');
        }
      }

      return match;
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  );
}

export async function refundMatchEntry(matchId: string, userId: string, stake: number) {
  return prisma.$transaction(async (tx) => {
    const result = await applyWalletMutation(tx, {
      userId,
      transactionKey: `match-refund:${matchId}:${userId}`,
      assetType: AssetType.POINT,
      transactionType: WalletTransactionType.REFUND,
      reason: WalletTransactionReason.MATCH_REFUND,
      amount: stake,
      referenceType: 'match',
      referenceId: matchId,
      description: '매칭 취소 환불',
    });
    const wallet = await tx.wallet.findUniqueOrThrow({ where: { userId } });
    return { duplicated: result.duplicated, wallet };
  });
}

export async function persistRound(input: {
  matchId: string;
  roundNumber: number;
  player1Choice: DomainChoice;
  player2Choice: DomainChoice;
  winnerId: string | null;
}) {
  return prisma.matchRound.upsert({
    where: {
      matchId_roundNumber: {
        matchId: input.matchId,
        roundNumber: input.roundNumber,
      },
    },
    update: {
      player1Choice: toDbChoice(input.player1Choice),
      player2Choice: toDbChoice(input.player2Choice),
      winnerId: input.winnerId,
      status: MatchRoundStatus.COMPLETED,
      completedAt: new Date(),
    },
    create: {
      matchId: input.matchId,
      roundNumber: input.roundNumber,
      player1Choice: toDbChoice(input.player1Choice),
      player2Choice: toDbChoice(input.player2Choice),
      winnerId: input.winnerId,
      status: MatchRoundStatus.COMPLETED,
      startedAt: new Date(),
      completedAt: new Date(),
    },
  });
}

export async function markMatchPlaying(matchId: string) {
  return prisma.match.update({
    where: { id: matchId },
    data: { status: MatchStatus.PLAYING },
  });
}

export async function finalizeMatch(input: {
  matchId: string;
  winnerId: string;
  loserId: string;
  rewardPoint: number;
}) {
  return prisma.$transaction(
    async (tx) => {
      const match = await tx.match.findUnique({ where: { id: input.matchId } });
      if (!match) throw notFound('매치를 찾을 수 없습니다');
      if (match.status === MatchStatus.COMPLETED) {
        return { duplicated: true as const, match };
      }

      const updated = await tx.match.update({
        where: { id: input.matchId },
        data: {
          status: MatchStatus.COMPLETED,
          winnerId: input.winnerId,
          completedAt: new Date(),
        },
      });

      const payout = await applyWalletMutation(tx, {
        userId: input.winnerId,
        transactionKey: `match-reward:${input.matchId}:${input.winnerId}`,
        assetType: AssetType.POINT,
        transactionType: WalletTransactionType.CREDIT,
        reason: WalletTransactionReason.MATCH_WIN_REWARD,
        amount: input.rewardPoint,
        referenceType: 'match',
        referenceId: input.matchId,
        description: '1:1 대전 승리 보상',
      });

      const winner = await tx.user.findUniqueOrThrow({ where: { id: input.winnerId } });
      const loser = await tx.user.findUniqueOrThrow({ where: { id: input.loserId } });
      const nextStreak = winner.currentStreak + 1;

      await tx.user.update({
        where: { id: input.winnerId },
        data: {
          wins: { increment: 1 },
          currentStreak: nextStreak,
          maxStreak: Math.max(winner.maxStreak, nextStreak),
          experience: { increment: 50 },
        },
      });
      await tx.user.update({
        where: { id: input.loserId },
        data: {
          losses: { increment: 1 },
          currentStreak: 0,
          experience: { increment: 15 },
        },
      });

      const winnerWallet = await tx.wallet.findUniqueOrThrow({
        where: { userId: input.winnerId },
      });
      const loserWallet = await tx.wallet.findUniqueOrThrow({
        where: { userId: input.loserId },
      });

      return {
        duplicated: payout.duplicated,
        match: updated,
        winnerWallet,
        loserWallet,
        winnerStats: {
          wins: winner.wins + 1,
          currentStreak: nextStreak,
          maxStreak: Math.max(winner.maxStreak, nextStreak),
        },
        loserStats: {
          losses: loser.losses + 1,
          currentStreak: 0,
        },
      };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  ).then(async (result) => {
    if (!result.duplicated) {
      const { afterMatchSettled } = await import('../progression/after-match.js');
      void afterMatchSettled({
        matchId: input.matchId,
        winnerId: input.winnerId,
        loserId: input.loserId,
      }).catch(() => undefined);
    }
    return result;
  });
}

export async function abortMatchAndRefund(matchId: string) {
  return prisma.$transaction(async (tx) => {
    const match = await tx.match.findUnique({ where: { id: matchId } });
    if (!match || match.status === MatchStatus.COMPLETED || match.status === MatchStatus.CANCELLED) {
      return { refunded: [] as string[] };
    }

    await tx.match.update({
      where: { id: matchId },
      data: { status: MatchStatus.CANCELLED, completedAt: new Date() },
    });

    const refunded: string[] = [];
    for (const userId of [match.player1Id, match.player2Id]) {
      if (!userId) continue;
      const result = await applyWalletMutation(tx, {
        userId,
        transactionKey: `match-refund:${matchId}:${userId}`,
        assetType: AssetType.POINT,
        transactionType: WalletTransactionType.REFUND,
        reason: WalletTransactionReason.MATCH_REFUND,
        amount: match.entryPoint,
        referenceType: 'match',
        referenceId: matchId,
        description: '매치 중단 환불',
      });
      if (!result.duplicated) refunded.push(userId);
    }
    return { refunded };
  });
}

export async function getMatchSnapshot(matchId: string) {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      rounds: { orderBy: { roundNumber: 'asc' } },
      player1: { include: { avatar: true, title: true } },
      player2: { include: { avatar: true, title: true } },
    },
  });
  if (!match) throw notFound('매치를 찾을 수 없습니다');
  return match;
}
