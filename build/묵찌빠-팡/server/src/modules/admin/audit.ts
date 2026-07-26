/**
 * 관리자 감사 로그.
 * 관리자 / 시간 / IP / 작업 종류 / 대상 / 변경 전 / 변경 후 / 사유를 모두 기록한다.
 */
import type { FastifyRequest } from 'fastify';
import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { badRequest } from '../../lib/errors.js';
import { requireAdminContext, requireSuperAdmin, type AdminRole } from '../../lib/access.js';
import type { AccessTokenPayload } from '../../lib/auth.js';
import { ADMIN_POLICY, isCriticalAction, isSuperAdminAction } from './policy.js';

export type AdminActor = {
  userId: string;
  role: AdminRole;
  nickname: string;
  ip: string;
  userAgent: string;
};

export function clientIp(request: FastifyRequest): string {
  const forwarded = request.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0]!.trim().slice(0, 64);
  }
  return (request.ip ?? 'unknown').slice(0, 64);
}

/** 관리자 확인 + 감사 로그용 컨텍스트 확보 */
export async function adminActor(request: FastifyRequest): Promise<AdminActor> {
  const ctx = await requireAdminContext(request.user as AccessTokenPayload);
  return {
    ...ctx,
    ip: clientIp(request),
    userAgent: String(request.headers['user-agent'] ?? '').slice(0, 255),
  };
}

/** 사유 필수 검증 */
export function requireReason(raw: unknown): string {
  const reason = typeof raw === 'string' ? raw.trim() : '';
  if (reason.length < ADMIN_POLICY.reason.min) {
    throw badRequest(`변경 사유를 ${ADMIN_POLICY.reason.min}자 이상 입력해 주세요`, {
      code: 'REASON_REQUIRED',
    });
  }
  return reason.slice(0, ADMIN_POLICY.reason.max);
}

/**
 * 중요 작업 게이트.
 * - 재확인 문구(confirm)가 있어야 통과
 * - SUPER_ADMIN 전용 작업은 역할까지 확인
 */
export async function assertActionAllowed(
  request: FastifyRequest,
  action: string,
  confirm: unknown
) {
  if (isSuperAdminAction(action)) {
    await requireSuperAdmin(request.user as AccessTokenPayload);
  }
  if (isCriticalAction(action) && confirm !== ADMIN_POLICY.confirmPhrase) {
    throw badRequest('중요 작업입니다. 재확인이 필요합니다', {
      code: 'CONFIRM_REQUIRED',
      expected: ADMIN_POLICY.confirmPhrase,
    });
  }
}

export async function writeAudit(input: {
  actor: AdminActor;
  action: string;
  targetType: string;
  targetId: string;
  reason: string;
  before?: unknown;
  after?: unknown;
  tx?: Prisma.TransactionClient;
}) {
  const db = input.tx ?? prisma;
  return db.auditLog.create({
    data: {
      adminUserId: input.actor.userId,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      reason: input.reason,
      ipAddress: input.actor.ip,
      userAgent: input.actor.userAgent,
      beforeData: (input.before ?? null) as Prisma.InputJsonValue,
      afterData: (input.after ?? null) as Prisma.InputJsonValue,
    },
  });
}

export async function listAuditLogs(query: {
  page?: number;
  limit?: number;
  action?: string;
  adminUserId?: string;
  targetId?: string;
}) {
  const page = Math.max(1, query.page ?? 1);
  const limit = Math.min(
    ADMIN_POLICY.pagination.maxLimit,
    Math.max(1, query.limit ?? ADMIN_POLICY.pagination.defaultLimit)
  );
  const where: Prisma.AuditLogWhereInput = {
    ...(query.action ? { action: query.action } : {}),
    ...(query.adminUserId ? { adminUserId: query.adminUserId } : {}),
    ...(query.targetId ? { targetId: query.targetId } : {}),
  };

  const [total, rows] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: { adminUser: { select: { id: true, nickname: true, role: true } } },
    }),
  ]);

  return {
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
    items: rows.map((row) => ({
      id: row.id,
      admin: row.adminUser
        ? { id: row.adminUser.id, nickname: row.adminUser.nickname, role: row.adminUser.role }
        : null,
      action: row.action,
      targetType: row.targetType,
      targetId: row.targetId,
      before: row.beforeData,
      after: row.afterData,
      reason: row.reason,
      ip: row.ipAddress,
      userAgent: row.userAgent,
      createdAt: row.createdAt.toISOString(),
    })),
  };
}
