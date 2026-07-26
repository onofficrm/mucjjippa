import { getRedis } from '../../lib/redis.js';
import { AppError } from '../../lib/errors.js';

const WINDOW_SECONDS = 15 * 60;
const MAX_FAILURES = 5;

function key(loginId: string, ip: string) {
  return `auth:login_fail:${loginId.toLowerCase()}:${ip}`;
}

/**
 * 로그인 실패 누적 제한.
 * Redis 장애 시에는 통과시키고(가용성 우선) 로그만 남긴다.
 */
export async function assertLoginAllowed(loginId: string, ip: string) {
  try {
    const client = getRedis();
    if (client.status !== 'ready') await client.connect().catch(() => null);
    const count = Number((await client.get(key(loginId, ip))) ?? '0');
    if (count >= MAX_FAILURES) {
      throw new AppError(
        429,
        'LOGIN_RATE_LIMITED',
        '로그인 시도가 너무 많습니다. 잠시 후 다시 시도해 주세요.'
      );
    }
  } catch (error) {
    if (error instanceof AppError) throw error;
  }
}

export async function recordLoginFailure(loginId: string, ip: string) {
  try {
    const client = getRedis();
    if (client.status !== 'ready') await client.connect().catch(() => null);
    const k = key(loginId, ip);
    const count = await client.incr(k);
    if (count === 1) await client.expire(k, WINDOW_SECONDS);
  } catch {
    /* ignore redis errors */
  }
}

export async function clearLoginFailures(loginId: string, ip: string) {
  try {
    const client = getRedis();
    if (client.status !== 'ready') await client.connect().catch(() => null);
    await client.del(key(loginId, ip));
  } catch {
    /* ignore */
  }
}
