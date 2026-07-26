/**
 * 관리자 토너먼트 관리.
 * 생성·수정·상태 전환·보상표·참가자·대진표 확인.
 */
import {
  Prisma,
  TournamentStatus,
  TournamentTier,
  TournamentType,
} from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { badRequest, notFound } from '../../lib/errors.js';
import { TOURNAMENT_POLICY } from '../tournament/policy.js';
import {
  adminCancel,
  adminCloseRegistration,
  adminForceComplete,
  adminOpenRegistration,
  adminPostpone,
  adminStart,
  getLiveBracketGamesForAdmin,
} from '../tournament/engine.js';
import { writeAudit, type AdminActor } from './audit.js';
import { ADMIN_POLICY } from './policy.js';

type TournamentInput = {
  name: string;
  type: string;
  tier: string;
  minParticipants: number;
  maxParticipants: number;
  bracketTarget?: number;
  entryTicket: number;
  totalPrize: number;
  startsAt: string;
  registrationEndsAt: string;
  refundOnPostpone?: boolean;
  qualifierRule?: string;
};

function validateInput(input: TournamentInput) {
  if (!(input.type in TournamentType)) throw badRequest('토너먼트 종류가 올바르지 않습니다');
  if (!(input.tier in TournamentTier)) throw badRequest('토너먼트 등급이 올바르지 않습니다');

  const tier = input.tier as keyof typeof TOURNAMENT_POLICY.tiers;
  const tierPolicy = TOURNAMENT_POLICY.tiers[tier];
  if (!tierPolicy.enabled) {
    throw badRequest(`${input.tier} 등급은 아직 준비 중입니다 (COMING SOON)`);
  }
  if (input.maxParticipants > tierPolicy.maxParticipants) {
    throw badRequest(`${input.tier} 등급의 최대 인원은 ${tierPolicy.maxParticipants}명입니다`);
  }
  if (input.minParticipants < 2 || input.minParticipants > input.maxParticipants) {
    throw badRequest('최소 인원이 올바르지 않습니다');
  }
  if (input.entryTicket < 0) throw badRequest('참가 티켓은 0 이상이어야 합니다');
  if (input.totalPrize < 0) throw badRequest('총 상금은 0 이상이어야 합니다');

  const startsAt = new Date(input.startsAt);
  const registrationEndsAt = new Date(input.registrationEndsAt);
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(registrationEndsAt.getTime())) {
    throw badRequest('일정 형식이 올바르지 않습니다');
  }
  if (registrationEndsAt > startsAt) {
    throw badRequest('모집 종료 시각은 시작 시각보다 앞서야 합니다');
  }

  return {
    tierPolicy,
    startsAt,
    registrationEndsAt,
  };
}

export async function listAdminTournaments(query: { status?: string; page?: number; limit?: number }) {
  const page = Math.max(1, query.page ?? 1);
  const limit = Math.min(
    ADMIN_POLICY.pagination.maxLimit,
    Math.max(1, query.limit ?? ADMIN_POLICY.pagination.defaultLimit)
  );
  const where: Prisma.TournamentWhereInput =
    query.status && query.status in TournamentStatus
      ? { status: TournamentStatus[query.status as keyof typeof TournamentStatus] }
      : {};

  const [total, rows] = await Promise.all([
    prisma.tournament.count({ where }),
    prisma.tournament.findMany({
      where,
      orderBy: { startsAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        _count: { select: { participants: true } },
        rewards: { orderBy: { rankFrom: 'asc' } },
      },
    }),
  ]);

  return {
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
    items: rows.map((t) => ({
      id: t.id,
      name: t.name,
      type: t.type,
      tier: t.tier,
      status: t.status,
      minParticipants: t.minParticipants,
      maxParticipants: t.maxParticipants,
      bracketTarget: t.bracketTarget,
      entryTicket: t.entryTicket,
      totalPrize: t.totalPrize,
      participants: t._count.participants,
      currentRoundLabel: t.currentRoundLabel,
      refundOnPostpone: t.refundOnPostpone,
      startsAt: t.startsAt.toISOString(),
      registrationEndsAt: t.registrationEndsAt.toISOString(),
      nextTransitionAt: t.nextTransitionAt?.toISOString() ?? null,
      rewards: t.rewards.map((r) => ({
        id: r.id,
        rankFrom: r.rankFrom,
        rankTo: r.rankTo,
        pointReward: r.pointReward,
        label: r.label,
      })),
    })),
  };
}

export async function createTournament(input: { actor: AdminActor; reason: string } & TournamentInput) {
  const { tierPolicy, startsAt, registrationEndsAt } = validateInput(input);

  const created = await prisma.tournament.create({
    data: {
      name: input.name.trim().slice(0, 120),
      type: TournamentType[input.type as keyof typeof TournamentType],
      tier: TournamentTier[input.tier as keyof typeof TournamentTier],
      status: TournamentStatus.DRAFT,
      minParticipants: input.minParticipants,
      maxParticipants: input.maxParticipants,
      bracketTarget: input.bracketTarget ?? tierPolicy.defaultBracketTarget,
      entryTicket: input.entryTicket,
      totalPrize: input.totalPrize,
      qualifierRule: input.qualifierRule ?? '예선 소수결 (최소 그룹 통과)',
      refundOnPostpone: input.refundOnPostpone ?? true,
      startsAt,
      registrationEndsAt,
    },
  });

  await writeAudit({
    actor: input.actor,
    action: 'TOURNAMENT_CREATE',
    targetType: 'TOURNAMENT',
    targetId: created.id,
    reason: input.reason,
    after: { name: created.name, tier: created.tier, startsAt: created.startsAt },
  });

  return created;
}

export async function updateTournament(
  input: { actor: AdminActor; reason: string; tournamentId: string } & Partial<TournamentInput>
) {
  const current = await prisma.tournament.findUnique({ where: { id: input.tournamentId } });
  if (!current) throw notFound('토너먼트를 찾을 수 없습니다');
  if (
    current.status !== TournamentStatus.DRAFT &&
    current.status !== TournamentStatus.REGISTRATION &&
    current.status !== TournamentStatus.POSTPONED
  ) {
    throw badRequest('진행 중이거나 종료된 토너먼트는 수정할 수 없습니다');
  }

  const merged: TournamentInput = {
    name: input.name ?? current.name,
    type: input.type ?? current.type,
    tier: input.tier ?? current.tier,
    minParticipants: input.minParticipants ?? current.minParticipants,
    maxParticipants: input.maxParticipants ?? current.maxParticipants,
    bracketTarget: input.bracketTarget ?? current.bracketTarget,
    entryTicket: input.entryTicket ?? current.entryTicket,
    totalPrize: input.totalPrize ?? current.totalPrize,
    startsAt: input.startsAt ?? current.startsAt.toISOString(),
    registrationEndsAt: input.registrationEndsAt ?? current.registrationEndsAt.toISOString(),
    refundOnPostpone: input.refundOnPostpone ?? current.refundOnPostpone,
    qualifierRule: input.qualifierRule ?? current.qualifierRule ?? undefined,
  };
  const { startsAt, registrationEndsAt } = validateInput(merged);

  const updated = await prisma.tournament.update({
    where: { id: input.tournamentId },
    data: {
      name: merged.name.trim().slice(0, 120),
      type: TournamentType[merged.type as keyof typeof TournamentType],
      tier: TournamentTier[merged.tier as keyof typeof TournamentTier],
      minParticipants: merged.minParticipants,
      maxParticipants: merged.maxParticipants,
      bracketTarget: merged.bracketTarget,
      entryTicket: merged.entryTicket,
      totalPrize: merged.totalPrize,
      qualifierRule: merged.qualifierRule,
      refundOnPostpone: merged.refundOnPostpone,
      startsAt,
      registrationEndsAt,
      version: { increment: 1 },
    },
  });

  await writeAudit({
    actor: input.actor,
    action: 'TOURNAMENT_UPDATE',
    targetType: 'TOURNAMENT',
    targetId: updated.id,
    reason: input.reason,
    before: {
      name: current.name,
      tier: current.tier,
      minParticipants: current.minParticipants,
      maxParticipants: current.maxParticipants,
      entryTicket: current.entryTicket,
      totalPrize: current.totalPrize,
      startsAt: current.startsAt,
    },
    after: {
      name: updated.name,
      tier: updated.tier,
      minParticipants: updated.minParticipants,
      maxParticipants: updated.maxParticipants,
      entryTicket: updated.entryTicket,
      totalPrize: updated.totalPrize,
      startsAt: updated.startsAt,
    },
  });

  return updated;
}

export type TournamentAdminAction =
  | 'OPEN_REGISTRATION'
  | 'CLOSE_REGISTRATION'
  | 'START'
  | 'POSTPONE'
  | 'CANCEL'
  | 'FORCE_COMPLETE';

const ACTION_AUDIT: Record<TournamentAdminAction, string> = {
  OPEN_REGISTRATION: 'TOURNAMENT_OPEN_REGISTRATION',
  CLOSE_REGISTRATION: 'TOURNAMENT_CLOSE_REGISTRATION',
  START: 'TOURNAMENT_START',
  POSTPONE: 'TOURNAMENT_POSTPONE',
  CANCEL: 'TOURNAMENT_CANCEL',
  FORCE_COMPLETE: 'TOURNAMENT_FORCE_COMPLETE',
};

export function auditActionFor(action: TournamentAdminAction) {
  return ACTION_AUDIT[action];
}

export async function runTournamentAction(input: {
  actor: AdminActor;
  tournamentId: string;
  action: TournamentAdminAction;
  reason: string;
}) {
  const before = await prisma.tournament.findUnique({ where: { id: input.tournamentId } });
  if (!before) throw notFound('토너먼트를 찾을 수 없습니다');

  let ok = false;
  switch (input.action) {
    case 'OPEN_REGISTRATION':
      ok = await adminOpenRegistration(input.tournamentId);
      break;
    case 'CLOSE_REGISTRATION':
      ok = await adminCloseRegistration(input.tournamentId);
      break;
    case 'START':
      ok = await adminStart(input.tournamentId);
      break;
    case 'POSTPONE':
      ok = await adminPostpone(input.tournamentId, input.reason);
      break;
    case 'CANCEL':
      ok = await adminCancel(input.tournamentId, input.reason);
      break;
    case 'FORCE_COMPLETE':
      ok = await adminForceComplete(input.tournamentId);
      break;
  }

  const after = await prisma.tournament.findUnique({ where: { id: input.tournamentId } });

  await writeAudit({
    actor: input.actor,
    action: ACTION_AUDIT[input.action],
    targetType: 'TOURNAMENT',
    targetId: input.tournamentId,
    reason: input.reason,
    before: { status: before.status, currentRoundLabel: before.currentRoundLabel },
    after: { status: after?.status, currentRoundLabel: after?.currentRoundLabel, applied: ok },
  });

  if (!ok) {
    throw badRequest(
      `현재 상태(${before.status})에서는 이 작업을 실행할 수 없습니다`,
      { code: 'INVALID_TRANSITION' }
    );
  }

  return { status: after?.status ?? before.status };
}

/** 보상표 설정 (전체 교체) */
export async function setRewardTable(input: {
  actor: AdminActor;
  tournamentId: string;
  reason: string;
  rows: Array<{ rankFrom: number; rankTo: number; pointReward: number; label?: string }>;
}) {
  const tournament = await prisma.tournament.findUnique({
    where: { id: input.tournamentId },
    include: { rewards: true },
  });
  if (!tournament) throw notFound('토너먼트를 찾을 수 없습니다');
  if (tournament.status === TournamentStatus.COMPLETED) {
    throw badRequest('종료된 토너먼트의 보상표는 변경할 수 없습니다');
  }
  if (!input.rows.length) throw badRequest('보상표를 1개 이상 입력해 주세요');

  for (const row of input.rows) {
    if (row.rankFrom < 1 || row.rankTo < row.rankFrom) {
      throw badRequest('보상 구간이 올바르지 않습니다');
    }
    if (row.pointReward < 0) throw badRequest('보상 포인트는 0 이상이어야 합니다');
  }

  const sorted = [...input.rows].sort((a, b) => a.rankFrom - b.rankFrom);
  for (let i = 1; i < sorted.length; i += 1) {
    if (sorted[i].rankFrom <= sorted[i - 1].rankTo) {
      throw badRequest('보상 구간이 서로 겹칩니다');
    }
  }

  const before = tournament.rewards.map((r) => ({
    rankFrom: r.rankFrom,
    rankTo: r.rankTo,
    pointReward: r.pointReward,
    label: r.label,
  }));

  await prisma.$transaction(async (tx) => {
    await tx.tournamentReward.deleteMany({ where: { tournamentId: input.tournamentId } });
    for (const row of sorted) {
      await tx.tournamentReward.create({
        data: {
          tournamentId: input.tournamentId,
          rankFrom: row.rankFrom,
          rankTo: row.rankTo,
          pointReward: row.pointReward,
          label: row.label ?? `${row.rankFrom}-${row.rankTo}위`,
        },
      });
    }
    await writeAudit({
      actor: input.actor,
      action: 'TOURNAMENT_REWARDS_SET',
      targetType: 'TOURNAMENT',
      targetId: input.tournamentId,
      reason: input.reason,
      before,
      after: sorted,
      tx,
    });
  });

  return prisma.tournamentReward.findMany({
    where: { tournamentId: input.tournamentId },
    orderBy: { rankFrom: 'asc' },
  });
}

/** 참가자 · 대진표 · 경기 상태 확인 */
export async function getTournamentOps(tournamentId: string) {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: {
      rewards: { orderBy: { rankFrom: 'asc' } },
      participants: {
        orderBy: [{ finalRank: 'asc' }, { joinedAt: 'asc' }],
        include: { user: { select: { id: true, nickname: true, status: true, level: true } } },
      },
      bracketMatches: {
        orderBy: [{ round: 'asc' }, { bracketPosition: 'asc' }],
        include: {
          player1: { select: { id: true, nickname: true } },
          player2: { select: { id: true, nickname: true } },
        },
      },
    },
  });
  if (!tournament) throw notFound('토너먼트를 찾을 수 없습니다');

  return {
    tournament: {
      id: tournament.id,
      name: tournament.name,
      status: tournament.status,
      tier: tournament.tier,
      type: tournament.type,
      currentRoundLabel: tournament.currentRoundLabel,
      minParticipants: tournament.minParticipants,
      maxParticipants: tournament.maxParticipants,
      bracketTarget: tournament.bracketTarget,
      entryTicket: tournament.entryTicket,
      totalPrize: tournament.totalPrize,
      refundOnPostpone: tournament.refundOnPostpone,
      startsAt: tournament.startsAt.toISOString(),
      registrationEndsAt: tournament.registrationEndsAt.toISOString(),
      nextTransitionAt: tournament.nextTransitionAt?.toISOString() ?? null,
    },
    rewards: tournament.rewards.map((r) => ({
      id: r.id,
      rankFrom: r.rankFrom,
      rankTo: r.rankTo,
      pointReward: r.pointReward,
      label: r.label,
    })),
    participants: tournament.participants.map((p) => ({
      userId: p.userId,
      nickname: p.user?.nickname ?? '-',
      accountStatus: p.user?.status ?? null,
      level: p.user?.level ?? 0,
      status: p.status,
      seed: p.seed,
      finalRank: p.finalRank,
      joinedAt: p.joinedAt.toISOString(),
      eliminatedAt: p.eliminatedAt?.toISOString() ?? null,
    })),
    bracket: tournament.bracketMatches.map((m) => ({
      id: m.id,
      round: m.round,
      roundLabel: m.roundLabel,
      bracketPosition: m.bracketPosition,
      status: m.status,
      isThirdPlace: m.isThirdPlace,
      winsRequired: m.winsRequired,
      player1: m.player1 ? { id: m.player1.id, nickname: m.player1.nickname } : null,
      player2: m.player2 ? { id: m.player2.id, nickname: m.player2.nickname } : null,
      player1Wins: m.player1Wins,
      player2Wins: m.player2Wins,
      winnerId: m.winnerId,
      startedAt: m.startedAt?.toISOString() ?? null,
      completedAt: m.completedAt?.toISOString() ?? null,
    })),
    liveGames: getLiveBracketGamesForAdmin(tournamentId),
  };
}
