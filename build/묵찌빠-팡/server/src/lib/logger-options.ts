import { mkdirSync, createWriteStream } from 'node:fs';
import { join } from 'node:path';
import type { FastifyServerOptions } from 'fastify';
import { env, isDev } from '../config/env.js';

/**
 * Pino / Fastify logger 옵션.
 * - development: pino-pretty (stdout)
 * - 그 외: JSON stdout
 * - LOG_DIR 설정 시 동일 스트림을 파일에도 tee (동기 writeStream)
 */
export function buildLoggerOptions(): FastifyServerOptions['logger'] {
  if (isDev && !env.LOG_DIR) {
    return {
      level: env.LOG_LEVEL,
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      },
    };
  }

  if (env.LOG_DIR) {
    try {
      mkdirSync(env.LOG_DIR, { recursive: true });
      const stream = createWriteStream(join(env.LOG_DIR, 'server.log'), { flags: 'a' });
      return {
        level: env.LOG_LEVEL,
        stream: {
          write(chunk: string) {
            process.stdout.write(chunk);
            stream.write(chunk);
          },
        },
      };
    } catch {
      /* fall through to default JSON logger */
    }
  }

  return { level: env.LOG_LEVEL };
}
