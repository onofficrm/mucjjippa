import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import cookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';
import {
  APP_NAME,
  APP_VERSION,
  corsOrigins,
  env,
  isProd,
} from './config/env.js';
import { buildLoggerOptions } from './lib/logger-options.js';
import { initErrorTracking } from './lib/error-tracking.js';
import { errorHandlerPlugin } from './plugins/error-handler.js';
import { jwtPlugin } from './plugins/jwt.js';
import { socketPlugin } from './plugins/socket.js';
import { swaggerPlugin } from './plugins/swagger.js';
import { healthRoutes } from './routes/health.js';
import { authRoutes } from './routes/auth.js';
import { userRoutes } from './routes/users.js';
import { walletRoutes } from './routes/wallet.js';
import { shopRoutes } from './routes/shop.js';
import { devRewardRoutes } from './routes/dev-rewards.js';
import { matchHttpRoutes } from './plugins/socket.js';
import { tournamentRoutes } from './routes/tournaments.js';
import { watchRoutes } from './routes/watch.js';
import { rankingRoutes } from './routes/rankings.js';
import { missionRoutes } from './routes/missions.js';
import { adminRoutes } from './routes/admin.js';
import { noticeRoutes } from './routes/notices.js';
import { connectRedis } from './lib/redis.js';
import { prisma } from './lib/prisma.js';

export async function buildApp() {
  const app = Fastify({
    logger: buildLoggerOptions(),
    requestIdHeader: 'x-request-id',
    genReqId: (req) => {
      const existing = req.headers['x-request-id'];
      if (typeof existing === 'string' && existing.length > 0) return existing;
      return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    },
    trustProxy: true,
    // request body 크기 제한 — DoS/과대 페이로드 차단 (기본 1MiB → 128KiB)
    bodyLimit: 128 * 1024,
  });

  await initErrorTracking(app.log);

  await app.register(cors, {
    origin: corsOrigins(),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
  });

  // 프로덕션 JSON API는 최소 CSP. 개발/스테이징은 Swagger UI(/api/docs) 허용.
  const strictApiCsp = env.APP_ENV === 'production' && process.env.EXPOSE_API_DOCS !== 'true';
  await app.register(helmet, {
    contentSecurityPolicy: strictApiCsp
      ? {
          directives: {
            defaultSrc: ["'none'"],
            frameAncestors: ["'none'"],
            baseUri: ["'none'"],
          },
        }
      : false,
    crossOriginEmbedderPolicy: false,
    // 프록시(HTTPS) 뒤 배포 시 HSTS
    hsts: isProd ? { maxAge: 15552000, includeSubDomains: true } : false,
  });

  await app.register(cookie);

  await app.register(rateLimit, {
    global: true,
    max: 200,
    timeWindow: '1 minute',
    errorResponseBuilder: (_request, context) => ({
      success: false,
      error: {
        code: 'RATE_LIMITED',
        message: `요청이 너무 많습니다. ${Math.ceil(context.ttl / 1000)}초 후 다시 시도해 주세요.`,
      },
    }),
  });

  await errorHandlerPlugin(app);
  await jwtPlugin(app);
  await swaggerPlugin(app);

  const registerApi = async (instance: FastifyInstance) => {
    await instance.register(healthRoutes);
    await instance.register(authRoutes);
    await instance.register(userRoutes);
    await instance.register(walletRoutes);
    await instance.register(shopRoutes);
    await instance.register(devRewardRoutes);
    await instance.register(matchHttpRoutes);
    await instance.register(tournamentRoutes);
    await instance.register(watchRoutes);
    await instance.register(rankingRoutes);
    await instance.register(missionRoutes);
    await instance.register(noticeRoutes);
    await instance.register(adminRoutes);
  };

  await app.register(registerApi, { prefix: env.API_PREFIX });
  await app.register(registerApi, { prefix: `${env.API_PREFIX}/${env.API_VERSION}` });

  app.get('/', async () => ({
    success: true,
    data: {
      service: APP_NAME,
      version: APP_VERSION,
      appEnv: env.APP_ENV,
      docs: {
        health: `${env.API_PREFIX}/health`,
        openapi: `${env.API_PREFIX}/docs`,
        auth: `${env.API_PREFIX}/auth`,
        version: `${env.API_PREFIX}/version`,
      },
    },
  }));

  app.addHook('onReady', async () => {
    await socketPlugin(app);
    await connectRedis().catch((error) => {
      app.log.warn({ err: error }, 'Redis connect deferred — will retry on health checks');
    });
  });

  app.addHook('onClose', async () => {
    await prisma.$disconnect();
  });

  return app;
}
