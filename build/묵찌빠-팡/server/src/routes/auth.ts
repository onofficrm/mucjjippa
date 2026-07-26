import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import {
  REFRESH_COOKIE_NAME,
  clearRefreshCookie,
  getClientMeta,
  setRefreshCookie,
  type AccessTokenPayload,
} from '../lib/auth.js';
import { unauthorized } from '../lib/errors.js';
import { loginBodySchema, signupBodySchema } from '../modules/auth/schemas.js';
import {
  authenticateUser,
  buildAccessPayload,
  getUserById,
  issueRefreshToken,
  revokeAllUserRefreshTokens,
  revokeRefreshToken,
  rotateRefreshToken,
  signupUser,
  toClientProfile,
  toPublicUser,
} from '../modules/auth/service.js';
import {
  assertLoginAllowed,
  clearLoginFailures,
  recordLoginFailure,
} from '../modules/auth/login-guard.js';

async function signAccessToken(
  app: FastifyInstance,
  payload: AccessTokenPayload,
  expiresIn?: string
) {
  return app.jwt.sign(payload, expiresIn ? { expiresIn } : undefined);
}

async function respondWithSession(
  app: FastifyInstance,
  reply: FastifyReply,
  user: Awaited<ReturnType<typeof getUserById>>,
  meta: { userAgent?: string | null; ipAddress?: string | null }
) {
  const accessToken = await signAccessToken(app, buildAccessPayload(user));
  const refresh = await issueRefreshToken({
    userId: user.id,
    userAgent: meta.userAgent,
    ipAddress: meta.ipAddress,
  });
  setRefreshCookie(reply, refresh.raw, refresh.expiresAt);

  return {
    success: true,
    data: {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: '15m',
      user: toPublicUser(user),
      profile: toClientProfile(user),
    },
  };
}

export async function authRoutes(app: FastifyInstance) {
  app.post(
    '/auth/signup',
    {
      config: {
        rateLimit: {
          max: 10,
          timeWindow: '15 minutes',
        },
      },
    },
    async (request, reply) => {
      const body = signupBodySchema.parse(request.body);
      const user = await signupUser(body);
      const meta = getClientMeta(request);
      return respondWithSession(app, reply, user, meta);
    }
  );

  app.post(
    '/auth/login',
    {
      config: {
        rateLimit: {
          max: 20,
          timeWindow: '15 minutes',
        },
      },
    },
    async (request, reply) => {
      const body = loginBodySchema.parse(request.body);
      const ip = request.ip || 'unknown';

      await assertLoginAllowed(body.loginId, ip);

      try {
        const user = await authenticateUser(body);
        await clearLoginFailures(body.loginId, ip);
        return respondWithSession(app, reply, user, getClientMeta(request));
      } catch (error) {
        await recordLoginFailure(body.loginId, ip);
        throw error;
      }
    }
  );

  app.post('/auth/refresh', async (request, reply) => {
    const raw = request.cookies[REFRESH_COOKIE_NAME];
    if (!raw) throw unauthorized('세션이 없습니다. 다시 로그인해 주세요.');

    const meta = getClientMeta(request);
    const { user, refresh } = await rotateRefreshToken({
      rawToken: raw,
      userAgent: meta.userAgent,
      ipAddress: meta.ipAddress,
    });

    const accessToken = await signAccessToken(app, buildAccessPayload(user));
    setRefreshCookie(reply, refresh.raw, refresh.expiresAt);

    return {
      success: true,
      data: {
        accessToken,
        tokenType: 'Bearer',
        expiresIn: '15m',
        user: toPublicUser(user),
        profile: toClientProfile(user),
      },
    };
  });

  app.post('/auth/logout', async (request, reply) => {
    const raw = request.cookies[REFRESH_COOKIE_NAME];
    await revokeRefreshToken(raw);

    // access token이 있으면 해당 유저의 모든 세션도 선택적으로 폐기하지 않고
    // 현재 refresh만 폐기한다 (다른 기기 세션 유지).
    try {
      await request.jwtVerify<AccessTokenPayload>();
    } catch {
      /* guest or expired — ignore */
    }

    clearRefreshCookie(reply);
    return { success: true, data: { loggedOut: true } };
  });

  /** 게스트: DB 사용자 생성 없음. access token만 발급 (refresh cookie 없음). */
  app.post(
    '/auth/guest',
    {
      config: {
        rateLimit: {
          max: 30,
          timeWindow: '15 minutes',
        },
      },
    },
    async (_request, reply) => {
      const guestId = `guest_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
      const nickname = `게스트${Math.floor(1000 + Math.random() * 9000)}`;
      const accessToken = await signAccessToken(
        app,
        {
          sub: guestId,
          typ: 'guest',
          nickname,
        },
        '2h'
      );

      // 게스트는 refresh cookie를 심지 않는다 (영구 세션 방지)
      clearRefreshCookie(reply);

      return {
        success: true,
        data: {
          accessToken,
          tokenType: 'Bearer',
          expiresIn: '2h',
          guest: true,
          user: {
            id: guestId,
            loginId: null,
            email: null,
            nickname,
            status: 'ACTIVE',
            role: 'USER',
            level: 1,
            experience: 0,
            avatarId: null,
            titleId: null,
            avatar: { id: 'guest', name: '게스트', imageUrl: '🎮' },
            title: { id: 'guest', name: '게스트 체험', description: '임시 세션' },
            wallet: { pointBalance: 5000, ticketBalance: 0, version: 0 },
            settings: null,
            createdAt: new Date().toISOString(),
            lastLoginAt: new Date().toISOString(),
          },
          profile: {
            id: guestId,
            nickname,
            avatar: '🎮',
            title: '게스트 체험',
            level: 1,
            exp: 0,
            maxExp: 100,
            points: 5000,
            tickets: 0,
            wins: 0,
            losses: 0,
            draws: 0,
            currentStreak: 0,
            maxStreak: 0,
            rockCount: 0,
            paperCount: 0,
            scissorsCount: 0,
            isOnline: true,
            isGuest: true,
          },
        },
      };
    }
  );

  app.get(
    '/auth/me',
    { preHandler: [app.authenticate] },
    async (request) => {
      const payload = request.user as AccessTokenPayload;
      if (payload.typ === 'guest') {
        return {
          success: true,
          data: {
            guest: true,
            user: {
              id: payload.sub,
              nickname: payload.nickname,
              isGuest: true,
            },
            profile: {
              id: payload.sub,
              nickname: payload.nickname,
              avatar: '🎮',
              title: '게스트 체험',
              level: 1,
              exp: 0,
              maxExp: 100,
              points: 5000,
              tickets: 0,
              wins: 0,
              losses: 0,
              draws: 0,
              currentStreak: 0,
              maxStreak: 0,
              rockCount: 0,
              paperCount: 0,
              scissorsCount: 0,
              isOnline: true,
              isGuest: true,
            },
          },
        };
      }

      const user = await getUserById(payload.sub);
      return {
        success: true,
        data: {
          guest: false,
          user: toPublicUser(user),
          profile: toClientProfile(user),
        },
      };
    }
  );

  /** 모든 기기 로그아웃 */
  app.post(
    '/auth/logout-all',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const payload = request.user as AccessTokenPayload;
      if (payload.typ === 'user') {
        await revokeAllUserRefreshTokens(payload.sub);
      }
      clearRefreshCookie(reply);
      return { success: true, data: { loggedOut: true } };
    }
  );
}

// type augmentation helper for request.user
declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: AccessTokenPayload;
    user: AccessTokenPayload;
  }
}

export type { FastifyRequest };
