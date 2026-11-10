import { NextRequest, NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@/payload.config';
import { notifyNewInquiry } from '@/lib/notify/dispatch';
import { formatAnimalTitle } from '@/lib/format';
import { verifyTurnstile } from '@/lib/security/turnstile';
import { checkRateLimit, clientIp } from '@/lib/security/rate-limit';

export async function POST(req: NextRequest) {
  const payload = await getPayload({ config });
  const session = await payload.auth({ headers: req.headers });
  if (!session.user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const ip = clientIp(req);
  if (!checkRateLimit(`inquiry:${ip}`, 10, 60 * 60 * 1000)) {
    return NextResponse.json({ error: 'Слишком много заявок. Попробуйте позже.' }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  if (!(await verifyTurnstile(body?.turnstileToken, ip))) {
    return NextResponse.json({ error: 'Проверка не пройдена. Обновите страницу.' }, { status: 400 });
  }
  if (!body?.animalId || !body?.message || String(body.message).trim().length < 1) {
    return NextResponse.json({ error: 'invalid' }, { status: 400 });
  }

  const animal: any = await payload.findByID({ collection: 'animals', id: body.animalId, depth: 1, overrideAccess: true }).catch(() => null);
  if (!animal || animal.status !== 'published') return NextResponse.json({ error: 'not found' }, { status: 404 });

  await payload.create({
    collection: 'adoption-inquiries',
    data: {
      animal: animal.id, applicant: session.user.id, message: String(body.message).slice(0, 2000),
      contactPhone: body.phone ?? session.user.phone ?? undefined,
      contactTelegram: body.telegram ?? (session.user.telegramUsername ? `@${session.user.telegramUsername}` : undefined),
      status: 'new',
    } as any,
    overrideAccess: true,
  });

  // email владельцу/организации + telegram + подтверждение заявителю
  let ownerEmail: string | null = null;
  if (animal.ownerUser) {
    const owner: any = await payload.findByID({ collection: 'users', id: typeof animal.ownerUser === 'object' ? animal.ownerUser.id : animal.ownerUser, depth: 0 }).catch(() => null);
    ownerEmail = owner?.email ?? null;
  } else if (animal.organization) {
    const org: any = await payload.findByID({ collection: 'organizations', id: typeof animal.organization === 'object' ? animal.organization.id : animal.organization, depth: 0 }).catch(() => null);
    ownerEmail = org?.email ?? null;
  }
  // заявка уже сохранена — сбой почты/Telegram не должен превращать её в ошибку для заявителя
  try {
    await notifyNewInquiry({
      ownerEmail, applicantEmail: session.user.email ?? null,
      animalTitle: formatAnimalTitle(animal),
      applicantName: [session.user.firstName, session.user.lastName].filter(Boolean).join(' ') || undefined,
      phone: body.phone ?? session.user.phone ?? undefined,
      telegram: body.telegram ?? undefined,
      message: String(body.message),
    });
  } catch (e) {
    console.error('[inquiries] notify failed', e);
  }

  return NextResponse.json({ ok: true });
}
