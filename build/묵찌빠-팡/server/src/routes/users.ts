import type { FastifyInstance } from 'fastify';
import type { AccessTokenPayload } from '../lib/auth.js';
import { unauthorized, badRequest } from '../lib/errors.js';
import { updateProfileBodySchema, updateSettingsBodySchema } from '../modules/auth/schemas.js';
import {
  getOrCreateSettings,
  getUserById,
  toClientProfile,
  toPublicUser,
  updateUserProfile,
  updateUserSettings,
} from '../modules/auth/service.js';

function requireUser(payload: AccessTokenPayload) {
  if (payload.typ !== 'user') {
    throw badRequest('게스트는 이 기능을 사용할 수 없습니다', { code: 'GUEST_FORBIDDEN' });
  }
  return payload.sub;
}

export async function userRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate);

  app.get('/users/me/profile', async (request) => {
    const userId = requireUser(request.user);
    const user = await getUserById(userId);
    return {
      success: true,
      data: {
        user: toPublicUser(user),
        profile: toClientProfile(user),
      },
    };
  });

  app.patch('/users/me', async (request) => {
    const userId = requireUser(request.user);
    const body = updateProfileBodySchema.parse(request.body);
    const user = await updateUserProfile(userId, body);
    return {
      success: true,
      data: {
        user: toPublicUser(user),
        profile: toClientProfile(user),
      },
    };
  });

  app.patch('/users/me/profile', async (request) => {
    const userId = requireUser(request.user);
    const body = updateProfileBodySchema.parse(request.body);
    const user = await updateUserProfile(userId, body);
    return {
      success: true,
      data: {
        user: toPublicUser(user),
        profile: toClientProfile(user),
      },
    };
  });

  app.get('/users/me/settings', async (request) => {
    const userId = requireUser(request.user);
    const settings = await getOrCreateSettings(userId);
    return { success: true, data: settings };
  });

  app.patch('/users/me/settings', async (request) => {
    const userId = requireUser(request.user);
    const body = updateSettingsBodySchema.parse(request.body);
    const settings = await updateUserSettings(userId, body);
    return { success: true, data: settings };
  });

  app.get('/users/me', async (request) => {
    const payload = request.user;
    if (payload.typ === 'guest') {
      throw unauthorized('로그인이 필요합니다');
    }
    const user = await getUserById(payload.sub);
    return { success: true, data: toPublicUser(user) };
  });
}
