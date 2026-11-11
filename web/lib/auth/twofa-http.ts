// Общая обвязка роутов /api/auth/2fa/*: пользователь из сессии Payload + код из JSON.
import { NextResponse } from 'next/server';
import { getPayload, type Payload } from 'payload';
import config from '@payload-config';
import { getCurrentUser } from '@/lib/auth/current-user';
import type { User } from '@/payload-types';

const STATUS: Record<string, number> = { no_session: 401, rate_limited: 429, already_enabled: 409, not_enrolled: 400, invalid_code: 400 };

export function twofaError(error: string) {
  return NextResponse.json({ error }, { status: STATUS[error] ?? 400 });
}

export async function twofaContext(req?: Request): Promise<{ payload: Payload; user: User; code: string } | NextResponse> {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = req ? await req.json().catch(() => ({})) : {};
  return { payload: await getPayload({ config }), user, code: String(body?.token ?? '') };
}
