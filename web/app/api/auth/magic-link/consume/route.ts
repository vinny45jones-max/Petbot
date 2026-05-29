import { NextRequest, NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@payload-config';
import { hashToken, isTokenExpired } from '@/lib/auth/magic-link';
import { issueSessionToken, setSessionCookie } from '@/lib/auth/session';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  if (!token) return NextResponse.redirect(new URL('/login?error=missing-token', req.url));
  const payload = await getPayload({ config });
  const found = await payload.find({ collection: 'magic-link-tokens', where: { tokenHash: { equals: hashToken(token) }, consumedAt: { exists: false } }, limit: 1 });
  if (!found.docs.length) return NextResponse.redirect(new URL('/login?error=invalid-token', req.url));
  const entry = found.docs[0] as any;
  if (isTokenExpired(new Date(entry.createdAt))) return NextResponse.redirect(new URL('/login?error=expired', req.url));
  await payload.update({ collection: 'magic-link-tokens', id: entry.id, data: { consumedAt: new Date().toISOString() } });
  // Выдаём сессию через общий хелпер (тот же механизм, что и TG-логин)
  const userId = typeof entry.user === 'string' ? entry.user : entry.user.id;
  const user = await payload.findByID({ collection: 'users', id: userId });
  const sessionToken = issueSessionToken({ id: user.id, email: user.email });
  await setSessionCookie(sessionToken);
  return NextResponse.redirect(new URL('/me', req.url));
}
