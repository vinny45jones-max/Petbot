// Cookie «второй фактор пройден»: uid.exp.hmac. Проверяется в proxy.ts и в Users.access.admin.
import crypto from 'node:crypto';

export const TWOFA_COOKIE_NAME = 'twofa-ok';
export const TWOFA_TTL_SEC = 12 * 3600;

function sign(body: string): string {
  const secret = process.env.PAYLOAD_SECRET;
  if (!secret) throw new Error('PAYLOAD_SECRET is required');
  return crypto.createHmac('sha256', `twofa-cookie:${secret}`).update(body).digest('base64url');
}

export function signTwofaCookie(uid: string, ttlSec = TWOFA_TTL_SEC, now = Date.now()): string {
  const body = `${uid}.${Math.floor(now / 1000) + ttlSec}`;
  return `${body}.${sign(body)}`;
}

export function verifyTwofaCookie(value: string | undefined | null, now = Date.now()): string | null {
  const parts = value?.split('.') ?? [];
  if (parts.length !== 3) return null;
  const [uid, exp, sig] = parts;
  const expected = Buffer.from(sign(`${uid}.${exp}`));
  const got = Buffer.from(sig);
  if (got.length !== expected.length || !crypto.timingSafeEqual(got, expected)) return null;
  if (!(Number(exp) * 1000 > now)) return null;
  return uid;
}

/** Достаёт значение cookie из заголовка Cookie (для Payload access, где нет next/headers). */
export function cookieFromHeader(header: string | null | undefined, name: string): string | undefined {
  for (const part of (header ?? '').split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return v.join('=');
  }
  return undefined;
}
