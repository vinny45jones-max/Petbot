import { NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@/payload.config';
import { verifyTurnstile } from '@/lib/security/turnstile';
import { checkRateLimit, clientIp } from '@/lib/security/rate-limit';
import { validatePartnerApplication } from '@/lib/content/validate';
import { sendEmail } from '@/lib/email/resend-client';
import PartnerApplicationEmail from '@/lib/email/templates/partner-application';

export async function POST(req: Request) {
  const ip = clientIp(req);
  if (!checkRateLimit(`partner:${ip}`, 5, 60 * 60 * 1000)) {
    return NextResponse.json({ error: 'Слишком много заявок. Попробуйте позже.' }, { status: 429 });
  }
  const form = await req.formData();
  if (!(await verifyTurnstile(form.get('cf-turnstile-response') as string | null, ip))) {
    return NextResponse.json({ error: 'Проверка не пройдена.' }, { status: 400 });
  }

  const name = (form.get('name') as string) ?? '';
  const unp = ((form.get('unp') as string) || '').trim() || undefined;
  const contact = (form.get('contact') as string) ?? '';
  const links = ((form.get('links') as string) || '').trim() || undefined;
  const message = ((form.get('message') as string) || '').trim() || undefined;

  const v = validatePartnerApplication({ name, unp, contact });
  if (!v.ok) return NextResponse.json({ error: v.errors.join('. ') }, { status: 422 });

  const payload = await getPayload({ config });
  const doc = await payload.create({
    collection: 'partner-applications',
    overrideAccess: true,
    data: { name, unp, contact, links, message, status: 'new' },
  });

  const base = process.env.NEXT_PUBLIC_APP_URL ?? '';
  const to = process.env.SUPERADMIN_EMAIL;
  if (to) {
    // заявка уже сохранена — сбой почты не должен превращать её в ошибку для заявителя
    try {
      await sendEmail({
        to, subject: `Заявка приюта: ${name}`,
        react: PartnerApplicationEmail({ name, unp, contact, links, message, adminUrl: `${base}/admin/collections/partner-applications/${doc.id}` }),
      });
    } catch (e) {
      console.error('[partner-applications] email failed', e);
    }
  }
  return NextResponse.json({ ok: true });
}
