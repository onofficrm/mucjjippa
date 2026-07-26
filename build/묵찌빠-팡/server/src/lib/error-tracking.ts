import { env } from '../config/env.js';

type LogLike = {
  info: (obj: object, msg?: string) => void;
  warn: (obj: object, msg?: string) => void;
};

/**
 * 오류 추적 준비 레이어.
 * SENTRY_DSN 이 있으면 @sentry/node 동적 로드를 시도한다 (선택 의존성).
 */
export async function initErrorTracking(log: LogLike): Promise<void> {
  const dsn = env.SENTRY_DSN?.trim();
  if (!dsn) {
    log.info({}, 'Error tracking idle (SENTRY_DSN unset)');
    return;
  }

  try {
    const mod = await import('@sentry/node');
    const sentry = mod as unknown as {
      init: (opts: { dsn: string; environment: string; tracesSampleRate: number }) => void;
    };
    sentry.init({
      dsn,
      environment: env.APP_ENV,
      tracesSampleRate: env.APP_ENV === 'production' ? 0.1 : 1.0,
    });
    log.info({ environment: env.APP_ENV }, 'Sentry error tracking initialized');
  } catch (error) {
    log.warn(
      { err: error as object },
      'SENTRY_DSN set but @sentry/node not available — install optionally: npm i @sentry/node'
    );
  }
}

export function captureException(error: unknown): void {
  void import('@sentry/node')
    .then((mod) => {
      const sentry = mod as unknown as { captureException?: (e: unknown) => void };
      sentry.captureException?.(error);
    })
    .catch(() => undefined);
}
