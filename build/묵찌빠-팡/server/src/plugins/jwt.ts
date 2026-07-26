import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import fjwt from '@fastify/jwt';
import { env } from '../config/env.js';
import { unauthorized } from '../lib/errors.js';
import type { AccessTokenPayload } from '../lib/auth.js';

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

export async function jwtPlugin(app: FastifyInstance) {
  await app.register(fjwt, {
    secret: env.JWT_ACCESS_SECRET,
    sign: {
      expiresIn: env.JWT_ACCESS_EXPIRES_IN,
    },
  });

  app.decorate('authenticate', async (request: FastifyRequest, _reply: FastifyReply) => {
    try {
      await request.jwtVerify<AccessTokenPayload>();
    } catch {
      throw unauthorized('인증이 필요합니다. 다시 로그인해 주세요.');
    }
  });
}
