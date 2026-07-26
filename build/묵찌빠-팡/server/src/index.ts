import { buildApp } from './app.js';
import { env, APP_NAME, APP_VERSION } from './config/env.js';
import { disconnectRedis } from './lib/redis.js';
import { prisma } from './lib/prisma.js';

async function main() {
  const app = await buildApp();

  let shuttingDown = false;

  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    app.log.info({ signal }, 'Graceful shutdown started');

    try {
      await app.close();
      await disconnectRedis();
      await prisma.$disconnect();
      app.log.info('Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      app.log.error({ err: error }, 'Error during shutdown');
      process.exit(1);
    }
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));

  process.on('unhandledRejection', (reason) => {
    app.log.error({ err: reason }, 'Unhandled rejection');
  });

  process.on('uncaughtException', (error) => {
    app.log.fatal({ err: error }, 'Uncaught exception');
    void shutdown('uncaughtException');
  });

  await app.listen({ host: env.HOST, port: env.PORT });
  app.log.info(
    {
      service: APP_NAME,
      version: APP_VERSION,
      host: env.HOST,
      port: env.PORT,
      apiPrefix: env.API_PREFIX,
      apiVersion: env.API_VERSION,
    },
    'Server listening'
  );
}

main().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
