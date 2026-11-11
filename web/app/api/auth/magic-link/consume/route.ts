import { NextRequest, NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@payload-config';
import { hashToken, isTokenExpired } from '@/lib/auth/magic-link';
import { startSession } from '@/lib/auth/session';

const back = (req: NextRequest, error: string) => NextResponse.redirect(new URL(`/login/magic?error=${error}`, req.url), 303);

// Старые ссылки вида /api/auth/magic-link/consume?token=… — на страницу подтверждения, токен здесь не тратим.
export function GET(req: NextRequest) {
  const url = new URL('/login/magic', req.url);
  const token = req.nextUrl.searchParams.get('token');
  if (token) url.searchParams.set('token', token);
  return NextResponse.redirect(url, 303);
}

export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null);
  const token = form?.get('token');
  if (typeof token !== 'string' || !token) return back(req, 'missing-token');
  const payload = await getPayload({ config });
  const found = await payload.find({ collection: 'magic-link-tokens', where: { tokenHash: { equals: hashToken(token) }, consumedAt: { exists: false } }, limit: 1 });
  if (!found.docs.length) return back(req, 'invalid-token');
  const entry = found.docs[0] as any;
  if (isTokenExpired(new Date(entry.createdAt))) return back(req, 'expired');
  await payload.update({ collection: 'magic-link-tokens', id: entry.id, data: { consumedAt: new Date().toISOString() } });
  const userId = typeof entry.user === 'object' ? entry.user.id : entry.user;
  const user = await payload.findByID({ collection: 'users', id: userId });
  // Переход по ссылке из письма подтверждает почту; без _verified Payload сессию не примет (auth.verify).
  if (user._verified === false) await payload.update({ collection: 'users', id: userId, data: { _verified: true } as any });
  await startSession(payload, userId);
  return NextResponse.redirect(new URL('/me', req.url), 303);
}
