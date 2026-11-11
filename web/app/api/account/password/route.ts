import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getPayload } from 'payload';
import config from '@payload-config';
import { getCurrentUser } from '@/lib/auth/current-user';
import { changePassword } from '@/lib/auth/change-password';
import { readPayloadToken } from '@/lib/auth/payload-token';

const STATUS: Record<string, number> = { rate_limited: 429, wrong_password: 400, weak_password: 400, same_password: 400 };

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const sid = readPayloadToken((await cookies()).get('payload-token')?.value)?.sid;
  const r = await changePassword(await getPayload({ config }), user, {
    current: String(body?.current ?? ''), next: String(body?.next ?? ''), sid,
  });
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: STATUS[r.error] ?? 400 });
  return NextResponse.json({ ok: true });
}
