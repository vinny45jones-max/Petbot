import { describe, it, expect, beforeAll } from 'vitest';
import { signTwofaCookie, verifyTwofaCookie, cookieFromHeader } from '@/lib/auth/twofa-cookie';

beforeAll(() => { process.env.PAYLOAD_SECRET = 'unit-test-secret-key'; });

describe('twofa-cookie (HMAC, привязка к сессии)', () => {
  const now = 1_700_000_000_000;
  it('подпись и проверка возвращают uid и sid', () => {
    expect(verifyTwofaCookie(signTwofaCookie('42', 'sid-a', 3600, now), now)).toEqual({ uid: '42', sid: 'sid-a' });
  });
  it('истёкшая cookie → null', () => {
    expect(verifyTwofaCookie(signTwofaCookie('42', 'sid-a', 10, now), now + 20_000)).toBeNull();
  });
  it('подделка uid, sid или подписи → null', () => {
    const c = signTwofaCookie('42', 'sid-a', 3600, now);
    expect(verifyTwofaCookie(c.replace(/^42\./, '99.'), now)).toBeNull();
    expect(verifyTwofaCookie(c.replace('.sid-a.', '.sid-b.'), now)).toBeNull();
    expect(verifyTwofaCookie(c.slice(0, -2) + 'xx', now)).toBeNull();
    expect(verifyTwofaCookie(undefined, now)).toBeNull();
    expect(verifyTwofaCookie('a.b', now)).toBeNull();
  });
  it('cookieFromHeader', () => {
    expect(cookieFromHeader('a=1; twofa-ok=x.y=z', 'twofa-ok')).toBe('x.y=z');
    expect(cookieFromHeader(null, 'a')).toBeUndefined();
  });
});
