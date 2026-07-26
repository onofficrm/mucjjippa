/**
 * 관리자 사용자 관리.
 * 모든 상태·잔액 변경은 사유 필수 + 감사 로그 기록.
 */
import {
  AssetType,
  Prisma,
  UserRole,
  UserStatus,
  WalletTransactionReason,
  WalletTransactionType,
} from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { badRequest, notFound } from '../../lib/errors.js';
import { applyWalletMutation } from '../../lib/wallet.js';
import { ADMIN_POLICY } from './policy.js';
import { writeAudit, type AdminActor } from './audit.js';

export async function searchUsers(query: {
  q?: string;
  status?: string;
  role?: string;
  page?: number;
  limit?: number;
}) {
  const page = Math.max(1, query.page ?? 1);
  const limit = Math.min(
    ADMIN_POLICY.pagination.maxLimit,
    Math.max(1, query.limit ?? ADMIN_POLICY.pagination.defaultLimit)
  );
  const keyword = query.q?.trim();

  const where: Prisma.UserWhereInput = {
    ...(keyword
      ? {
          OR: [
            { nickname: { contains: keyword, mode: 'insensitive' } },
            { loginId: { contains: keyword, mode: 'insensitive' } },
            { email: { contains: keyword, mode: 'insensitive' } },
            { id: keyword },
          ],
        }
      : {}),
    ...(query.status && query.status in UserStatus
      ? { status: UserStatus[query.status as keyof typeof UserStatus] }
      : {}),
    ...(query.role && query.role in UserRole
      ? { role: UserRole[query.role as keyof typeof UserRole] }
      : {}),
  };

  const [total, rows] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        wallet: { select: { pointBalance: true, ticketBalance: true } },
        title: { select: { name: true } },
        avatar: { select: { imageUrl: true } },
      },
    }),
  ]);

  return {
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
    items: rows.map((u) => ({
      id: u.id,
      loginId: u.loginId,
      nickname: u.nickname,
      email: u.email,
      status: u.status,
      role: u.role,
      level: u.level,
      wins: u.wins,
      losses: u.losses,
      draws: u.draws,
      points: u.wallet?.pointBalance ?? 0,
      tickets: u.wallet?.ticketBalance ?? 0,
      avatar: u.avatar?.imageUrl ?? '✊',
      title: u.title?.name ?? null,
      lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
      createdAt: u.createdAt.toISOString(),
      deletedAt: u.deletedAt?.toISOString() ?? null,
    })),
  };
}

/** 상세조회 — 포인트 거래내역 / 게임 기록 / 토너먼트 기록 / 로그인 상태 */
export async function getUserDetail(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      wallet: true,
      title: { select: { id: true, name: true } },
      avatar: { select: { id: true, imageUrl: true } },
      settings: true,
    },
  });
  if (!user) throw notFound('사용자를 찾을 수 없습니다');

  const [transactions, matches, tournaments, sessions, auditTrail] = await Promise.all([
    prisma.walletTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 30,
    }),
    prisma.match.findMany({
      where: { OR: [{ player1Id: userId }, { player2Id: userId }] },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        player1: { select: { id: true, nickname: true } },
        player2: { select: { id: true, nickname: true } },
        rounds: { orderBy: { roundNumber: 'asc' } },
      },
    }),
    prisma.tournamentParticipant.findMany({
      where: { userId },
      orderBy: { joinedAt: 'desc' },
      take: 20,
      include: { tournament: { select: { id: true, name: true, status: true, startsAt: true } } },
    }),
    prisma.refreshToken.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        createdAt: true,
        expiresAt: true,
        revokedAt: true,
        ipAddress: true,
        userAgent: true,
      },
    }),
    prisma.auditLog.findMany({
      where: { targetId: userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: { adminUser: { select: { nickname: true } } },
    }),
  ]);

  const now = Date.now();
  const activeSession = sessions.find(
    (s) => !s.revokedAt && s.expiresAt.getTime() > now
  );

  return {
    profile: {
      id: user.id,
      loginId: user.loginId,
      nickname: user.nickname,
      email: user.email,
      status: user.status,
      role: user.role,
      level: user.level,
      experience: user.experience,
      wins: user.wins,
      losses: user.losses,
      draws: user.draws,
      currentStreak: user.currentStreak,
      maxStreak: user.maxStreak,
      rockCount: user.rockCount,
      paperCount: user.paperCount,
      scissorsCount: user.scissorsCount,
      tournamentParticipations: user.tournamentParticipations,
      tournamentWins: user.tournamentWins,
      avatar: user.avatar?.imageUrl ?? '✊',
      title: user.title?.name ?? null,
      createdAt: user.createdAt.toISOString(),
      lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
      deletedAt: user.deletedAt?.toISOString() ?? null,
    },
    wallet: {
      points: user.wallet?.pointBalance ?? 0,
      tickets: user.wallet?.ticketBalance ?? 0,
      version: user.wallet?.version ?? 0,
    },
    loginState: {
      online: Boolean(activeSession),
      lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
      sessions: sessions.map((s) => ({
        id: s.id,
        createdAt: s.createdAt.toISOString(),
        expiresAt: s.expiresAt.toISOString(),
        revoked: Boolean(s.revokedAt),
        ip: s.ipAddress,
        userAgent: s.userAgent,
      })),
    },
    transactions: transactions.map((t) => ({
      id: t.id,
      key: t.transactionKey,
      asset: t.assetType,
      type: t.transactionType,
      reason: t.reason,
      amount: t.amount,
      balanceBefore: t.balanceBefore,
      balanceAfter: t.balanceAfter,
      description: t.description,
      createdAt: t.createdAt.toISOString(),
    })),
    matches: matches.map((m) => ({
      id: m.id,
      mode: m.mode,
      status: m.status,
      entryPoint: m.entryPoint,
      rewardPoint: m.rewardPoint,
      opponent:
        m.player1Id === userId ? (m.player2?.nickname ?? '-') : (m.player1?.nickname ?? '-'),
      result: m.winnerId ? (m.winnerId === userId ? 'WIN' : 'LOSS') : 'DRAW',
      rounds: m.rounds.length,
      completedAt: m.completedAt?.toISOString() ?? null,
    })),
    tournaments: tournaments.map((p) => ({
      tournamentId: p.tournamentId,
      name: p.tournament.name,
      tournamentStatus: p.tournament.status,
      participantStatus: p.status,
      finalRank: p.finalRank,
      joinedAt: p.joinedAt.toISOString(),
      startsAt: p.tournament.startsAt.toISOString(),
    })),
    auditTrail: auditTrail.map((a) => ({
      id: a.id,
      action: a.action,
      admin: a.adminUser?.nickname ?? '시스템',
      reason: a.reason,
      ip: a.ipAddress,
      createdAt: a.createdAt.toISOString(),
    })),
  };
}

/** 이용 정지 / 영구 정지 / 정지 해제 */
export async function setUserStatus(input: {
  actor: AdminActor;
  userId: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'BANNED';
  reason: string;
}) {
  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { id: true, status: true, role: true, nickname: true },
  });
  if (!user) throw notFound('사용자를 찾을 수 없습니다');
  if (user.role === UserRole.SUPER_ADMIN) {
    throw badRequest('최고 관리자 계정은 상태를 변경할 수 없습니다');
  }
  if (user.id === input.actor.userId) {
    throw badRequest('자신의 계정 상태는 변경할 수 없습니다');
  }
  if (user.status === input.status) {
    return { changed: false, status: user.status };
  }

  const updated = await prisma.$transaction(async (tx) => {
    const next = await tx.user.update({
      where: { id: input.userId },
      data: { status: UserStatus[input.status] },
      select: { status: true },
    });

    // 정지 시 세션 강제 만료
    if (input.status !== 'ACTIVE') {
      await tx.refreshToken.updateMany({
        where: { userId: input.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }

    await writeAudit({
      actor: input.actor,
      action:
        input.status === 'ACTIVE'
          ? 'USER_UNSUSPEND'
          : input.status === 'BANNED'
            ? 'USER_BAN'
            : 'USER_SUSPEND',
      targetType: 'USER',
      targetId: input.userId,
      reason: input.reason,
      before: { status: user.status },
      after: { status: next.status },
      tx,
    });

    return next;
  });

  return { changed: true, status: updated.status };
}

/** 포인트·티켓 지급 / 회수 */
export async function adjustUserWallet(input: {
  actor: AdminActor;
  userId: string;
  asset: 'POINT' | 'TICKET';
  amount: number;
  credit: boolean;
  reason: string;
  transactionKey: string;
}) {
  if (!Number.isInteger(input.amount) || input.amount <= 0) {
    throw badRequest('수량은 1 이상의 정수여야 합니다');
  }
  const target = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { id: true, deletedAt: true },
  });
  if (!target || target.deletedAt) throw notFound('사용자를 찾을 수 없습니다');

  return prisma.$transaction(
    async (tx) => {
      const before = await tx.wallet.findUniqueOrThrow({ where: { userId: input.userId } });
      const result = await applyWalletMutation(tx, {
        userId: input.userId,
        transactionKey: input.transactionKey,
        assetType: AssetType[input.asset],
        transactionType: input.credit
          ? WalletTransactionType.CREDIT
          : WalletTransactionType.DEBIT,
        reason: input.credit
          ? WalletTransactionReason.ADMIN_CREDIT
          : WalletTransactionReason.ADMIN_DEBIT,
        amount: input.amount,
        referenceType: 'admin',
        referenceId: input.actor.userId,
        description: input.reason,
      });
      const after = await tx.wallet.findUniqueOrThrow({ where: { userId: input.userId } });

      if (!result.duplicated) {
        await writeAudit({
          actor: input.actor,
          action: input.credit ? 'WALLET_CREDIT' : 'WALLET_DEBIT',
          targetType: 'USER_WALLET',
          targetId: input.userId,
          reason: input.reason,
          before: { points: before.pointBalance, tickets: before.ticketBalance },
          after: {
            points: after.pointBalance,
            tickets: after.ticketBalance,
            asset: input.asset,
            amount: input.amount,
            transactionKey: input.transactionKey,
          },
          tx,
        });
      }

      return {
        duplicated: result.duplicated,
        wallet: { points: after.pointBalance, tickets: after.ticketBalance },
      };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  );
}
