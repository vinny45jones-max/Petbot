import { getPayload } from 'payload';
import config from '@payload-config';
import { configFromEnv, getInvoiceStatus } from '@/lib/payments/expresspay';
import { finalizeDonationPaid } from '@/lib/payments/finalize-paid';
import { handleNotification } from '@/lib/payments/handle-notification';

// URL для уведомлений в ЛК ExpressPay: <сайт>/api/donations/expresspay/webhook
export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const cfg = configFromEnv();
  const payload = await getPayload({ config });

  const r = await handleNotification(
    { data: String(form?.get('Data') ?? ''), signature: String(form?.get('Signature') ?? '') },
    {
      secret: cfg.secret,
      findByAccountNo: async (accountNo) =>
        ((await payload.find({ collection: 'donations', where: { accountNo: { equals: accountNo } }, limit: 1, depth: 0, overrideAccess: true })).docs[0] as any) ?? null,
      confirmStatus: (invoiceId) => getInvoiceStatus(invoiceId, cfg),
      finalizePaid: (id) => finalizeDonationPaid(payload, id),
      setStatus: async (id, status) => {
        await payload.update({ collection: 'donations', id, data: { status }, overrideAccess: true });
      },
    },
  );
  return new Response(r.body, { status: r.status, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
