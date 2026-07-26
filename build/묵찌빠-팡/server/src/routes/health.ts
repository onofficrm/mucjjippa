import type { FastifyInstance } from 'fastify';
import { APP_NAME, APP_VERSION, env } from '../config/env.js';
import { checkDatabase } from '../lib/prisma.js';
import { checkRedis } from '../lib/redis.js';

export async function healthRoutes(app: FastifyInstance) {
  /** 간단한 생존 확인 — 로드밸런서용 */
  app.get('/health', async () => {
    return {
      success: true,
      data: {
        status: 'ok',
        service: APP_NAME,
        timestamp: new Date().toISOString(),
      },
    };
  });

  /** DB·Redis 포함 상세 상태 */
  app.get('/health/ready', async (_request, reply) => {
    const [database, redis] = await Promise.all([checkDatabase(), checkRedis()]);
    const ready = database.ok && redis.ok;

    return reply.status(ready ? 200 : 503).send({
      success: ready,
      data: {
        status: ready ? 'ready' : 'degraded',
        service: APP_NAME,
        checks: {
          database,
          redis,
        },
        timestamp: new Date().toISOString(),
      },
    });
  });

  app.get('/version', async () => {
    return {
      success: true,
      data: {
        name: APP_NAME,
        version: APP_VERSION,
        apiVersion: env.API_VERSION,
        nodeEnv: env.NODE_ENV,
        appEnv: env.APP_ENV,
        node: process.version,
      },
    };
  });
}
