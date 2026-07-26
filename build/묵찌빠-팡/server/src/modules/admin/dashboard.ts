/**
 * 관리자 대시보드 집계.
 */
import { AssetType, TournamentStatus, UserStatus, WalletTransactionType } from '@prisma/client';
import type { Server as SocketIOServer } from 'socket.io';
import { prisma } from '../../lib/prisma.js';
import {
  getLiveMatchCount,
  getWaitingPlayerCount,
} from '../match/runtime.js';
import { getLiveBracketGameCount } from '../tournament/engine.js';
import { listLiveSnapshots } from '../watch/spectator.js';
import { ADMIN_POLICY } from './policy.js';

const ACTIVE_TOURNAMENT_STATUSES: TournamentStatus[] = [
  TournamentStatus.REGISTRATION,
  TournamentStatus.READY,
  TournamentStatus.QUALIFIER,
  TournamentStatus.BRACKET,
  TournamentStatus.SEMIFINAL,
  TournamentStatus.FINAL,
];

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export async function getAdminDashboard(io: SocketIOServer | null) {
  const since = startOfToday();

  const [
    todayGames,
    pointCredit,
    pointDebit,
    ticketCredit,
    errorCount,
    newSignups,
    suspended,
    banned,
    activeTournaments,
    recentAudit,
    openFraudSignals,
    criticalFraudSignals,
  ] = await Promise.all([
    prisma.match.count({ where: { status: 'COMPLETED', completedAt: { gte: since } } }),
    prisma.walletTransaction.aggregate({
      where: {
        assetType: AssetType.POINT,
        transactionType: { in: [WalletTransactionType.CREDIT, WalletTransactionType.REFUND] },
        createdAt: { gte: since },
      },
      _sum: { amount: true },
      _count: { _all: true },
    }),
    prisma.walletTransaction.aggregate({
      where: {
        assetType: AssetType.POINT,
        transactionType: WalletTransactionType.DEBIT,
        createdAt: { gte: since },
      },
      _sum: { amount: true },
      _count: { _all: true },
    }),
    prisma.walletTransaction.aggregate({
      where: {
        assetType: AssetType.TICKET,
        transactionType: WalletTransactionType.CREDIT,
        createdAt: { gte: since },
      },
      _sum: { amount: true },
    }),
    prisma.systemErrorLog.count({ where: { createdAt: { gte: since } } }),
    prisma.user.count({ where: { createdAt: { gte: since }, deletedAt: null } }),
    prisma.user.count({ where: { status: UserStatus.SUSPENDED } }),
    prisma.user.count({ where: { status: UserStatus.BANNED } }),
    prisma.tournament.count({ where: { status: { in: ACTIVE_TOURNAMENT_STATUSES } } }),
    prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: ADMIN_POLICY.dashboardRecent,
      include: { adminUser: { select: { nickname: true, role: true } } },
    }),
    prisma.fraudSignal.count({ where: { status: 'OPEN' } }),
    prisma.fraudSignal.count({ where: { status: 'OPEN', severity: 'CRITICAL' } }),
  ]);

  const onlineUsers = io ? io.engine.clientsCount : 0;
  const watchLive = listLiveSnapshots().length;

  return {
    generatedAt: new Date().toISOString(),
    online: {
      /** 현재 접속 사용자 (소켓 연결 수) */
      connectedUsers: onlineUsers,
      /** 매칭 대기 사용자 */
      waitingPlayers: getWaitingPlayerCount(),
      /** 진행 중 1:1 경기 */
      liveMatches: getLiveMatchCount(),
      /** 진행 중 본선 경기 */
      liveBracketGames: getLiveBracketGameCount(),
      /** 관전 중계 중인 경기 */
      liveWatchStreams: watchLive,
      /** 진행 중 토너먼트 */
      activeTournaments,
    },
    today: {
      games: todayGames,
      pointsGranted: pointCredit._sum.amount ?? 0,
      pointsGrantedCount: pointCredit._count._all,
      pointsSpent: pointDebit._sum.amount ?? 0,
      pointsSpentCount: pointDebit._count._all,
      ticketsGranted: ticketCredit._sum.amount ?? 0,
      errors: errorCount,
      newSignups,
    },
    moderation: {
      suspended,
      banned,
      total: suspended + banned,
    },
    fraud: {
      /** 미검토 부정 이용 신호 (초기 정책: 차단 아닌 경고) */
      open: openFraudSignals,
      critical: criticalFraudSignals,
    },
    recentAudit: recentAudit.map((row) => ({
      id: row.id,
      action: row.action,
      admin: row.adminUser?.nickname ?? '시스템',
      role: row.adminUser?.role ?? null,
      targetType: row.targetType,
      targetId: row.targetId,
      reason: row.reason,
      ip: row.ipAddress,
      createdAt: row.createdAt.toISOString(),
    })),
  };
}
