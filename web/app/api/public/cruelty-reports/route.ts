import { NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@/payload.config';
import { verifyTurnstile } from '@/lib/security/turnstile';
import { checkRateLimit, clientIp } from '@/lib/security/rate-limit';
import { validateCrueltyReport } from '@/lib/content/validate';
import { getCurrentUser } from '@/lib/auth/current-user';
import { sendEmail } from '@/lib/email/resend-client';
import CrueltyReceived from '@/lib/email/templates/cruelty-received';

export async function POST(req: Request) {
  const ip = clientIp(req);
  if (!checkRateLimit(`cruelty:${ip}`, 5, 60 * 60 * 1000)) {
    return NextResponse.json({ error: 'Слишком много обращений. Попробуйте позже.' }, { status: 429 });
  }
  const form = await req.formData();
  const token = form.get('cf-turnstile-response') as string | null;
  if (!(await verifyTurnstile(token, ip))) {
    return NextResponse.json({ error: 'Проверка не пройдена. Обновите страницу.' }, { status: 400 });
  }

  const description = (form.get('description') as string) ?? '';
  const contact = (form.get('contact') as string) || undefined;
  const v = validateCrueltyReport({ description, contact });
  if (!v.ok) return NextResponse.json({ error: v.errors.join('. ') }, { status: 422 });

  const payload = await getPayload({ config });
  const user = await getCurrentUser();

  const doc = await payload.create({
    collection: 'cruelty-reports',
    overrideAccess: true,
    data: { description, contact, reporterUser: user?.id ?? undefined, status: 'new' },
  });

  const base = process.env.NEXT_PUBLIC_APP_URL ?? '';
  const adminUrl = `${base}/admin/collections/cruelty-reports/${doc.id}`;
  const to = process.env.SUPERADMIN_EMAIL;
  if (to) {
    // обращение уже сохранено — сбой почты не должен превращать его в ошибку для заявителя
    try {
      await sendEmail({ to, subject: 'Новое сообщение о жестокости', react: CrueltyReceived({ description, contact, adminUrl }) });
    } catch (e) {
      console.error('[cruelty-reports] email failed', e);
    }
  }

  return NextResponse.json({ ok: true });
}
