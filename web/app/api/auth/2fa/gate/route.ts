import { NextResponse } from 'next/server';
import { passTwofaGate } from '@/lib/auth/twofa';
import { twofaContext, twofaError } from '@/lib/auth/twofa-http';
import { signTwofaCookie, TWOFA_COOKIE_NAME, TWOFA_TTL_SEC } from '@/lib/auth/twofa-cookie';

export async function POST(req: Request) {
  const ctx = await twofaContext(req);
  if (ctx instanceof NextResponse) return ctx;
  const r = await passTwofaGate(ctx.payload, ctx.user, ctx.code);
  if (!r.ok) return twofaError(r.error);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(TWOFA_COOKIE_NAME, signTwofaCookie(String(ctx.user.id)), {
    httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: TWOFA_TTL_SEC,
  });
  return res;
}
