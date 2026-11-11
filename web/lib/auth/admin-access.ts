// Кто входит в Payload-админку (Users.access.admin). Роль уже прошла maskUnverifiedStaff (Users.afterRead):
// moderator/superadmin здесь только с пройденной в этой сессии 2FA.
import { isAdmin } from './rbac.ts';

export function canAccessAdmin(user: { id: number | string; role?: string | null } | null | undefined): boolean {
  return Boolean(user) && isAdmin(user as never);
}
