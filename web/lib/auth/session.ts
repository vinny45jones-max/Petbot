import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

const COOKIE = 'payload-token';

export function issueSessionToken(user: { id: string | number; email: string }): string {
  const secret = process.env.PAYLOAD_SECRET;
  if (!secret) throw new Error('PAYLOAD_SECRET is not set');
  return jwt.sign({ id: user.id, collection: 'users', email: user.email }, secret, { expiresIn: '7d' });
}

export async function setSessionCookie(token: string): Promise<void> {
  const store = await cookies();
  store.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });
}
