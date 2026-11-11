import { NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@payload-config';
import { verifyTurnstile } from '@/lib/security/turnstile';
import { checkRateLimit, clientIp } from '@/lib/security/rate-limit';
import { configFromEnv, createInvoice, isDonationsEnabled, kindFromConfig } from '@/lib/payments/expresspay';
import { startDonation } from '@/lib/payments/start-donation';
import { getCurrentUser } from '@/lib/auth/current-user';

export async function POST(req: Request) {
  const cfg = configFromEnv();
  if (!isDonationsEnabled(cfg)) return NextResponse.json({ error: 'Приём пожертвований скоро заработает.' }, { status: 503 });

  const ip = clientIp(req);
  if (!checkRateLimit(`donate:${ip}`, 15, 60 * 60 * 1000)) {
    return NextResponse.json({ error: 'Слишком много попыток. Попробуйте позже.' }, { status: 429 });
  }
  const form = await req.formData();
  if (!(await verifyTurnstile(form.get('cf-turnstile-response') as string | null, ip))) {
    return NextResponse.json({ error: 'Проверка не пройдена. Обновите страницу.' }, { status: 400 });
  }
  const str = (k: string) => ((form.get(k) as string | null) ?? '').toString();

  const payload = await getPayload({ config });
  const user = await getCurrentUser();
  const one = async (collection: 'animals' | 'organizations', slug: string) =>
    (await payload.find({ collection, where: { slug: { equals: slug } }, limit: 1, depth: 0, overrideAccess: true })).docs[0] as any ?? null;

  const r = await startDonation(
    {
      amount: str('amount'), targetType: str('targetType'), targetSlug: str('targetSlug'), purpose: str('purpose'),
      donorEmail: str('donorEmail'), donorPhone: str('donorPhone'), donorName: str('donorName'), donorUserId: user?.id ?? null,
    },
    {
      enabled: true,
      invoiceKind: kindFromConfig(cfg),
      baseUrl: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
      findAnimal: (slug) => one('animals', slug),
      findOrganization: (slug) => one('organizations', slug),
      createDonation: (data) => payload.create({ collection: 'donations', data: data as any, overrideAccess: true }),
      updateDonation: (id, data) => payload.update({ collection: 'donations', id, data: data as any, overrideAccess: true }),
      createInvoice: (input) => createInvoice(input, cfg),
    },
  );
  return NextResponse.json(r.body, { status: r.status });
}
