import type { Payload } from 'payload';
import { receiptData } from './donation.ts';
import { formatAnimalTitle } from '../format.ts';

type Send = (args: { to: string; subject: string; react: any }) => Promise<unknown>;

async function defaultSend(args: Parameters<Send>[0]) {
  const { sendEmail } = await import('../email/resend-client.ts');
  return sendEmail(args);
}

/**
 * Донат оплачен: статус + paidAt, чек донору (аудит пишет хук коллекции). Общая точка для webhook и сверки (cron).
 * Повторный вызов для уже оплаченного — ничего не делает (повторная доставка уведомления).
 */
export async function finalizeDonationPaid(payload: Payload, donationId: string | number, send: Send = defaultSend): Promise<void> {
  const d = (await payload.findByID({ collection: 'donations', id: donationId, depth: 1, overrideAccess: true })) as any;
  if (!d || d.status === 'paid') return;
  await payload.update({ collection: 'donations', id: donationId, overrideAccess: true, data: { status: 'paid', paidAt: new Date().toISOString() } as any });

  const label = d.targetType === 'animal' && d.animal && typeof d.animal === 'object' ? formatAnimalTitle(d.animal)
    : d.targetType === 'organization' && d.organization && typeof d.organization === 'object' ? d.organization.name : null;
  const rd = receiptData({ amountByn: d.amountByn, targetType: d.targetType, targetLabel: label });
  if (d.donorEmail) {
    try {
      const { default: DonationReceipt } = await import('../email/templates/donation-receipt.tsx');
      await send({ to: d.donorEmail, subject: 'Чек о пожертвовании', react: DonationReceipt({ amountText: rd.amountText, targetText: rd.targetText, donorName: d.donorName }) });
    } catch (e) {
      console.error('[donation] receipt email failed (non-fatal)', e);
    }
  }
}
