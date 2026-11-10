import { NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@/payload.config';
import { isCronAuthorized } from '@/lib/security/cron-auth';
import { runUrgencyRecalc, type CronAnimal, type CronPref } from '@/lib/urgency-cron';
import { notifyUrgentChannel } from '@/lib/notify/telegram';
import { sendEmail } from '@/lib/email/resend-client';
import UrgentAlert from '@/lib/email/templates/urgent-alert';

export const dynamic = 'force-dynamic';

const obj = (v: unknown): Record<string, any> | null => (v && typeof v === 'object' ? (v as Record<string, any>) : null);

/** §17.6: ежедневный пересчёт срочности. Вызывается внешним cron с `Authorization: Bearer $CRON_SECRET`. */
export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: 'CRON_SECRET не настроен' }, { status: 503 });
  if (!isCronAuthorized(req.headers.get('authorization'), secret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const payload = await getPayload({ config });
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL ?? '').replace(/\/$/, '');

  const result = await runUrgencyRecalc({
    now: new Date(),
    baseUrl,
    findAnimals: async () => {
      const res = await payload.find({
        collection: 'animals', overrideAccess: true, depth: 1, pagination: false,
        where: { and: [{ intakeFacility: { exists: true } }, { legalDeadlineDate: { exists: true } }, { status: { equals: 'published' } }] },
      });
      return res.docs.map((a: any): CronAnimal => {
        const city = obj(a.city);
        return {
          id: String(a.id), name: a.name, petNumber: a.petNumber, species: a.species, slug: a.slug,
          urgencyLevel: a.urgencyLevel, legalDeadlineDate: a.legalDeadlineDate, urgentAnnouncedAt: a.urgentAnnouncedAt,
          city: city ? { id: city.id, slug: city.slug, nameRu: city.nameRu } : null,
          facilityName: obj(a.intakeFacility)?.name ?? null,
          photoUrl: (Array.isArray(a.media) && obj(a.media[0])?.url) || null,
        };
      });
    },
    updateAnimal: async (id, data) => {
      await payload.update({ collection: 'animals', id: Number(id), overrideAccess: true, data: data as any });
    },
    findPrefs: async () => {
      const res = await payload.find({
        collection: 'notification-preferences', overrideAccess: true, depth: 1, pagination: false,
        where: { emailUrgentInCities: { exists: true } },
      });
      return res.docs.flatMap((p: any): CronPref[] => {
        const user = obj(p.user);
        if (!user?.email || user.isBlocked) return [];
        return [{
          id: String(p.id), email: user.email, urgentLastSentAt: p.urgentLastSentAt,
          cityIds: (p.emailUrgentInCities ?? []).map((c: unknown) => String(obj(c)?.id ?? c)),
        }];
      });
    },
    markPrefSent: async (id) => {
      await payload.update({
        collection: 'notification-preferences', id: Number(id), overrideAccess: true,
        data: { urgentLastSentAt: new Date().toISOString() } as any,
      });
    },
    postToChannel: notifyUrgentChannel,
    sendAlert: async (to, city, items) => {
      await sendEmail({ to, subject: 'Срочные животные рядом — нужна помощь', react: UrgentAlert({ city, items, profileUrl: `${baseUrl}/me` }) });
    },
  });

  console.log(`[urgency] done. changed=${result.changed}, announced=${result.announced}, emailed=${result.emailed}`);
  return NextResponse.json({ ok: true, ...result });
}
