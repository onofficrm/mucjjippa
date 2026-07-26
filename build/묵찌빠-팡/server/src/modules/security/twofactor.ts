/**
 * 관리자 2단계 인증(TOTP) — 준비 단계.
 *
 * RFC 6238 TOTP (HMAC-SHA1, 30s step, 6 digits)를 외부 의존성 없이 구현한다.
 * 흐름:
 *   1) beginEnroll: secret 생성 → otpauth URI 반환(인증 앱에 등록). 아직 활성화 아님.
 *   2) confirmEnroll: 앱이 만든 코드 검증 성공 시 twoFactorEnabled=true 저장.
 *   3) verifyTotp: 로그인 시 코드 검증 (활성화된 관리자에 한해 요구 — 강제 시점은 후속).
 *   4) disable: 비활성화.
 */
import { createHmac, randomBytes } from 'node:crypto';
import { prisma } from '../../lib/prisma.js';
import { badRequest, notFound } from '../../lib/errors.js';

const TOTP_STEP_SECONDS = 30;
const TOTP_DIGITS = 6;
const TOTP_WINDOW = 1; // ±1 step 허용 (시계 오차 보정)
const ISSUER = 'MucjjippaPang';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Encode(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = '';
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return output;
}

function base32Decode(input: string): Buffer {
  const clean = input.replace(/=+$/, '').toUpperCase().replace(/\s+/g, '');
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const char of clean) {
    const idx = BASE32_ALPHABET.indexOf(char);
    if (idx === -1) throw badRequest('잘못된 2FA secret 형식');
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

function hotp(secret: Buffer, counter: number): string {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(BigInt(counter));
  const digest = createHmac('sha1', secret).update(buf).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const code =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);
  return (code % 10 ** TOTP_DIGITS).toString().padStart(TOTP_DIGITS, '0');
}

/** 시간 기준 코드 검증 (±TOTP_WINDOW step) — 타이밍 세이프 비교 */
function verifyCode(secretBase32: string, code: string): boolean {
  const normalized = code.trim();
  if (!/^\d{6}$/.test(normalized)) return false;
  const secret = base32Decode(secretBase32);
  const counter = Math.floor(Date.now() / 1000 / TOTP_STEP_SECONDS);
  for (let w = -TOTP_WINDOW; w <= TOTP_WINDOW; w += 1) {
    const expected = hotp(secret, counter + w);
    // 길이 동일 → 상수 시간 비교
    let diff = 0;
    for (let i = 0; i < TOTP_DIGITS; i += 1) {
      diff |= expected.charCodeAt(i) ^ normalized.charCodeAt(i);
    }
    if (diff === 0) return true;
  }
  return false;
}

/** 1) 등록 시작 — secret 생성, otpauth URI 반환 (아직 활성화 아님) */
export async function beginTwoFactorEnroll(userId: string, loginId: string) {
  const secret = base32Encode(randomBytes(20));
  await prisma.user.update({
    where: { id: userId },
    data: { twoFactorSecret: secret, twoFactorEnabled: false },
  });
  const label = encodeURIComponent(`${ISSUER}:${loginId}`);
  const otpauthUri = `otpauth://totp/${label}?secret=${secret}&issuer=${ISSUER}&digits=${TOTP_DIGITS}&period=${TOTP_STEP_SECONDS}`;
  return { secret, otpauthUri };
}

/** 2) 등록 확정 — 앱 코드 검증 후 활성화 */
export async function confirmTwoFactorEnroll(userId: string, code: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { twoFactorSecret: true },
  });
  if (!user?.twoFactorSecret) throw badRequest('먼저 2FA 등록을 시작하세요');
  if (!verifyCode(user.twoFactorSecret, code)) throw badRequest('인증 코드가 올바르지 않습니다');
  await prisma.user.update({ where: { id: userId }, data: { twoFactorEnabled: true } });
  return { enabled: true };
}

/** 3) 로그인 등 검증 (활성 사용자만) */
export async function verifyTotp(userId: string, code: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { twoFactorEnabled: true, twoFactorSecret: true },
  });
  if (!user) throw notFound('사용자를 찾을 수 없습니다');
  if (!user.twoFactorEnabled || !user.twoFactorSecret) return true; // 미설정 → 통과(준비 단계)
  return verifyCode(user.twoFactorSecret, code);
}

/** 4) 비활성화 */
export async function disableTwoFactor(userId: string) {
  await prisma.user.update({
    where: { id: userId },
    data: { twoFactorEnabled: false, twoFactorSecret: null },
  });
  return { enabled: false };
}

export async function twoFactorStatus(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { twoFactorEnabled: true },
  });
  return { enabled: user?.twoFactorEnabled ?? false };
}
