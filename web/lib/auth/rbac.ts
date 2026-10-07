import type { User } from '@/payload-types';

export type UserLike = Pick<User, 'role'>;

export function isAdmin(user: UserLike | null): boolean {
  if (!user) return false;
  return user.role === 'superadmin' || user.role === 'moderator';
}

export function canModerateContent(user: UserLike | null): boolean {
  if (!user) return false;
  return user.role === 'superadmin' || user.role === 'moderator';
}
