import {
  AssetType,
  Prisma,
  TournamentParticipantStatus,
  TournamentStatus,
  TournamentTier,
  WalletTransactionReason,
  WalletTransactionType,
  type Tournament,
} from '@prisma/client';
import { applyWalletMutation } from '../../lib/wallet.js';
import { badRequest, conflict, notFound } from '../../lib/errors.js';
import { prisma } from '../../lib/prisma.js';
import { isTierEnabled, TOURNAMENT_POLICY } from './policy.js';

export type DbClient = Prisma.TransactionClient | typeof prisma;

function entryKey(tournamentId: string, userId: string, attempt: number) {
  return `tournament-entry:${tournamentId}:${userId}:${attempt}`;
}
function refundKey(tournamentId: string, userId: string, attempt: number) {
  return `tournament-refund:${tournamentId}:${userId}:${attempt}`;
}
export function rewardKey(tournamentId: string, userId: string, rank: number) {
  return `tournament-reward:${tournamentId}:${userId}:${rank}`;
}

async function nextEntryAttempt(tx: DbClient, tournamentId: string, userId: string) {
  const refunds = await tx.walletTransaction.count({
    where: {
      userId,
      transactionKey: { startsWith: `tournament-refund:${tournamentId}:${userId}:` },
    },
  });
  return refunds;
}

const ACTIVE_JOIN_STATUSES: TournamentStatus[] = [
  TournamentStatus.REGISTRATION,
  TournamentStatus.READY,
];

export function toClientTournament(
  t: Tournament & { _count?: { participants: number }; rewards?: Array<{ rankFrom: number; rankTo: number; pointReward: number; label: string | null }> },
  opts?: { registered?: boolean; meId?: string }
) {
  const currentParticipants = t._count?.participants ?? 0;
  const comingSoon = t.tier === TournamentTier.MEGA || !isTierEnabled(t.tier);
  const statusMap: Record<string, string> = {
    DRAFT: 'coming_soon',
    REGISTRATION: opts?.registered ? 'applied' : 'open',
    READY: 'imminent',
    QUALIFIER: 'in_progress',
    BRACKET: 'in_progress',
    SEMIFINAL: 'in_progress',
    FINAL: 'in_progress',
    COMPLETED: 'ended',
    CANCELLED: 'ended',
    POSTPONED: 'deferred',
  };

  return {
    id: t.id,
    title: t.name,
    subTitle: comingSoon ? 'COMING SOON' : t.qualifierRule ?? undefined,
    type: t.type.toLowerCase() as 'daily' | 'weekly' | 'hourly',
    totalPrize: t.totalPrize,
    ticketCost: t.entryTicket,
    maxParticipants: t.maxParticipants,
    currentParticipants,
    startTime: t.startsAt.toISOString(),
    startTimeEpoch: t.startsAt.getTime(),
    status: comingSoon ? 'coming_soon' : statusMap[t.status] ?? t.status,
    serverStatus: t.status,
    tier: t.tier,
    bracketTarget: t.bracketTarget,
    currentRound: t.currentRoundLabel ?? '대기',
    registrationEndsAt: t.registrationEndsAt.toISOString(),
    nextTransitionAt: t.nextTransitionAt?.toISOString() ?? null,
    description: t.qualifierRule ?? undefined,
    rules: {
      preliminary: '예선 소수결 (최소 그룹 통과, 동률 시 재라운드)',
      main: '본선 1:1 싱글 엘리미네이션',
      finals: '준결승·결승·3·4위 3판 2승',
    },
    prizes: (t.rewards ?? []).map((r) => ({
      rank: r.label ?? `${r.rankFrom}${r.rankFrom === r.rankTo ? '' : `-${r.rankTo}`}위`,
      prize: `${r.pointReward.toLocaleString()}P`,
    })),
  };
}

export async function listTournaments(userId?: string) {
  const rows = await prisma.tournament.findMany({
    where: { status: { not: TournamentStatus.DRAFT } },
    include: {
      participants: {
        where: { status: { not: TournamentParticipantStatus.CANCELLED } },
        select: { id: true },
      },
      rewards: { orderBy: { rankFrom: 'asc' } },
    },
    orderBy: { startsAt: 'asc' },
  });

  let registered = new Set<string>();
  if (userId) {
    const mine = await prisma.tournamentParticipant.findMany({
      where: {
        userId,
        status: { not: TournamentParticipantStatus.CANCELLED },
        tournamentId: { in: rows.map((r) => r.id) },
      },
      select: { tournamentId: true },
    });
    registered = new Set(mine.map((m) => m.tournamentId));
  }

  return rows.map((t) =>
    toClientTournament(
      { ...t, _count: { participants: t.participants.length } },
      { registered: registered.has(t.id), meId: userId }
    )
  );
}

export async function getTournament(id: string, userId?: string) {
  const t = await prisma.tournament.findUnique({
    where: { id },
    include: {
      participants: {
        where: { status: { not: TournamentParticipantStatus.CANCELLED } },
        select: { id: true },
      },
      rewards: { orderBy: { rankFrom: 'asc' } },
    },
  });
  if (!t) throw notFound('토너먼트를 찾을 수 없습니다');

  let registered = false;
  if (userId) {
    const p = await prisma.tournamentParticipant.findUnique({
      where: { tournamentId_userId: { tournamentId: id, userId } },
    });
    registered = Boolean(p && p.status !== TournamentParticipantStatus.CANCELLED);
  }
  return toClientTournament(
    { ...t, _count: { participants: t.participants.length } },
    { registered, meId: userId }
  );
}

export async function getRegisteredIds(userId: string) {
  const rows = await prisma.tournamentParticipant.findMany({
    where: { userId, status: { not: TournamentParticipantStatus.CANCELLED } },
    select: { tournamentId: true },
  });
  return rows.map((r) => r.tournamentId);
}

/**
 * 참가 — 단일 DB transaction:
 * 상태·마감·중복·티켓 확인 → 차감 → 원장 → 참가자 생성
 */
export async function joinTournament(tournamentId: string, userId: string) {
  return prisma.$transaction(
    async (tx) => {
      const tournament = await tx.tournament.findUnique({ where: { id: tournamentId } });
      if (!tournament) throw notFound('토너먼트를 찾을 수 없습니다');
      if (tournament.tier === TournamentTier.MEGA || !isTierEnabled(tournament.tier)) {
        throw badRequest('아직 오픈되지 않은 토너먼트입니다 (COMING SOON)');
      }
      if (!ACTIVE_JOIN_STATUSES.includes(tournament.status)) {
        throw conflict('참가 신청이 마감되었습니다', { reason: 'CLOSED' });
      }
      if (Date.now() >= tournament.registrationEndsAt.getTime()) {
        throw conflict('참가 신청이 마감되었습니다', { reason: 'CLOSED' });
      }

      const existing = await tx.tournamentParticipant.findUnique({
        where: { tournamentId_userId: { tournamentId, userId } },
      });
      if (existing && existing.status !== TournamentParticipantStatus.CANCELLED) {
        return {
          success: true,
          tournamentId,
          registered: true,
          reason: 'ALREADY_REGISTERED' as const,
          duplicated: true,
        };
      }

      const activeCount = await tx.tournamentParticipant.count({
        where: {
          tournamentId,
          status: { not: TournamentParticipantStatus.CANCELLED },
        },
      });
      if (activeCount >= tournament.maxParticipants) {
        throw conflict('정원초과입니다', { reason: 'FULL' });
      }

      const attempt = await nextEntryAttempt(tx, tournamentId, userId);

      const debit = await applyWalletMutation(tx, {
        userId,
        transactionKey: entryKey(tournamentId, userId, attempt),
        assetType: AssetType.TICKET,
        transactionType: WalletTransactionType.DEBIT,
        reason: WalletTransactionReason.TOURNAMENT_ENTRY,
        amount: tournament.entryTicket,
        referenceType: 'Tournament',
        referenceId: tournamentId,
        description: `${tournament.name} 참가`,
      });

      if (existing?.status === TournamentParticipantStatus.CANCELLED) {
        await tx.tournamentParticipant.update({
          where: { id: existing.id },
          data: {
            status: TournamentParticipantStatus.REGISTERED,
            joinedAt: new Date(),
            eliminatedAt: null,
            finalRank: null,
            seed: null,
          },
        });
      } else {
        await tx.tournamentParticipant.create({
          data: {
            tournamentId,
            userId,
            status: TournamentParticipantStatus.REGISTERED,
          },
        });
      }

      const wallet = await tx.wallet.findUnique({ where: { userId } });
      return {
        success: true,
        tournamentId,
        registered: true,
        duplicated: debit.duplicated,
        tickets: wallet?.ticketBalance ?? 0,
        points: wallet?.pointBalance ?? 0,
      };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  ).then(async (result) => {
    if (result.success && !result.duplicated && result.registered) {
      const { afterTournamentJoined } = await import('../progression/after-match.js');
      void afterTournamentJoined(userId).catch(() => undefined);
    }
    return result;
  });
}

/**
 * 참가 취소 — 시작 전(REGISTRATION/READY)만, 티켓 환불 + 중복 환불 방지
 */
export async function cancelTournament(tournamentId: string, userId: string) {
  return prisma.$transaction(
    async (tx) => {
      const tournament = await tx.tournament.findUnique({ where: { id: tournamentId } });
      if (!tournament) throw notFound('토너먼트를 찾을 수 없습니다');
      if (
        tournament.status !== TournamentStatus.REGISTRATION &&
        tournament.status !== TournamentStatus.READY
      ) {
        throw conflict('이미 시작된 토너먼트는 취소할 수 없습니다', { reason: 'CLOSED' });
      }

      const participant = await tx.tournamentParticipant.findUnique({
        where: { tournamentId_userId: { tournamentId, userId } },
      });
      if (!participant || participant.status === TournamentParticipantStatus.CANCELLED) {
        return {
          success: false,
          tournamentId,
          registered: false,
          reason: 'NOT_REGISTERED' as const,
        };
      }

      await tx.tournamentParticipant.update({
        where: { id: participant.id },
        data: { status: TournamentParticipantStatus.CANCELLED },
      });

      const attempt = await nextEntryAttempt(tx, tournamentId, userId);
      // 현재 참가의 환불 attempt = 이미 완료된 환불 수와 동일한 entry attempt
      await applyWalletMutation(tx, {
        userId,
        transactionKey: refundKey(tournamentId, userId, attempt),
        assetType: AssetType.TICKET,
        transactionType: WalletTransactionType.REFUND,
        reason: WalletTransactionReason.TOURNAMENT_REFUND,
        amount: tournament.entryTicket,
        referenceType: 'Tournament',
        referenceId: tournamentId,
        description: `${tournament.name} 참가 취소 환불`,
      });

      const wallet = await tx.wallet.findUnique({ where: { userId } });
      return {
        success: true,
        tournamentId,
        registered: false,
        tickets: wallet?.ticketBalance ?? 0,
        points: wallet?.pointBalance ?? 0,
      };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  );
}

export async function listParticipants(tournamentId: string, meId?: string) {
  const rows = await prisma.tournamentParticipant.findMany({
    where: {
      tournamentId,
      status: { not: TournamentParticipantStatus.CANCELLED },
    },
    include: {
      user: {
        select: {
          id: true,
          nickname: true,
          avatar: { select: { imageUrl: true } },
          title: { select: { name: true } },
        },
      },
    },
    orderBy: [{ seed: 'asc' }, { joinedAt: 'asc' }],
  });

  return rows.map((p) => ({
    id: p.userId,
    nickname: p.user.nickname,
    avatar: p.user.avatar?.imageUrl ?? '✊',
    title: p.user.title?.name,
    seed: p.seed ?? undefined,
    status: p.status,
    finalRank: p.finalRank,
    isMe: meId === p.userId,
    eliminatedAtRound: p.status === TournamentParticipantStatus.ELIMINATED ? '탈락' : null,
  }));
}

export async function getBracket(tournamentId: string) {
  const matches = await prisma.tournamentMatch.findMany({
    where: { tournamentId },
    include: {
      player1: { select: { id: true, nickname: true, avatar: { select: { imageUrl: true } } } },
      player2: { select: { id: true, nickname: true, avatar: { select: { imageUrl: true } } } },
      winner: { select: { id: true } },
    },
    orderBy: [{ round: 'asc' }, { bracketPosition: 'asc' }],
  });

  const nodes = matches.map((m) => ({
    id: m.id,
    roundName: m.roundLabel ?? `${m.round}라운드`,
    roundKey: roundKeyFromLabel(m.roundLabel),
    tableNo: m.bracketPosition,
    isLive: m.status === 'READY' || m.status === 'PLAYING',
    isCompleted: m.status === 'COMPLETED' || m.status === 'BYE',
    isThirdPlace: m.isThirdPlace,
    nextMatchId: m.nextMatchId ?? undefined,
    player1: m.player1
      ? {
          name: m.player1.nickname,
          avatar: m.player1.avatar?.imageUrl ?? '✊',
          score: m.player1Wins,
          isWinner: m.winnerId === m.player1Id,
        }
      : null,
    player2: m.player2
      ? {
          name: m.player2.nickname,
          avatar: m.player2.avatar?.imageUrl ?? '✊',
          score: m.player2Wins,
          isWinner: m.winnerId === m.player2Id,
        }
      : null,
  }));

  const byRound = new Map<string, typeof nodes>();
  for (const node of nodes) {
    const key = node.roundName.split(' ')[0];
    const list = byRound.get(key) ?? [];
    list.push(node);
    byRound.set(key, list);
  }

  const rounds = [...byRound.entries()].map(([name, matchesInRound], order) => ({
    id: `round_${order + 1}`,
    name,
    order: order + 1,
    matches: matchesInRound,
    isCurrent: matchesInRound.some((m) => m.isLive),
  }));

  return {
    tournamentId,
    rounds,
    nodes,
    updatedAt: Date.now(),
  };
}

function roundKeyFromLabel(label: string | null): string {
  if (!label) return '16';
  if (label === '결승') return 'final';
  if (label === '준결승') return '4';
  if (label === '3·4위') return '3rd';
  const m = label.match(/(\d+)/);
  return m?.[1] ?? '16';
}

export async function getResult(tournamentId: string) {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: { rewards: true },
  });
  if (!tournament) throw notFound('토너먼트를 찾을 수 없습니다');

  const participants = await prisma.tournamentParticipant.findMany({
    where: {
      tournamentId,
      finalRank: { not: null },
      status: { not: TournamentParticipantStatus.CANCELLED },
    },
    include: {
      user: {
        select: {
          id: true,
          nickname: true,
          avatar: { select: { imageUrl: true } },
        },
      },
    },
    orderBy: { finalRank: 'asc' },
  });

  return {
    tournamentId,
    status: tournament.status,
    completedAt: tournament.completedAt?.toISOString() ?? null,
    rankings: participants.map((p) => ({
      rank: p.finalRank!,
      userId: p.userId,
      nickname: p.user.nickname,
      avatar: p.user.avatar?.imageUrl ?? '✊',
      rewardPoints:
        tournament.rewards.find(
          (r) => p.finalRank! >= r.rankFrom && p.finalRank! <= r.rankTo
        )?.pointReward ?? 0,
    })),
  };
}

/** 기본 보상표 시드 */
export async function ensureDefaultRewards(tx: DbClient, tournamentId: string, totalPrize: number) {
  const existing = await tx.tournamentReward.count({ where: { tournamentId } });
  if (existing > 0) return;

  const table = [
    { rankFrom: 1, rankTo: 1, pointReward: Math.floor(totalPrize * 0.4), label: '1위' },
    { rankFrom: 2, rankTo: 2, pointReward: Math.floor(totalPrize * 0.2), label: '2위' },
    { rankFrom: 3, rankTo: 3, pointReward: Math.floor(totalPrize * 0.12), label: '3위' },
    { rankFrom: 4, rankTo: 4, pointReward: Math.floor(totalPrize * 0.08), label: '4위' },
    { rankFrom: 5, rankTo: 8, pointReward: Math.floor(totalPrize * 0.05), label: '5-8위' },
  ];

  for (const row of table) {
    if (row.pointReward <= 0) continue;
    await tx.tournamentReward.create({
      data: { tournamentId, ...row },
    });
  }
}

export async function refundAllParticipants(tournamentId: string, reason: string) {
  const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });
  if (!tournament) return;

  const participants = await prisma.tournamentParticipant.findMany({
    where: {
      tournamentId,
      status: { not: TournamentParticipantStatus.CANCELLED },
    },
  });

  for (const p of participants) {
    await prisma.$transaction(async (tx) => {
      const attempt = await nextEntryAttempt(tx, tournamentId, p.userId);
      await applyWalletMutation(tx, {
        userId: p.userId,
        transactionKey: refundKey(tournamentId, p.userId, attempt),
        assetType: AssetType.TICKET,
        transactionType: WalletTransactionType.REFUND,
        reason: WalletTransactionReason.TOURNAMENT_REFUND,
        amount: tournament.entryTicket,
        referenceType: 'Tournament',
        referenceId: tournamentId,
        description: reason,
      });
      await tx.tournamentParticipant.update({
        where: { id: p.id },
        data: { status: TournamentParticipantStatus.CANCELLED },
      });
    }).catch(() => null);
  }
}

export { TOURNAMENT_POLICY };
