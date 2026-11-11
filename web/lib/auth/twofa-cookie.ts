// Cookie «второй фактор пройден в этой сессии»: uid.sid.exp.hmac. sid — id сессии Payload из payload-token,
// поэтому после выхода (сессия удалена) и нового входа старая cookie не подходит.
import crypto from 'node:crypto';

export const TWOFA_COOKIE_NAME = 'twofa-ok';
export const TWOFA_TTL_SEC = 12 * 3600;

function sign(body: string): string {
  const secret = process.env.PAYLOAD_SECRET;
  if (!secret) throw new Error('PAYLOAD_SECRET is required');
  return crypto.createHmac('sha256', `twofa-cookie:${secret}`).update(body).digest('base64url');
}

export function signTwofaCookie(uid: string, sid: string, ttlSec = TWOFA_TTL_SEC, now = Date.now()): string {
  const body = `${uid}.${sid}.${Math.floor(now / 1000) + ttlSec}`;
  return `${body}.${sign(body)}`;
}

export function verifyTwofaCookie(value: string | undefined | null, now = Date.now()): { uid: string; sid: string } | null {
  const parts = value?.split('.') ?? [];
  if (parts.length !== 4) return null;
  const [uid, sid, exp, sig] = parts;
  const expected = Buffer.from(sign(`${uid}.${sid}.${exp}`));
  const got = Buffer.from(sig);
  if (got.length !== expected.length || !crypto.timingSafeEqual(got, expected)) return null;
  if (!(Number(exp) * 1000 > now)) return null;
  return { uid, sid };
}

/** Значение cookie из заголовка Cookie (в хуках Payload нет next/headers). */
export function cookieFromHeader(header: string | null | undefined, name: string): string | undefined {
  for (const part of (header ?? '').split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return v.join('=');
  }
  return undefined;
}
