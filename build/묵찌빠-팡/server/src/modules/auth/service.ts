import type { Prisma, User, UserSettings, Wallet, Avatar, Title } from '@prisma/client';
import { UserStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { AppError, conflict, unauthorized } from '../../lib/errors.js';
import {
  createRefreshTokenValue,
  hashPassword,
  hashToken,
  refreshExpiresAt,
  sanitizeText,
  verifyPassword,
  type AccessTokenPayload,
} from '../../lib/auth.js';
import type { LoginBody, SignupBody, UpdateProfileBody, UpdateSettingsBody } from './schemas.js';

const userInclude = {
  avatar: true,
  title: true,
  wallet: true,
  settings: true,
} satisfies Prisma.UserInclude;

export type UserWithRelations = Prisma.UserGetPayload<{ include: typeof userInclude }>;

export function toPublicUser(user: UserWithRelations) {
  return {
    id: user.id,
    loginId: user.loginId,
    email: user.email,
    nickname: user.nickname,
    status: user.status,
    role: user.role,
    level: user.level,
    experience: user.experience,
    avatarId: user.avatarId,
    titleId: user.titleId,
    avatar: user.avatar
      ? { id: user.avatar.id, name: user.avatar.name, imageUrl: user.avatar.imageUrl }
      : null,
    title: user.title
      ? { id: user.title.id, name: user.title.name, description: user.title.description }
      : null,
    wallet: user.wallet
      ? {
          pointBalance: user.wallet.pointBalance,
          ticketBalance: user.wallet.ticketBalance,
          version: user.wallet.version,
        }
      : { pointBalance: 0, ticketBalance: 0, version: 0 },
    settings: user.settings,
    createdAt: user.createdAt,
    lastLoginAt: user.lastLoginAt,
  };
}

/** 프론트 UserProfile 형태에 가깝게 매핑 */
export function toClientProfile(user: UserWithRelations) {
  return {
    id: user.id,
    nickname: user.nickname,
    avatar: user.avatar?.imageUrl ?? '✊',
    title: user.title?.name ?? '새싹 플레이어',
    level: user.level,
    exp: user.experience,
    maxExp: Math.max(100, user.level * 100),
    points: user.wallet?.pointBalance ?? 0,
    tickets: user.wallet?.ticketBalance ?? 0,
    wins: user.wins,
    losses: user.losses,
    draws: user.draws,
    currentStreak: user.currentStreak,
    maxStreak: user.maxStreak,
    maxLossStreak: user.maxLossStreak,
    currentLossStreak: user.currentLossStreak,
    rockCount: user.rockCount,
    paperCount: user.paperCount,
    scissorsCount: user.scissorsCount,
    tournamentParticipations: user.tournamentParticipations,
    tournamentQualifierPasses: user.tournamentQualifierPasses,
    tournamentBracketEntries: user.tournamentBracketEntries,
    tournamentWins: user.tournamentWins,
    tournamentSeconds: user.tournamentSeconds,
    tournamentThirds: user.tournamentThirds,
    tournamentFourths: user.tournamentFourths,
    tournamentBestRank:
      user.tournamentWins > 0
        ? '우승 (1위)'
        : user.tournamentSeconds > 0
          ? '준우승 (2위)'
          : user.tournamentThirds > 0
            ? '3위'
            : user.tournamentFourths > 0
              ? '4위'
              : '기록 없음',
    isOnline: true,
    loginId: user.loginId,
    email: user.email,
    role: user.role,
    status: user.status,
    avatarId: user.avatarId,
    titleId: user.titleId,
  };
}

async function assertUniqueFields(input: {
  loginId?: string;
  email?: string | null;
  nickname?: string;
  excludeUserId?: string;
}) {
  if (input.loginId) {
    const found = await prisma.user.findUnique({ where: { loginId: input.loginId } });
    if (found && found.id !== input.excludeUserId) {
      throw conflict('이미 사용 중인 로그인 ID입니다', { field: 'loginId' });
    }
  }
  if (input.email) {
    const found = await prisma.user.findUnique({ where: { email: input.email } });
    if (found && found.id !== input.excludeUserId) {
      throw conflict('이미 사용 중인 이메일입니다', { field: 'email' });
    }
  }
  if (input.nickname) {
    const found = await prisma.user.findUnique({ where: { nickname: input.nickname } });
    if (found && found.id !== input.excludeUserId) {
      throw conflict('이미 사용 중인 닉네임입니다', { field: 'nickname' });
    }
  }
}

export async function signupUser(body: SignupBody) {
  const loginId = sanitizeText(body.loginId, 32).toLowerCase();
  const nickname = sanitizeText(body.nickname, 16);
  const email = body.email ? sanitizeText(body.email, 255).toLowerCase() : null;

  await assertUniqueFields({ loginId, email, nickname });

  const passwordHash = await hashPassword(body.password);
  const defaultAvatar = await prisma.avatar.findFirst({
    where: { status: 'ACTIVE' },
    orderBy: { createdAt: 'asc' },
  });
  const defaultTitle = await prisma.title.findFirst({
    where: { status: 'ACTIVE' },
    orderBy: { createdAt: 'asc' },
  });

  const user = await prisma.user.create({
    data: {
      loginId,
      email,
      passwordHash,
      nickname,
      avatarId: defaultAvatar?.id,
      titleId: defaultTitle?.id,
      settings: { create: {} },
      wallet: {
        create: {
          pointBalance: 3000,
          ticketBalance: 1,
          version: 0,
        },
      },
      inventory: defaultAvatar || defaultTitle
        ? {
            create: [
              ...(defaultAvatar
                ? [{
                    itemType: 'AVATAR' as const,
                    itemId: defaultAvatar.id,
                    quantity: 1,
                    equipped: true,
                  }]
                : []),
              ...(defaultTitle
                ? [{
                    itemType: 'TITLE' as const,
                    itemId: defaultTitle.id,
                    quantity: 1,
                    equipped: true,
                  }]
                : []),
            ],
          }
        : undefined,
    },
    include: userInclude,
  });

  return user;
}

export async function authenticateUser(body: LoginBody) {
  const loginId = sanitizeText(body.loginId, 32).toLowerCase();
  const user = await prisma.user.findUnique({
    where: { loginId },
    include: userInclude,
  });

  if (!user) {
    throw unauthorized('로그인 ID 또는 비밀번호가 올바르지 않습니다');
  }

  if (user.status === UserStatus.SUSPENDED || user.status === UserStatus.BANNED) {
    throw new AppError(403, 'ACCOUNT_SUSPENDED', '정지된 계정입니다. 고객센터에 문의해 주세요.');
  }

  if (user.status === UserStatus.DELETED || user.deletedAt) {
    throw new AppError(403, 'ACCOUNT_DELETED', '탈퇴한 계정입니다.');
  }

  const ok = await verifyPassword(body.password, user.passwordHash);
  if (!ok) {
    throw unauthorized('로그인 ID 또는 비밀번호가 올바르지 않습니다');
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
    include: userInclude,
  });

  return updated;
}

export function buildAccessPayload(user: User): AccessTokenPayload {
  return {
    sub: user.id,
    typ: 'user',
    role: user.role,
    nickname: user.nickname,
    loginId: user.loginId,
  };
}

export async function issueRefreshToken(input: {
  userId: string;
  userAgent?: string | null;
  ipAddress?: string | null;
}) {
  const raw = createRefreshTokenValue();
  const tokenHash = hashToken(raw);
  const expiresAt = refreshExpiresAt();

  await prisma.refreshToken.create({
    data: {
      userId: input.userId,
      tokenHash,
      expiresAt,
      userAgent: input.userAgent,
      ipAddress: input.ipAddress,
    },
  });

  return { raw, expiresAt, tokenHash };
}

export async function rotateRefreshToken(input: {
  rawToken: string;
  userAgent?: string | null;
  ipAddress?: string | null;
}) {
  const tokenHash = hashToken(input.rawToken);
  const existing = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: { user: { include: userInclude } },
  });

  if (!existing) {
    throw unauthorized('세션이 만료되었습니다. 다시 로그인해 주세요.');
  }

  if (existing.revokedAt) {
    await prisma.refreshToken.updateMany({
      where: { userId: existing.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    throw unauthorized('세션이 무효화되었습니다. 다시 로그인해 주세요.');
  }

  if (existing.expiresAt.getTime() < Date.now()) {
    await prisma.refreshToken.update({
      where: { id: existing.id },
      data: { revokedAt: new Date() },
    });
    throw unauthorized('세션이 만료되었습니다. 다시 로그인해 주세요.');
  }

  const user = existing.user;
  if (user.status !== UserStatus.ACTIVE || user.deletedAt) {
    throw unauthorized('사용할 수 없는 계정입니다.');
  }

  const raw = createRefreshTokenValue();
  const nextHash = hashToken(raw);
  const expiresAt = refreshExpiresAt();

  const created = await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: nextHash,
      expiresAt,
      userAgent: input.userAgent,
      ipAddress: input.ipAddress,
    },
  });

  await prisma.refreshToken.update({
    where: { id: existing.id },
    data: {
      revokedAt: new Date(),
      replacedById: created.id,
    },
  });

  return { user, refresh: { raw, expiresAt, tokenHash: nextHash } };
}

export async function revokeRefreshToken(rawToken: string | undefined | null) {
  if (!rawToken) return;
  const tokenHash = hashToken(rawToken);
  await prisma.refreshToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function revokeAllUserRefreshTokens(userId: string) {
  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function getUserById(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: userInclude,
  });
  if (!user || user.status === UserStatus.DELETED || user.deletedAt) {
    throw unauthorized('사용자를 찾을 수 없습니다');
  }
  return user;
}

export async function updateUserProfile(userId: string, body: UpdateProfileBody) {
  if (body.nickname) {
    await assertUniqueFields({
      nickname: sanitizeText(body.nickname, 16),
      excludeUserId: userId,
    });
  }

  return prisma.user.update({
    where: { id: userId },
    data: {
      nickname: body.nickname ? sanitizeText(body.nickname, 16) : undefined,
      avatarId: body.avatarId === undefined ? undefined : body.avatarId,
      titleId: body.titleId === undefined ? undefined : body.titleId,
    },
    include: userInclude,
  });
}

export async function getOrCreateSettings(userId: string): Promise<UserSettings> {
  const existing = await prisma.userSettings.findUnique({ where: { userId } });
  if (existing) return existing;
  return prisma.userSettings.create({ data: { userId } });
}

export async function updateUserSettings(userId: string, body: UpdateSettingsBody) {
  await getOrCreateSettings(userId);
  return prisma.userSettings.update({
    where: { userId },
    data: body,
  });
}

export type { User, Wallet, Avatar, Title };
