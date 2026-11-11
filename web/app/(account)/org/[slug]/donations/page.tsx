import { notFound } from 'next/navigation';
import { getPayload } from 'payload';
import config from '@/payload.config';
import { requireOrgAdmin } from '@/lib/auth/current-user';
import { getOrganizationBySlug } from '@/lib/org';
import { sumPaidByn, donorCount, type DonationRow } from '@/lib/payments/aggregate';
import { formatByn } from '@/lib/payments/amounts';

export const dynamic = 'force-dynamic';

export default async function OrgDonationsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const org = await getOrganizationBySlug(slug);
  if (!org) notFound();
  // финансовые данные: проверка прав и здесь, не только в layout
  await requireOrgAdmin(String(org.id));
  const payload = await getPayload({ config });
  const res = await payload.find({
    collection: 'donations', overrideAccess: true, depth: 0, pagination: false, sort: '-createdAt',
    select: { amountByn: true, status: true, donorUser: true, donorEmail: true, paidAt: true, createdAt: true, purpose: true },
    where: { and: [{ organization: { equals: org.id } }, { status: { equals: 'paid' } }] },
  });
  const rows = res.docs as any[];

  return (
    <main>
      <h1 className="mb-2 text-2xl font-bold">Пожертвования</h1>
      <p className="mb-6 text-gray-600">Всего собрано: <b>{formatByn(sumPaidByn(rows as DonationRow[]))}</b> · доноров: <b>{donorCount(rows as DonationRow[])}</b></p>
      {rows.length === 0 ? (
        <p className="text-gray-500">Пожертвований пока нет.</p>
      ) : (
        <ul className="divide-y rounded-2xl border">
          {rows.map((d) => (
            <li key={d.id} className="flex items-center justify-between p-4">
              <span className="font-medium">{formatByn(d.amountByn)}{d.purpose ? ` · ${d.purpose}` : ''}</span>
              <span className="text-sm text-gray-500">{new Date(d.paidAt ?? d.createdAt).toLocaleDateString('ru-RU')}</span>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
