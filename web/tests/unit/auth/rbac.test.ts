import { describe, it, expect } from 'vitest';
import { canManageOrganization, canModerateContent, isAdmin } from '@/lib/auth/rbac';

describe('rbac', () => {
  describe('isAdmin', () => {
    it('returns true for superadmin', () => {
      expect(isAdmin({ role: 'superadmin' } as any)).toBe(true);
    });
    it('returns true for moderator', () => {
      expect(isAdmin({ role: 'moderator' } as any)).toBe(true);
    });
    it('returns false for citizen', () => {
      expect(isAdmin({ role: 'citizen' } as any)).toBe(false);
    });
    it('returns false for null user', () => {
      expect(isAdmin(null)).toBe(false);
    });
  });

  describe('canModerateContent', () => {
    it('allows moderator and superadmin', () => {
      expect(canModerateContent({ role: 'moderator' } as any)).toBe(true);
      expect(canModerateContent({ role: 'superadmin' } as any)).toBe(true);
    });
    it('denies citizen and org_admin', () => {
      expect(canModerateContent({ role: 'citizen' } as any)).toBe(false);
      expect(canModerateContent({ role: 'org_admin' } as any)).toBe(false);
    });
  });

  describe('canManageOrganization', () => {
    it('superadmin can manage any org', () => {
      const user = { role: 'superadmin', id: 'u1', organizations: [] } as any;
      expect(canManageOrganization(user, 'org-x')).toBe(true);
    });
    it('org_admin can manage own org', () => {
      const user = { role: 'org_admin', id: 'u1', organizations: ['org-x'] } as any;
      expect(canManageOrganization(user, 'org-x')).toBe(true);
    });
    it('org_admin cannot manage other orgs', () => {
      const user = { role: 'org_admin', id: 'u1', organizations: ['org-x'] } as any;
      expect(canManageOrganization(user, 'org-y')).toBe(false);
    });
    it('citizen cannot manage orgs', () => {
      const user = { role: 'citizen', id: 'u1', organizations: [] } as any;
      expect(canManageOrganization(user, 'org-x')).toBe(false);
    });
  });
});
