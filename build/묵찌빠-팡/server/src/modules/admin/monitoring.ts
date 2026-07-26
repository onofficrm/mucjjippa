/**
 * 게임 모니터링.
 * - 진행 중 매치 / 선택 제출 여부 / 연결 상태 / 결과 상태
 * - 오류 로그
 * - 중복 거래 탐지
 *
 * 결과 공개 전 실제 선택값은 응답에 포함하지 않는다 (runtime 계층에서 마스킹).
 * 관리자에게는 어떤 선택 변경 API도 제공하지 않는다 — 읽기 전용.
 */
import { Prisma, SystemErrorLevel } from '@prisma/client';
import type { Server as SocketIOServer } from 'socket.io';
import { prisma } from '../../lib/prisma.js';
import {
  getLiveMatchesForAdmin,
  getQueueSnapshotForAdmin,
} from '../match/runtime.js';
import { getLiveBracketGamesForAdmin } from '../tournament/engine.js';
import { listLiveSnapshots } from '../watch/spectator.js';
import { ADMIN_POLICY } from './policy.js';

export function getLiveMonitor(io: SocketIOServer | null) {
  return {
    generatedAt: new Date().toISOString(),
    connectedSockets: io ? io.engine.clientsCount : 0,
    matches: getLiveMatchesForAdmin(),
    queues: getQueueSnapshotForAdmin(),
    bracketGames: getLiveBracketGamesForAdmin(),
    watchStreams: listLiveSnapshots().map((s) => ({
      matchId: s.matchId,
      kind: s.kind,
      phase: s.phase,
      viewerCount: s.viewerCount,
    })),
  };
}

export async function listErrorLogs(query: {
  page?: number;
  limit?: number;
  level?: string;
  unresolvedOnly?: boolean;
}) {
  const page = Math.max(1, query.page ?? 1);
  const limit = Math.min(
    ADMIN_POLICY.pagination.maxLimit,
    Math.max(1, query.limit ?? ADMIN_POLICY.pagination.defaultLimit)
  );
  const where: Prisma.SystemErrorLogWhereInput = {
    ...(query.level && query.level in SystemErrorLevel
      ? { level: SystemErrorLevel[query.level as keyof typeof SystemErrorLevel] }
      : {}),
    ...(query.unresolvedOnly ? { resolvedAt: null } : {}),
  };

  const [total, rows] = await Promise.all([
    prisma.systemErrorLog.count({ where }),
    prisma.systemErrorLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return {
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
    items: rows.map((r) => ({
      id: r.id,
      level: r.level,
      code: r.code,
      message: r.message,
      scope: r.scope,
      userId: r.userId,
      requestId: r.requestId,
      context: r.context,
      resolved: Boolean(r.resolvedAt),
      createdAt: r.createdAt.toISOString(),
    })),
  };
}

/**
 * 중복 거래 탐지.
 * transactionKey 는 유니크라 완전 중복은 차단되지만,
 * 같은 사용자·자산·금액·사유가 짧은 시간에 여러 키로 들어오면 의심 거래로 본다.
 */
export async function detectDuplicateTransactions(windowMinutes?: number) {
  const minutes = Math.max(1, Math.min(1440, windowMinutes ?? ADMIN_POLICY.duplicateWindowMinutes));
  const since = new Date(Date.now() - minutes * 60_000);

  const rows = await prisma.$queryRaw<
    Array<{
      user_id: string;
      asset_type: string;
      transaction_type: string;
      reason: string;
      amount: number;
      hits: bigint;
      keys: string[];
      first_at: Date;
      last_at: Date;
    }>
  >`
    SELECT
      "user_id",
      "asset_type"::text        AS asset_type,
      "transaction_type"::text  AS transaction_type,
      "reason"::text            AS reason,
      "amount",
      COUNT(*)::bigint          AS hits,
      ARRAY_AGG("transaction_key" ORDER BY "created_at") AS keys,
      MIN("created_at")         AS first_at,
      MAX("created_at")         AS last_at
    FROM "wallet_transactions"
    WHERE "created_at" >= ${since}
    GROUP BY "user_id", "asset_type", "transaction_type", "reason", "amount"
    HAVING COUNT(*) > 1
    ORDER BY COUNT(*) DESC, MAX("created_at") DESC
    LIMIT 50
  `;

  const userIds = [...new Set(rows.map((r) => r.user_id))];
  const users = userIds.length
    ? await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, nickname: true },
      })
    : [];
  const nickMap = new Map(users.map((u) => [u.id, u.nickname]));

  const [duplicateKeyCount, referenceDupes] = await Promise.all([
    prisma.walletTransaction.count({ where: { createdAt: { gte: since } } }),
    prisma.$queryRaw<Array<{ reference_type: string; reference_id: string; hits: bigint }>>`
      SELECT "reference_type", "reference_id", COUNT(*)::bigint AS hits
      FROM "wallet_transactions"
      WHERE "created_at" >= ${since}
        AND "reference_type" IS NOT NULL
        AND "reference_id" IS NOT NULL
      GROUP BY "reference_type", "reference_id"
      HAVING COUNT(*) > 2
      ORDER BY COUNT(*) DESC
      LIMIT 20
    `,
  ]);

  return {
    windowMinutes: minutes,
    scannedTransactions: duplicateKeyCount,
    suspects: rows.map((r) => ({
      userId: r.user_id,
      nickname: nickMap.get(r.user_id) ?? '-',
      asset: r.asset_type,
      type: r.transaction_type,
      reason: r.reason,
      amount: r.amount,
      hits: Number(r.hits),
      transactionKeys: r.keys,
      firstAt: r.first_at.toISOString(),
      lastAt: r.last_at.toISOString(),
    })),
    referenceHotspots: referenceDupes.map((r) => ({
      referenceType: r.reference_type,
      referenceId: r.reference_id,
      hits: Number(r.hits),
    })),
  };
}

/** 운영 오류 기록 헬퍼 — 서버 어디서든 호출 가능 */
export async function recordSystemError(input: {
  code: string;
  message: string;
  level?: SystemErrorLevel;
  scope?: string;
  userId?: string;
  requestId?: string;
  context?: unknown;
}) {
  return prisma.systemErrorLog
    .create({
      data: {
        code: input.code.slice(0, 64),
        message: input.message.slice(0, 500),
        level: input.level ?? SystemErrorLevel.ERROR,
        scope: input.scope?.slice(0, 64),
        userId: input.userId,
        requestId: input.requestId?.slice(0, 64),
        context: (input.context ?? null) as Prisma.InputJsonValue,
      },
    })
    .catch(() => null);
}

export async function resolveErrorLog(id: string) {
  return prisma.systemErrorLog.update({
    where: { id },
    data: { resolvedAt: new Date() },
  });
}
