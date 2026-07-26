/**
 * 부정 이용 탐지.
 * 초기 정책: 차단하지 않고 신호(FraudSignal)를 기록하여 관리자가 검토·경고한다.
 *
 * - 실시간 신호: recordFraudSignal (게임 이벤트에서 호출)
 * - 배치 스캔: runFraudScan (관리자가 온디맨드/주기 실행) — 기존 데이터로 계산
 */
import {
  FraudSeverity,
  FraudSignalStatus,
  FraudSignalType,
  Prisma,
} from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { SECURITY_POLICY } from './policy.js';

type RecordInput = {
  type: FraudSignalType;
  severity?: FraudSeverity;
  userId?: string | null;
  /** 같은 신호를 하나의 행으로 누적하기 위한 키 (없으면 매번 새 행) */
  dedupeKey?: string;
  message: string;
  context?: unknown;
};

/**
 * 신호 기록.
 * dedupeKey 가 있으면 같은 키의 신호는 hitCount 만 증가시킨다(스팸 방지).
 * 실패해도 게임/요청 흐름을 막지 않도록 예외를 삼킨다.
 */
export async function recordFraudSignal(input: RecordInput) {
  const data = {
    type: input.type,
    severity: input.severity ?? FraudSeverity.WARN,
    userId: input.userId ?? null,
    message: input.message.slice(0, 500),
    context: (input.context ?? null) as Prisma.InputJsonValue,
  };

  try {
    if (input.dedupeKey) {
      return await prisma.fraudSignal.upsert({
        where: { dedupeKey: input.dedupeKey },
        create: { ...data, dedupeKey: input.dedupeKey, hitCount: 1 },
        update: {
          hitCount: { increment: 1 },
          // 재발생 시 심각도는 낮추지 않는다
          severity: data.severity,
          message: data.message,
          context: data.context,
          // 이미 종료된 신호가 재발하면 다시 OPEN
          status: FraudSignalStatus.OPEN,
        },
      });
    }
    return await prisma.fraudSignal.create({ data });
  } catch {
    return null;
  }
}

export async function listFraudSignals(query: {
  status?: string;
  type?: string;
  severity?: string;
  userId?: string;
  page?: number;
  limit?: number;
}) {
  const page = Math.max(1, query.page ?? 1);
  const limit = Math.min(
    SECURITY_POLICY.pagination.maxLimit,
    Math.max(1, query.limit ?? SECURITY_POLICY.pagination.defaultLimit)
  );
  const where: Prisma.FraudSignalWhereInput = {
    ...(query.status && query.status in FraudSignalStatus
      ? { status: FraudSignalStatus[query.status as keyof typeof FraudSignalStatus] }
      : {}),
    ...(query.type && query.type in FraudSignalType
      ? { type: FraudSignalType[query.type as keyof typeof FraudSignalType] }
      : {}),
    ...(query.severity && query.severity in FraudSeverity
      ? { severity: FraudSeverity[query.severity as keyof typeof FraudSeverity] }
      : {}),
    ...(query.userId ? { userId: query.userId } : {}),
  };

  const [total, rows, openCount, criticalCount] = await Promise.all([
    prisma.fraudSignal.count({ where }),
    prisma.fraudSignal.findMany({
      where,
      orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
      include: { user: { select: { id: true, nickname: true, status: true } } },
    }),
    prisma.fraudSignal.count({ where: { status: FraudSignalStatus.OPEN } }),
    prisma.fraudSignal.count({
      where: { status: FraudSignalStatus.OPEN, severity: FraudSeverity.CRITICAL },
    }),
  ]);

  return {
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
    openCount,
    criticalCount,
    items: rows.map((row) => ({
      id: row.id,
      type: row.type,
      severity: row.severity,
      status: row.status,
      hitCount: row.hitCount,
      message: row.message,
      context: row.context,
      user: row.user
        ? { id: row.user.id, nickname: row.user.nickname, status: row.user.status }
        : null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      reviewedAt: row.reviewedAt?.toISOString() ?? null,
    })),
  };
}

export async function reviewFraudSignal(input: {
  id: string;
  status: 'REVIEWING' | 'RESOLVED' | 'IGNORED';
  reviewedById: string;
}) {
  return prisma.fraudSignal.update({
    where: { id: input.id },
    data: {
      status: FraudSignalStatus[input.status],
      reviewedById: input.reviewedById,
      reviewedAt: new Date(),
    },
  });
}

// ─────────────────────────────────────────────
// 배치 스캔 — 기존 데이터에서 신호 계산
// ─────────────────────────────────────────────

/** 동일 IP 다계정 의심 (refresh_tokens.ip_address 기준) */
async function scanMultiAccountIp() {
  const since = new Date(Date.now() - SECURITY_POLICY.multiAccountIp.windowMs);
  const rows = await prisma.$queryRaw<
    Array<{ ip_address: string; user_count: bigint; user_ids: string[] }>
  >`
    SELECT "ip_address", COUNT(DISTINCT "user_id")::bigint AS user_count,
           ARRAY_AGG(DISTINCT "user_id") AS user_ids
    FROM "refresh_tokens"
    WHERE "created_at" >= ${since} AND "ip_address" IS NOT NULL
    GROUP BY "ip_address"
    HAVING COUNT(DISTINCT "user_id") >= ${SECURITY_POLICY.multiAccountIp.threshold}
    ORDER BY COUNT(DISTINCT "user_id") DESC
    LIMIT 50
  `;
  let created = 0;
  for (const row of rows) {
    const count = Number(row.user_count);
    await recordFraudSignal({
      type: FraudSignalType.MULTI_ACCOUNT_SAME_IP,
      severity: count >= SECURITY_POLICY.multiAccountIp.threshold * 2
        ? FraudSeverity.CRITICAL
        : FraudSeverity.WARN,
      dedupeKey: `multi_account_ip:${row.ip_address}`,
      message: `동일 IP(${row.ip_address})에서 ${count}개 계정 접속`,
      context: { ip: row.ip_address, userCount: count, userIds: row.user_ids.slice(0, 20) },
    });
    created += 1;
  }
  return created;
}

/** 비정상 승률 (최소 게임 수 이상 + 승률 임계 초과) */
async function scanAbnormalWinrate() {
  const { minGames, threshold } = SECURITY_POLICY.winRate;
  const users = await prisma.user.findMany({
    where: {
      status: 'ACTIVE',
      deletedAt: null,
      role: 'USER',
    },
    select: { id: true, nickname: true, wins: true, losses: true, draws: true },
  });
  let created = 0;
  for (const u of users) {
    const games = u.wins + u.losses + u.draws;
    if (games < minGames) continue;
    const rate = u.wins / games;
    if (rate < threshold) continue;
    await recordFraudSignal({
      type: FraudSignalType.ABNORMAL_WINRATE,
      severity: rate >= 0.97 ? FraudSeverity.CRITICAL : FraudSeverity.WARN,
      userId: u.id,
      dedupeKey: `abnormal_winrate:${u.id}`,
      message: `${u.nickname} 승률 ${(rate * 100).toFixed(1)}% (${games}판)`,
      context: { wins: u.wins, losses: u.losses, draws: u.draws, winRate: rate },
    });
    created += 1;
  }
  return created;
}

/** 비정상 포인트 증가 (윈도우 내 순증가 임계 초과) */
async function scanAbnormalPointGain() {
  const since = new Date(Date.now() - SECURITY_POLICY.pointGain.windowMs);
  const rows = await prisma.$queryRaw<
    Array<{ user_id: string; net_gain: number }>
  >`
    SELECT "user_id",
      SUM(CASE WHEN "transaction_type" IN ('CREDIT','REFUND') THEN "amount"
               WHEN "transaction_type" = 'DEBIT' THEN -"amount" ELSE 0 END)::int AS net_gain
    FROM "wallet_transactions"
    WHERE "created_at" >= ${since} AND "asset_type" = 'POINT'
    GROUP BY "user_id"
    HAVING SUM(CASE WHEN "transaction_type" IN ('CREDIT','REFUND') THEN "amount"
                    WHEN "transaction_type" = 'DEBIT' THEN -"amount" ELSE 0 END)
           >= ${SECURITY_POLICY.pointGain.threshold}
    ORDER BY 2 DESC
    LIMIT 50
  `;
  const users = rows.length
    ? await prisma.user.findMany({
        where: { id: { in: rows.map((r) => r.user_id) } },
        select: { id: true, nickname: true },
      })
    : [];
  const nickMap = new Map(users.map((u) => [u.id, u.nickname]));
  let created = 0;
  for (const row of rows) {
    await recordFraudSignal({
      type: FraudSignalType.ABNORMAL_POINT_GAIN,
      severity: FraudSeverity.WARN,
      userId: row.user_id,
      dedupeKey: `abnormal_point_gain:${row.user_id}:${since.toISOString().slice(0, 13)}`,
      message: `${nickMap.get(row.user_id) ?? row.user_id} 최근 포인트 순증가 ${row.net_gain.toLocaleString()}`,
      context: { netGain: row.net_gain, windowMs: SECURITY_POLICY.pointGain.windowMs },
    });
    created += 1;
  }
  return created;
}

/** 보상 반복 요청 (동일 reference 로 window 내 threshold 초과) */
async function scanRepeatedReward() {
  const since = new Date(Date.now() - SECURITY_POLICY.repeatedReward.windowMs);
  const rows = await prisma.$queryRaw<
    Array<{ user_id: string; reference_type: string; reference_id: string; hits: bigint }>
  >`
    SELECT "user_id", "reference_type", "reference_id", COUNT(*)::bigint AS hits
    FROM "wallet_transactions"
    WHERE "created_at" >= ${since}
      AND "transaction_type" IN ('CREDIT','REFUND')
      AND "reference_type" IS NOT NULL AND "reference_id" IS NOT NULL
    GROUP BY "user_id", "reference_type", "reference_id"
    HAVING COUNT(*) > ${SECURITY_POLICY.repeatedReward.threshold}
    ORDER BY COUNT(*) DESC
    LIMIT 50
  `;
  let created = 0;
  for (const row of rows) {
    await recordFraudSignal({
      type: FraudSignalType.REPEATED_REWARD,
      severity: FraudSeverity.WARN,
      userId: row.user_id,
      dedupeKey: `repeated_reward:${row.user_id}:${row.reference_type}:${row.reference_id}`,
      message: `보상 반복 지급 ${Number(row.hits)}회 (${row.reference_type}:${row.reference_id})`,
      context: {
        referenceType: row.reference_type,
        referenceId: row.reference_id,
        hits: Number(row.hits),
      },
    });
    created += 1;
  }
  return created;
}

/** 동일 상대 반복 매칭 (window 내 동일 페어 threshold 초과) */
async function scanSameOpponentRematch() {
  const since = new Date(Date.now() - SECURITY_POLICY.sameOpponent.windowMs);
  const rows = await prisma.$queryRaw<
    Array<{ a: string; b: string; hits: bigint }>
  >`
    SELECT LEAST("player1_id","player2_id") AS a,
           GREATEST("player1_id","player2_id") AS b,
           COUNT(*)::bigint AS hits
    FROM "matches"
    WHERE "created_at" >= ${since}
      AND "player1_id" IS NOT NULL AND "player2_id" IS NOT NULL
    GROUP BY LEAST("player1_id","player2_id"), GREATEST("player1_id","player2_id")
    HAVING COUNT(*) > ${SECURITY_POLICY.sameOpponent.threshold}
    ORDER BY COUNT(*) DESC
    LIMIT 50
  `;
  let created = 0;
  for (const row of rows) {
    await recordFraudSignal({
      type: FraudSignalType.SAME_OPPONENT_REMATCH,
      severity: Number(row.hits) >= SECURITY_POLICY.sameOpponent.threshold * 3
        ? FraudSeverity.CRITICAL
        : FraudSeverity.WARN,
      userId: row.a,
      dedupeKey: `same_opponent:${row.a}:${row.b}:${since.toISOString().slice(0, 10)}`,
      message: `동일 상대 반복 매칭 ${Number(row.hits)}회`,
      context: { userA: row.a, userB: row.b, hits: Number(row.hits) },
    });
    created += 1;
  }
  return created;
}

/** 전체 배치 스캔 실행 */
export async function runFraudScan() {
  const [multiAccount, winrate, pointGain, repeatedReward, sameOpponent] = await Promise.all([
    scanMultiAccountIp().catch(() => 0),
    scanAbnormalWinrate().catch(() => 0),
    scanAbnormalPointGain().catch(() => 0),
    scanRepeatedReward().catch(() => 0),
    scanSameOpponentRematch().catch(() => 0),
  ]);
  return {
    scannedAt: new Date().toISOString(),
    created: {
      multiAccountSameIp: multiAccount,
      abnormalWinrate: winrate,
      abnormalPointGain: pointGain,
      repeatedReward,
      sameOpponentRematch: sameOpponent,
    },
    total: multiAccount + winrate + pointGain + repeatedReward + sameOpponent,
  };
}
