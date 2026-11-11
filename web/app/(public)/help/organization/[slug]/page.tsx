import { notFound } from 'next/navigation';
import { getPayload } from 'payload';
import config from '@payload-config';
import { DonationForm } from '@/components/donate/DonationForm';
import { isDonationsEnabled } from '@/lib/payments/expresspay';

export const metadata = { title: 'Помочь приюту', robots: { index: false } };

export default async function HelpOrgPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const payload = await getPayload({ config });
  const r = await payload.find({ collection: 'organizations', where: { and: [{ slug: { equals: slug } }, { isPublished: { equals: true } }] }, limit: 1, depth: 0 });
  const org = r.docs[0];
  if (!org) notFound();
  return (
    <main className="mx-auto max-w-xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Помочь приюту</h1>
      <DonationForm targetType="organization" targetSlug={org.slug as string} targetTitle={org.name as string} enabled={isDonationsEnabled()} />
    </main>
  );
}
