import { describe, it, expect, beforeAll } from 'vitest';
import { canAccessAdmin } from '@/lib/auth/admin-access';
import { signTwofaCookie } from '@/lib/auth/twofa-cookie';

beforeAll(() => { process.env.PAYLOAD_SECRET = 'unit-test-secret-key'; });

const mod = { id: 5, role: 'moderator', totpEnabled: true };
const hdr = (uid: string) => `foo=1; twofa-ok=${signTwofaCookie(uid)}`;

describe('canAccessAdmin', () => {
  it('модератор с включённой 2FA и своей cookie — да', () => {
    expect(canAccessAdmin(mod, hdr('5'))).toBe(true);
  });
  it('без cookie, с чужой cookie, с выключенной 2FA — нет', () => {
    expect(canAccessAdmin(mod, 'foo=1')).toBe(false);
    expect(canAccessAdmin(mod, hdr('6'))).toBe(false);
    expect(canAccessAdmin({ ...mod, totpEnabled: false }, hdr('5'))).toBe(false);
  });
  it('не-staff и аноним — нет', () => {
    expect(canAccessAdmin({ id: 7, role: 'org_admin', totpEnabled: true }, hdr('7'))).toBe(false);
    expect(canAccessAdmin(null, hdr('5'))).toBe(false);
  });
});
