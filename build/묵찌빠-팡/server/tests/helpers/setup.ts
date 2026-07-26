/**
 * Vitest 전역 설정.
 * - 로거 소음 억제
 * - 테스트 종료 시 Prisma/Redis 정리
 */
import { afterAll } from 'vitest';

process.env.LOG_LEVEL = process.env.LOG_LEVEL ?? 'silent';
process.env.NODE_ENV = process.env.NODE_ENV ?? 'test';

afterAll(async () => {
  try {
    const { prisma } = await import('../src/lib/prisma.js');
    await prisma.$disconnect();
  } catch {
    // ignore
  }
  try {
    const { disconnectRedis } = await import('../src/lib/redis.js');
    await disconnectRedis();
  } catch {
    // ignore
  }
});
