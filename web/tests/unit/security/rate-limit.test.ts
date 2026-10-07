import { describe, it, expect } from 'vitest';
import { slidingWindowAllow } from '@/lib/security/rate-limit';

describe('slidingWindowAllow', () => {
  it('allows up to limit within window', () => {
    const now = 1_000_000;
    const hits = [now - 5000, now - 4000, now - 3000];
    expect(slidingWindowAllow(hits, { limit: 5, windowMs: 60_000, now })).toBe(true);
  });
  it('blocks when limit reached within window', () => {
    const now = 1_000_000;
    const hits = Array.from({ length: 5 }, (_, i) => now - i * 1000);
    expect(slidingWindowAllow(hits, { limit: 5, windowMs: 60_000, now })).toBe(false);
  });
  it('ignores hits outside the window', () => {
    const now = 1_000_000;
    const hits = [now - 120_000, now - 90_000];
    expect(slidingWindowAllow(hits, { limit: 5, windowMs: 60_000, now })).toBe(true);
  });
});
