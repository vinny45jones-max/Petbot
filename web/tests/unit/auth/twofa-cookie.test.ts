import { describe, it, expect, beforeAll } from 'vitest';
import { signTwofaCookie, verifyTwofaCookie } from '@/lib/auth/twofa-cookie';

beforeAll(() => { process.env.PAYLOAD_SECRET = 'unit-test-secret-key'; });

describe('twofa-cookie (HMAC)', () => {
  const now = 1_700_000_000_000;
  it('подпись и проверка возвращают uid', () => {
    expect(verifyTwofaCookie(signTwofaCookie('42', 3600, now), now)).toBe('42');
  });
  it('истёкшая cookie → null', () => {
    expect(verifyTwofaCookie(signTwofaCookie('42', 10, now), now + 20_000)).toBeNull();
  });
  it('подделка uid или подписи → null', () => {
    const c = signTwofaCookie('42', 3600, now);
    expect(verifyTwofaCookie(c.replace(/^42\./, '99.'), now)).toBeNull();
    expect(verifyTwofaCookie(c.slice(0, -2) + 'xx', now)).toBeNull();
    expect(verifyTwofaCookie(undefined, now)).toBeNull();
    expect(verifyTwofaCookie('a.b', now)).toBeNull();
  });
});
