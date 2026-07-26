import type { AccessTokenPayload } from './auth.js';
import { badRequest, unauthorized } from './errors.js';
import { prisma } from './prisma.js';

const ADMIN_ROLES = ['ADMIN', 'SUPER_ADMIN'] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

function isAdminRole(role: string | undefined): role is AdminRole {
  return (ADMIN_ROLES as readonly string[]).includes(role ?? '');
}

export function requireUser(payload: AccessTokenPayload): string {
  if (payload.typ !== 'user') {
    throw badRequest('게스트는 이 기능을 사용할 수 없습니다', { code: 'GUEST_FORBIDDEN' });
  }
  return payload.sub;
}

/**
 * ADMIN / SUPER_ADMIN 확인.
 * JWT 의 role 과 DB 의 role 을 모두 검증한다 (토큰만 위조해도 통과 못 함).
 */
export async function requireAdmin(payload: AccessTokenPayload): Promise<string> {
  const { userId } = await requireAdminContext(payload);
  return userId;
}

export async function requireAdminContext(
  payload: AccessTokenPayload
): Promise<{ userId: string; role: AdminRole; nickname: string }> {
  const userId = requireUser(payload);
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, status: true, nickname: true, deletedAt: true },
  });
  if (
    !isAdminRole(payload.role) ||
    !user ||
    !isAdminRole(user.role) ||
    user.status !== 'ACTIVE' ||
    user.deletedAt
  ) {
    throw unauthorized('관리자 권한이 필요합니다');
  }
  return { userId, role: user.role, nickname: user.nickname };
}

/** SUPER_ADMIN 전용 작업 */
export async function requireSuperAdmin(payload: AccessTokenPayload): Promise<string> {
  const ctx = await requireAdminContext(payload);
  if (ctx.role !== 'SUPER_ADMIN') {
    throw unauthorized('이 작업은 최고 관리자(SUPER_ADMIN) 권한이 필요합니다');
  }
  return ctx.userId;
}
