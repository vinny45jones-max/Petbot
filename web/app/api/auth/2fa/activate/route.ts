import { NextResponse } from 'next/server';
import { activateTwofa } from '@/lib/auth/twofa';
import { twofaContext, twofaError } from '@/lib/auth/twofa-http';

export async function POST(req: Request) {
  const ctx = await twofaContext(req);
  if (ctx instanceof NextResponse) return ctx;
  const r = await activateTwofa(ctx.payload, ctx.user, ctx.code);
  if (!r.ok) return twofaError(r.error);
  return NextResponse.json({ ok: true, recoveryCodes: r.recoveryCodes });
}
