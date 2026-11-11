import { getPayload } from 'payload';
import config from '@payload-config';
import { sumPaidByn, donorCount, type DonationRow } from '@/lib/payments/aggregate';
import { isDonationsEnabled } from '@/lib/payments/expresspay';
import { DonationSummaryView } from './DonationSummaryView';

export async function DonationSummary({ target }: { target: { type: 'animal' | 'organization'; id: string | number; slug: string } }) {
  const payload = await getPayload({ config });
  const res = await payload.find({
    collection: 'donations', overrideAccess: true, depth: 0, pagination: false,
    select: { amountByn: true, status: true, donorUser: true, donorEmail: true },
    where: { and: [{ [target.type]: { equals: target.id } }, { status: { equals: 'paid' } }] },
  });
  const rows = res.docs as unknown as DonationRow[];
  return (
    <DonationSummaryView
      total={sumPaidByn(rows)}
      donors={donorCount(rows)}
      helpHref={`/help/${target.type}/${target.slug}`}
      enabled={isDonationsEnabled()}
    />
  );
}
