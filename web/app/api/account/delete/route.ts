import { NextRequest, NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@payload-config';
import { recordAuditLog } from '@/lib/audit/log';

export async function POST(req: NextRequest) {
  const payload = await getPayload({ config });
  const session = await payload.auth({ headers: req.headers });
  if (!session.user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const userId = session.user.id;
  // Soft-anonymize: затереть PII, оставить запись для целостности связанных donations/audit
  await payload.update({
    collection: 'users',
    id: userId,
    data: {
      email: `deleted-${userId}@example.invalid`,
      firstName: null,
      lastName: null,
      phone: null,
      telegramId: null,
      telegramUsername: null,
      photoUrl: null,
      isBlocked: true,
    } as any,
  });
  await recordAuditLog(payload, { actorId: userId, action: 'account.deleted', targetType: 'user', targetId: String(userId) });
  const res = NextResponse.json({ ok: true });
  res.cookies.delete('payload-token');
  return res;
}
