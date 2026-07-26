/**
 * 미션 진행·수령.
 * - 완료 여부는 서버 판정
 * - 보상은 transactionKey 로 중복 수령 방지
 * - 클라이언트가 임의 완료 요청해도 진행도만 재계산/검증
 */
import {
  AssetType,
  CatalogStatus,
  MissionMetric,
  MissionPeriod,
  Prisma,
  WalletTransactionReason,
  WalletTransactionType,
} from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { applyWalletMutation } from '../../lib/wallet.js';
import { badRequest, notFound } from '../../lib/errors.js';

export function dailyKey(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

export function weeklyKey(d = new Date()) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

export function periodKeyFor(period: MissionPeriod, now = new Date()) {
  if (period === MissionPeriod.DAILY) return dailyKey(now);
  if (period === MissionPeriod.WEEKLY) return weeklyKey(now);
  return 'once';
}

export function missionRewardKey(missionId: string, userId: string, periodKey: string) {
  return `mission-reward:${missionId}:${userId}:${periodKey}`;
}

type ProgressEvent = {
  metric: MissionMetric;
  amount?: number;
  /** STREAK_REACH 등 absolute 값 */
  absolute?: number;
};

async function ensureProgressRow(
  tx: Prisma.TransactionClient,
  userId: string,
  missionId: string,
  periodKey: string
) {
  return tx.userMission.upsert({
    where: {
      userId_missionId_periodKey: { userId, missionId, periodKey },
    },
    create: { userId, missionId, periodKey, progress: 0 },
    update: {},
  });
}

export async function applyMissionProgress(userId: string, events: ProgressEvent[]) {
  if (!events.length) return [];
  const missions = await prisma.mission.findMany({
    where: { status: CatalogStatus.ACTIVE },
  });
  const touched: Array<{ code: string; progress: number; goal: number; completed: boolean }> = [];

  await prisma.$transaction(async (tx) => {
    for (const mission of missions) {
      const relevant = events.filter((e) => e.metric === mission.metric);
      if (!relevant.length) continue;
      const key = periodKeyFor(mission.period);
      const row = await ensureProgressRow(tx, userId, mission.id, key);

      let next = row.progress;
      for (const ev of relevant) {
        if (typeof ev.absolute === 'number') {
          next = Math.max(next, ev.absolute);
        } else {
          next += ev.amount ?? 1;
        }
      }
      next = Math.min(next, mission.goal);
      const completed = next >= mission.goal;
      const updated = await tx.userMission.update({
        where: { id: row.id },
        data: {
          progress: next,
          completedAt: completed ? row.completedAt ?? new Date() : row.completedAt,
        },
      });
      touched.push({
        code: mission.code,
        progress: updated.progress,
        goal: mission.goal,
        completed,
      });
    }
  });

  return touched;
}

export async function listMissionsForUser(userId: string) {
  const missions = await prisma.mission.findMany({
    where: { status: CatalogStatus.ACTIVE },
    orderBy: [{ period: 'asc' }, { sortOrder: 'asc' }],
  });
  const keys = [...new Set(missions.map((m) => periodKeyFor(m.period)))];
  const rows = await prisma.userMission.findMany({
    where: { userId, periodKey: { in: keys } },
  });
  const map = new Map(rows.map((r) => [`${r.missionId}:${r.periodKey}`, r]));

  return missions.map((m) => {
    const key = periodKeyFor(m.period);
    const row = map.get(`${m.id}:${key}`);
    const progress = row?.progress ?? 0;
    const claimed = Boolean(row?.claimedAt);
    const completed = progress >= m.goal || Boolean(row?.completedAt);
    let status: 'locked' | 'in_progress' | 'completed' | 'claimed' = 'in_progress';
    if (claimed) status = 'claimed';
    else if (completed) status = 'completed';
    else if (progress === 0) status = 'in_progress';

    return {
      id: m.id,
      code: m.code,
      title: m.title,
      description: m.description ?? undefined,
      period: m.period,
      metric: m.metric,
      progress,
      goal: m.goal,
      status,
      rewardPoints: m.rewardPoints,
      rewardTickets: m.rewardTickets,
      periodKey: key,
      resetsAt:
        m.period === MissionPeriod.DAILY
          ? Date.parse(`${dailyKey()}T23:59:59.999Z`)
          : m.period === MissionPeriod.WEEKLY
            ? undefined
            : undefined,
    };
  });
}

export async function claimMission(userId: string, missionId: string) {
  const mission = await prisma.mission.findFirst({
    where: { id: missionId, status: CatalogStatus.ACTIVE },
  });
  if (!mission) throw notFound('미션을 찾을 수 없습니다');

  const key = periodKeyFor(mission.period);
  const row = await prisma.userMission.findUnique({
    where: {
      userId_missionId_periodKey: { userId, missionId, periodKey: key },
    },
  });
  if (!row || row.progress < mission.goal) {
    throw badRequest('미션이 아직 완료되지 않았습니다');
  }
  if (row.claimedAt) {
    return { duplicated: true as const, rewards: { points: 0, tickets: 0 } };
  }

  return prisma.$transaction(async (tx) => {
    const locked = await tx.userMission.findUnique({
      where: { id: row.id },
    });
    if (!locked || locked.claimedAt) {
      return { duplicated: true as const, rewards: { points: 0, tickets: 0 } };
    }
    if (locked.progress < mission.goal) {
      throw badRequest('미션이 아직 완료되지 않았습니다');
    }

    const txKey = missionRewardKey(mission.id, userId, key);
    let pointsDup = false;
    let ticketsDup = false;

    if (mission.rewardPoints > 0) {
      const r = await applyWalletMutation(tx, {
        userId,
        transactionKey: `${txKey}:POINT`,
        assetType: AssetType.POINT,
        transactionType: WalletTransactionType.CREDIT,
        reason: WalletTransactionReason.MISSION_REWARD,
        amount: mission.rewardPoints,
        referenceType: 'mission',
        referenceId: mission.id,
        description: `미션 보상: ${mission.title}`,
      });
      pointsDup = r.duplicated;
    }
    if (mission.rewardTickets > 0) {
      const r = await applyWalletMutation(tx, {
        userId,
        transactionKey: `${txKey}:TICKET`,
        assetType: AssetType.TICKET,
        transactionType: WalletTransactionType.CREDIT,
        reason: WalletTransactionReason.MISSION_REWARD,
        amount: mission.rewardTickets,
        referenceType: 'mission',
        referenceId: mission.id,
        description: `미션 티켓: ${mission.title}`,
      });
      ticketsDup = r.duplicated;
    }

    await tx.userMission.update({
      where: { id: row.id },
      data: { claimedAt: new Date(), completedAt: locked.completedAt ?? new Date() },
    });

    const wallet = await tx.wallet.findUniqueOrThrow({ where: { userId } });
    return {
      duplicated: pointsDup && ticketsDup,
      rewards: { points: mission.rewardPoints, tickets: mission.rewardTickets },
      wallet: { points: wallet.pointBalance, tickets: wallet.ticketBalance },
    };
  });
}
