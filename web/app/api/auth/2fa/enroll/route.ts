import { NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { enrollTwofa } from '@/lib/auth/twofa';
import { twofaContext, twofaError } from '@/lib/auth/twofa-http';

export async function POST() {
  const ctx = await twofaContext();
  if (ctx instanceof NextResponse) return ctx;
  const r = await enrollTwofa(ctx.payload, ctx.user);
  if (!r.ok) return twofaError(r.error);
  return NextResponse.json({ qrDataUrl: await QRCode.toDataURL(r.otpauth), secret: r.secret });
}
