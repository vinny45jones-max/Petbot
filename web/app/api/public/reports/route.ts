import { NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@/payload.config';
import { checkRateLimit, clientIp } from '@/lib/security/rate-limit';
import { getCurrentUser } from '@/lib/auth/current-user';

const TARGET_TYPES = ['animal', 'comment', 'organization'] as const;
type ReportTarget = (typeof TARGET_TYPES)[number];

export async function POST(req: Request) {
  const ip = clientIp(req);
  if (!checkRateLimit(`report:${ip}`, 20, 60 * 60 * 1000)) {
    return NextResponse.json({ error: 'Слишком много жалоб.' }, { status: 429 });
  }
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Войдите, чтобы пожаловаться.' }, { status: 401 });

  const { targetType, targetId, reason } = await req.json().catch(() => ({}));
  if (!TARGET_TYPES.includes(targetType) || !targetId || !String(reason ?? '').trim()) {
    return NextResponse.json({ error: 'Некорректная жалоба.' }, { status: 422 });
  }

  const payload = await getPayload({ config });
  await payload.create({
    collection: 'report-flags', overrideAccess: true,
    data: { reporter: user.id, targetType: targetType as ReportTarget, targetId: String(targetId), reason: String(reason).trim().slice(0, 1000), status: 'new' },
  });

  // жалоба на комментарий — в очередь модерации. Только published → reported:
  // hidden (shadow-ban) так вернулся бы в публичный список
  if (targetType === 'comment') {
    await payload.update({
      collection: 'comments', overrideAccess: true,
      where: { and: [{ id: { equals: targetId } }, { status: { equals: 'published' } }] },
      data: { status: 'reported' },
    });
  }
  return NextResponse.json({ ok: true });
}
