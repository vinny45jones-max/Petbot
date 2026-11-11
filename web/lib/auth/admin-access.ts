// Кто входит в Payload-админку (Users.access.admin): только moderator/superadmin с пройденной 2FA.
import { isAdmin } from './rbac.ts';
import { cookieFromHeader, TWOFA_COOKIE_NAME, verifyTwofaCookie } from './twofa-cookie.ts';

type AdminCandidate = { id: number | string; role?: string | null; totpEnabled?: boolean | null };

export function canAccessAdmin(user: AdminCandidate | null | undefined, cookieHeader: string | null | undefined): boolean {
  if (!user || !isAdmin(user as never) || !user.totpEnabled) return false;
  return verifyTwofaCookie(cookieFromHeader(cookieHeader, TWOFA_COOKIE_NAME)) === String(user.id);
}
