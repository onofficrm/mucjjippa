import { createHash, randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { env, isProd } from '../config/env.js';

export const REFRESH_COOKIE_NAME = 'rps_refresh_token';
export const BCRYPT_ROUNDS = 12;

export type AccessTokenPayload = {
  sub: string;
  typ: 'user' | 'guest';
  role?: string;
  nickname: string;
  loginId?: string;
};

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

export function createRefreshTokenValue(): string {
  return randomBytes(48).toString('base64url');
}

export function refreshExpiresAt(): Date {
  // JWT_REFRESH_EXPIRES_IN like "7d"
  const match = /^(\d+)([smhd])$/.exec(env.JWT_REFRESH_EXPIRES_IN);
  const amount = match ? Number(match[1]) : 7;
  const unit = match?.[2] ?? 'd';
  const ms =
    unit === 's'
      ? amount * 1000
      : unit === 'm'
        ? amount * 60_000
        : unit === 'h'
          ? amount * 3_600_000
          : amount * 86_400_000;
  return new Date(Date.now() + ms);
}

export function setRefreshCookie(reply: FastifyReply, rawToken: string, expiresAt: Date) {
  reply.setCookie(REFRESH_COOKIE_NAME, rawToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/api/auth',
    expires: expiresAt,
  });
}

export function clearRefreshCookie(reply: FastifyReply) {
  reply.clearCookie(REFRESH_COOKIE_NAME, {
    path: '/api/auth',
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
  });
}

export function getClientMeta(request: FastifyRequest) {
  return {
    userAgent: request.headers['user-agent']?.slice(0, 255) ?? null,
    ipAddress: request.ip?.slice(0, 64) ?? null,
  };
}

/** 입력 정리 — trim + 연속 공백 축소. SQL은 Prisma 파라미터로 방어. */
export function sanitizeText(value: string, maxLen: number): string {
  return value.trim().replace(/\s+/g, ' ').slice(0, maxLen);
}
