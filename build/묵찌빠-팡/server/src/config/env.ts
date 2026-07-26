import { config as loadDotenv } from 'dotenv';
import { z } from 'zod';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
loadDotenv({ path: resolve(__dirname, '../../.env') });

const envSchema = z.object({
  /** Node 런타임 모드 (Nest/Express 관례) */
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  /**
   * 배포 티어 — development | staging | production
   * NODE_ENV=production 이어도 staging 티어로 구분 가능
   */
  APP_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  HOST: z.string().default('0.0.0.0'),
  PORT: z.coerce.number().int().positive().default(4000),
  API_PREFIX: z.string().default('/api'),
  API_VERSION: z.string().default('v1'),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  REDIS_URL: z.string().default('redis://127.0.0.1:6379'),

  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  /** 설정 시 JSON 로그를 파일에도 기록 (디렉터리 경로). 미설정 시 stdout만 */
  LOG_DIR: z.string().optional(),
  /** Sentry DSN — 설정 시 오류 추적 훅 활성화 준비 (패키지 미설치여도 env만 보관) */
  SENTRY_DSN: z.string().optional(),

  /** catalog = 카탈로그만 / demo = 데모 유저·토너먼트 포함(기본) */
  SEED_MODE: z.enum(['catalog', 'demo']).default('demo'),
  SEED_ADMIN_PASSWORD: z.string().min(8).default('Admin1234!'),
  SEED_USER_PASSWORD: z.string().min(8).default('User1234!'),
});

export type Env = z.infer<typeof envSchema>;

function parseEnv(): Env {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment variables:\n${details}`);
  }
  return result.data;
}

export const env = parseEnv();

export const isProd = env.NODE_ENV === 'production';
export const isDev = env.NODE_ENV === 'development';
export const isStaging = env.APP_ENV === 'staging';
export const isProductionTier = env.APP_ENV === 'production';

/** 콤마 구분 CORS origin 목록 */
export function corsOrigins(): string[] {
  return env.CORS_ORIGIN.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export const APP_NAME = 'mucjjippa-pang-server';
export const APP_VERSION = '0.1.0';
