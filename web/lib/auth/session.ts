import { cookies } from 'next/headers';
import { getFieldsToSign, jwtSign, type Payload, type PayloadRequest } from 'payload';
import { addSessionToUser } from 'payload/shared';

const COOKIE = 'payload-token';

// Сессия как у штатного логина Payload (operations/login): запись в users.sessions + JWT с sid,
// подписанный payload.secret (производный от PAYLOAD_SECRET) и заголовком authVersion. Иначе Payload токен не примет (И-25).
export async function issueSessionToken(payload: Payload, userId: number | string): Promise<{ token: string; maxAge: number }> {
  const collectionConfig = payload.collections.users.config;
  const user = await payload.db.findOne<any>({ collection: 'users', where: { id: { equals: userId } } });
  if (!user) throw new Error(`user ${userId} not found`);
  const { sid } = await addSessionToUser({ collectionConfig, payload, req: undefined as unknown as PayloadRequest, user });
  const fieldsToSign = getFieldsToSign({ collectionConfig, email: user.email, sid, user });
  const maxAge = collectionConfig.auth.tokenExpiration;
  const { token } = await jwtSign({ fieldsToSign, secret: payload.secret, tokenExpiration: maxAge });
  return { token, maxAge };
}

export async function setSessionCookie({ token, maxAge }: { token: string; maxAge: number }): Promise<void> {
  const store = await cookies();
  store.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge,
  });
}

export async function startSession(payload: Payload, userId: number | string): Promise<void> {
  await setSessionCookie(await issueSessionToken(payload, userId));
}
