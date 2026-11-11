import { describe, it, expect } from 'vitest';
import { computeSignature, verifySignature } from '@/lib/payments/expresspay-signature';

describe('expresspay signature', () => {
  it('matches the reference HMAC-SHA1 vector, upper-case hex', () => {
    // эталон: HMAC_SHA1("key", "The quick brown fox jumps over the lazy dog")
    expect(computeSignature(['The quick brown fox ', 'jumps over the lazy dog'], 'key'))
      .toBe('DE7C9B85B8B78AA6BC8A7A36F70A90701C9DB4D9');
  });
  it('verifies a correct signature and rejects a wrong one', () => {
    const parts = ['100', 'BYN', 'order-1'];
    const sig = computeSignature(parts, 'secret');
    expect(verifySignature(parts, 'secret', sig)).toBe(true);
    expect(verifySignature(parts, 'secret', sig.toLowerCase())).toBe(true);
    expect(verifySignature(parts, 'secret', 'DEADBEEF')).toBe(false);
    expect(verifySignature(parts, 'secret', '')).toBe(false);
  });
  it('treats empty secret as signature disabled (allow)', () => {
    expect(verifySignature(['x'], '', 'whatever')).toBe(true);
  });
});
