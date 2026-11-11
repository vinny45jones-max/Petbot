import { NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@/payload.config';
import { isCronAuthorized } from '@/lib/security/cron-auth';
import { configFromEnv, getInvoiceStatus, isDonationsEnabled } from '@/lib/payments/expresspay';
import { finalizeDonationPaid } from '@/lib/payments/finalize-paid';
import { runReconcile } from '@/lib/payments/reconcile';
import { sendEmail } from '@/lib/email/resend-client';
import ReconcileAlert from '@/lib/email/templates/reconcile-alert';

export const dynamic = 'force-dynamic';

/** Сверка зависших донатов (раз в час). Вызывается внешним cron с `Authorization: Bearer $CRON_SECRET`. */
export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: 'CRON_SECRET не настроен' }, { status: 503 });
  if (!isCronAuthorized(req.headers.get('authorization'), secret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const cfg = configFromEnv();
  if (!isDonationsEnabled(cfg)) return NextResponse.json({ ok: true, skipped: 'ExpressPay не подключён' });

  const payload = await getPayload({ config });
  const result = await runReconcile({
    now: new Date(),
    findStalePending: async (before) => {
      const res = await payload.find({
        collection: 'donations', overrideAccess: true, depth: 0, pagination: false,
        select: { providerInvoiceId: true },
        where: { and: [{ status: { equals: 'pending' } }, { providerInvoiceId: { exists: true } }, { createdAt: { less_than: before.toISOString() } }] },
      });
      return res.docs.map((d: any) => ({ id: d.id, providerInvoiceId: String(d.providerInvoiceId) }));
    },
    confirmStatus: (inv) => getInvoiceStatus(inv, cfg),
    finalizePaid: (id) => finalizeDonationPaid(payload, id),
    setStatus: async (id, status) => {
      await payload.update({ collection: 'donations', id, overrideAccess: true, data: { status } });
    },
    sendReport: async (r) => {
      const to = process.env.SUPERADMIN_EMAIL;
      if (to) await sendEmail({ to, subject: `Сверка донатов: +${r.fixed} оплат, ${r.failed} не прошли`, react: ReconcileAlert(r) });
    },
  });

  console.log(`[reconcile] done. fixed=${result.fixed} failed=${result.failed} stillPending=${result.stillPending}`);
  return NextResponse.json({ ok: true, ...result });
}
