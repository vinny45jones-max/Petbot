import { describe, it, expect } from 'vitest';
import { canAccessAdmin } from '@/lib/auth/admin-access';

// Роль уже «замаскирована» хуком Users.afterRead: staff без 2FA приходит как citizen.
describe('canAccessAdmin', () => {
  it('moderator/superadmin — да', () => {
    expect(canAccessAdmin({ id: 5, role: 'moderator' })).toBe(true);
    expect(canAccessAdmin({ id: 1, role: 'superadmin' })).toBe(true);
  });
  it('замаскированный staff, не-staff и аноним — нет', () => {
    expect(canAccessAdmin({ id: 5, role: 'citizen' })).toBe(false);
    expect(canAccessAdmin({ id: 7, role: 'org_admin' })).toBe(false);
    expect(canAccessAdmin(null)).toBe(false);
  });
});
