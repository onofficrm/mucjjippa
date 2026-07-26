/**
 * 테스트 픽스처 — 격리된 사용자/지갑 생성·정리.
 */
import { randomBytes } from 'node:crypto';
import { UserRole, UserStatus } from '@prisma/client';
import { prisma } from '../../src/lib/prisma.js';
import { hashPassword } from '../../src/lib/auth.js';

export function uniqueSuffix() {
  return `${Date.now().toString(36)}_${randomBytes(3).toString('hex')}`;
}

export async function createTestUser(opts?: {
  loginId?: string;
  nickname?: string;
  password?: string;
  points?: number;
  tickets?: number;
  role?: UserRole;
}) {
  const suffix = uniqueSuffix();
  const loginId = opts?.loginId ?? `t_${suffix}`;
  const nickname = opts?.nickname ?? `닉_${suffix.slice(-8)}`;
  const password = opts?.password ?? 'Test1234!';
  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      loginId,
      nickname,
      passwordHash,
      status: UserStatus.ACTIVE,
      role: opts?.role ?? UserRole.USER,
      email: `${loginId}@test.local`,
      wallet: {
        create: {
          pointBalance: opts?.points ?? 10_000,
          ticketBalance: opts?.tickets ?? 5,
        },
      },
      settings: { create: {} },
    },
    include: { wallet: true },
  });

  return { user, password, loginId, nickname };
}

export async function deleteTestUser(userId: string) {
  await prisma.walletTransaction.deleteMany({ where: { userId } });
  await prisma.refreshToken.deleteMany({ where: { userId } });
  await prisma.inventory.deleteMany({ where: { userId } });
  await prisma.userMission.deleteMany({ where: { userId } });
  await prisma.notification.deleteMany({ where: { userId } });
  await prisma.fraudSignal.deleteMany({ where: { userId } });
  await prisma.tournamentParticipant.deleteMany({ where: { userId } });
  // matches referencing user
  await prisma.matchRound.deleteMany({
    where: { match: { OR: [{ player1Id: userId }, { player2Id: userId }] } },
  });
  await prisma.match.deleteMany({
    where: { OR: [{ player1Id: userId }, { player2Id: userId }] },
  });
  await prisma.wallet.deleteMany({ where: { userId } });
  await prisma.userSettings.deleteMany({ where: { userId } });
  await prisma.user.deleteMany({ where: { id: userId } });
}

export async function cleanupUsers(userIds: string[]) {
  for (const id of userIds) {
    await deleteTestUser(id).catch(() => undefined);
  }
}
