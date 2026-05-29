import { describe, it, expect } from 'vitest';
import { generateMagicToken, isTokenExpired } from '@/lib/auth/magic-link';

describe('magic-link', () => {
  it('generateMagicToken returns 64-char hex', () => {
    const token = generateMagicToken();
    expect(token).toMatch(/^[0-9a-f]{64}$/);
  });

  it('isTokenExpired returns true after 15 minutes', () => {
    const now = Date.now();
    expect(isTokenExpired(new Date(now - 16 * 60 * 1000), now)).toBe(true);
    expect(isTokenExpired(new Date(now - 14 * 60 * 1000), now)).toBe(false);
  });
});
