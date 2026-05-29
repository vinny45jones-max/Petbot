import type { User } from '@/payload-types';

export type UserLike = Pick<User, 'role' | 'id'> & {
  organizations?: Array<string | { id: string }>;
};

export function isAdmin(user: UserLike | null): boolean {
  if (!user) return false;
  return user.role === 'superadmin' || user.role === 'moderator';
}

export function canModerateContent(user: UserLike | null): boolean {
  if (!user) return false;
  return user.role === 'superadmin' || user.role === 'moderator';
}

export function canManageOrganization(user: UserLike | null, orgId: string): boolean {
  if (!user) return false;
  if (user.role === 'superadmin') return true;
  if (user.role !== 'org_admin') return false;
  const orgIds = (user.organizations || []).map((o) => (typeof o === 'string' ? o : o.id));
  return orgIds.includes(orgId);
}
