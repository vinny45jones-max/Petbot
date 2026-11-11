// Единая точка 2FA для staff (§16.2). Users.afterRead вызывает maskUnverifiedStaff, когда Payload поднимает
// пользователя по токену запроса: staff без 2FA в этой сессии получает роль citizen → все проверки ролей
// (REST, GraphQL, админка, кабинеты) отказывают, а роль берётся из БД, а не из JWT.
import { isAdmin } from './rbac.ts';
import { cookieFromHeader, TWOFA_COOKIE_NAME, verifyTwofaCookie } from './twofa-cookie.ts';
import { readPayloadToken } from './payload-token.ts';

type UserDoc = Record<string, any> & { id: number | string; role?: string | null; totpEnabled?: boolean | null };

function sessionOf(cookieHeader: string | null | undefined) {
  return readPayloadToken(cookieFromHeader(cookieHeader, 'payload-token'));
}

export function twofaSatisfied(user: UserDoc, cookieHeader: string | null | undefined): boolean {
  if (!user.totpEnabled) return false;
  const session = sessionOf(cookieHeader);
  const pass = verifyTwofaCookie(cookieFromHeader(cookieHeader, TWOFA_COOKIE_NAME));
  return Boolean(session?.sid && pass && pass.uid === String(user.id) && String(session.id) === String(user.id) && pass.sid === session.sid);
}

export function maskUnverifiedStaff<T extends UserDoc>(doc: T, cookieHeader: string | null | undefined): T {
  if (!cookieHeader || !isAdmin(doc as never)) return doc;
  const session = sessionOf(cookieHeader);
  if (!session || String(session.id) !== String(doc.id)) return doc;
  if (twofaSatisfied(doc, cookieHeader)) return doc;
  return { ...doc, role: 'citizen', twofaRequired: true };
}
